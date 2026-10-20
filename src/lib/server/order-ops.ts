import "server-only";
import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import {
  canTransition,
  isBeforePreparation,
  refundableCents,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/order-status";
import type { Owner } from "./auth";
import { notify } from "./email/outbox";
import { cancelAuthorisation, capturePayment, createRefund, refundStatus, stripe } from "./stripe";
import { db } from "./supabase";

export type OpResult = { ok: true; message?: string } | { ok: false; message: string };

const ok = (message?: string): OpResult => ({ ok: true, message });
const fail = (message: string): OpResult => ({ ok: false, message });

type Later = (task: () => Promise<void>) => void;
const now = () => new Date().toISOString();

async function loadOrder(orderId: number) {
  const { data, error } = await db()
    .from("orders")
    .select("*, payments(*), refunds(id, amount_cents, status)")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const payment = Array.isArray(data.payments) ? data.payments[0] : data.payments;
  const pending = (data.refunds ?? []).filter((r) => r.status === "pending").reduce((s, r) => s + r.amount_cents, 0);
  return { ...data, payment: payment ?? null, pendingRefundCents: pending };
}
export type LoadedOrder = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

async function transition(
  order: { id: number; status: string },
  to: OrderStatus,
  actor: { kind: "owner" | "system" | "stripe"; id?: string | null },
  opts: { releaseStock?: boolean; reason?: string | null; paymentStatus?: PaymentStatus } = {}
) {
  const { data, error } = await db().rpc("transition_order", {
    p_order_id: order.id,
    p_from: order.status,
    p_to: to,
    p_actor: actor.kind,
    p_actor_id: actor.id ?? undefined,
    p_release_stock: opts.releaseStock ?? false,
    p_reason: opts.reason ?? undefined,
    p_payment_status: opts.paymentStatus,
  });
  if (error) throw error;
  return data === true;
}

const CHANGED = "Поръчката току-що е променена от друго място. Обновете страницата.";
const errorText = (e: unknown) => (e instanceof Error ? e.message : String(e));

// ---------------------------------------------------------------------------
// Owner actions

export async function acceptOrder(orderId: number, owner: Owner, later: Later): Promise<OpResult> {
  const order = await loadOrder(orderId);
  if (!order) return fail("Поръчката не е намерена.");
  if (order.status !== "new") return fail(CHANGED);

  let paymentStatus: PaymentStatus | undefined;
  if (order.payment_method === "card") {
    const pi = order.payment?.stripe_payment_intent_id;
    if (order.payment_status !== "authorised" || !pi) return fail("Картата не е потвърдена — поръчката не може да бъде приета.");
    try {
      const captured = await capturePayment(pi, order.id);
      if (captured.status !== "succeeded") return fail(`Плащането не беше изтеглено (статус: ${captured.status}).`);
    } catch (e) {
      return fail(`Плащането не можа да бъде изтеглено: ${errorText(e)}. Поръчката остава „Нова“.`);
    }
    await db().from("payments").update({ status: "paid", captured_at: now() }).eq("order_id", order.id);
    paymentStatus = "paid";
  }
  if (!(await transition(order, "accepted", { kind: "owner", id: owner.id }, { paymentStatus }))) return fail(CHANGED);
  later(() => notify("customer_accepted", order.id));
  return ok(order.payment_method === "card" ? "Приета. Сумата е изтеглена от картата." : "Приета.");
}

export async function rejectOrder(orderId: number, owner: Owner, reason: string, later: Later): Promise<OpResult> {
  const order = await loadOrder(orderId);
  if (!order) return fail("Поръчката не е намерена.");
  if (order.status !== "new") return fail(CHANGED);
  const voided = await voidAuthorisation(order);
  if (!voided.ok) return voided;
  const done = await transition(order, "rejected", { kind: "owner", id: owner.id }, {
    releaseStock: true,
    reason: reason || null,
    paymentStatus: voided.message === "voided" ? "cancelled" : undefined,
  });
  if (!done) return fail(CHANGED);
  later(() => notify("customer_rejected", order.id));
  return ok("Поръчката е отказана. Порциите са върнати.");
}

// Releases a card authorisation that hasn't been captured. message "voided"
// when something was released.
async function voidAuthorisation(order: LoadedOrder): Promise<OpResult> {
  if (order.payment_method !== "card" || order.payment_status !== "authorised") return ok();
  const pi = order.payment?.stripe_payment_intent_id;
  if (!pi) return ok();
  try {
    await cancelAuthorisation(pi, order.id);
  } catch (e) {
    return fail(`Резервацията по картата не можа да бъде освободена: ${errorText(e)}`);
  }
  await db().from("payments").update({ status: "cancelled", cancelled_at: now() }).eq("order_id", order.id);
  return ok("voided");
}

export async function advanceOrder(orderId: number, owner: Owner, to: OrderStatus): Promise<OpResult> {
  if (to === "accepted" || to === "rejected" || to === "cancelled") return fail("Използвайте съответния бутон.");
  const order = await loadOrder(orderId);
  if (!order) return fail("Поръчката не е намерена.");
  if (!canTransition(order.fulfilment as "delivery" | "pickup", order.status as OrderStatus, to)) return fail(CHANGED);
  if (!(await transition(order, to, { kind: "owner", id: owner.id }))) return fail(CHANGED);
  return ok();
}

// Cancellation (requests come in by phone). Before preparation: portions back
// automatically and a card payment refunded in full, delivery included. After
// that, the owner decides about portions; refunds are a separate action.
export async function cancelOrder(
  orderId: number,
  owner: Owner,
  input: { reason: string; restoreStock: boolean },
  later: Later
): Promise<OpResult> {
  const order = await loadOrder(orderId);
  if (!order) return fail("Поръчката не е намерена.");
  const status = order.status as OrderStatus;
  if (!canTransition(order.fulfilment as "delivery" | "pickup", status, "cancelled")) return fail(CHANGED);
  const early = isBeforePreparation(status);

  const voided = await voidAuthorisation(order);
  if (!voided.ok) return voided;
  const done = await transition(order, "cancelled", { kind: "owner", id: owner.id }, {
    releaseStock: early || input.restoreStock,
    reason: input.reason || null,
    paymentStatus: voided.message === "voided" ? "cancelled" : undefined,
  });
  if (!done) return fail(CHANGED);
  later(() => notify("customer_cancelled", order.id));

  if (early && (order.payment_status === "paid" || order.payment_status === "partially_refunded")) {
    const amount = refundableCents({ ...order, payment_status: order.payment_status as PaymentStatus, pending_refund_cents: order.pendingRefundCents });
    if (amount > 0) {
      const refund = await refundOrder(order.id, owner, amount, input.reason || "Анулирана преди приготвяне", later);
      return refund.ok ? ok(`Анулирана. ${refund.message ?? ""}`.trim()) : fail(`Анулирана, но: ${refund.message}`);
    }
  }
  return ok(voided.message === "voided" ? "Анулирана. Резервацията по картата е освободена." : "Анулирана.");
}

export async function markPaid(orderId: number, owner: Owner): Promise<OpResult> {
  const order = await loadOrder(orderId);
  if (!order) return fail("Поръчката не е намерена.");
  if (order.payment_method === "card") return fail("Картовите плащания се потвърждават от Stripe.");
  if (order.payment_status !== "pending") return fail("Поръчката вече е отбелязана като платена.");
  const { data, error } = await db()
    .from("orders")
    .update({ payment_status: "paid" })
    .eq("id", order.id)
    .eq("payment_status", "pending")
    .select("id");
  if (error) throw error;
  if (!data?.length) return fail(CHANGED);
  await db().from("payments").update({ status: "paid", captured_at: now() }).eq("order_id", order.id);
  await db().from("audit_log").insert({
    actor: "owner",
    actor_id: owner.id,
    action: "payment.marked_paid",
    entity: "order",
    entity_id: String(order.id),
    details: { method: order.payment_method, amount_cents: order.total_cents },
  });
  return ok("Отбелязана като платена.");
}

// Full or partial refund to the original card. Counts as done only once
// Stripe confirms it (API response or webhook).
export async function refundOrder(orderId: number, owner: Owner, amountCents: number, reason: string, later: Later): Promise<OpResult> {
  const order = await loadOrder(orderId);
  if (!order) return fail("Поръчката не е намерена.");
  const max = refundableCents({ ...order, payment_status: order.payment_status as PaymentStatus, pending_refund_cents: order.pendingRefundCents });
  if (!Number.isInteger(amountCents) || amountCents < 1) return fail("Невалидна сума.");
  if (amountCents > max) return fail(`Може да се възстановят най-много ${(max / 100).toFixed(2)} €.`);
  if (!reason.trim()) return fail("Посочете причина.");
  const pi = order.payment?.stripe_payment_intent_id;
  if (!pi || !order.payment) return fail("Няма картово плащане за тази поръчка.");

  const { data: row, error } = await db()
    .from("refunds")
    .insert({
      order_id: order.id,
      payment_id: order.payment.id,
      amount_cents: amountCents,
      reason: reason.trim().slice(0, 300),
      idempotency_key: randomUUID(),
      requested_by: owner.id,
    })
    .select("id")
    .single();
  if (error) throw error;

  let refund: Stripe.Refund;
  try {
    refund = await createRefund({ paymentIntentId: pi, amountCents, refundId: row.id, orderId: order.id });
  } catch (e) {
    await db().rpc("apply_refund_result", { p_refund_id: row.id, p_status: "failed", p_failure: errorText(e).slice(0, 300) });
    return fail(`Stripe отказа възстановяването: ${errorText(e)}`);
  }
  await db().from("refunds").update({ stripe_refund_id: refund.id }).eq("id", row.id);
  const status = refundStatus(refund.status);
  await db().rpc("apply_refund_result", {
    p_refund_id: row.id,
    p_status: status,
    p_stripe_status: refund.status ?? undefined,
    p_failure: refund.failure_reason ?? undefined,
  });
  if (status === "succeeded") {
    later(() => notify("customer_refund", order.id, { refundId: row.id, refundCents: amountCents }));
    return ok(`Възстановени ${(amountCents / 100).toFixed(2)} €. Stripe потвърди.`);
  }
  if (status === "pending") return ok("Възстановяването е заявено и чака потвърждение от Stripe.");
  return fail(`Stripe: ${refund.failure_reason ?? refund.status}`);
}

// ---------------------------------------------------------------------------
// Stripe webhook handling (called only after the signature is verified)

async function orderForSession(session: Stripe.Checkout.Session) {
  const id = Number(session.metadata?.order_id);
  if (Number.isInteger(id) && id > 0) return loadOrder(id);
  const { data } = await db().from("payments").select("order_id").eq("stripe_checkout_session_id", session.id).maybeSingle();
  return data ? loadOrder(data.order_id) : null;
}

async function onSessionCompleted(session: Stripe.Checkout.Session, later: Later) {
  const order = await orderForSession(session);
  if (!order) return `no order for session ${session.id}`;
  const piId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!piId) return "no payment intent";
  const pi = await stripe().paymentIntents.retrieve(piId);
  if (pi.status !== "requires_capture" && pi.status !== "succeeded") return `payment intent ${pi.status}`;
  const paymentStatus: PaymentStatus = pi.status === "succeeded" ? "paid" : "authorised";

  await db()
    .from("payments")
    .update({ stripe_payment_intent_id: pi.id, status: paymentStatus, authorised_at: now() })
    .eq("order_id", order.id);

  if (order.status === "awaiting_payment") {
    if (await transition(order, "new", { kind: "stripe" }, { paymentStatus })) {
      later(async () => {
        await notify("owner_new_order", order.id);
        await db().from("orders").update({ owner_notified_at: now() }).eq("id", order.id);
        await notify("customer_received", order.id);
      });
    }
    return "authorised";
  }

  if (order.status === "abandoned") {
    // Late payment: the hold had already been released. Accept it if the
    // portions are still there; otherwise release the card and tell the customer.
    const { data: reserved, error } = await db().rpc("rereserve_order_stock", { p_order_id: order.id });
    if (error) throw error;
    if (reserved) {
      await transition(order, "new", { kind: "stripe" }, { paymentStatus, reason: "late_payment_accepted" });
      later(async () => {
        await notify("owner_new_order", order.id);
        await db().from("orders").update({ owner_notified_at: now() }).eq("id", order.id);
        await notify("customer_received", order.id);
      });
      return "late payment accepted";
    }
    if (pi.status === "requires_capture") {
      await cancelAuthorisation(pi.id, order.id);
      await db().from("payments").update({ status: "cancelled", cancelled_at: now() }).eq("order_id", order.id);
      await transition(order, "cancelled", { kind: "stripe" }, { paymentStatus: "cancelled", reason: "late_payment_out_of_stock" });
    } else {
      // Already captured (shouldn't happen with manual capture): refund in full.
      await db().from("orders").update({ payment_status: "paid" }).eq("id", order.id);
      await transition({ ...order, status: "abandoned" }, "cancelled", { kind: "stripe" }, { reason: "late_payment_out_of_stock" });
      const { data: row } = await db()
        .from("refunds")
        .insert({
          order_id: order.id,
          payment_id: order.payment!.id,
          amount_cents: order.total_cents,
          reason: "Късно плащане, изчерпани порции",
          idempotency_key: randomUUID(),
        })
        .select("id")
        .single();
      const refund = await createRefund({ paymentIntentId: pi.id, amountCents: order.total_cents, refundId: row!.id, orderId: order.id });
      await db().from("refunds").update({ stripe_refund_id: refund.id }).eq("id", row!.id);
      await db().rpc("apply_refund_result", { p_refund_id: row!.id, p_status: refundStatus(refund.status), p_stripe_status: refund.status ?? undefined });
    }
    await db().from("audit_log").insert({
      actor: "stripe",
      action: "payment.late_released",
      entity: "order",
      entity_id: String(order.id),
      details: { reason: "out_of_stock" },
    });
    later(() => notify("customer_cancelled", order.id));
    return "late payment released";
  }
  return `ignored (order is ${order.status})`;
}

