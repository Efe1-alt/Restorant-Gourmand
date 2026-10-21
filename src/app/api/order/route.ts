import { after } from "next/server";
import { getNow } from "@/lib/server/clock";
import { placeOrder } from "@/lib/server/place-order";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Невалидна заявка." }, { status: 400 });
  }
  try {
    const result = await placeOrder(body, { headers: request.headers, now: await getNow(), after });
    if (!result.ok) {
      return Response.json({ message: result.message, errors: result.errors, code: result.code }, { status: result.status });
    }
    return Response.json(
      { number: result.number, statusUrl: result.statusUrl, checkoutUrl: result.checkoutUrl },
      { status: 201 }
    );
  } catch (e) {
    console.error("[order] failed:", e instanceof Error ? e.message : e);
    return Response.json({ message: "Поръчката не беше изпратена." }, { status: 500 });
  }
}
