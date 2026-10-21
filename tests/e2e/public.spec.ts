import { expect, shot, test, todaysLunch } from "./support";

test("home page in Bulgarian with hreflang, canonical and structured data", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "bg");
  await expect(page).toHaveTitle(/Gourmand Пловдив/);
  await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en$/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http:\/\/localhost:3000\/?$/);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld).toMatchObject({ "@type": "Restaurant", name: "Gourmand", telephone: "+359878920254" });
  await expect(page.getByRole("heading", { name: "Сготвено като у дома" })).toBeVisible();
  await shot(page, "01-home-bg");
});

test("English site under /en with English slugs", async ({ page }) => {
  await page.goto("/menu");
  await page.getByRole("link", { name: "English" }).click();
  await expect(page).toHaveURL(/\/en\/menu$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Menu", level: 1 })).toBeVisible();
  await expect(page.locator('link[rel="alternate"][hreflang="bg"]')).toHaveAttribute("href", /\/menu$/);
  await expect(page.getByRole("button", { name: "Lunch menu" })).toBeVisible();
  await shot(page, "02-menu-en");
});

test("today's published lunch menu is orderable, other days are informational", async ({ page }) => {
  const lunch = await todaysLunch();
  await page.goto("/menu");
  await expect(page.getByRole("button", { name: /Днес/ })).toHaveAttribute("aria-pressed", "true");
  const first = page.locator(`[data-dish="${lunch[0].dish.slug}"]`);
  await expect(first.getByRole("button", { name: /Добави/ })).toBeVisible();
  await shot(page, "03-menu-today");
  await page.getByRole("button", { name: /^Ср/ }).click();
  await expect(page.getByText("Менюто за този ден е само за информация")).toBeVisible();
  await expect(page.getByText("Само в сряда").first()).toBeVisible();
});

test("standing categories, dish dialog and allergen notice", async ({ page }) => {
  await page.goto("/menu?tab=soups");
  await expect(page.getByRole("button", { name: "Супи" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Виж снимка: Боб чорба" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Боб чорба" })).toBeVisible();
  await expect(dialog.getByText("Информацията за алергени предстои")).toBeVisible();
});

test("map loads from Google only after a click", async ({ page }) => {
  const google: string[] = [];
  page.on("request", (r) => r.url().includes("google.com/maps") && google.push(r.url()));
  await page.goto("/#contact");
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(0);
  expect(google).toHaveLength(0);
  await page.getByRole("button", { name: "Покажи картата" }).click();
  await expect(page.locator('iframe[src*="google.com/maps"]')).toHaveCount(1);
});

test("privacy and terms pages exist in both languages, marked as drafts", async ({ page }) => {
  for (const [path, heading] of [
    ["/poveritelnost", "Политика за поверителност"],
    ["/obshti-usloviya", "Общи условия за онлайн поръчки"],
    ["/en/privacy", "Privacy policy"],
    ["/en/terms", "Terms for online orders"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(page.getByRole("note")).toContainText(/Чернова|Draft/);
  }
  await page.goto("/obshti-usloviya");
  await expect(page.getByText("Преди да започнем приготвянето")).toBeVisible();
});

test("sitemap lists both languages; site stays noindex before launch", async ({ page }) => {
  const xml = await (await page.request.get("/sitemap.xml")).text();
  expect(xml).toContain("http://localhost:3000/en/order");
  expect(xml).toContain('hreflang="bg"');
  const robots = await (await page.request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \//);
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
