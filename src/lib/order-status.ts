// Fulfilment state machine. Payment state is separate (see payments).
//
// Delivery: new → accepted → preparing → out_for_delivery → delivered
//           (also rejected, cancelled, delivery_failed)
// Pickup:   new → accepted → preparing → ready_for_pickup → picked_up
//           (also rejected, cancelled, not_collected)
// Card orders start as awaiting_payment and reach `new` only once the card
// is authorised; unpaid sessions end as `abandoned`.

import type { Fulfilment } from "./hours";

export type OrderStatus =
  | "awaiting_payment"
  | "abandoned"
  | "new"
  | "accepted"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "delivery_failed"
  | "ready_for_pickup"
  | "picked_up"
  | "not_collected"
  | "rejected"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "authorised"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled"
  | "partially_refunded"
  | "refunded";

const FORWARD: Record<Fulfilment, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  delivery: {
    new: ["accepted", "rejected", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered", "delivery_failed", "cancelled"],
  },
  pickup: {
    new: ["accepted", "rejected", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["ready_for_pickup", "cancelled"],
    ready_for_pickup: ["picked_up", "not_collected", "cancelled"],
  },
};

export function nextStatuses(fulfilment: Fulfilment, status: OrderStatus): OrderStatus[] {
  return FORWARD[fulfilment][status] ?? [];
}

export function canTransition(fulfilment: Fulfilment, from: OrderStatus, to: OrderStatus) {
  return nextStatuses(fulfilment, from).includes(to);
}

// Statuses shown in the processing queue (awaiting payment and abandoned are hidden).
export const QUEUE_STATUSES: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
];

export const FINAL_STATUSES: OrderStatus[] = [
  "abandoned",
  "delivered",
  "delivery_failed",
  "picked_up",
  "not_collected",
  "rejected",
  "cancelled",
];

// Before preparation, cancelling restores portions automatically and a card
// payment is refunded in full (delivery included). After that the owner decides.
export function isBeforePreparation(status: OrderStatus) {
  return status === "new" || status === "accepted";
}

// The main forward action for the queue's big button.
export function primaryNext(fulfilment: Fulfilment, status: OrderStatus): OrderStatus | null {
  const next = nextStatuses(fulfilment, status).filter((s) => s !== "rejected" && s !== "cancelled");
  return next[0] ?? null;
}

export const STATUS_LABELS_BG: Record<OrderStatus, string> = {
  awaiting_payment: "Очаква плащане",
  abandoned: "Неплатена (изтекла)",
  new: "Нова",
  accepted: "Приета",
  preparing: "Приготвя се",
  out_for_delivery: "Изпратена",
  delivered: "Доставена",
  delivery_failed: "Неуспешна доставка",
  ready_for_pickup: "Готова за вземане",
  picked_up: "Взета",
  not_collected: "Невзета",
  rejected: "Отказана",
  cancelled: "Анулирана",
};

// Labels for the button that moves an order into that status.
export const ACTION_LABELS_BG: Partial<Record<OrderStatus, string>> = {
  accepted: "Приеми",
  preparing: "Започни приготвяне",
  out_for_delivery: "Изпратена с куриер",
  delivered: "Доставена",
  delivery_failed: "Неуспешна доставка",
  ready_for_pickup: "Готова за вземане",
  picked_up: "Взета от клиента",
  not_collected: "Не е взета",
  rejected: "Откажи",
  cancelled: "Анулирай",
};

export const PAYMENT_LABELS_BG: Record<PaymentStatus, string> = {
  pending: "Очаква плащане",
  authorised: "Резервирана (неизтеглена)",
  paid: "Платена",
  failed: "Неуспешна",
  expired: "Изтекла",
  cancelled: "Освободена резервация",
  partially_refunded: "Частично възстановена",
  refunded: "Възстановена",
};

export const METHOD_LABELS_BG = {
  card: "Карта онлайн",
  cash: "В брой при доставка",
  pay_at_pickup: "При вземане",
} as const;

// How much can still be refunded: captured amount minus succeeded and pending refunds.
export function refundableCents(order: {
  payment_method: string;
  payment_status: PaymentStatus;
  total_cents: number;
  refunded_cents: number;
  pending_refund_cents: number;
}) {
  if (order.payment_method !== "card") return 0;
  if (order.payment_status !== "paid" && order.payment_status !== "partially_refunded") return 0;
  return Math.max(0, order.total_cents - order.refunded_cents - order.pending_refund_cents);
}

export function paymentStatusAfterRefunds(totalCents: number, refundedCents: number): PaymentStatus {
  if (refundedCents <= 0) return "paid";
  return refundedCents >= totalCents ? "refunded" : "partially_refunded";
}
