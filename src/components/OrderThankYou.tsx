"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { LAST_ORDER_KEY, type PlacedOrder } from "@/lib/placed-order";
import { fulfillmentLabels, formatCents, paymentLabels } from "@/lib/ordering";

// Последната поръчка от sessionStorage (записва я CheckoutForm). На сървъра
// е null, за да няма hydration разминаване.
const noopSubscribe = () => () => {};
function readRaw() {
  try {
    return window.sessionStorage.getItem(LAST_ORDER_KEY) ?? "";
  } catch {
    return "";
  }
}

const backButton =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-terracotta px-8 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark";

export function OrderThankYou() {
  const raw = useSyncExternalStore(noopSubscribe, readRaw, () => null);
  const order = useMemo<PlacedOrder | null>(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PlacedOrder;
    } catch {
      return null;
    }
  }, [raw]);

  if (raw === null) return null;

  if (!order) {
    return (
      <div className="text-center">
        <h1 className="text-3xl font-medium sm:text-4xl">Няма скорошна поръчка</h1>
        <Link href="/menu" className={`${backButton} mt-8`}>
          Обратно към менюто
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">Благодарим!</h1>
        <p className="mt-4 text-ink-soft">
          Поръчка <span className="font-semibold text-ink">{order.number}</span>
        </p>
        <p className="mt-2 text-ink-soft">Ще ви се обадим за потвърждение.</p>
      </div>

      <div className="mt-10 rounded-2xl border border-line bg-cream-soft p-5 sm:p-8">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Начин</dt>
            <dd className="font-medium">{fulfillmentLabels[order.fulfillment]}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Час</dt>
            <dd className="font-medium">{order.timeLabel}</dd>
          </div>
          {order.address && (
            <div className="sm:col-span-2">
              <dt className="text-ink-soft">Адрес</dt>
              <dd className="font-medium">{order.address}</dd>
            </div>
          )}
          <div>
            <dt className="text-ink-soft">Плащане</dt>
            <dd className="font-medium">{paymentLabels[order.payment]}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Телефон</dt>
            <dd className="font-medium">{order.phone}</dd>
          </div>
        </dl>

        <ul className="mt-6 divide-y divide-line border-t border-line">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {item.quantity} × {item.name}
                </p>
                {item.weight && <p className="mt-0.5 text-ink-soft">{item.weight}</p>}
              </div>
              <span className="shrink-0 font-semibold text-terracotta">{formatCents(item.lineTotal)}</span>
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Междинна сума</dt>
            <dd>{formatCents(order.subtotalCents)}</dd>
          </div>
          {order.fulfillment === "delivery" && (
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Доставка</dt>
              <dd className="text-right">
                {order.deliveryCents === null ? "Уточнява се по телефона" : formatCents(order.deliveryCents)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Общо</dt>
            <dd>{formatCents(order.totalCents)}</dd>
          </div>
        </dl>

        {order.note && <p className="mt-4 text-sm text-ink-soft">Бележка: {order.note}</p>}
      </div>

      <div className="mt-10 text-center">
        <Link href="/menu" className={backButton}>
          Обратно към менюто
        </Link>
      </div>
    </div>
  );
}
