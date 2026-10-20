import { timingSafeEqual } from "node:crypto";
import { runScheduledJobs } from "@/lib/server/jobs";
import { env } from "@/lib/server/env";

// Every minute from Supabase pg_cron via pg_net (sends `Authorization: Bearer
// $CRON_SECRET`). `npm run cron` can do the same from the host.
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${env.cronSecret}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  if (!env.cronSecret || expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return Response.json(await runScheduledJobs());
}
