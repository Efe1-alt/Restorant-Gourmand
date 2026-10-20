import "server-only";
import { verifyStatusToken } from "./security";
import { db } from "./supabase";

export type OrderStatusView = {
  number: string;
  locale: "bg" | "en";
  createdAt: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  fulfilment: "delivery" | "pickup";
  requestedTime: string;
  firstName: string;
  address: string | null;
  district: string | null;
  items: { name: string; nameEn: string | null; weight: string; quantity: number; lineTotalCents: number }[];
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  refundedCents: number;
  // Only while the card payment can still be completed.
  checkoutUrl: string | null;
  holdExpiresAt: string | null;
};

// What the customer's private page shows. Reached only with a valid signed
// token; shows the customer's own order, nothing else.
export async function getOrderStatus(token: string): Promise<OrderStatusView | null> {
  const number = verifyStatusToken(token);
  if (!number) return null;
  const { data } = await db()
    .from("orders")
    .select(
      "number, locale, created_at, status, payment_status, payment_method, fulfilment, requested_time, customer_name, address, district_name, subtotal_cents, discount_cents, delivery_fee_cents, total_cents, refunded_cents, hold_expires_at, anonymised_at, order_items(name_bg, name_en, weight, quantity, line_total_cents, id), payments(checkout_url)"
    )
    .eq("number", number)
    .maybeSingle();
  if (!data || data.anonymised_at) return null;
  const payment = Array.isArray(data.payments) ? data.payments[0] : data.payments;
  const payable =
    data.status === "awaiting_payment" && data.hold_expires_at !== null && new Date(data.hold_expires_at) > new Date();
  return {
    number: data.number,
    locale: data.locale as "bg" | "en",
    createdAt: data.created_at,
    status: data.status,
    paymentStatus: data.payment_status,
    paymentMethod: data.payment_method,
    fulfilment: data.fulfilment as "delivery" | "pickup",
    requestedTime: data.requested_time,
    firstName: data.customer_name.split(/\s+/)[0] ?? "",
    address: data.address,
    district: data.district_name,
    items: [...data.order_items]
      .sort((a, b) => a.id - b.id)
      .map((i) => ({ name: i.name_bg, nameEn: i.name_en, weight: i.weight, quantity: i.quantity, lineTotalCents: i.line_total_cents })),
    subtotalCents: data.subtotal_cents,
    discountCents: data.discount_cents,
    deliveryFeeCents: data.delivery_fee_cents,
    totalCents: data.total_cents,
    refundedCents: data.refunded_cents,
    checkoutUrl: payable ? (payment?.checkout_url ?? null) : null,
    holdExpiresAt: data.hold_expires_at,
  };
}
