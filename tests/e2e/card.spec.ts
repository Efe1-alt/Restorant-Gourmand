import Stripe from "stripe";
import type { BrowserContext, Page } from "@playwright/test";
import { apiOrder, db, expect, loginAsOwner, shot, test, testPhone, todaysLunch } from "./support";

// Card path against the real Stripe test mode: hosted Checkout, the webhook
// forwarded by `npm run stripe:listen`, capture on accept, void on reject,
// expiry, refunds. Needs STRIPE_SECRET_KEY (test) and STRIPE_WEBHOOK_SECRET
// in .env.local; skipped otherwise. Desktop only (one run per Stripe flow).

const key = process.env.STRIPE_SECRET_KEY ?? "";
const testKey = /^(sk|rk)_test_/.test(key);
const stripe = testKey ? new Stripe(key) : null;

test.skip(!testKey || !process.env.STRIPE_WEBHOOK_SECRET, "Stripe test key or webhook secret not set");
test.skip(({ isMobile }) => isMobile, "card flow runs once, on desktop");
test.describe.configure({ timeout: 150_000 });

// Stripe's published test card.
const CARD = { number: "4242424242424242", expiry: "12 / 34", cvc: "123" };

async function orderRow(number: string) {
  const { data } = await db
    .from("orders")
    .select("id, status, payment_status, total_cents, refunded_cents, stock_held, payments(stripe_checkout_session_id, stripe_payment_intent_id, status)")
    .eq("number", number)
    .single();
  const payment = (Array.isArray(data!.payments) ? data!.payments[0] : data!.payments) as {
    stripe_checkout_session_id: string | null;
    stripe_payment_intent_id: string | null;
    status: string;
  } | null;
  return { ...data!, payment };
}

async function waitForOrder(number: string, expected: Record<string, unknown>) {
  await expect(async () => {
    expect(await orderRow(number)).toMatchObject(expected);
  }).toPass({ timeout: 30_000 });
  return orderRow(number);
}

const reservedFor = async (dishId: number) => (await todaysLunch()).find((r) => r.dish_id === dishId)!.reserved;

// Pays on Stripe's hosted page in a fresh tab (the fixture's pinned clock
// belongs to the first page and must not reach Stripe's scripts).
async function payOnStripe(context: BrowserContext, checkoutUrl: string) {
  const p = await context.newPage();
  await p.goto(checkoutUrl);
  const cardNumber = p.locator("#cardNumber");
  const accordion = p.getByTestId("card-accordion-item-button");
  await cardNumber.or(accordion).first().waitFor({ timeout: 30_000 });
  if (await accordion.isVisible()) await accordion.click();
  const email = p.locator("#email");
  if (await email.isVisible()) await email.fill("e2e-card@example.com");
  await cardNumber.fill(CARD.number);
  await p.locator("#cardExpiry").fill(CARD.expiry);
  await p.locator("#cardCvc").fill(CARD.cvc);
  const name = p.locator("#billingName");
  if (await name.isVisible()) await name.fill("E2E Карта");
  const zip = p.locator("#billingPostalCode");
  if (await zip.isVisible()) await zip.fill("4000");
  await p.getByTestId("hosted-payment-submit-button").click();
  await p.waitForURL(/\/(porachka|en\/order)\/status\/[^?]+\?paid=1/, { timeout: 60_000 });
  return p;
}

async function paidCardOrder(page: Page, context: BrowserContext) {
  const order = (await apiOrder(page, { payment: "card", email: "e2e-card@example.com" })) as Awaited<ReturnType<typeof apiOrder>> & {
    checkoutUrl: string;
  };
  expect(order.checkoutUrl).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  const paid = await payOnStripe(context, order.checkoutUrl);
  await paid.close();
  const row = await waitForOrder(order.number, { status: "new", payment_status: "authorised" });
  return { ...order, row };
}

test("card order via checkout reaches the admin only once authorised; Accept captures", async ({ page, context }) => {
  const lunch = (await todaysLunch()).filter((r) => !r.sold_out).slice(0, 2);
  await page.goto("/menu");
  for (const r of lunch) await page.locator(`[data-dish="${r.dish.slug}"]`).getByRole("button", { name: /Добави/ }).click();
  await page.goto("/porachka");
  await page.getByLabel("Име", { exact: true }).fill("E2E Карта");
  await page.getByLabel("Телефон", { exact: true }).fill(testPhone());
  await page.getByLabel("Имейл").fill("e2e-card@example.com");
  const trakia = (await db.from("districts").select("id").eq("name_bg", "Тракия").single()).data!.id;
  await page.getByLabel("Квартал / район").selectOption(String(trakia));
  await page.getByLabel("Адрес за доставка").fill("бл. 12, вх. А, ет. 3");
  await page.locator("label").filter({ hasText: /^С карта онлайн/ }).click();
  await page.getByRole("button", { name: /Продължи към плащане/ }).click();
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 });
  const checkoutUrl = page.url();

  const { data: pay } = await db.from("payments").select("order_id").eq("checkout_url", checkoutUrl).single();
  const { data: o } = await db.from("orders").select("number").eq("id", pay!.order_id).single();
  const number = o!.number;
  expect(await orderRow(number)).toMatchObject({ status: "awaiting_payment", payment_status: "pending", stock_held: true });

  // Not in the owner's queue while unpaid.
  const owner = await context.newPage();
  await loginAsOwner(owner);
  const queue = async () => ((await (await owner.request.get("/api/admin/queue")).json()) as { orders: { number: string }[] }).orders.map((q) => q.number);
  expect(await queue()).not.toContain(number);
  await expect(owner.getByRole("article", { name: `Поръчка ${number}` })).toHaveCount(0);

  const paid = await payOnStripe(context, checkoutUrl);
  await expect(paid.getByRole("heading", { name: /Получена/ })).toBeVisible();
  await paid.close();

  const authorised = await waitForOrder(number, { status: "new", payment_status: "authorised", payment: { status: "authorised" } });
  const pi = authorised.payment!.stripe_payment_intent_id!;
  expect((await stripe!.paymentIntents.retrieve(pi)).status).toBe("requires_capture");
  expect(await queue()).toContain(number);

  const card = owner.getByRole("article", { name: `Поръчка ${number}` });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await shot(owner, "10-admin-card-authorised");
  await card.getByRole("button", { name: "Приеми" }).click();
  await waitForOrder(number, { status: "accepted", payment_status: "paid", payment: { status: "paid" } });
  const captured = await stripe!.paymentIntents.retrieve(pi);
  expect(captured.status).toBe("succeeded");
  expect(captured.amount_received).toBe(authorised.total_cents);
});

