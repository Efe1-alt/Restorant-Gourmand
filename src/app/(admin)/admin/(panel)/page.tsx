import type { Metadata } from "next";
import { QueueBoard } from "@/components/admin/QueueBoard";
import { getQueue } from "@/lib/server/admin-data";
import { getShopConfig } from "@/lib/server/catalog";

export const metadata: Metadata = { title: "Опашка" };

export default async function QueuePage() {
  const [queue, shop] = await Promise.all([getQueue(), getShopConfig("bg")]);
  return <QueueBoard initial={queue} checkoutOpen={shop.ordering.hoursConfirmed && !shop.ordering.paused} />;
}
