import { timingSafeEqual } from "node:crypto";
import { runScheduledJobs } from "@/lib/server/jobs";
import { env } from "@/lib/server/env";

// Every minute: Vercel Cron in production (sends `Authorization: Bearer
// $CRON_SECRET`), `npm run cron` locally.
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${env.cronSecret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  if (!env.cronSecret || expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runScheduledJobs());
}
