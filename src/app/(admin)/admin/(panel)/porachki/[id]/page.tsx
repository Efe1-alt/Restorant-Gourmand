import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderDetail } from "@/components/admin/OrderDetail";
import { getOrderDetail } from "@/lib/server/admin-data";
import { db } from "@/lib/server/supabase";

export const metadata: Metadata = { title: "Поръчка" };

export default async function OrderPage({ params }: PageProps<"/admin/porachki/[id]">) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const detail = await getOrderDetail(id);
  if (!detail) notFound();
  // Opening an order counts as seeing it.
  if (detail.order.status === "new" && !detail.order.acknowledged_at) {
    await db().from("orders").update({ acknowledged_at: new Date().toISOString() }).eq("id", id);
  }
  return <OrderDetail detail={detail} />;
}
