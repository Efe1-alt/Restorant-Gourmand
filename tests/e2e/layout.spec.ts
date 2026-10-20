import { expect, loginAsOwner, test } from "./support";

const overflow = () => document.documentElement.scrollWidth - window.innerWidth;

test("no horizontal scrolling at phone width", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "phone layout only");
  for (const path of ["/", "/menu", "/porachka", "/en/menu", "/poveritelnost"]) {
    await page.goto(path);
    expect(await page.evaluate(overflow), path).toBeLessThanOrEqual(1);
  }
  await loginAsOwner(page);
  for (const path of ["/admin", "/admin/porachki", "/admin/sedmica", "/admin/menu", "/admin/shabloni", "/admin/nastroyki", "/admin/imeyli", "/admin/dnevnik"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(overflow), path).toBeLessThanOrEqual(1);
  }
});
