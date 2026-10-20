import type { Metadata } from "next";
import Link from "next/link";
import { Card, Input, PageTitle, Select, StatusBadge, buttonClass } from "@/components/admin/ui";
import { METHOD_LABELS_BG, PAYMENT_LABELS_BG, STATUS_LABELS_BG, type OrderStatus, type PaymentStatus } from "@/lib/order-status";
import { formatCents } from "@/lib/pricing";
import { listOrders } from "@/lib/server/admin-data";

export const metadata: Metadata = { title: "Поръчки" };

const fmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function OrdersPage({ searchParams }: PageProps<"/admin/porachki">) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const filters = { q: one(sp.q), status: one(sp.status), date: one(sp.date), page: Number(one(sp.page)) || 1 };
  const { orders, count, page, pages } = await listOrders(filters);
  const qs = (p: number) => new URLSearchParams({ ...filters, page: String(p) } as Record<string, string>).toString();

  return (
    <div>
      <PageTitle>Поръчки</PageTitle>
      <Card>
        <form className="grid gap-3 sm:grid-cols-[1fr_200px_170px_auto]" role="search">
          <Input name="q" defaultValue={filters.q} placeholder="Номер, име или телефон" aria-label="Търсене" />
          <Select name="status" defaultValue={filters.status} aria-label="Статус">
            <option value="">Всички статуси</option>
            <option value="active">Активни (в опашката)</option>
            {Object.entries(STATUS_LABELS_BG).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Input name="date" type="date" defaultValue={filters.date} aria-label="Дата" />
          <button className={buttonClass("primary")}>Търси</button>
        </form>
      </Card>

      <p className="mt-4 text-sm text-ink-soft">{count} поръчки</p>
      <ul className="mt-2 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
        {orders.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/porachki/${o.id}`} className="grid gap-1 px-4 py-3 hover:bg-cream-soft sm:grid-cols-[170px_1fr_auto] sm:items-center sm:gap-4">
              <span className="font-semibold">{o.number}</span>
              <span className="text-sm">
                {o.customer_name} · <span className="text-ink-soft">{fmt.format(new Date(o.created_at))} · {o.fulfilment === "delivery" ? "Доставка" : "Вземане"} · {METHOD_LABELS_BG[o.payment_method as keyof typeof METHOD_LABELS_BG]} ({PAYMENT_LABELS_BG[o.payment_status as PaymentStatus]})</span>
              </span>
              <span className="flex items-center gap-3 sm:justify-end">
                <StatusBadge status={o.status} label={STATUS_LABELS_BG[o.status as OrderStatus]} />
                <span className="font-semibold">{formatCents(o.total_cents)}</span>
              </span>
            </Link>
          </li>
        ))}
        {orders.length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-soft">Няма поръчки по тези критерии.</li>}
      </ul>
      {pages > 1 && (
        <nav className="mt-4 flex justify-between" aria-label="Страници">
          {page > 1 ? <Link className={buttonClass()} href={`?${qs(page - 1)}`}>Предишна</Link> : <span />}
          <span className="self-center text-sm text-ink-soft">
            {page} / {pages}
          </span>
          {page < pages ? <Link className={buttonClass()} href={`?${qs(page + 1)}`}>Следваща</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
