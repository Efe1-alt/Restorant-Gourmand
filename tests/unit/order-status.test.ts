import { describe, expect, it } from "vitest";
import { canTransition, isBeforePreparation, nextStatuses, paymentStatusAfterRefunds, primaryNext, refundableCents } from "@/lib/order-status";

describe("delivery flow", () => {
  it("New → Accepted → Preparing → Out for delivery → Delivered", () => {
    expect(primaryNext("delivery", "new")).toBe("accepted");
    expect(primaryNext("delivery", "accepted")).toBe("preparing");
    expect(primaryNext("delivery", "preparing")).toBe("out_for_delivery");
    expect(primaryNext("delivery", "out_for_delivery")).toBe("delivered");
    expect(primaryNext("delivery", "delivered")).toBeNull();
  });
  it("allows reject only from New, delivery failed only when out", () => {
    expect(canTransition("delivery", "new", "rejected")).toBe(true);
    expect(canTransition("delivery", "accepted", "rejected")).toBe(false);
    expect(canTransition("delivery", "out_for_delivery", "delivery_failed")).toBe(true);
    expect(canTransition("delivery", "preparing", "delivery_failed")).toBe(false);
  });
  it("never moves an unpaid card order into the queue by hand", () => {
    expect(nextStatuses("delivery", "awaiting_payment")).toEqual([]);
  });
});

describe("pickup flow", () => {
  it("New → Accepted → Preparing → Ready → Picked up, or Not collected", () => {
    expect(primaryNext("pickup", "preparing")).toBe("ready_for_pickup");
    expect(canTransition("pickup", "ready_for_pickup", "picked_up")).toBe(true);
    expect(canTransition("pickup", "ready_for_pickup", "not_collected")).toBe(true);
    expect(canTransition("pickup", "preparing", "out_for_delivery")).toBe(false);
  });
});

describe("cancellation and refunds", () => {
  it("before preparation means New or Accepted", () => {
    expect(isBeforePreparation("new")).toBe(true);
    expect(isBeforePreparation("accepted")).toBe(true);
    expect(isBeforePreparation("preparing")).toBe(false);
  });
  it("refundable = captured − refunded − pending, card only", () => {
    const order = { payment_method: "card", payment_status: "paid" as const, total_cents: 1490, refunded_cents: 0, pending_refund_cents: 0 };
    expect(refundableCents(order)).toBe(1490);
    expect(refundableCents({ ...order, payment_status: "partially_refunded", refunded_cents: 500, pending_refund_cents: 200 })).toBe(790);
    expect(refundableCents({ ...order, payment_status: "authorised" })).toBe(0);
    expect(refundableCents({ ...order, payment_method: "cash" })).toBe(0);
  });
  it("payment status after refunds", () => {
    expect(paymentStatusAfterRefunds(1490, 0)).toBe("paid");
    expect(paymentStatusAfterRefunds(1490, 500)).toBe("partially_refunded");
    expect(paymentStatusAfterRefunds(1490, 1490)).toBe("refunded");
  });
});
