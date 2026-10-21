import "server-only";
import { Resend } from "resend";
import { statusHref } from "@/lib/routes";
import { env } from "../env";
import { statusToken } from "../security";
import { db } from "../supabase";
import { customerEmail, ownerNewOrder, type EmailOrder } from "./templates";

// Every email is written to email_outbox first (one row per order event,
// unique idempotency key), then sent. Failures stay in the outbox with the
// error, are retried with backoff by /api/cron, and can be retried by hand
// from the admin. The order itself is always visible in the admin either way.

export type EmailKind =
  | "owner_new_order"
  | "owner_reminder"
  | "customer_received"
  | "customer_accepted"
  | "customer_rejected"
  | "customer_cancelled"
  | "customer_refund";

const MAX_AUTO_ATTEMPTS = 5;
const BACKOFF_MINUTES = [1, 5, 15, 60, 180];

let resend: Resend | null = null;
function resendClient() {
  if (!env.resendApiKey) return null;
  resend ??= new Resend(env.resendApiKey);
  return resend;
}

const ORDER_EMAIL_COLUMNS =
  "id, number, locale, fulfilment, payment_method, customer_name, customer_phone, customer_email, address, district_name, notes, requested_time, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, reason, order_items(name_bg, name_en, weight, quantity, line_total_cents)";

async function loadEmailOrder(orderId: number): Promise<EmailOrder> {
  const { data, error } = await db().from("orders").select(ORDER_EMAIL_COLUMNS).eq("id", orderId).single();
  if (error) throw error;
  const { order_items, ...rest } = data as unknown as Omit<EmailOrder, "items"> & { order_items: EmailOrder["items"] };
  return { ...rest, items: order_items };
}

async function ownerAddress() {
  const { data } = await db().from("settings").select("owner_notification_email").eq("id", 1).single();
  return data?.owner_notification_email || env.ownerNotificationEmail || null;
}

export function orderStatusUrl(number: string, locale: "bg" | "en") {
  return `${env.siteUrl}${statusHref(statusToken(number), locale)}`;
}

// Queues an email for an order event. Returns the outbox id, or null if this
// event was already queued (or there is nobody to send it to).
export async function enqueueOrderEmail(kind: EmailKind, orderId: number, extra?: { refundId?: number; refundCents?: number }) {
  const order = await loadEmailOrder(orderId);
  const isOwner = kind === "owner_new_order" || kind === "owner_reminder";
  const to = isOwner ? await ownerAddress() : order.customer_email;
  if (!isOwner && !to) return null; // No email given: material changes go by phone.

  const rendered = isOwner
    ? ownerNewOrder(order, `${env.siteUrl}/admin/porachki/${order.id}`, kind === "owner_reminder")
    : customerEmail(
        kind.replace("customer_", "") as "received" | "accepted" | "rejected" | "cancelled" | "refund",
        order,
        orderStatusUrl(order.number, order.locale),
        { refundCents: extra?.refundCents }
      );

  const key = `${kind}/${order.id}${extra?.refundId ? `/${extra.refundId}` : ""}`;
  const { data, error } = await db()
    .from("email_outbox")
    .upsert(
      {
        order_id: order.id,
        kind,
        to_address: to,
        subject: rendered.subject,
        html: rendered.html,
        text_body: rendered.text,
        idempotency_key: key,
        // Owner email with no address configured: logged as failed right away.
        ...(to ? {} : { status: "failed", last_error: "No owner notification email set (admin → Настройки)." }),
      },
      { onConflict: "idempotency_key", ignoreDuplicates: true }
    )
    .select("id");
  if (error) throw error;
  return data?.[0]?.id ?? null;
}

type SendResult = { ok: true; id: string } | { ok: false; error: string };

async function deliver(row: { to_address: string | null; subject: string; html: string; text_body: string; idempotency_key: string }): Promise<SendResult> {
  if (!row.to_address) return { ok: false, error: "No recipient address." };
  const client = resendClient();
  if (!client) return { ok: false, error: "RESEND_API_KEY is not set." };
  const { data: settings } = await db().from("settings").select("reply_to_email").eq("id", 1).single();
  // The SDK returns { data, error } and doesn't throw on API errors.
  const { data, error } = await client.emails.send(
    {
      from: env.emailFrom,
      to: [row.to_address],
      subject: row.subject,
      html: row.html,
      text: row.text_body,
      ...(settings?.reply_to_email ? { replyTo: settings.reply_to_email } : {}),
    },
    { idempotencyKey: row.idempotency_key }
  );
  if (error) return { ok: false, error: `${error.name}: ${error.message}` };
  return { ok: true, id: data!.id };
}

// Claims and sends one outbox row. Safe to call concurrently: the claim is a
// compare-and-set on status.
export async function sendOutboxRow(id: number, { manual = false } = {}) {
  const client = db();
  const { data: claimed, error } = await client
    .from("email_outbox")
    .update({ status: "sending" })
    .eq("id", id)
    .in("status", manual ? ["pending", "failed", "skipped"] : ["pending", "failed"])
    .select("id, to_address, subject, html, text_body, idempotency_key, attempts")
    .maybeSingle();
  if (error) throw error;
  if (!claimed) return false;

  let result: SendResult;
  try {
    result = await deliver(claimed);
  } catch (e) {
    result = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
  const attempts = claimed.attempts + 1;
  if (result.ok) {
    await client
      .from("email_outbox")
      .update({ status: "sent", attempts, sent_at: new Date().toISOString(), provider_message_id: result.id, last_error: null })
      .eq("id", id);
    return true;
  }
  const backoff = BACKOFF_MINUTES[Math.min(attempts - 1, BACKOFF_MINUTES.length - 1)];
  await client
    .from("email_outbox")
    .update({
      status: "failed",
      attempts,
      last_error: result.error.slice(0, 500),
      next_attempt_at: new Date(Date.now() + backoff * 60_000).toISOString(),
    })
    .eq("id", id);
  // Routine logs carry no personal data: only the row id and the error.
  console.warn(`[email] outbox ${id} failed (attempt ${attempts}): ${result.error}`);
  return false;
}

// Sends what's due. Called right after an event and by /api/cron.
export async function processOutbox(limit = 20) {
  const { data, error } = await db()
    .from("email_outbox")
    .select("id")
    .in("status", ["pending", "failed"])
    .lt("attempts", MAX_AUTO_ATTEMPTS)
    .lte("next_attempt_at", new Date().toISOString())
    .order("id")
    .limit(limit);
  if (error) throw error;
  let sent = 0;
  for (const row of data) if (await sendOutboxRow(row.id)) sent++;
  return { attempted: data.length, sent };
}

// Queue + try to send now (used after the response with next/server `after`).
export async function notify(kind: EmailKind, orderId: number, extra?: { refundId?: number; refundCents?: number }) {
  try {
    const id = await enqueueOrderEmail(kind, orderId, extra);
    if (id) await sendOutboxRow(id);
  } catch (e) {
    console.error(`[email] could not queue ${kind} for order ${orderId}:`, e instanceof Error ? e.message : e);
  }
}
