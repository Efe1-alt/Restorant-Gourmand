"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { slotLabel } from "@/lib/hours";
import { localizeWeight } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/locale-context";
import { formatCents } from "@/lib/pricing";
import { href } from "@/lib/routes";
import type { OrderStatusView } from "@/lib/server/order-status-view";
import { siteConfig } from "@/lib/site-config";

const FINAL = ["abandoned", "delivered", "delivery_failed", "picked_up", "not_collected", "rejected", "cancelled"];
const PROGRESS: Record<"delivery" | "pickup", string[]> = {
  delivery: ["new", "accepted", "preparing", "out_for_delivery", "delivered"],
  pickup: ["new", "accepted", "preparing", "ready_for_pickup", "picked_up"],
};

const noopSubscribe = () => () => {};

export function OrderStatus({ token, initial }: { token: string; initial: OrderStatusView }) {
  const locale = useLocale();
  const t = useT().status;
  const [view, setView] = useState(initial);
  const search = useSyncExternalStore(noopSubscribe, () => window.location.search, () => "");
  const params = new URLSearchParams(search);
  const returnedPaid = params.has("paid");
  const returnedCancelled = params.has("cancelled");

  // Poll until the order reaches a final state (faster right after payment).
  useEffect(() => {
    if (FINAL.includes(view.status)) return;
    const every = view.status === "awaiting_payment" ? 3000 : 15000;
    const id = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/order/status?token=${encodeURIComponent(token)}`, { cache: "no-store" });
        if (res.ok) setView((await res.json()) as OrderStatusView);
      } catch {}
    }, every);
    return () => window.clearInterval(id);
  }, [token, view.status]);

  const steps = PROGRESS[view.fulfilment];
  const stepIndex = steps.indexOf(view.status);
  const name = (i: OrderStatusView["items"][number]) => (locale === "en" ? (i.nameEn ?? i.name) : i.name);
  const time = view.requestedTime === "asap" ? (locale === "bg" ? "Възможно най-скоро" : "As soon as possible") : slotLabel(view.requestedTime);
  const bad = ["rejected", "cancelled", "abandoned", "delivery_failed", "not_collected"].includes(view.status);

  return (
    <div>
      <p className="text-sm text-ink-soft">
        {t.number} <span className="font-semibold text-ink">{view.number}</span>
      </p>
      <h1 className="mt-2 text-balance text-3xl font-medium leading-tight sm:text-4xl" aria-live="polite">
        {t.labels[view.status] ?? view.status}
      </h1>
      {t.hints[view.status] && <p className="mt-3 text-ink-soft">{t.hints[view.status]}</p>}

      {view.status === "awaiting_payment" && returnedPaid && (
        <p role="status" className="mt-4 rounded-xl bg-cream-soft px-5 py-3 text-sm">
          {t.paymentReturned}
        </p>
      )}
      {view.status === "awaiting_payment" && returnedCancelled && (
        <p role="status" className="mt-4 rounded-xl bg-cream-soft px-5 py-3 text-sm">
          {t.paymentCancelled}
        </p>
      )}
      {view.checkoutUrl && (
        <a
          href={view.checkoutUrl}
          className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-terracotta px-8 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
        >
          {t.payNow}
        </a>
      )}

      {stepIndex >= 0 && !bad && (
        <ol className="mt-8 grid grid-cols-5 gap-1.5" aria-label={t.title}>
          {steps.map((s, i) => (
            <li key={s} className="text-center">
              <span className={`block h-1.5 rounded-full ${i <= stepIndex ? "bg-olive" : "bg-line"}`} />
              <span className={`mt-2 block text-[11px] leading-tight sm:text-xs ${i === stepIndex ? "font-semibold text-ink" : "text-ink-soft"}`}>
                {t.labels[s]}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-10 rounded-2xl border border-line bg-cream-soft p-5 sm:p-8">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">{t.fulfilment[view.fulfilment]}</dt>
            <dd className="font-medium">{time}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">{t.payment}</dt>
            <dd className="font-medium">
              {t.method[view.paymentMethod]} · {t.paymentLabels[view.paymentStatus]}
            </dd>
          </div>
          {view.address && (
            <div className="sm:col-span-2">
              <dt className="text-ink-soft">{t.address}</dt>
              <dd className="font-medium">
                {view.address}
                {view.district ? `, ${view.district}` : ""}
              </dd>
            </div>
          )}
        </dl>

        <ul className="mt-6 divide-y divide-line border-t border-line">
          {view.items.map((item, i) => (
            <li key={i} className="flex justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {item.quantity} × {name(item)}
                </p>
                {item.weight && <p className="mt-0.5 text-ink-soft">{localizeWeight(item.weight, locale)}</p>}
              </div>
              <span className="shrink-0 font-semibold text-terracotta">{formatCents(item.lineTotalCents, locale)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
          {view.discountCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">{locale === "bg" ? "Отстъпка" : "Discount"}</dt>
              <dd>{formatCents(-view.discountCents, locale)}</dd>
            </div>
          )}
          {view.fulfilment === "delivery" && (
            <div className="flex justify-between">
              <dt className="text-ink-soft">{locale === "bg" ? "Доставка" : "Delivery"}</dt>
              <dd>{formatCents(view.deliveryFeeCents, locale)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>{locale === "bg" ? "Общо" : "Total"}</dt>
            <dd>{formatCents(view.totalCents, locale)}</dd>
          </div>
          {view.refundedCents > 0 && (
            <div className="flex justify-between text-olive">
              <dt>{t.refunded}</dt>
              <dd>{formatCents(view.refundedCents, locale)}</dd>
            </div>
          )}
        </dl>
      </div>

      <p className="mt-6 text-sm text-ink-soft">
        {t.private} {t.bookmark} {!FINAL.includes(view.status) && t.updated}
      </p>
      <p className="mt-2 text-sm">
        <a href={`tel:${siteConfig.contact.phoneE164}`} className="font-semibold text-terracotta hover:text-terracotta-dark">
          {t.questions(siteConfig.contact.phone)}
        </a>
      </p>
      <div className="mt-10">
        <Link href={href("menu", locale)} className="inline-flex min-h-12 items-center rounded-full border border-line px-7 text-sm font-semibold hover:border-terracotta hover:text-terracotta">
          {t.backToMenu}
        </Link>
      </div>
    </div>
  );
}
