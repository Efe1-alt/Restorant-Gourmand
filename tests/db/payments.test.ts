import Stripe from "stripe";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { admin, cleanup, item, makeDish, place, publishDay, testDate } from "./helpers";

// Stripe's API is mocked; webhook signatures use the real library.
const api = vi.hoisted(() => ({
  retrieve: vi.fn(),
  capture: vi.fn(),
  cancel: vi.fn(),
  refund: vi.fn(),
}));
vi.mock("@/lib/server/stripe", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/server/stripe")>();
  return {
    ...real,
    stripe: () => ({ paymentIntents: { retrieve: api.retrieve } }),
    capturePayment: api.capture,
    cancelAuthorisation: api.cancel,
    createRefund: api.refund,
  };
});

const { processStripeEvent, acceptOrder, rejectOrder, cancelOrder, refundOrder, markPaid } = await import("@/lib/server/order-ops");
const { constructWebhookEvent } = await import("@/lib/server/stripe");

const date = testDate(2);
const dishes: number[] = [];
const owner = { id: "00000000-0000-0000-0000-000000000001", email: "owner@test" };
const tasks: Promise<void>[] = [];
const later = (t: () => Promise<void>) => void tasks.push(t());
const flush = async () => {
  await Promise.all(tasks.splice(0));
};

afterAll(async () => {
  await flush();
  await cleanup([date], dishes);
  await admin.from("stripe_events").delete().like("id", "evt_test_%");
});
beforeEach(() => {
  Object.values(api).forEach((f) => f.mockReset());
});

let seq = 0;
const event = (type: string, object: unknown) =>
  ({ id: `evt_test_${Date.now()}_${seq++}`, type, data: { object }, object: "event" }) as unknown as Stripe.Event;

async function cardOrder(portions = 5, qty = 1) {
  const dish = await makeDish({ price: 800 });
  dishes.push(dish.id);
  await publishDay(date, [{ id: dish.id, portions }]);
  const { data, error } = await place(date, [item(dish, qty)], { payment_method: "card", fulfilment: "pickup" });
  if (error) throw error;
  const id = data![0].order_id;
  await admin.from("payments").update({ stripe_checkout_session_id: `cs_test_${id}` }).eq("order_id", id);
  return { id, dish };
}
const session = (orderId: number, pi = `pi_test_${orderId}`) => ({ id: `cs_test_${orderId}`, object: "checkout.session", metadata: { order_id: String(orderId) }, payment_intent: pi, payment_status: "unpaid" });
const order = async (id: number) => (await admin.from("orders").select("status, payment_status, stock_held, refunded_cents").eq("id", id).single()).data!;

