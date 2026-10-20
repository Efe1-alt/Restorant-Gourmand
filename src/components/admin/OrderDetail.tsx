"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import {
  acceptAction,
  advanceAction,
  cancelAction,
  markPaidAction,
  refundAction,
  rejectAction,
  retryEmailAction,
} from "@/app/(admin)/admin/actions";
import { slotLabel } from "@/lib/hours";
import {
  ACTION_LABELS_BG,
  METHOD_LABELS_BG,
  PAYMENT_LABELS_BG,
  STATUS_LABELS_BG,
  isBeforePreparation,
  nextStatuses,
  refundableCents,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/order-status";
import { formatCents } from "@/lib/pricing";
import { formatPhone } from "@/lib/validation";
import type { getOrderDetail } from "@/lib/server/admin-data";
import { Button, Card, Input, Label, Notice, PageTitle, StatusBadge, Textarea } from "./ui";

type Detail = NonNullable<Awaited<ReturnType<typeof getOrderDetail>>>;

const fmt = new Intl.DateTimeFormat("bg-BG", { timeZone: "Europe/Sofia", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

const EMAIL_KINDS: Record<string, string> = {
  owner_new_order: "До собственика: нова поръчка",
  owner_reminder: "До собственика: напомняне",
  customer_received: "До клиента: получена",
  customer_accepted: "До клиента: приета",
  customer_rejected: "До клиента: отказана",
  customer_cancelled: "До клиента: анулирана",
  customer_refund: "До клиента: възстановяване",
};

export function OrderDetail({ detail }: { detail: Detail }) {
  const { order, emails, audit } = detail;
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [panel, setPanel] = useState<null | "reject" | "cancel" | "refund">(null);
  const [reason, setReason] = useState("");
  const [restore, setRestore] = useState(false);
  const [amount, setAmount] = useState("");
  const [confirmRefund, setConfirmRefund] = useState(false);

  const status = order.status as OrderStatus;
  const fulfilment = order.fulfilment as "delivery" | "pickup";
  const payment = (Array.isArray(order.payments) ? order.payments[0] : order.payments) ?? null;
  const refunds = order.refunds ?? [];
  const pendingRefunds = refunds.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount_cents, 0);
  const refundable = refundableCents({ ...order, payment_status: order.payment_status as PaymentStatus, pending_refund_cents: pendingRefunds });
  const forward = nextStatuses(fulfilment, status).filter((s) => s !== "rejected" && s !== "cancelled" && s !== "accepted");
  const canCancel = nextStatuses(fulfilment, status).includes("cancelled");
  const early = isBeforePreparation(status);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    start(async () => {
      const r = await fn();
      setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Готово." : "Грешка.") });
      if (r.ok) {
        setPanel(null);
        setReason("");
        setConfirmRefund(false);
        after?.();
      }
    });
  }

  const items = [...order.order_items].sort((a, b) => a.id - b.id);

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/admin" className="text-terracotta">
          ← Опашка
        </Link>
      </p>
      <PageTitle actions={<StatusBadge status={status} label={STATUS_LABELS_BG[status]} />}>{order.number}</PageTitle>

      {msg && (
        <div className="mb-4">
          <Notice tone={msg.ok ? "ok" : "error"}>{msg.text}</Notice>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink-soft">Клиент</dt>
                <dd className="font-semibold">{order.customer_name}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Телефон</dt>
                <dd>
                  {order.customer_phone ? (
                    <a href={`tel:${order.customer_phone}`} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-terracotta">
                      <Phone aria-hidden className="h-4 w-4" /> {formatPhone(order.customer_phone)}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft">Имейл</dt>
                <dd>{order.customer_email ?? "— (промени по телефона)"}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">{fulfilment === "delivery" ? "Доставка" : "Вземане от място"}</dt>
                <dd className="font-semibold">{order.requested_time === "asap" ? "Възможно най-скоро" : slotLabel(order.requested_time)}</dd>
              </div>
              {fulfilment === "delivery" && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-soft">Адрес</dt>
                  <dd className="font-semibold">
                    {order.address} ({order.district_name})
                  </dd>
                </div>
              )}
              {order.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-soft">Бележка</dt>
                  <dd className="rounded-lg bg-gold/15 px-3 py-2">{order.notes}</dd>
                </div>
              )}
              {order.reason && (
                <div className="sm:col-span-2">
                  <dt className="text-ink-soft">Причина / бележка към статуса</dt>
                  <dd>{order.reason}</dd>
                </div>
              )}
              <div>
                <dt className="text-ink-soft">Създадена</dt>
                <dd>{fmt.format(new Date(order.created_at))}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Език</dt>
                <dd>{order.locale === "en" ? "Английски" : "Български"}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Ястия</h2>
            <ul className="divide-y divide-line text-sm">
              {items.map((i) => (
                <li key={i.id} className="flex justify-between gap-4 py-2">
                  <span>
                    <span className="font-semibold">{i.quantity} ×</span> {i.name_bg} <span className="text-ink-soft">{i.weight}</span>
                  </span>
                  <span>{formatCents(i.line_total_cents)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-2 space-y-1 border-t border-line pt-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Храна</dt><dd>{formatCents(order.subtotal_cents)}</dd></div>
              {order.discount_cents > 0 && <div className="flex justify-between"><dt className="text-ink-soft">Отстъпка за вземане</dt><dd>{formatCents(-order.discount_cents)}</dd></div>}
              {fulfilment === "delivery" && <div className="flex justify-between"><dt className="text-ink-soft">Доставка</dt><dd>{formatCents(order.delivery_fee_cents)}</dd></div>}
              <div className="flex justify-between text-base font-semibold"><dt>Общо</dt><dd>{formatCents(order.total_cents)}</dd></div>
              {order.refunded_cents > 0 && <div className="flex justify-between text-olive"><dt>Възстановено</dt><dd>{formatCents(order.refunded_cents)}</dd></div>}
            </dl>
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">Имейли</h2>
            {emails.length === 0 ? (
              <p className="text-sm text-ink-soft">Няма.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {emails.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-cream-soft px-3 py-2">
                    <span>
                      {EMAIL_KINDS[e.kind] ?? e.kind} —{" "}
                      <span className={e.status === "sent" ? "text-olive" : e.status === "failed" ? "text-terracotta-dark" : ""}>
                        {e.status === "sent" ? "изпратен" : e.status === "failed" ? `неуспешен (${e.attempts})` : e.status}
                      </span>
                      {e.last_error && e.status !== "sent" && <span className="block text-xs text-ink-soft">{e.last_error}</span>}
                    </span>
                    {e.status !== "sent" && (
                      <Button size="sm" disabled={pending} onClick={() => run(() => retryEmailAction(e.id))}>
                        Изпрати пак
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-2 font-semibold">История</h2>
            <ol className="space-y-1 text-sm">
              {audit.map((a) => {
                const d = a.details as Record<string, string>;
                return (
                  <li key={a.id} className="flex gap-3">
                    <span className="shrink-0 text-ink-soft">{fmt.format(new Date(a.created_at))}</span>
                    <span>
                      {a.action === "order.status"
                        ? `${STATUS_LABELS_BG[d.from as OrderStatus] ?? d.from} → ${STATUS_LABELS_BG[d.to as OrderStatus] ?? d.to}`
                        : a.action}{" "}
                      <span className="text-ink-soft">({a.actor === "owner" ? "собственик" : a.actor === "stripe" ? "Stripe" : a.actor === "customer" ? "клиент" : "система"})</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-2 font-semibold">Плащане</h2>
            <p className="text-sm">
              {METHOD_LABELS_BG[order.payment_method as keyof typeof METHOD_LABELS_BG]}
              <br />
              <span className="font-semibold">{PAYMENT_LABELS_BG[order.payment_status as PaymentStatus]}</span>
            </p>
            {payment?.failure_message && <p className="mt-1 text-xs text-terracotta-dark">Последен опит: {payment.failure_message}</p>}
            {payment?.stripe_payment_intent_id && <p className="mt-1 break-all text-xs text-ink-soft">Stripe: {payment.stripe_payment_intent_id}</p>}
            {order.payment_method !== "card" && order.payment_status === "pending" && status !== "abandoned" && (
              <Button className="mt-3 w-full" tone="olive" disabled={pending} onClick={() => run(() => markPaidAction(order.id))}>
                Отбележи като платена
              </Button>
            )}
            {refunds.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs">
                {refunds.map((r) => (
                  <li key={r.id}>
                    {formatCents(r.amount_cents)} — {r.status === "succeeded" ? "потвърдено от Stripe" : r.status === "pending" ? "чака Stripe" : `неуспешно${r.failure_reason ? `: ${r.failure_reason}` : ""}`} · {r.reason}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold">Действия</h2>
            <div className="grid gap-2">
              {status === "new" && (
                <>
                  <Button tone="primary" size="lg" disabled={pending} onClick={() => run(() => acceptAction(order.id))}>
                    {order.payment_method === "card" ? "Приеми и изтегли сумата" : "Приеми"}
                  </Button>
                  <Button tone="danger" disabled={pending} onClick={() => setPanel("reject")}>
                    Откажи
                  </Button>
                </>
              )}
              {forward.map((s) => (
                <Button key={s} tone="olive" size="lg" disabled={pending} onClick={() => run(() => advanceAction(order.id, s))}>
                  {ACTION_LABELS_BG[s]}
                </Button>
              ))}
              {canCancel && status !== "new" && (
                <Button tone="danger" disabled={pending} onClick={() => { setPanel("cancel"); setRestore(early); }}>
                  Анулирай (по телефона)
                </Button>
              )}
              {status === "new" && (
                <Button disabled={pending} onClick={() => { setPanel("cancel"); setRestore(true); }}>
                  Клиентът се отказа
                </Button>
              )}
              {refundable > 0 && (
                <Button disabled={pending} onClick={() => { setPanel("refund"); setAmount((refundable / 100).toFixed(2).replace(".", ",")); }}>
                  Възстанови сума…
                </Button>
              )}
              {status !== "new" && forward.length === 0 && !canCancel && refundable === 0 && !(order.payment_method !== "card" && order.payment_status === "pending") && (
                <p className="text-sm text-ink-soft">Поръчката е приключена — няма други действия.</p>
              )}
            </div>

            {panel === "reject" && (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <Label htmlFor="reason">Причина (вижда я клиентът)</Label>
                <Textarea id="reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
                <p className="text-xs text-ink-soft">Порциите се връщат. Резервацията по картата се освобождава.</p>
                <Button tone="danger" disabled={pending} onClick={() => run(() => rejectAction(order.id, reason))}>
                  Потвърди отказа
                </Button>
              </div>
            )}

            {panel === "cancel" && (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <Label htmlFor="creason">Причина</Label>
                <Textarea id="creason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
                {early ? (
                  <p className="text-xs text-ink-soft">
                    Преди приготвяне: порциите се връщат автоматично
                    {order.payment_status === "paid" ? `, а клиентът получава пълно възстановяване (${formatCents(refundable)}), включително доставката.` : order.payment_status === "authorised" ? ", а резервацията по картата се освобождава." : "."}
                  </p>
                ) : (
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" checked={restore} onChange={(e) => setRestore(e.target.checked)} className="h-5 w-5 accent-terracotta" />
                    Върни порциите в наличност
                  </label>
                )}
                {!early && order.payment_status === "paid" && <p className="text-xs text-ink-soft">Възстановяване на сума (ако решите) — с „Възстанови сума…“ след анулирането.</p>}
                <Button tone="danger" disabled={pending} onClick={() => run(() => cancelAction(order.id, reason, restore))}>
                  Потвърди анулирането
                </Button>
              </div>
            )}

            {panel === "refund" && (
              <div className="mt-4 space-y-2 border-t border-line pt-4">
                <Label htmlFor="amount" hint={`(до ${formatCents(refundable)})`}>
                  Сума за възстановяване, €
                </Label>
                <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setConfirmRefund(false); }} />
                <Label htmlFor="rreason">Причина</Label>
                <Textarea id="rreason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
                {!confirmRefund ? (
                  <Button tone="primary" disabled={pending || !reason.trim()} onClick={() => setConfirmRefund(true)}>
                    Продължи
                  </Button>
                ) : (
                  <>
                    <Notice tone="warn">
                      Ще възстановите <strong>{amount} €</strong> по картата на клиента. Това не може да се отмени.
                    </Notice>
                    <Button tone="danger" disabled={pending} onClick={() => run(() => refundAction(order.id, amount, reason))}>
                      Потвърди възстановяването
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
