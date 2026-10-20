import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cleanup, makeDish, publishDay, testDate } from "./helpers";

const { placeOrder } = await import("@/lib/server/place-order");

const date = testDate(3); // a Monday in 2099
const now = new Date(`${date}T09:00:00Z`); // 11:00 in Sofia
const dishes: number[] = [];
let lunch: { id: number }, soup: { id: number }, trakia: number, centre: number;
let savedConfirmed: string | null = null;

const after = () => {};
let ip = 0;
const headers = () => new Headers({ "x-forwarded-for": `198.51.100.${(ip++ % 200) + 1}` });
let phone = 100;
const body = (over: Record<string, unknown> = {}) => ({
  locale: "bg",
  fulfilment: "delivery",
  name: "Тест Клиент",
  phone: `0888 000 ${String(phone++).padStart(3, "0")}`,
  email: "",
  districtId: String(trakia),
  address: "ул. Тестова 1",
  time: "asap",
  payment: "cash",
  notes: "",
  website: "",
  items: [{ dishId: lunch.id, quantity: 2 }],
  ...over,
});
const totals = async (number: string) =>
  (await admin.from("orders").select("subtotal_cents, discount_cents, delivery_fee_cents, total_cents, status").eq("number", number).single()).data!;

const clearHits = () => admin.from("rate_limit_hits").delete().gte("created_at", new Date(Date.now() - 3600_000).toISOString());

beforeAll(async () => {
  await clearHits();
  savedConfirmed = (await admin.from("settings").select("hours_confirmed_at").eq("id", 1).single()).data!.hours_confirmed_at;
  await admin.from("settings").update({ hours_confirmed_at: new Date().toISOString(), ordering_paused: false }).eq("id", 1);
  const a = await makeDish({ price: 490 });
  const b = await makeDish({ standing: true, price: 240 });
  dishes.push(a.id, b.id);
  lunch = a;
  soup = b;
  await publishDay(date, [{ id: a.id, portions: 50 }]);
  trakia = (await admin.from("districts").select("id").eq("name_bg", "Тракия").single()).data!.id; // €1.00
  centre = (await admin.from("districts").select("id").eq("name_bg", "Център").single()).data!.id; // €0
});
afterAll(async () => {
  await clearHits();
  await admin.from("settings").update({ hours_confirmed_at: savedConfirmed }).eq("id", 1);
  await cleanup([date], dishes);
});

describe("placeOrder (server checkout)", () => {
  it("prices delivery by district from the database, not the browser", async () => {
    const r = await placeOrder(body({ items: [{ dishId: lunch.id, quantity: 2 }], subtotal: 1, total: 1 }), { headers: headers(), now, after });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await totals(r.number)).toMatchObject({ subtotal_cents: 980, delivery_fee_cents: 100, total_cents: 1080, status: "new" });
    expect(r.statusUrl).toMatch(/^\/porachka\/status\/GM-\d{8}-\d{4,}\.[\w-]{22}$/);
  });

  it("free delivery from €25 and €0 districts", async () => {
    const r1 = await placeOrder(body({ items: [{ dishId: lunch.id, quantity: 6 }] }), { headers: headers(), now, after });
    const r2 = await placeOrder(body({ districtId: String(centre), items: [{ dishId: lunch.id, quantity: 2 }] }), { headers: headers(), now, after });
    expect(r1.ok && (await totals(r1.number)).delivery_fee_cents).toBe(0);
    expect(r2.ok && (await totals(r2.number)).delivery_fee_cents).toBe(0);
  });

  it("enforces the delivery minimum", async () => {
    const r = await placeOrder(body({ items: [{ dishId: soup.id, quantity: 1 }] }), { headers: headers(), now, after });
    expect(r).toMatchObject({ ok: false, code: "below_minimum" });
  });

  it("pickup: 10% off, no fee, no minimum, pay at the restaurant", async () => {
    const r = await placeOrder(body({ fulfilment: "pickup", payment: "pay_at_pickup", districtId: "", address: "", items: [{ dishId: soup.id, quantity: 1 }] }), { headers: headers(), now, after });
    expect(r.ok).toBe(true);
    if (r.ok) expect(await totals(r.number)).toMatchObject({ subtotal_cents: 240, discount_cents: 24, delivery_fee_cents: 0, total_cents: 216 });
  });

  it("rejects the spam trap, unknown dishes and bad fields", async () => {
    expect(await placeOrder(body({ website: "http://spam" }), { headers: headers(), now, after })).toMatchObject({ ok: false, status: 422 });
    expect(await placeOrder(body({ items: [{ dishId: 999999, quantity: 1 }] }), { headers: headers(), now, after })).toMatchObject({ ok: false, code: "not_available" });
    const bad = await placeOrder(body({ phone: "123", districtId: "" }), { headers: headers(), now, after });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors ?? {})).toEqual(expect.arrayContaining(["phone", "districtId"]));
  });

  it("refuses card when Stripe isn't available", async () => {
    await admin.from("settings").update({ card_payments_enabled: false }).eq("id", 1);
    const r = await placeOrder(body({ payment: "card" }), { headers: headers(), now, after });
    await admin.from("settings").update({ card_payments_enabled: true }).eq("id", 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors?.payment).toBeTruthy();
  });

  it("rate-limits per IP", async () => {
    const h = new Headers({ "x-forwarded-for": "203.0.113.77" });
    const codes = [];
    for (let i = 0; i < 8; i++) codes.push((await placeOrder(body(), { headers: h, now, after })).ok ? "ok" : "no");
    await clearHits();
    expect(codes.filter((c) => c === "ok")).toHaveLength(6);
  });

  it("rate-limits per phone across IPs", async () => {
    const same = "0888 999 777";
    const ok = [];
    for (let i = 0; i < 6; i++) ok.push((await placeOrder(body({ phone: same }), { headers: headers(), now, after })).ok);
    await clearHits();
    expect(ok.filter(Boolean)).toHaveLength(4);
  });

  it("checkout stays closed until hours are confirmed, and outside ordering hours", async () => {
    await admin.from("settings").update({ hours_confirmed_at: null }).eq("id", 1);
    expect(await placeOrder(body(), { headers: headers(), now, after })).toMatchObject({ ok: false, code: "closed" });
    await admin.from("settings").update({ hours_confirmed_at: new Date().toISOString() }).eq("id", 1);
    const early = new Date(`${date}T06:30:00Z`); // 08:30 Sofia, before 10:00
    expect(await placeOrder(body(), { headers: headers(), now: early, after })).toMatchObject({ ok: false, code: "closed" });
  });
});
