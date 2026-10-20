import { afterAll, describe, expect, it } from "vitest";
import { admin, anon, cleanup, item, makeDish, place, testDate } from "./helpers";

const date = testDate(1);
const dishes: number[] = [];
afterAll(async () => {
  await cleanup([date], dishes);
  await admin.from("rate_limit_hits").delete().like("bucket", "test:%");
});

describe("Data API lockdown (RLS + no grants)", () => {
  it.each(["orders", "order_items", "dishes", "settings", "districts", "payments", "refunds", "email_outbox", "audit_log"] as const)(
    "anon cannot read %s",
    async (table) => {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(error !== null || (data ?? []).length === 0).toBe(true);
    }
  );
  it("anon cannot write or call the order functions", async () => {
    const ins = await anon.from("orders").insert({} as never);
    expect(ins.error).not.toBeNull();
    const rpc = await anon.rpc("place_order", { p_order: {}, p_items: [] });
    expect(rpc.error).not.toBeNull();
    const rl = await anon.rpc("expire_stale_holds", {});
    expect(rl.error).not.toBeNull();
  });
});

describe("rate limiting", () => {
  it("allows up to the limit in the window, then refuses", async () => {
    const bucket = `test:${Date.now()}`;
    const results = [];
    for (let i = 0; i < 4; i++) results.push((await admin.rpc("hit_rate_limit", { p_bucket: bucket, p_window_seconds: 600, p_max: 3 })).data);
    expect(results).toEqual([true, true, true, false]);
  });
});

describe("12-month anonymisation", () => {
  it("removes name, phone, address, email and notes; keeps items and amounts", async () => {
    const dish = await makeDish({ standing: true, price: 700 });
    dishes.push(dish.id);
    const old = (await place(date, [item(dish, 1, "standing")], { customer_email: "old@example.test", notes: "звънец 3" })).data![0].order_id;
    const recent = (await place(date, [item(dish, 1, "standing")])).data![0].order_id;
    await admin.from("orders").update({ created_at: new Date(Date.now() - 400 * 86_400_000).toISOString() }).eq("id", old);
    const { data: n } = await admin.rpc("anonymise_old_orders", {});
    expect(n).toBeGreaterThanOrEqual(1);
    const { data: o } = await admin.from("orders").select("customer_name, customer_phone, customer_email, address, notes, total_cents, anonymised_at").eq("id", old).single();
    expect(o).toMatchObject({ customer_phone: null, customer_email: null, address: null, notes: null, total_cents: 700 });
    expect(o!.customer_name).not.toBe("Тест");
    expect(o!.anonymised_at).not.toBeNull();
    const { data: items } = await admin.from("order_items").select("unit_price_cents").eq("order_id", old);
    expect(items).toHaveLength(1);
    const { data: r } = await admin.from("orders").select("customer_phone").eq("id", recent).single();
    expect(r!.customer_phone).toBe("+359888000111");
  });
});

describe("refund bookkeeping", () => {
  it("a refund counts once, only when Stripe says it succeeded", async () => {
    const dish = await makeDish({ standing: true, price: 1000 });
    dishes.push(dish.id);
    const id = (await place(date, [item(dish, 1, "standing")], { payment_method: "card" })).data![0].order_id;
    await admin.from("orders").update({ status: "accepted", payment_status: "paid" }).eq("id", id);
    const { data: pay } = await admin.from("payments").select("id").eq("order_id", id).single();
    const mk = async (amount: number) =>
      (await admin.from("refunds").insert({ order_id: id, payment_id: pay!.id, amount_cents: amount, reason: "t", idempotency_key: crypto.randomUUID() }).select("id").single()).data!.id;
    const r1 = await mk(300);
    await admin.rpc("apply_refund_result", { p_refund_id: r1, p_status: "pending" });
    let o = (await admin.from("orders").select("refunded_cents, payment_status").eq("id", id).single()).data!;
    expect(o).toEqual({ refunded_cents: 0, payment_status: "paid" });
    await admin.rpc("apply_refund_result", { p_refund_id: r1, p_status: "succeeded" });
    await admin.rpc("apply_refund_result", { p_refund_id: r1, p_status: "succeeded" });
    o = (await admin.from("orders").select("refunded_cents, payment_status").eq("id", id).single()).data!;
    expect(o).toEqual({ refunded_cents: 300, payment_status: "partially_refunded" });
    const r2 = await mk(700);
    await admin.rpc("apply_refund_result", { p_refund_id: r2, p_status: "succeeded" });
    o = (await admin.from("orders").select("refunded_cents, payment_status").eq("id", id).single()).data!;
    expect(o).toEqual({ refunded_cents: 1000, payment_status: "refunded" });
  });
});
