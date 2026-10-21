import type { Metadata } from "next";
import Link from "next/link";
import { EmailRetry } from "@/components/admin/EmailRetry";
import { Notice, PageTitle } from "@/components/admin/ui";
import { db } from "@/lib/server/supabase";

export const metadata: Metadata = { title: "Имейли" };

const fmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function EmailsPage() {
  const { data } = await db()
    .from("email_outbox")
    .select("id, order_id, kind, status, attempts, last_error, created_at, sent_at, subject, orders(number)")
    .order("id", { ascending: false })
    .limit(100);
  const failed = (data ?? []).filter((e) => e.status === "failed").length;
  return (
    <div>
      <PageTitle>Имейли</PageTitle>
      {failed > 0 && (
        <div className="mb-4">
          <Notice tone="warn">{failed} неизпратени имейла. Поръчките са видими в опашката независимо от това.</Notice>
        </div>
      )}
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-paper">
        {(data ?? []).map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{e.subject}</span>
              <span className="block text-xs text-ink-soft">
                {fmt.format(new Date(e.created_at))} ·{" "}
                {e.order_id && (
                  <Link href={`/admin/porachki/${e.order_id}`} className="text-terracotta">
                    {(e.orders as { number: string } | null)?.number}
                  </Link>
                )}{" "}
                · {e.status === "sent" ? "изпратен" : e.status === "failed" ? `неуспешен (${e.attempts} опита)` : e.status}
              </span>
              {e.last_error && e.status !== "sent" && <span className="block text-xs text-terracotta-dark">{e.last_error}</span>}
            </span>
            {e.status !== "sent" && <EmailRetry id={e.id} />}
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="px-4 py-8 text-center text-sm text-ink-soft">Няма имейли.</li>}
      </ul>
    </div>
  );
}
