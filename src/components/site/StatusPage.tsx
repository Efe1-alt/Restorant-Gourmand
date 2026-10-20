import { notFound } from "next/navigation";
import { OrderStatus } from "@/components/OrderStatus";
import type { Locale } from "@/lib/routes";
import { getOrderStatus } from "@/lib/server/order-status-view";
import { PageFrame } from "./PageFrame";

export async function StatusPage({ locale, token }: { locale: Locale; token: string }) {
  const view = await getOrderStatus(token);
  if (!view) notFound();
  return (
    <PageFrame locale={locale}>
      <section className="mx-auto max-w-2xl px-5 pb-24 pt-32 sm:px-8 sm:pt-40">
        <OrderStatus token={token} initial={view} />
      </section>
    </PageFrame>
  );
}
