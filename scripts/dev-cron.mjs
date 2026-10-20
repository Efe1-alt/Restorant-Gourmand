// Optional: calls /api/cron every minute from the host. Normally not needed —
// pg_cron already does this (see the app_cron_via_pg_net migration).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const secret = /^CRON_SECRET=(.*)$/m.exec(readFileSync(join(root, ".env.development.local"), "utf8"))?.[1];
const url = process.env.CRON_URL ?? "http://localhost:3000/api/cron";

async function tick() {
  try {
    const res = await fetch(url, { headers: { authorization: `Bearer ${secret}` } });
    console.log(new Date().toISOString(), res.status, await res.text());
  } catch (e) {
    console.log(new Date().toISOString(), "error", e.message);
  }
}
await tick();
setInterval(tick, 60_000);
