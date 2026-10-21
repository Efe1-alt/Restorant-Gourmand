import { apiOrder, db, expect, loginAsOwner, shot, test, TEST_DATE, todaysLunch } from "./support";

test("admin requires the owner; wrong password is refused", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/vhod$/);
  await page.getByLabel("Имейл").fill(process.env.DEV_OWNER_EMAIL!);
  await page.getByLabel("Парола").fill("wrong-password-123");
  await page.getByRole("button", { name: "Вход" }).click();
  await expect(page.getByText("Грешен имейл или парола.")).toBeVisible();
  expect((await page.request.get("/api/admin/queue")).status()).toBe(401);
});

test("live queue: a new order appears with the unacknowledged alert, then goes through delivery", async ({ page }) => {
  await loginAsOwner(page);
  const order = await apiOrder(page);
  const card = page.getByRole("article", { name: `Поръчка ${order.number}` });
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("alert").filter({ hasText: /нов/ })).toBeVisible();
  await expect(page).toHaveTitle(/^\(\d+\) Нови поръчки/);
  await shot(page, "07-admin-queue");

  await card.getByRole("button", { name: "Приеми" }).click();
  for (const step of ["Започни приготвяне", "Изпратена с куриер", "Доставена"]) {
    await card.getByRole("button", { name: step }).click();
    if (step === "Доставена") break;
    await expect(card.getByRole("button", { name: step })).toHaveCount(0);
  }
  await expect(async () => {
    const { data } = await db.from("orders").select("status").eq("number", order.number).single();
    expect(data!.status).toBe("delivered");
  }).toPass();
  // The customer's private page follows along.
  await page.goto(order.statusUrl);
  await expect(page.getByRole("heading", { name: "Доставена" })).toBeVisible();
});

test("reject with a reason releases portions and shows on the status page", async ({ page }) => {
  await loginAsOwner(page);
  const before = (await todaysLunch()).filter((r) => !r.sold_out)[0];
  const order = await apiOrder(page);
  const card = page.getByRole("article", { name: `Поръчка ${order.number}` });
  await card.getByRole("button", { name: "Откажи" }).click();
  await card.getByLabel(/Причина за отказа/).fill("Свърши ни продуктът");
  await card.getByRole("button", { name: "Потвърди отказа" }).click();
  await expect(card).toHaveCount(0);
  const after = (await todaysLunch()).find((r) => r.dish_id === before.dish_id)!;
  expect(after.reserved).toBe(before.reserved);
  await page.goto(order.statusUrl);
  await expect(page.getByRole("heading", { name: "Отказана" })).toBeVisible();
});

test("order detail: cancel by phone before preparation, mark cash as paid", async ({ page }) => {
  await loginAsOwner(page);
  const order = await apiOrder(page);
  const { data } = await db.from("orders").select("id").eq("number", order.number).single();
  await page.goto(`/admin/porachki/${data!.id}`);
  await expect(page.getByRole("heading", { name: order.number })).toBeVisible();
  await page.getByRole("button", { name: "Отбележи като платена" }).click();
  await expect(page.getByText("Отбелязана като платена.")).toBeVisible();
  await page.getByRole("button", { name: "Клиентът се отказа" }).click();
  await expect(page.getByText(/порциите се връщат автоматично/)).toBeVisible();
  await page.getByRole("button", { name: "Потвърди анулирането" }).click();
  await expect(page.getByText(/^Анулирана/).first()).toBeVisible();
  await shot(page, "08-admin-order-detail");
  const { data: o } = await db.from("orders").select("status, payment_status, stock_held").eq("id", data!.id).single();
  expect(o).toEqual({ status: "cancelled", payment_status: "paid", stock_held: false });
});

test("sold-out from the week planner shows on the public menu", async ({ page }) => {
  await loginAsOwner(page);
  const target = (await todaysLunch()).filter((r) => !r.sold_out).at(-1)!;
  await page.goto("/admin/sedmica");
  await shot(page, "09-admin-week");
  const today = page.locator("section").filter({ has: page.getByText("днес", { exact: true }) });
  const row = today.locator("li").filter({ hasText: target.dish.name_bg }).first();
  await row.getByRole("button", { name: "Изчерпано" }).click();
  await expect(row.getByRole("button", { name: "Пусни" })).toBeVisible();
  await page.goto("/menu");
  await expect(page.locator(`[data-dish="${target.dish.slug}"]`).getByText("Изчерпано")).toBeVisible();
  await db.from("menu_day_dishes").update({ sold_out: false }).eq("menu_date", TEST_DATE).eq("dish_id", target.dish_id);
});

test("settings: turning ordering off and on again", async ({ page }) => {
  await loginAsOwner(page);
  await page.goto("/admin/nastroyki");
  await shot(page, "10-admin-settings");
  await page.getByRole("button", { name: "Изключи онлайн поръчките" }).click();
  await expect(page.getByText("Онлайн поръчките са изключени до ново потвърждение.")).toBeVisible();
  await page.getByRole("button", { name: /Потвърждавам часовете/ }).click();
  await expect(page.getByText("Часовете са потвърдени — онлайн поръчките са включени.")).toBeVisible();
  const { data } = await db.from("audit_log").select("action").like("action", "settings.hours_%").order("id", { ascending: false }).limit(2);
  expect(data!.map((a) => a.action)).toEqual(["settings.hours_confirmed", "settings.hours_unconfirmed"]);
});

test("dish editing: English needs a name before it can be approved", async ({ page }) => {
  await loginAsOwner(page);
  const { data: dish } = await db.from("dishes").select("id, name_en, en_status").eq("slug", "bob-chorba").single();
  await page.goto(`/admin/menu/${dish!.id}`);
  await page.getByLabel("Name (English)").fill("");
  await page.getByLabel("Статус на превода").selectOption("approved");
  await page.getByRole("button", { name: "Запази" }).click();
  await expect(page.getByText("За да публикувате на английски, попълнете английското име.")).toBeVisible();
  await page.getByLabel("Name (English)").fill(dish!.name_en!);
  await page.getByLabel("Статус на превода").selectOption("approved");
  await page.getByRole("button", { name: "Запази" }).click();
  await expect(page.getByText("Запазено.")).toBeVisible();
  await page.goto("/en/menu?tab=soups");
  await expect(page.getByRole("heading", { name: "Bean soup" })).toBeVisible();
  await db.from("dishes").update({ en_status: dish!.en_status }).eq("id", dish!.id);
});
