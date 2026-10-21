"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, Phone, Volume2, VolumeX } from "lucide-react";
import { acceptAction, acknowledgeAction, advanceAction, rejectAction } from "@/app/(admin)/admin/actions";
import { slotLabel } from "@/lib/hours";
import { ACTION_LABELS_BG, METHOD_LABELS_BG, PAYMENT_LABELS_BG, STATUS_LABELS_BG, primaryNext, type OrderStatus, type PaymentStatus } from "@/lib/order-status";
import { formatCents } from "@/lib/pricing";
import { formatPhone } from "@/lib/validation";
import type { QueueOrder } from "@/lib/server/admin-data";
import { Button, Notice, PageTitle, StatusBadge, Textarea } from "./ui";

type Queue = { orders: QueueOrder[]; unacknowledged: number; serverTime: string };

const POLL_MS = 5000;
const CHIME_EVERY_MS = 20000;

// Two-tone chime with the Web Audio API (no file to load).
function chime(ctx: AudioContext) {
  const t = ctx.currentTime;
  [880, 1175, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, t + i * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.35, t + i * 0.22 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + i * 0.22);
    osc.stop(t + i * 0.22 + 0.22);
  });
}

function minutesAgo(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  return m < 1 ? "току-що" : `преди ${m} мин`;
}

