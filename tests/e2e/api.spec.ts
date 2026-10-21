import { apiOrder, expect, test } from "./support";

test("spam trap, signature checks and auth guards", async ({ page, request }) => {
  const trap = await request.post("/api/order", { data: { website: "http://spam.example", items: [] } });
  expect(trap.status()).toBe(422);
  expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(400);
  expect((await request.post("/api/stripe/webhook", { data: "{}", headers: { "stripe-signature": "t=1,v1=bad" } })).status()).toBe(400);
  expect((await request.get("/api/cron")).status()).toBe(401);
  expect((await request.get("/api/cron", { headers: { authorization: "Bearer nope" } })).status()).toBe(401);
  expect((await request.get("/api/admin/queue")).status()).toBe(401);
  // Prices come from the server, whatever the browser sends.
  const order = await apiOrder(page, { total: 1, subtotalCents: 1 });
  const status = await (await request.get(`/api/order/status?token=${order.statusUrl.split("/").pop()}`)).json();
  expect(status.totalCents).toBeGreaterThan(100);
  expect(status).not.toHaveProperty("customer_phone");
});
