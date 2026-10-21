import { createClient } from "@supabase/supabase-js";
import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import type { Database } from "../../src/lib/database.types";

// Tuesday 20 October 2026, 12:00 in Sofia.
export const TEST_DATE = "2026-10-20";
export const TEST_NOW = "2026-10-20T09:00:00.000Z";

export const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});

export async function pinClock(context: BrowserContext, page: Page, iso = TEST_NOW) {
  await context.addCookies([{ name: "gm-test-now", value: iso, url: "http://localhost:3000" }]);
  await page.clock.setFixedTime(new Date(iso));
}

export const test = base.extend<{ pinned: void }>({
  pinned: [
    async ({ context, page }, use) => {
      await db.from("rate_limit_hits").delete().gte("created_at", new Date(Date.now() - 3600_000).toISOString());
      await pinClock(context, page);
      await use();
    },
    { auto: true },
  ],
});
export { expect };

export async function setSettings(values: Database["public"]["Tables"]["settings"]["Update"]) {
  const { error } = await db.from("settings").update(values).eq("id", 1);
  if (error) throw error;
}

export async function dishBySlug(slug: string) {
  return (await db.from("dishes").select("id, name_bg, name_en, price_cents").eq("slug", slug).single()).data!;
}

export async function todaysLunch() {
  const { data } = await db
    .from("menu_day_dishes")
    .select("dish_id, portions, reserved, sold_out, dishes(slug, name_bg, price_cents)")
    .eq("menu_date", TEST_DATE)
    .order("sort_order");
  return data!.map((r) => ({ ...r, dish: r.dishes as unknown as { slug: string; name_bg: string; price_cents: number } }));
}

let phoneSeq = Date.now() % 1000;
export const testPhone = () => `0888 7${String(phoneSeq++ % 100).padStart(2, "0")} ${String(Math.floor(Math.random() * 900) + 100)}`;

// Places an order through the public API (like the checkout does).
export async function apiOrder(page: Page, over: Record<string, unknown> = {}) {
  const district = (await db.from("districts").select("id").eq("name_bg", "Тракия").single()).data!.id;
  const lunch = (await todaysLunch()).filter((r) => !r.sold_out);
  const res = await page.request.post("/api/order", {
    data: {
      locale: "bg",
      fulfilment: "delivery",
      name: "E2E Клиент",
      phone: testPhone(),
      email: "",
      districtId: String(district),
      address: "ул. Тестова 5",
      time: "asap",
      payment: "cash",
      notes: "e2e",
      website: "",
      items: [{ dishId: lunch[0].dish_id, quantity: 2 }],
      ...over,
    },
  });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { number: string; statusUrl: string };
}

export async function loginAsOwner(page: Page) {
  await page.goto("/admin/vhod");
  await page.getByLabel("Имейл").fill(process.env.DEV_OWNER_EMAIL!);
  await page.getByLabel("Парола").fill(process.env.DEV_OWNER_PASSWORD!);
  await page.getByRole("button", { name: "Вход" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export const shot = (page: Page, name: string) =>
  page.screenshot({ path: `../baseline-screenshots/backend-2026-10-20/${test.info().project.name}-${name}.png`, fullPage: false });
