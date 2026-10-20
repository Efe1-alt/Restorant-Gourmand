import { afterAll, describe, expect, it } from "vitest";
import { admin, cleanup, item, makeDish, place, testDate } from "./helpers";

const { sendReminders } = await import("@/lib/server/jobs");
const { enqueueOrderEmail, sendOutboxRow, processOutbox } = await import("@/lib/server/email/outbox");

const date = testDate(4);
const dishes: number[] = [];
afterAll(() => cleanup([date], dishes));

async function newOrder(over: Record<string, unknown> = {}) {
  const dish = await makeDish({ standing: true, price: 600 });
  dishes.push(dish.id);
  return (await place(date, [item(dish, 1, "standing")], over)).data![0].order_id;
}

describe("owner reminder after 10 minutes", () => {
  it("is queued once for orders still New after 10 min, never for younger ones", async () => {
    const old = await newOrder();
    const young = await newOrder();
    await admin.from("orders").update({ status_changed_at: new Date(Date.now() - 11 * 60_000).toISOString() }).eq("id", old);
    await sendReminders();
    await sendReminders();
    const { data } = await admin.from("email_outbox").select("order_id, kind").eq("kind", "owner_reminder").in("order_id", [old, young]);
    expect(data).toEqual([{ order_id: old, kind: "owner_reminder" }]);
    expect((await admin.from("orders").select("reminder_sent_at").eq("id", young).single()).data!.reminder_sent_at).toBeNull();
  });

  it("skips orders that were accepted in the meantime", async () => {
    const id = await newOrder();
    await admin.from("orders").update({ status: "accepted", status_changed_at: new Date(Date.now() - 20 * 60_000).toISOString() }).eq("id", id);
    await sendReminders();
    const { data } = await admin.from("email_outbox").select("id").eq("kind", "owner_reminder").eq("order_id", id);
    expect(data).toEqual([]);
  });
});

describe("email outbox", () => {
  it("one email per order event (idempotent), customer emails only with an address", async () => {
    const withEmail = await newOrder({ customer_email: "c@example.test" });
    const without = await newOrder();
    const a = await enqueueOrderEmail("customer_accepted", withEmail);
    const b = await enqueueOrderEmail("customer_accepted", withEmail);
    expect(a).not.toBeNull();
    expect(b).toBeNull();
    expect(await enqueueOrderEmail("customer_accepted", without)).toBeNull();
  });

  it("logs failures with the error, backs off, and can be retried by hand", async () => {
    const id = await newOrder({ customer_email: "c@example.test" });
    const outbox = (await enqueueOrderEmail("customer_received", id))!;
    expect(await sendOutboxRow(outbox)).toBe(false); // no RESEND_API_KEY in tests
    let row = (await admin.from("email_outbox").select("status, attempts, last_error, next_attempt_at").eq("id", outbox).single()).data!;
    expect(row).toMatchObject({ status: "failed", attempts: 1, last_error: "RESEND_API_KEY is not set." });
    expect(new Date(row.next_attempt_at).getTime()).toBeGreaterThan(Date.now());
    // Not due yet: the cron run leaves it alone.
    await processOutbox();
    row = (await admin.from("email_outbox").select("status, attempts, last_error, next_attempt_at").eq("id", outbox).single()).data!;
    expect(row.attempts).toBe(1);
    // Manual retry from the admin.
    expect(await sendOutboxRow(outbox, { manual: true })).toBe(false);
    expect((await admin.from("email_outbox").select("attempts").eq("id", outbox).single()).data!.attempts).toBe(2);
    // The order itself is untouched by email trouble.
    expect((await admin.from("orders").select("status").eq("id", id).single()).data!.status).toBe("new");
  });

  it("owner email content has number, items, phone and admin link", async () => {
    const id = await newOrder();
    const outbox = (await enqueueOrderEmail("owner_new_order", id))!;
    const { data } = await admin.from("email_outbox").select("to_address, subject, html").eq("id", outbox).single();
    expect(data!.to_address).toBeTruthy();
    expect(data!.subject).toMatch(/^Нова поръчка GM-/);
    expect(data!.html).toContain(`/admin/porachki/${id}`);
    expect(data!.html).toContain("+359888000111");
  });
});
