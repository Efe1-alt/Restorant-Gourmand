// LOCAL TEST DATA ONLY. Makes the local site orderable for development and
// end-to-end tests: confirms the seeded hours, pre-fills this week from the
// weekday templates, sets test portions and publishes the days, and sets a
// test owner email. Never run against a real project (it refuses to).
//
// Usage: node scripts/dev-fixture.mjs [portions=20] [date=today in Sofia]

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(root, ".env.development.local"), "utf8")
    .split("\n")
    .map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l))
    .filter(Boolean)
    .map((m) => [m[1], m[2]])
);
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(env.NEXT_PUBLIC_SUPABASE_URL)) {
  throw new Error("Refusing to load test data into a non-local Supabase.");
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const portions = Number(process.argv[2] ?? 20);
const today = process.argv[3] ?? new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());
const d = new Date(`${today}T00:00:00Z`);
const wd = d.getUTCDay();
d.setUTCDate(d.getUTCDate() + (wd === 0 ? 1 : 1 - wd));
const monday = d.toISOString().slice(0, 10);

const check = ({ error }) => {
  if (error) throw error;
};
check(await db.from("settings").update({ hours_confirmed_at: new Date().toISOString(), owner_notification_email: "owner@gourmand.test" }).eq("id", 1));
check(await db.rpc("prefill_week", { p_monday: monday }));
const dates = Array.from({ length: 6 }, (_, i) => {
  const x = new Date(`${monday}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + i);
  return x.toISOString().slice(0, 10);
});
check(await db.from("menu_day_dishes").update({ portions }).in("menu_date", dates));
check(await db.from("menu_days").update({ status: "published", published_at: new Date().toISOString() }).in("menu_date", dates));
console.log(`Test data: hours confirmed, week of ${monday} published with ${portions} portions per dish.`);