async function onSessionExpired(session: Stripe.Checkout.Session) {
  const order = await orderForSession(session);
  if (!order || order.status !== "awaiting_payment") return "nothing to release";
  await transition(order, "abandoned", { kind: "stripe" }, { releaseStock: true, reason: "payment_expired", paymentStatus: "expired" });
  return "released";
}

async function onSessionFailed(session: Stripe.Checkout.Session) {
  const order = await orderForSession(session);
  if (!order || order.status !== "awaiting_payment") return "ignored";
  await transition(order, "abandoned", { kind: "stripe" }, { releaseStock: true, reason: "payment_failed", paymentStatus: "failed" });
  return "released";
}

async function orderIdForIntent(pi: Stripe.PaymentIntent) {
  const id = Number(pi.metadata?.order_id);
  if (Number.isInteger(id) && id > 0) return id;
  const { data } = await db().from("payments").select("order_id").eq("stripe_payment_intent_id", pi.id).maybeSingle();
  return data?.order_id ?? null;
}

async function onIntentFailed(pi: Stripe.PaymentIntent) {
  const id = await orderIdForIntent(pi);
  if (!id) return "unknown";
  // The customer can still retry inside the same Checkout session.
  await db()
    .from("payments")
    .update({ failure_message: pi.last_payment_error?.message?.slice(0, 300) ?? "payment_failed" })
    .eq("order_id", id);
  return "recorded";
}

