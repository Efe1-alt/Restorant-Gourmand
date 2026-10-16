import { notifyRestaurant, placeOrder } from "@/lib/orders-server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Невалидна заявка." }, { status: 400 });
  }

  const result = placeOrder(body);
  if (!result.ok) {
    return Response.json(
      { message: result.message, errors: result.errors },
      { status: result.status }
    );
  }

  try {
    await notifyRestaurant(result.order);
  } catch (error) {
    console.error("notifyRestaurant се провали", error);
    return Response.json({ message: "Поръчката не беше изпратена." }, { status: 502 });
  }

  return Response.json({ order: result.order }, { status: 201 });
}
