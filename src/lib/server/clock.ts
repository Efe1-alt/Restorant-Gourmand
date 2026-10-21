import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { sofiaNow } from "@/lib/time";
import { env } from "./env";

export const TEST_CLOCK_COOKIE = "gm-test-now";

// The current time. In local development with ALLOW_TEST_CLOCK=1, Playwright
// can fix it with a cookie so tests don't depend on the real time of day.
// Never honoured in production.
export async function getNow(): Promise<Date> {
  // Today's menu, stock and opening state are per request: never prerender.
  await connection();
  if (env.allowTestClock) {
    const value = (await cookies()).get(TEST_CLOCK_COOKIE)?.value;
    if (value) {
      const fixed = new Date(value);
      if (!Number.isNaN(fixed.getTime())) return fixed;
    }
  }
  return new Date();
}

export async function getSofiaNow() {
  return sofiaNow(await getNow());
}