async function onIntentCanceled(pi: Stripe.PaymentIntent) {
  const id = await orderIdForIntent(pi);
  if (!id) return "unknown";
  const { data } = await db()
    .from("orders")
    .update({ payment_status: "cancelled" })
    .eq("id", id)
    .eq("payment_status", "authorised")
    .select("id");
  if (data?.length) {
    await db().from("payments").update({ status: "cancelled", cancelled_at: now() }).eq("order_id", id);
    await db().from("audit_log").insert({
      actor: "stripe",
      action: "payment.authorisation_cancelled",
      entity: "order",
      entity_id: String(id),
      details: { cancellation_reason: pi.cancellation_reason },
    });
  }
  return "ok";
}

async function onIntentSucceeded(pi: Stripe.PaymentIntent) {
  const id = await orderIdForIntent(pi);
  if (!id) return "unknown";
  await db().from("orders").update({ payment_status: "paid" }).eq("id", id).in("payment_status", ["pending", "authorised"]);
  await db().from("payments").update({ status: "paid", captured_at: now() }).eq("order_id", id).in("status", ["pending", "authorised"]);
  return "ok";
}

async function onRefund(refund: Stripe.Refund, later: Later) {
  let { data: row } = await db()
    .from("refunds")
    .select("id, order_id, amount_cents, status")
    .eq("stripe_refund_id", refund.id)
    .maybeSingle();
  if (!row && refund.metadata?.refund_id) {
    const { data } = await db()
      .from("refunds")
      .select("id, order_id, amount_cents, status")
      .eq("id", Number(refund.metadata.refund_id))
      .maybeSingle();
    if (data) {
      await db().from("refunds").update({ stripe_refund_id: refund.id }).eq("id", data.id);
      row = data;
    }
  }
  if (!row) {
    // Refund made outside the app (Stripe Dashboard): record it.
    const piId = typeof refund.payment_intent === "string" ? refund.payment_intent : refund.payment_intent?.id;
    const { data: payment } = piId
      ? await db().from("payments").select("id, order_id").eq("stripe_payment_intent_id", piId).maybeSingle()
      : { data: null };
    if (!payment) return "unknown payment";
    const { data, error } = await db()
      .from("refunds")
      .insert({
        order_id: payment.order_id,
        payment_id: payment.id,
        amount_cents: refund.amount,
        reason: "Възстановено от Stripe Dashboard",
        stripe_refund_id: refund.id,
        idempotency_key: `stripe/${refund.id}`,
      })
      .select("id, order_id, amount_cents, status")
      .single();
    if (error) throw error;
    row = data;
  }
  const status = refundStatus(refund.status);
  const { data: changed } = await db().rpc("apply_refund_result", {
    p_refund_id: row.id,
    p_status: status,
    p_stripe_status: refund.status ?? undefined,
    p_failure: refund.failure_reason ?? undefined,
  });
  if (changed && status === "succeeded") {
    const r = row;
    later(() => notify("customer_refund", r.order_id, { refundId: r.id, refundCents: r.amount_cents }));
  }
  return status;
}

