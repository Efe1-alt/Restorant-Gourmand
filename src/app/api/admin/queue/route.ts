import { getOwner } from "@/lib/server/auth";
import { getQueue } from "@/lib/server/admin-data";

// Live order queue for the admin (polled every few seconds).
export async function GET() {
  const owner = await getOwner();
  if (!owner) return Response.json({ message: "Unauthorized" }, { status: 401 });
  return Response.json(await getQueue(), { headers: { "Cache-Control": "no-store" } });
}
