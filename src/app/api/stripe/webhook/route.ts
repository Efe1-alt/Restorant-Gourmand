import { after } from "next/server";
import type Stripe from "stripe";
import { processStripeEvent } from "@/lib/server/order-ops";
import { constructWebhookEvent } from "@/lib/server/stripe";

// Payment is confirmed only here, from signature-verified events. The success
// page never changes an order.
export async function POST(request: Request) {
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(payload, request.headers.get("stripe-signature"));
  } catch (e) {
    console.warn("[stripe] rejected webhook:", e instanceof Error ? e.message : e);
    return new Response("Invalid signature", { status: 400 });
  }
  try {
    const result = await processStripeEvent(event, after);
    return Response.json({ received: true, result });
  } catch (e) {
    console.error(`[stripe] ${event.type} ${event.id} failed:`, e instanceof Error ? e.message : e);
    // Non-2xx makes Stripe retry later.
    return new Response("Processing failed", { status: 500 });
  }
}