export async function handleStripeEvent(event: Stripe.Event, later: Later): Promise<string> {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      return onSessionCompleted(event.data.object, later);
    case "checkout.session.expired":
      return onSessionExpired(event.data.object);
    case "checkout.session.async_payment_failed":
      return onSessionFailed(event.data.object);
    case "payment_intent.payment_failed":
      return onIntentFailed(event.data.object);
    case "payment_intent.canceled":
      return onIntentCanceled(event.data.object);
    case "payment_intent.succeeded":
      return onIntentSucceeded(event.data.object);
    case "refund.created":
    case "refund.updated":
    case "refund.failed":
      return onRefund(event.data.object, later);
    default:
      return "ignored";
  }
}

// Idempotent wrapper: each event id is processed once.
export async function processStripeEvent(event: Stripe.Event, later: Later) {
  const client = db();
  const { data: inserted, error } = await client
    .from("stripe_events")
    .upsert({ id: event.id, type: event.type }, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  if (!inserted?.length) {
    const { data: existing } = await client.from("stripe_events").select("processed_at").eq("id", event.id).single();
    if (existing?.processed_at) return "duplicate";
  }
  try {
    const result = await handleStripeEvent(event, later);
    await client.from("stripe_events").update({ processed_at: now(), error: null }).eq("id", event.id);
    return result;
  } catch (e) {
    await client.from("stripe_events").update({ error: errorText(e).slice(0, 500) }).eq("id", event.id);
    throw e;
  }
}

export { loadOrder };
