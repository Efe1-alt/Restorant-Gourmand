import { db, dishBySlug, expect, setSettings, shot, test, testPhone, todaysLunch } from "./support";

async function addLunch(page: import("@playwright/test").Page, count = 1) {
  const lunch = (await todaysLunch()).filter((r) => !r.sold_out);
  await page.goto("/menu");
  for (let i = 0; i < count; i++) {
    await page.locator(`[data-dish="${lunch[i].dish.slug}"]`).getByRole("button", { name: /Добави/ }).click();
  }
  return lunch.slice(0, count);
}

test("delivery with cash: district fee, server totals, private status page", async ({ page }) => {
  const added = await addLunch(page, 2);
  const subtotal = added.reduce((s, r) => s + r.dish.price_cents, 0);
  await page.goto("/porachka");
  await page.getByLabel("Име", { exact: true }).fill("E2E Доставка");
  await page.getByLabel("Телефон", { exact: true }).fill(testPhone());
  const trakia = (await db.from("districts").select("id").eq("name_bg", "Тракия").single()).data!.id;
  await page.getByLabel("Квартал / район").selectOption(String(trakia));
  await page.getByLabel("Адрес за доставка").fill("бл. 12, вх. А, ет. 3");
  const total = ((subtotal + 100) / 100).toFixed(2).replace(".", ",");
  const submit = page.getByRole("button", { name: /Изпрати поръчката/ });
  await expect(submit).toContainText(`${total} €`);
  await shot(page, "04-checkout-delivery");
  await submit.click();
  await expect(page).toHaveURL(/\/porachka\/status\/GM-20261020-\d{4,}\.[\w-]{22}$/);
  await expect(page.getByRole("heading", { name: "Получена — очаква потвърждение" })).toBeVisible();
  await expect(page.getByText(`${total} €`).last()).toBeVisible();
  await shot(page, "05-status-received");

  const number = page.url().match(/GM-\d{8}-\d+/)![0];
  const { data } = await db.from("orders").select("delivery_fee_cents, total_cents, payment_method, status").eq("number", number).single();
  expect(data).toEqual({ delivery_fee_cents: 100, total_cents: subtotal + 100, payment_method: "cash", status: "new" });
});

test("delivery minimum blocks small orders; pickup takes 10% off", async ({ page }) => {
  const bread = await dishBySlug("pitka-byal-hlyab");
  await page.goto("/menu?tab=bread");
  await page.getByRole("button", { name: `Добави ${bread.name_bg} в количката` }).click();
  await page.goto("/porachka");
  await expect(page.getByText(/до минималната поръчка за доставка/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Изпрати поръчката/ })).toBeDisabled();

  await page.locator("label").filter({ hasText: /^Вземане от място/ }).click();
  await expect(page.getByText("При вземане в ресторанта")).toBeVisible();
  await expect(page.getByText("При доставка не приемаме карти")).toHaveCount(0);
  await page.getByLabel("Име", { exact: true }).fill("E2E Вземане");
  await page.getByLabel("Телефон", { exact: true }).fill(testPhone());
  const submit = page.getByRole("button", { name: /Изпрати поръчката/ });
  const expected = bread.price_cents - Math.floor((bread.price_cents * 1000 + 5000) / 10000);
  await expect(submit).toContainText(`${(expected / 100).toFixed(2).replace(".", ",")} €`);
  await submit.click();
  await expect(page.getByRole("heading", { name: /Получена/ })).toBeVisible();
  const number = page.url().match(/GM-\d{8}-\d+/)![0];
  const { data } = await db.from("orders").select("discount_cents, total_cents, payment_method").eq("number", number).single();
  expect(data).toMatchObject({ payment_method: "pay_at_pickup", total_cents: expected });
});

test("checkout is closed until the owner confirms the hours", async ({ page }) => {
  await setSettings({ hours_confirmed_at: null });
  try {
    await addLunch(page, 1);
    await page.goto("/porachka");
    await expect(page.getByText("Онлайн поръчките временно не са активни")).toBeVisible();
    await expect(page.getByRole("button", { name: /Изпрати поръчката/ })).toBeDisabled();
    await shot(page, "06-checkout-closed");
  } finally {
    await setSettings({ hours_confirmed_at: new Date().toISOString() });
  }
});

test("validation messages and the basket survives a reload", async ({ page }) => {
  await addLunch(page, 2);
  await page.goto("/porachka");
  await page.getByLabel("Телефон", { exact: true }).fill("123");
  await page.getByRole("button", { name: /Изпрати поръчката/ }).click();
  await expect(page.getByText("Моля, въведете име.")).toBeVisible();
  await expect(page.getByText(/Невалиден номер/)).toBeVisible();
  await expect(page.getByText("Изберете квартал за доставка.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Изпрати поръчката/ })).toBeVisible();
});

test("English checkout and status page", async ({ page }) => {
  const lunch = (await todaysLunch()).filter((r) => !r.sold_out);
  await page.goto("/en/menu");
  await page.locator(`[data-dish="${lunch[0].dish.slug}"]`).getByRole("button", { name: /Add/ }).click();
  await page.goto("/en/order");
  await page.locator("label").filter({ hasText: /^Pickup/ }).click();
  await page.getByLabel("Name", { exact: true }).fill("E2E English");
  await page.getByLabel("Phone", { exact: true }).fill(testPhone());
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/en\/order\/status\//);
  await expect(page.getByRole("heading", { name: "Received — awaiting confirmation" })).toBeVisible();
});

test("card payment is offered only when Stripe is configured", async ({ page }) => {
  await addLunch(page, 2);
  await page.goto("/porachka");
  const card = page.getByText("С карта онлайн");
  if (process.env.STRIPE_SECRET_KEY) {
    await expect(card).toBeVisible();
  } else {
    await expect(card).toHaveCount(0);
    await expect(page.getByText("В брой при доставка")).toBeVisible();
  }
});

test("a tampered status link is a 404", async ({ page }) => {
  const res = await page.goto("/porachka/status/GM-20261020-0001.AAAAAAAAAAAAAAAAAAAAAA");
  expect(res?.status()).toBe(404);
});