describe("webhook signature", () => {
  it("accepts a correctly signed payload and rejects anything else", () => {
    const payload = JSON.stringify({ id: "evt_sig", object: "event", type: "ping", data: { object: {} } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test_secret" });
    expect(constructWebhookEvent(payload, header).id).toBe("evt_sig");
    expect(() => constructWebhookEvent(payload, header.replace(/v1=./, "v1=0"))).toThrow();
    expect(() => constructWebhookEvent(payload.replace("ping", "pong"), header)).toThrow();
    expect(() => constructWebhookEvent(payload, null)).toThrow();
  });
});

describe("card payment lifecycle", () => {
  it("authorisation (verified webhook) moves the order to New and notifies the owner", async () => {
    const { id } = await cardOrder();
    api.retrieve.mockResolvedValue({ id: `pi_test_${id}`, status: "requires_capture" });
    const e = event("checkout.session.completed", session(id));
    expect(await processStripeEvent(e, later)).toBe("authorised");
    await flush();
    expect(await order(id)).toMatchObject({ status: "new", payment_status: "authorised" });
    const { data: mails } = await admin.from("email_outbox").select("kind, status").eq("order_id", id);
    expect(mails!.map((m) => m.kind)).toContain("owner_new_order");
    // Same event again: processed once.
    expect(await processStripeEvent(e, later)).toBe("duplicate");
  });

  it("Accept captures the card; capture failure keeps the order New", async () => {
    const { id } = await cardOrder();
    api.retrieve.mockResolvedValue({ id: `pi_test_${id}`, status: "requires_capture" });
    await processStripeEvent(event("checkout.session.completed", session(id)), later);
    api.capture.mockRejectedValueOnce(new Error("authorization expired"));
    expect((await acceptOrder(id, owner, later)).ok).toBe(false);
    expect((await order(id)).status).toBe("new");
    api.capture.mockResolvedValueOnce({ status: "succeeded" });
    expect((await acceptOrder(id, owner, later)).ok).toBe(true);
    expect(api.capture).toHaveBeenLastCalledWith(`pi_test_${id}`, id);
    expect(await order(id)).toMatchObject({ status: "accepted", payment_status: "paid" });
  });

  it("Reject cancels the authorisation and gives portions back", async () => {
    const { id } = await cardOrder();
    api.retrieve.mockResolvedValue({ id: `pi_test_${id}`, status: "requires_capture" });
    await processStripeEvent(event("checkout.session.completed", session(id)), later);
    api.cancel.mockResolvedValue({ status: "canceled" });
    expect((await rejectOrder(id, owner, "Няма продукти", later)).ok).toBe(true);
    expect(api.cancel).toHaveBeenCalledWith(`pi_test_${id}`, id);
    expect(await order(id)).toMatchObject({ status: "rejected", payment_status: "cancelled", stock_held: false });
  });

  it("an expired session releases the hold", async () => {
    const { id } = await cardOrder();
    expect(await processStripeEvent(event("checkout.session.expired", session(id)), later)).toBe("released");
    expect(await order(id)).toMatchObject({ status: "abandoned", payment_status: "expired", stock_held: false });
  });

  it("late payment is accepted when portions are still there", async () => {
    const { id } = await cardOrder(3, 2);
    await processStripeEvent(event("checkout.session.expired", session(id)), later);
    api.retrieve.mockResolvedValue({ id: `pi_test_${id}`, status: "requires_capture" });
    expect(await processStripeEvent(event("checkout.session.completed", session(id)), later)).toBe("late payment accepted");
    expect(await order(id)).toMatchObject({ status: "new", payment_status: "authorised", stock_held: true });
  });

  it("late payment without portions is released automatically, never lost", async () => {
    const { id, dish } = await cardOrder(2, 2);
    await processStripeEvent(event("checkout.session.expired", session(id)), later);
    expect((await place(date, [item(dish, 2)])).error).toBeNull(); // someone else took them
    api.retrieve.mockResolvedValue({ id: `pi_test_${id}`, status: "requires_capture" });
    api.cancel.mockResolvedValue({ status: "canceled" });
    expect(await processStripeEvent(event("checkout.session.completed", session(id)), later)).toBe("late payment released");
    expect(api.cancel).toHaveBeenCalled();
    expect(await order(id)).toMatchObject({ status: "cancelled", payment_status: "cancelled" });
    await flush();
    const { data: audit } = await admin.from("audit_log").select("action").eq("entity_id", String(id));
    expect(audit!.map((a) => a.action)).toContain("payment.late_released");
  });
});

describe("cancellations and refunds", () => {
  async function paidOrder() {
    const { id } = await cardOrder();
    api.retrieve.mockResolvedValue({ id: `pi_test_${id}`, status: "requires_capture" });
    await processStripeEvent(event("checkout.session.completed", session(id)), later);
    api.capture.mockResolvedValue({ status: "succeeded" });
    await acceptOrder(id, owner, later);
    return id;
  }

  it("cancelling before preparation refunds in full and restores portions", async () => {
    const id = await paidOrder();
    api.refund.mockResolvedValue({ id: `re_test_${id}`, status: "succeeded" });
    const r = await cancelOrder(id, owner, { reason: "клиентът се обади", restoreStock: false }, later);
    expect(r.ok).toBe(true);
    expect(api.refund).toHaveBeenCalledWith(expect.objectContaining({ paymentIntentId: `pi_test_${id}`, amountCents: 800 }));
    expect(await order(id)).toMatchObject({ status: "cancelled", payment_status: "refunded", refunded_cents: 800, stock_held: false });
  });

  it("after preparation the owner decides: portions stay unless restored", async () => {
    const id = await paidOrder();
    await admin.rpc("transition_order", { p_order_id: id, p_from: "accepted", p_to: "preparing", p_actor: "owner" });
    expect((await cancelOrder(id, owner, { reason: "x", restoreStock: false }, later)).ok).toBe(true);
    expect(await order(id)).toMatchObject({ status: "cancelled", payment_status: "paid", stock_held: true });
  });

  it("partial refund counts only after Stripe confirms it (webhook)", async () => {
    const id = await paidOrder();
    api.refund.mockResolvedValue({ id: `re_part_${id}`, status: "pending" });
    expect((await refundOrder(id, owner, 300, "студено", later)).ok).toBe(true);
    expect((await order(id)).refunded_cents).toBe(0);
    expect((await refundOrder(id, owner, 600, "x", later)).ok).toBe(false); // 300 pending, 500 left
    await processStripeEvent(event("refund.updated", { id: `re_part_${id}`, object: "refund", status: "succeeded", amount: 300, metadata: {} }), later);
    expect(await order(id)).toMatchObject({ refunded_cents: 300, payment_status: "partially_refunded" });
  });

  it("cash orders are marked paid by the owner and can't be refunded online", async () => {
    const dish = await makeDish({ standing: true });
    dishes.push(dish.id);
    const id = (await place(date, [item(dish, 1, "standing")])).data![0].order_id;
    expect((await refundOrder(id, owner, 100, "x", later)).ok).toBe(false);
    expect((await markPaid(id, owner)).ok).toBe(true);
    expect((await order(id)).payment_status).toBe("paid");
    expect((await markPaid(id, owner)).ok).toBe(false);
  });
});
