import "server-only";
import { notify, processOutbox } from "./email/outbox";
import { db } from "./supabase";

export const REMINDER_AFTER_MINUTES = 10;

// Owner reminder for orders still "New" 10 minutes after they became New.
// There is no automatic rejection.
export async function sendReminders() {
  const cutoff = new Date(Date.now() - REMINDER_AFTER_MINUTES * 60_000).toISOString();
  const { data, error } = await db()
    .from("orders")
    .select("id")
    .eq("status", "new")
    .is("reminder_sent_at", null)
    .lte("status_changed_at", cutoff)
    .limit(20);
  if (error) throw error;
  let sent = 0;
  for (const { id } of data) {
    // Claim first so two runs never send twice.
    const { data: claimed } = await db()
      .from("orders")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "new")
      .is("reminder_sent_at", null)
      .select("id");
    if (!claimed?.length) continue;
    await notify("owner_reminder", id);
    sent++;
  }
  return sent;
}

export async function runScheduledJobs() {
  const client = db();
  const expired = await client.rpc("expire_stale_holds", { p_grace_seconds: 300 });
  if (expired.error) throw expired.error;
  const reminders = await sendReminders();
  const emails = await processOutbox();
  const anonymised = await client.rpc("anonymise_old_orders", {});
  if (anonymised.error) throw anonymised.error;
  return { expiredHolds: expired.data, reminders, emails, anonymised: anonymised.data };
}
