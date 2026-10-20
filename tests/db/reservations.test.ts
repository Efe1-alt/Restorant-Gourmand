import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, item, makeDish, place, publishDay, testDate } from "./helpers";

const date = testDate(0);
const dishes: number[] = [];
afterAll(() => cleanup([date], dishes));

const reserved = async (dishId: number) =>
  (await admin.from("menu_day_dishes").select("reserved").eq("menu_date", date).eq("dish_id", dishId).single()).data!.reserved;

describe("atomic portion reservation", () => {
  it("never oversells: 10 parallel orders for 5 portions → exactly 5 succeed", async () => {
    const dish = await makeDish();
    dishes.push(dish.id);
    await publishDay(date, [{ id: dish.id, portions: 5 }]);
    const results = await Promise.all(Array.from({ length: 10 }, () => place(date, [item(dish, 1)])));
    const ok = results.filter((r) => !r.error);
    const soldOut = results.filter((r) => r.error?.message === "out_of_stock");
    expect(ok).toHaveLength(5);
    expect(soldOut).toHaveLength(5);
    expect(await reserved(dish.id)).toBe(5);
  });

  it("standing dishes respect the optional daily cap", async () => {
    const dish = await makeDish({ standing: true, cap: 3 });
    dishes.push(dish.id);
    const results = await Promise.all([1, 2, 3].map(() => place(date, [item(dish, 2, "standing")])));
    expect(results.filter((r) => !r.error)).toHaveLength(1);
    const { data } = await admin.from("standing_stock").select("reserved").eq("menu_date", date).eq("dish_id", dish.id).single();
    expect(data!.reserved).toBe(2);
  });

  it("standing dishes without a cap are unlimited until marked sold out", async () => {
    const dish = await makeDish({ standing: true });
    dishes.push(dish.id);
    expect((await place(date, [item(dish, 20, "standing")])).error).toBeNull();
    await admin.from("standing_stock").update({ sold_out: true }).eq("menu_date", date).eq("dish_id", dish.id);
    expect((await place(date, [item(dish, 1, "standing")])).error?.message).toBe("out_of_stock");
  });

  it("re-checks availability, publication and price on the server", async () => {
    const dish = await makeDish({ price: 490 });
    dishes.push(dish.id);
    await publishDay(date, [{ id: dish.id, portions: 10 }]);
    expect((await place(date, [{ ...item(dish, 1), unit_price_cents: 100 }])).error?.message).toBe("price_changed");
    await admin.from("menu_day_dishes").update({ sold_out: true }).eq("menu_date", date).eq("dish_id", dish.id);
    expect((await place(date, [item(dish, 1)])).error?.message).toBe("out_of_stock");
    await admin.from("menu_days").update({ status: "draft", published_at: null }).eq("menu_date", date);
    expect((await place(date, [item(dish, 1)])).error?.message).toBe("not_available");
    await admin.from("menu_days").update({ status: "published", published_at: new Date().toISOString() }).eq("menu_date", date);
  });

  it("numbers orders GM-YYYYMMDD-NNNN from the sequence and stores snapshots", async () => {
    const dish = await makeDish({ standing: true, price: 260 });
    dishes.push(dish.id);
    const { data, error } = await place(date, [item(dish, 2, "standing")]);
    expect(error).toBeNull();
    expect(data![0].order_number).toMatch(/^GM-20990105-\d{4,}$/);
    const { data: items } = await admin.from("order_items").select("name_bg, unit_price_cents, line_total_cents").eq("order_id", data![0].order_id);
    expect(items).toEqual([{ name_bg: dish.name_bg, unit_price_cents: 260, line_total_cents: 520 }]);
    // Removing the dish never alters the order.
    await admin.from("dishes").update({ price_cents: 999, archived_at: new Date().toISOString() }).eq("id", dish.id);
    const { data: after } = await admin.from("order_items").select("unit_price_cents").eq("order_id", data![0].order_id);
    expect(after![0].unit_price_cents).toBe(260);
  });
});

describe("holds and releases", () => {
  it("cancelling releases portions once (idempotent)", async () => {
    const dish = await makeDish();
    dishes.push(dish.id);
    await publishDay(date, [{ id: dish.id, portions: 4 }]);
    const { data } = await place(date, [item(dish, 3)]);
    const id = data![0].order_id;
    expect(await reserved(dish.id)).toBe(3);
    const t = await admin.rpc("transition_order", { p_order_id: id, p_from: "new", p_to: "cancelled", p_actor: "owner", p_release_stock: true });
    expect(t.data).toBe(true);
    expect(await reserved(dish.id)).toBe(0);
    expect((await admin.rpc("release_order_stock", { p_order_id: id })).data).toBe(false);
    expect(await reserved(dish.id)).toBe(0);
  });

  it("status changes are compare-and-set: two owners, one wins", async () => {
    const dish = await makeDish({ standing: true });
    dishes.push(dish.id);
    const { data } = await place(date, [item(dish, 1, "standing")]);
    const id = data![0].order_id;
    const [a, b] = await Promise.all([
      admin.rpc("transition_order", { p_order_id: id, p_from: "new", p_to: "accepted", p_actor: "owner" }),
      admin.rpc("transition_order", { p_order_id: id, p_from: "new", p_to: "rejected", p_actor: "owner", p_release_stock: true }),
    ]);
    expect([a.data, b.data].filter(Boolean)).toHaveLength(1);
  });

  it("card orders wait as awaiting_payment and expired holds are released", async () => {
    const dish = await makeDish();
    dishes.push(dish.id);
    await publishDay(date, [{ id: dish.id, portions: 2 }]);
    const { data } = await place(date, [item(dish, 2)], { payment_method: "card", hold_minutes: 30 });
    const id = data![0].order_id;
    const { data: o } = await admin.from("orders").select("status, payment_status, hold_expires_at").eq("id", id).single();
    expect(o).toMatchObject({ status: "awaiting_payment", payment_status: "pending" });
    expect(new Date(o!.hold_expires_at!).getTime() - Date.now()).toBeGreaterThan(29 * 60_000);
    expect((await place(date, [item(dish, 1)])).error?.message).toBe("out_of_stock");

    await admin.from("orders").update({ hold_expires_at: new Date(Date.now() - 10 * 60_000).toISOString() }).eq("id", id);
    const expired = await admin.rpc("expire_stale_holds", { p_grace_seconds: 300 });
    expect(expired.data).toBeGreaterThanOrEqual(1);
    const { data: after } = await admin.from("orders").select("status, payment_status, stock_held").eq("id", id).single();
    expect(after).toEqual({ status: "abandoned", payment_status: "expired", stock_held: false });
    expect(await reserved(dish.id)).toBe(0);
  });

  it("late payment: re-reserves when stock allows, refuses when it doesn't", async () => {
    const dish = await makeDish();
    dishes.push(dish.id);
    await publishDay(date, [{ id: dish.id, portions: 2 }]);
    const { data } = await place(date, [item(dish, 2)], { payment_method: "card" });
    const id = data![0].order_id;
    await admin.rpc("transition_order", { p_order_id: id, p_from: "awaiting_payment", p_to: "abandoned", p_actor: "system", p_release_stock: true });
    expect((await admin.rpc("rereserve_order_stock", { p_order_id: id })).data).toBe(true);
    expect(await reserved(dish.id)).toBe(2);

    await admin.rpc("release_order_stock", { p_order_id: id });
    await place(date, [item(dish, 1)]);
    expect((await admin.rpc("rereserve_order_stock", { p_order_id: id })).data).toBe(false);
    expect(await reserved(dish.id)).toBe(1);
  });
});
