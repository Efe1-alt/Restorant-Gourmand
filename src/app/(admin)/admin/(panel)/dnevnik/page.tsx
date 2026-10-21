import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/server/supabase";

export const metadata: Metadata = { title: "Дневник" };

const fmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const ACTORS: Record<string, string> = { owner: "Собственик", system: "Система", stripe: "Stripe", customer: "Клиент" };

// Status changes, stock adjustments, refunds and settings changes.
export default async function AuditPage({ searchParams }: PageProps<"/admin/dnevnik">) {
  const kind = (await searchParams).kind;
  let query = db().from("audit_log").select("*").order("id", { ascending: false }).limit(200);
  if (kind === "orders") query = query.eq("entity", "order");
  if (kind === "stock") query = query.like("action", "stock.%");
  if (kind === "settings") query = query.like("action", "settings.%");
  if (kind === "refunds") query = query.like("action", "refund.%");
  const { data } = await query;
  const tabs = [["", "Всичко"], ["orders", "Поръчки"], ["stock", "Наличност"], ["refunds", "Възстановявания"], ["settings", "Настройки"]];
  return (
    <div>
      <PageTitle>Дневник</PageTitle>
      <nav className="mb-4 flex flex-wrap gap-2">
        {tabs.map(([k, label]) => (
          <Link key={k} href={k ? `?kind=${k}` : "?"} className={`min-h-10 rounded-xl px-3.5 py-2 text-sm font-semibold ${(kind ?? "") === k ? "bg-terracotta text-cream" : "border border-line bg-paper"}`}>
            {label}
          </Link>
        ))}
      </nav>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper text-sm">
        {(data ?? []).map((a) => (
          <li key={a.id} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[160px_110px_1fr]">
            <span className="text-ink-soft">{fmt.format(new Date(a.created_at))}</span>
            <span>{ACTORS[a.actor] ?? a.actor}</span>
            <span>
              <span className="font-medium">{a.action}</span>{" "}
              {a.entity === "order" && a.entity_id ? (
                <Link href={`/admin/porachki/${a.entity_id}`} className="text-terracotta">
                  поръчка #{a.entity_id}
                </Link>
              ) : (
                <span className="text-ink-soft">
                  {a.entity} {a.entity_id}
                </span>
              )}
              {Object.keys((a.details as object) ?? {}).length > 0 && (
                <code className="mt-0.5 block break-all text-xs text-ink-soft">{JSON.stringify(a.details)}</code>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
