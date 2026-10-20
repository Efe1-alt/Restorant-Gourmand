import "server-only";
import { checkoutState } from "@/lib/hours";
import { getDictionary } from "@/lib/i18n";
import { computeQuote } from "@/lib/pricing";
import { statusHref, type Locale } from "@/lib/routes";
import { sofiaNow } from "@/lib/time";
import {
  MAX_LINES,
  MAX_QTY,
  normalizePhone,
  validateCheckout,
  type CheckoutForm,
  type FormErrors,
  type PaymentMethod,
} from "@/lib/validation";
import { loadMenu, loadSettings } from "./catalog";
import { notify } from "./email/outbox";
import { env } from "./env";
import { clientIp, hitRateLimit, statusToken, verifyTurnstile } from "./security";
import { CHECKOUT_SESSION_SECONDS, createCheckoutSession, stripeConfigured } from "./stripe";
import { db, rpcError } from "./supabase";

export type PlaceOrderResult =
  | { ok: true; number: string; statusUrl: string; checkoutUrl: string | null; orderId: number }
  | { ok: false; status: number; message: string; errors?: FormErrors; code?: string };

const str = (v: unknown, max = 1000) => (typeof v === "string" ? v.slice(0, max) : "");

export async function placeOrder(
  body: unknown,
  ctx: { headers: Headers; now: Date; after: (task: () => Promise<void>) => void }
): Promise<PlaceOrderResult> {
  const input = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const locale: Locale = input.locale === "en" ? "en" : "bg";
  const t = getDictionary(locale).errors;
  const fail = (status: number, message: string, extra: Partial<PlaceOrderResult & { ok: false }> = {}) =>
    ({ ok: false, status, message, ...extra }) as PlaceOrderResult;

  // Hidden spam-trap field: humans never see it, simple bots fill it in.
  if (str(input.website).trim() !== "") return fail(422, t.spam, { code: "spam" });

  const ip = clientIp(ctx.headers);
  if (!(await hitRateLimit("ip", ip))) return fail(429, t.rateLimited, { code: "rate_limited" });

  const now = sofiaNow(ctx.now);
  const [{ settings, ordering, districts }, menu] = await Promise.all([loadSettings(now.date), loadMenu(now.date)]);

  if (!checkoutState(ordering, now).open) return fail(409, t.closed, { code: "closed" });

  if (settings.turnstile_enabled) {
    const ok = await verifyTurnstile(str(input.turnstileToken, 4000), ip);
    if (!ok) return fail(400, t.captcha, { code: "captcha" });
  }

  const form: CheckoutForm = {
    fulfilment: str(input.fulfilment) as CheckoutForm["fulfilment"],
    name: str(input.name, 200).trim(),
    phone: str(input.phone, 40).trim(),
    email: str(input.email, 300).trim(),
    districtId: str(input.districtId, 20),
    address: str(input.address, 400).trim(),
    time: str(input.time, 10),
    payment: str(input.payment, 20) as PaymentMethod,
    notes: str(input.notes, 600).trim(),
  };
  const cardEnabled = settings.card_payments_enabled && stripeConfigured();
  const activeDistricts = districts.filter((d) => d.is_active);
  const errors = validateCheckout(form, {
    locale,
    now,
    config: ordering,
    activeDistrictIds: activeDistricts.map((d) => String(d.id)),
    cardEnabled,
  });
  if (Object.keys(errors).length > 0) return fail(400, t.check, { errors });

  const phone = normalizePhone(form.phone);
  if (!(await hitRateLimit("phone", phone))) return fail(429, t.rateLimited, { code: "rate_limited" });

  // Cart: merge duplicates, cap quantities, look up today's price and stock kind.
  if (!Array.isArray(input.items) || input.items.length === 0) return fail(400, t.cartEmpty);
  if (input.items.length > MAX_LINES) return fail(400, t.cartInvalid);
  const quantities = new Map<number, number>();
  for (const raw of input.items as unknown[]) {
    const r = (raw ?? {}) as { dishId?: unknown; quantity?: unknown };
    const id = Number(r.dishId);
    const qty = r.quantity;
    if (!Number.isInteger(id) || id <= 0 || typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) {
      return fail(400, t.cartInvalid);
    }
    quantities.set(id, Math.min((quantities.get(id) ?? 0) + qty, MAX_QTY));
  }

  const dishes = new Map(menu.dishes.map((d) => [d.id, d]));
  const today = menu.days.find((d) => d.menu_date === now.date);
  const dailyIds = new Set((today?.menu_day_dishes ?? []).map((d) => d.dish_id));
  const items = [];
  for (const [dishId, quantity] of quantities) {
    const dish = dishes.get(dishId);
    const kind = dish && !dish.is_standing && dailyIds.has(dishId) ? "daily" : dish?.is_standing ? "standing" : null;
    if (!dish || !kind) {
      return fail(409, t.notAvailable(dish?.name_bg ?? `#${dishId}`), { code: "not_available" });
    }
    items.push({
      dish_id: dishId,
      stock_kind: kind,
      quantity,
      unit_price_cents: dish.price_cents,
      name_bg: dish.name_bg,
      name_en: dish.en_status === "approved" ? dish.name_en : null,
      weight: dish.weight,
    });
  }

  const district = form.fulfilment === "delivery" ? activeDistricts.find((d) => String(d.id) === form.districtId)! : null;
  const quote = computeQuote({
    lines: items.map((i) => ({ unitPriceCents: i.unit_price_cents, quantity: i.quantity })),
    fulfilment: form.fulfilment,
    districtFeeCents: district?.fee_cents ?? null,
    settings: {
      minSubtotalCents: settings.min_subtotal_cents,
      freeDeliveryFromCents: settings.free_delivery_from_cents,
      pickupDiscountBps: settings.pickup_discount_bps,
    },
  });
  if (quote.missingForMinimumCents > 0) return fail(400, t.belowMinimum, { code: "below_minimum" });

  const isCard = form.payment === "card";
  const { data: placed, error } = await db().rpc("place_order", {
    p_order: {
      menu_date: now.date,
      locale,
      fulfilment: form.fulfilment,
      payment_method: form.payment,
      customer_name: form.name,
      customer_phone: phone,
      customer_email: form.email || null,
      address: district ? form.address : null,
      district_id: district?.id ?? null,
      district_name: district?.name_bg ?? null,
      notes: form.notes || null,
      requested_time: form.time,
      subtotal_cents: quote.subtotalCents,
      discount_cents: quote.discountCents,
      delivery_fee_cents: quote.deliveryFeeCents,
      total_cents: quote.totalCents,
      hold_minutes: Math.ceil(CHECKOUT_SESSION_SECONDS / 60),
    },
    p_items: items,
  });
  if (error) {
    const e = rpcError(error);
    const dishName = (id: unknown) => dishes.get(Number(id))?.name_bg ?? "";
    if (e?.code === "out_of_stock") {
      return fail(409, t.outOfStock(dishName(e.detail.dish_id), Number(e.detail.available ?? 0)), {
        code: "out_of_stock",
      });
    }
    if (e?.code === "not_available") return fail(409, t.notAvailable(dishName(e.detail.dish_id)), { code: "not_available" });
    if (e?.code === "price_changed") return fail(409, t.priceChanged, { code: "price_changed" });
    throw error;
  }
  const { order_id: orderId, order_number: number } = placed![0];
  const statusPath = statusHref(statusToken(number), locale);
  const statusUrl = `${env.siteUrl}${statusPath}`;

  if (!isCard) {
    // Cash and pay-at-pickup orders are "New" straight away.
    ctx.after(async () => {
      await notify("owner_new_order", orderId);
      await db().from("orders").update({ owner_notified_at: new Date().toISOString() }).eq("id", orderId);
      await notify("customer_received", orderId);
    });
    return { ok: true, number, statusUrl: statusPath, checkoutUrl: null, orderId };
  }

  // Card: create the Checkout session (manual capture). The owner hears about
  // the order only once the card is authorised (webhook).
  try {
    const session = await createCheckoutSession({
      id: orderId,
      number,
      totalCents: quote.totalCents,
      locale,
      email: form.email || null,
      itemsSummary: items.map((i) => `${i.quantity} × ${locale === "en" ? (i.name_en ?? i.name_bg) : i.name_bg}`).join(", "),
      statusUrl,
      expiresAt: new Date(Date.now() + CHECKOUT_SESSION_SECONDS * 1000),
    });
    await Promise.all([
      db()
        .from("payments")
        .update({ stripe_checkout_session_id: session.id, checkout_url: session.url })
        .eq("order_id", orderId),
      db()
        .from("orders")
        .update({ hold_expires_at: new Date(session.expires_at * 1000).toISOString() })
        .eq("id", orderId),
    ]);
    return { ok: true, number, statusUrl: statusPath, checkoutUrl: session.url, orderId };
  } catch (e) {
    // Couldn't start payment: give the portions back straight away.
    console.error(`[order] checkout session failed for order ${orderId}:`, e instanceof Error ? e.message : e);
    await db().rpc("transition_order", {
      p_order_id: orderId,
      p_from: "awaiting_payment",
      p_to: "abandoned",
      p_actor: "system",
      p_release_stock: true,
      p_reason: "checkout_session_failed",
      p_payment_status: "failed",
    });
    return fail(502, t.payment_unavailable, { code: "payment_unavailable" });
  }
}