test("Reject on an authorised card order voids the hold and releases portions", async ({ page, context }) => {
  const dishId = (await todaysLunch()).filter((r) => !r.sold_out)[0].dish_id;
  const before = await reservedFor(dishId);
  const order = await paidCardOrder(page, context);
  expect(await reservedFor(dishId)).toBe(before + 2);

  await loginAsOwner(page);
  const card = page.getByRole("article", { name: `Поръчка ${order.number}` });
  await card.getByRole("button", { name: "Откажи" }).click();
  await card.getByLabel(/Причина за отказа/).fill("Свърши ни продуктът");
  await card.getByRole("button", { name: "Потвърди отказа" }).click();
  await expect(card).toHaveCount(0);

  const row = await waitForOrder(order.number, { status: "rejected", payment_status: "cancelled", stock_held: false });
  expect((await stripe!.paymentIntents.retrieve(row.payment!.stripe_payment_intent_id!)).status).toBe("canceled");
  expect(await reservedFor(dishId)).toBe(before);
});

test("an expired Checkout session abandons the order and releases its portions", async ({ page }) => {
  const dishId = (await todaysLunch()).filter((r) => !r.sold_out)[0].dish_id;
  const before = await reservedFor(dishId);
  const order = await apiOrder(page, { payment: "card", email: "e2e-card@example.com" });
  const row = await orderRow(order.number);
  expect(row).toMatchObject({ status: "awaiting_payment", stock_held: true });
  expect(await reservedFor(dishId)).toBe(before + 2);

  // Sessions last 30 minutes at minimum; expiring it now sends the same
  // checkout.session.expired event through the webhook.
  await stripe!.checkout.sessions.expire(row.payment!.stripe_checkout_session_id!);
  await waitForOrder(order.number, { status: "abandoned", payment_status: "expired", stock_held: false });
  expect(await reservedFor(dishId)).toBe(before);
});

test("partial and full refunds are confirmed through the webhook", async ({ page, context }) => {
  const order = await paidCardOrder(page, context);
  await loginAsOwner(page);
  await page.getByRole("article", { name: `Поръчка ${order.number}` }).getByRole("button", { name: "Приеми" }).click();
  const accepted = await waitForOrder(order.number, { status: "accepted", payment_status: "paid" });
  const pi = accepted.payment!.stripe_payment_intent_id!;

  const refundEvents = async (since: string) =>
    (await db.from("stripe_events").select("id, type, processed_at, error").like("type", "refund.%").gte("received_at", since)).data!;

  async function refund(amount: string, reason: string) {
    const since = new Date().toISOString();
    await page.getByRole("button", { name: "Възстанови сума…" }).click();
    await page.getByLabel(/Сума за възстановяване/).fill(amount);
    await page.getByLabel("Причина", { exact: true }).fill(reason);
    await page.getByRole("button", { name: "Продължи" }).click();
    await page.getByRole("button", { name: "Потвърди възстановяването" }).click();
    await expect(page.getByText(new RegExp(`${amount.replace(",", "[,.]")}\\s*€ — потвърдено от Stripe`))).toBeVisible({ timeout: 20_000 });
    // The webhook delivered and processed refund.* events for it.
    await expect(async () => {
      const events = await refundEvents(since);
      expect(events.length).toBeGreaterThan(0);
      expect(events.every((e) => e.processed_at && !e.error)).toBe(true);
    }).toPass({ timeout: 30_000 });
  }

  await page.goto(`/admin/porachki/${accepted.id}`);
  await refund("1,00", "E2E частично");
  let row = await waitForOrder(order.number, { refunded_cents: 100 });
  expect(row.payment_status).toBe("partially_refunded");

  const rest = ((accepted.total_cents - 100) / 100).toFixed(2).replace(".", ",");
  await refund(rest, "E2E пълно");
  row = await waitForOrder(order.number, { refunded_cents: accepted.total_cents, payment_status: "refunded" });
  await shot(page, "11-admin-card-refunds");

  const refunds = await stripe!.refunds.list({ payment_intent: pi });
  expect(refunds.data.map((r) => [r.amount, r.status]).sort()).toEqual([[100, "succeeded"], [accepted.total_cents - 100, "succeeded"]].sort());
  const { data: ours } = await db.from("refunds").select("stripe_refund_id, status").eq("order_id", row.id);
  expect(new Set(ours!.map((r) => r.stripe_refund_id))).toEqual(new Set(refunds.data.map((r) => r.id)));
  expect(ours!.every((r) => r.status === "succeeded")).toBe(true);
});
