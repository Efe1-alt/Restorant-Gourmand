import { getOrderStatus } from "@/lib/server/order-status-view";

// Polled by the private status page. The token is the only key.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const view = await getOrderStatus(token);
  if (!view) return Response.json({ message: "Not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}
