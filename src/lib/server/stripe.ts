import "server-only";
import Stripe from "stripe";
import { env } from "./env";

// Stripe Checkout (hosted) with manual capture: the card is authorised at
// checkout and captured when the owner taps "Accept". Test mode locally.

let client: Stripe | null = null;

export function stripeConfigured() {
  return Boolean(env.stripeSecretKey);
}

export function stripe(): Stripe {
  if (!env.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not set.");
  client ??= new Stripe(env.stripeSecretKey, {
    appInfo: { name: "gourmand-orders", version: "1.0.0" },
    maxNetworkRetries: 2,
  });
  return client;
}

// Tags our sessions in the Dashboard (label + 8 random letters, fixed).
const INTEGRATION_IDENTIFIER = "gourmand-orders-qhzmtwpe";

// Stripe's minimum session lifetime is 30 minutes; 30 seconds of margin keep
// the request valid. The order's hold is then set to the session's own
// expires_at, so portions are held for exactly as long as the session.
export const CHECKOUT_SESSION_SECONDS = 30 * 60 + 30;

export async function createCheckoutSession(order: {
  id: number;
  number: string;
  totalCents: number;
  locale: "bg" | "en";
  email: string | null;
  itemsSummary: string;
  statusUrl: string;
  expiresAt: Date;
}) {
  const label = order.locale === "bg" ? `Поръчка ${order.number} — Gourmand` : `Order ${order.number} — Gourmand`;
  return stripe().checkout.sessions.create(
    {
      mode: "payment",
      currency: "eur",
      locale: order.locale,
      // One line with the exact server-computed total (delivery and any
      // pickup discount included); the items are listed in the description.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: order.totalCents,
            product_data: { name: label, description: order.itemsSummary.slice(0, 500) || undefined },
          },
        },
      ],
      payment_intent_data: {
        capture_method: "manual",
        description: label,
        metadata: { order_id: String(order.id), order_number: order.number },
      },
      metadata: { order_id: String(order.id), order_number: order.number },
      client_reference_id: order.number,
      customer_email: order.email ?? undefined,
      expires_at: Math.floor(order.expiresAt.getTime() / 1000),
      success_url: `${order.statusUrl}?paid=1`,
      cancel_url: `${order.statusUrl}?cancelled=1`,
      integration_identifier: INTEGRATION_IDENTIFIER,
    },
    { idempotencyKey: `checkout-session/${order.id}` }
  );
}

export async function capturePayment(paymentIntentId: string, orderId: number) {
  return stripe().paymentIntents.capture(paymentIntentId, {}, { idempotencyKey: `capture/${orderId}` });
}

export async function cancelAuthorisation(paymentIntentId: string, orderId: number) {
  return stripe().paymentIntents.cancel(paymentIntentId, {}, { idempotencyKey: `cancel/${orderId}` });
}

export async function expireCheckoutSession(sessionId: string) {
  return stripe().checkout.sessions.expire(sessionId);
}

export async function createRefund(input: { paymentIntentId: string; amountCents: number; refundId: number; orderId: number }) {
  return stripe().refunds.create(
    {
      payment_intent: input.paymentIntentId,
      amount: input.amountCents,
      reason: "requested_by_customer",
      metadata: { order_id: String(input.orderId), refund_id: String(input.refundId) },
    },
    { idempotencyKey: `refund/${input.refundId}` }
  );
}

export function constructWebhookEvent(payload: string, signature: string | null) {
  if (!env.stripeWebhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set.");
  if (!signature) throw new Error("Missing Stripe-Signature header.");
  // Verification needs no API key, only the signing secret.
  return Stripe.webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
}

// Stripe refund statuses → ours.
export function refundStatus(status: string | null | undefined): "pending" | "succeeded" | "failed" | "canceled" {
  if (status === "succeeded") return "succeeded";
  if (status === "failed") return "failed";
  if (status === "canceled") return "canceled";
  return "pending";
}