export function QueueBoard({ initial, checkoutOpen }: { initial: Queue; checkoutOpen: boolean }) {
  const router = useRouter();
  const [queue, setQueue] = useState(initial);
  const [offline, setOffline] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const audio = useRef<AudioContext | null>(null);
  const lastChime = useRef(0);
  const lastCount = useRef(initial.unacknowledged);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/queue", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/admin/vhod");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setQueue((await res.json()) as Queue);
      setOffline(false);
    } catch {
      setOffline(true);
    }
    setNow(Date.now());
  }, [router]);

  useEffect(() => {
    const id = window.setInterval(poll, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  // Sound + title while something is unacknowledged.
  useEffect(() => {
    const n = queue.unacknowledged;
    document.title = n > 0 ? `(${n}) Нови поръчки — Gourmand` : "Опашка — Gourmand админ";
    const rose = n > lastCount.current;
    lastCount.current = n;
    if (n === 0 || !soundOn || !audio.current) return;
    if (rose || Date.now() - lastChime.current >= CHIME_EVERY_MS) {
      chime(audio.current);
      lastChime.current = Date.now();
    }
  }, [queue, soundOn]);

  function enableSound() {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio.current ??= new Ctx();
    void audio.current.resume();
    chime(audio.current);
    lastChime.current = Date.now();
    setSoundOn(true);
  }

  async function acknowledgeAll() {
    const ids = queue.orders.filter((o) => o.status === "new" && !o.acknowledged_at).map((o) => o.id);
    await acknowledgeAction(ids);
    await poll();
  }

  const newOrders = queue.orders.filter((o) => o.status === "new");
  const inProgress = queue.orders.filter((o) => o.status !== "new");

  return (
    <div>
      <PageTitle
        actions={
          soundOn ? (
            <Button size="sm" onClick={() => setSoundOn(false)} aria-pressed="true">
              <Volume2 aria-hidden className="h-4 w-4" /> Звукът е включен
            </Button>
          ) : (
            <Button tone="primary" size="md" onClick={enableSound}>
              <VolumeX aria-hidden className="h-4 w-4" /> Включи звука
            </Button>
          )
        }
      >
        Опашка
      </PageTitle>

      {!checkoutOpen && (
        <div className="mb-4">
          <Notice tone="warn">
            Онлайн поръчките са изключени (часовете не са потвърдени или поръчките са на пауза).{" "}
            <Link href="/admin/nastroyki" className="font-semibold underline">
              Настройки
            </Link>
          </Notice>
        </div>
      )}
      {offline && (
        <div className="mb-4">
          <Notice tone="error">Няма връзка със сървъра — опитваме отново на всеки 5 секунди.</Notice>
        </div>
      )}

      {queue.unacknowledged > 0 && (
        <div
          role="alert"
          className="sticky top-14 z-20 mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-terracotta px-4 py-3 text-cream shadow-lg lg:top-4"
        >
          <p className="flex items-center gap-2 text-base font-semibold">
            <BellRing aria-hidden className="h-5 w-5 animate-pulse motion-reduce:animate-none" />
            {queue.unacknowledged === 1 ? "1 нова поръчка" : `${queue.unacknowledged} нови поръчки`}
          </p>
          <button type="button" onClick={acknowledgeAll} className="min-h-11 rounded-xl bg-cream px-4 text-sm font-semibold text-terracotta-dark">
            Видях
          </button>
        </div>
      )}

      <section aria-labelledby="new-orders">
        <h2 id="new-orders" className="mb-3 text-sm font-semibold text-ink-soft">
          Нови ({newOrders.length})
        </h2>
        {newOrders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-soft">Няма нови поръчки.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {newOrders.map((o) => (
              <OrderCard key={o.id} order={o} now={now} highlight={!o.acknowledged_at} onChanged={poll} />
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="in-progress" className="mt-8">
        <h2 id="in-progress" className="mb-3 text-sm font-semibold text-ink-soft">
          В процес ({inProgress.length})
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {inProgress.map((o) => (
            <OrderCard key={o.id} order={o} now={now} highlight={false} onChanged={poll} />
          ))}
        </div>
      </section>
    </div>
  );
}

function OrderCard({ order, now, highlight, onChanged }: { order: QueueOrder; now: number; highlight: boolean; onChanged: () => Promise<void> }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const status = order.status as OrderStatus;
  const next = primaryNext(order.fulfilment as "delivery" | "pickup", status);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    start(async () => {
      const r = await fn();
      setMessage(r.message ? { ok: r.ok, text: r.message } : null);
      await onChanged();
    });
  }

  return (
    <article
      className={`rounded-2xl border bg-paper p-4 sm:p-5 ${highlight ? "border-terracotta ring-2 ring-terracotta/30" : "border-line"}`}
      aria-label={`Поръчка ${order.number}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`/admin/porachki/${order.id}`} className="text-lg font-semibold hover:text-terracotta">
            {order.number.slice(-4)} <span className="text-sm font-normal text-ink-soft">{order.number}</span>
          </Link>
          <p className="text-xs text-ink-soft">{minutesAgo(order.status_changed_at, now)}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={order.status} label={STATUS_LABELS_BG[status]} />
          <span className="rounded-full bg-cream-soft px-2.5 py-1 text-xs font-semibold">
            {order.fulfilment === "delivery" ? "Доставка" : "Вземане"} · {order.requested_time === "asap" ? "веднага" : slotLabel(order.requested_time)}
          </span>
        </div>
      </header>

      <div className="mt-3 space-y-1 text-sm">
        <p className="font-medium">{order.customer_name}</p>
        {order.customer_phone && (
          <a href={`tel:${order.customer_phone}`} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-terracotta">
            <Phone aria-hidden className="h-4 w-4" /> {formatPhone(order.customer_phone)}
          </a>
        )}
        {order.fulfilment === "delivery" && (
          <p>
            {order.address} <span className="text-ink-soft">({order.district_name})</span>
          </p>
        )}
        {order.notes && <p className="rounded-lg bg-gold/15 px-3 py-2">„{order.notes}“</p>}
      </div>

      <ul className="mt-3 space-y-0.5 border-t border-line pt-3 text-sm">
        {order.order_items.map((i, k) => (
          <li key={k}>
            <span className="font-semibold">{i.quantity} ×</span> {i.name_bg}
          </li>
        ))}
      </ul>
      <p className="mt-3 flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="text-ink-soft">
          {METHOD_LABELS_BG[order.payment_method as keyof typeof METHOD_LABELS_BG]} · {PAYMENT_LABELS_BG[order.payment_status as PaymentStatus]}
        </span>
        <span className="text-lg font-semibold">{formatCents(order.total_cents)}</span>
      </p>

      {message && (
        <div className="mt-3">
          <Notice tone={message.ok ? "ok" : "error"}>{message.text}</Notice>
        </div>
      )}

      {rejecting ? (
        <div className="mt-4 space-y-2">
          <label htmlFor={`reason-${order.id}`} className="text-sm font-semibold">
            Причина за отказа (вижда я клиентът)
          </label>
          <Textarea id={`reason-${order.id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          <div className="flex gap-2">
            <Button tone="danger" disabled={pending} onClick={() => run(() => rejectAction(order.id, reason))}>
              Потвърди отказа
            </Button>
            <Button onClick={() => setRejecting(false)}>Назад</Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {status === "new" ? (
            <>
              <Button tone="primary" size="lg" className="flex-1" disabled={pending} onClick={() => run(() => acceptAction(order.id))}>
                {pending ? "…" : order.payment_method === "card" ? "Приеми и изтегли" : "Приеми"}
              </Button>
              <Button tone="danger" size="lg" disabled={pending} onClick={() => setRejecting(true)}>
                Откажи
              </Button>
            </>
          ) : (
            next && (
              <Button tone="olive" size="lg" className="flex-1" disabled={pending} onClick={() => run(() => advanceAction(order.id, next))}>
                {pending ? "…" : ACTION_LABELS_BG[next]}
              </Button>
            )
          )}
          <Link href={`/admin/porachki/${order.id}`} className="inline-flex min-h-14 items-center rounded-xl border border-line px-4 text-sm font-semibold hover:border-terracotta">
            Детайли
          </Link>
        </div>
      )}
    </article>
  );
}
