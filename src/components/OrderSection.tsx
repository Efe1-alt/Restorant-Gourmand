"use client";

import { useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";
import { siteConfig } from "@/lib/site-config";
import { supabase } from "@/lib/supabase-client";
import { formatPrice, useCart } from "@/lib/cart";

type Status = "idle" | "submitting" | "success" | "error";
type Fulfillment = "delivery" | "pickup";

const SLOT_STEP_MINUTES = 30;

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

const DAY_NAMES = ["неделя", "понеделник", "вторник", "сряда", "четвъртък", "петък", "събота"];

// Поръчки само за днес: "веднага" (ако сме отворени) + слотове през 30 мин.
// до последната поръчка преди затваряне.
function todaysOptions(now: Date) {
  const today = siteConfig.orderHours[now.getDay()];
  if (!today) return { asap: false, slots: [] as string[] };
  const { open, close } = today;
  const { lastOrderMinutesBeforeClose, minLeadMinutes } = siteConfig.ordering;
  const openMin = toMinutes(open);
  const lastMin = toMinutes(close) - lastOrderMinutesBeforeClose;
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const asap = nowMin >= openMin && nowMin <= lastMin;
  const earliest = Math.max(openMin, nowMin + minLeadMinutes);
  const slots: string[] = [];
  for (
    let t = Math.ceil(earliest / SLOT_STEP_MINUTES) * SLOT_STEP_MINUTES;
    t <= lastMin;
    t += SLOT_STEP_MINUTES
  ) {
    slots.push(toTime(t));
  }
  return { asap, slots };
}

// "утре в 08:00" / "в понеделник в 08:00" — следващото отваряне след днес.
function nextOpening(now: Date) {
  for (let offset = 1; offset <= 7; offset++) {
    const day = (now.getDay() + offset) % 7;
    const hours = siteConfig.orderHours[day];
    if (hours) return `${offset === 1 ? "утре" : `в ${DAY_NAMES[day]}`} от ${hours.open}`;
  }
  return null;
}

// Текущата минута като външен store: на сървъра е null (часовете зависят от
// времето на посетителя), в браузъра се обновява на всяка минута.
function subscribeMinute(onChange: () => void) {
  const id = window.setInterval(onChange, 15_000);
  return () => window.clearInterval(id);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);

const inputClass =
  "mt-1.5 w-full rounded-lg border border-line bg-cream px-4 py-3 text-base outline-none transition-colors focus:border-terracotta";

export function OrderSection() {
  const { items, totalCents, setQty, clear } = useCart();
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [submittedPhone, setSubmittedPhone] = useState("");
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, () => null);
  const options = useMemo(
    () => (minute === null ? null : todaysOptions(new Date(minute * 60_000))),
    [minute]
  );

  const closedToday = options !== null && !options.asap && options.slots.length === 0;
  const opening = minute === null ? null : nextOpening(new Date(minute * 60_000));
  const isEmpty = items.length === 0;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    const form = new FormData(e.currentTarget);
    const clientName = String(form.get("name") ?? "").trim();
    const clientPhone = String(form.get("phone") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();
    const requestedTime = String(form.get("time") ?? "");
    const payment = String(form.get("payment") ?? "");
    const note = String(form.get("note") ?? "").trim();

    if (isEmpty) {
      setStatus("error");
      setErrorMsg("Количката е празна — добави поне едно ястие от менюто.");
      return;
    }

    if (
      clientName.length < 2 ||
      clientPhone.length < 6 ||
      !requestedTime ||
      !payment ||
      (fulfillment === "delivery" && address.length < 5)
    ) {
      setStatus("error");
      setErrorMsg("Провери въведените данни.");
      return;
    }

    if (!supabase) {
      setStatus("error");
      setErrorMsg("Онлайн поръчките временно не са достъпни. Обади ни се директно.");
      return;
    }

    const { error } = await supabase.from("orders").insert([
      {
        client_name: clientName,
        client_phone: clientPhone,
        fulfillment,
        address: fulfillment === "delivery" ? address : null,
        requested_time: requestedTime,
        payment,
        note: note || null,
        items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.priceCents / 100 })),
        total: totalCents / 100,
        status: "pending",
      },
    ]);

    if (error) {
      console.error(error);
      setStatus("error");
      setErrorMsg("Нещо се обърка. Опитай отново или ни се обади.");
      return;
    }

    setSubmittedPhone(clientPhone);
    setStatus("success");
    clear();
  }

  return (
    <section id="order" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8 sm:py-32">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <ScrollReveal>
            <h2 className="text-balance text-3xl font-medium leading-tight sm:text-4xl">
              Поръчай онлайн
            </h2>
            <p className="mt-5 text-ink-soft leading-relaxed">
              Избери ястия от менюто, а ние ще ги приготвим за доставка до теб
              или за вземане от нас. Плащаш при получаване — в брой или с
              карта.
            </p>
            <p className="mt-4 text-sm text-ink-soft/80 leading-relaxed">
              Ще ти се обадим, за да потвърдим поръчката и цената на
              доставката. За големи поръчки звънни директно на{" "}
              <a href={`tel:${siteConfig.contact.phone}`} className="text-terracotta">
                {siteConfig.contact.phone}
              </a>
              .
            </p>
          </ScrollReveal>
        </div>

        <div className="lg:col-span-7">
          <ScrollReveal delay={0.1}>
            {status === "success" ? (
              <div className="rounded-2xl border border-olive bg-olive/10 p-8 text-center">
                <p className="text-lg font-medium text-olive-dark">Получихме поръчката ти!</p>
                <p className="mt-2 text-ink-soft">
                  Ще ти се обадим на {submittedPhone} за потвърждение.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="mt-6 text-sm font-semibold text-terracotta"
                >
                  Направи нова поръчка
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl border border-line bg-cream-soft p-6 sm:p-8"
              >
                <h3 className="font-medium">Твоята поръчка</h3>

                {isEmpty ? (
                  <div className="mt-4 rounded-lg border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
                    Количката е празна.{" "}
                    <Link href="/menu" className="font-semibold text-terracotta">
                      Разгледай менюто →
                    </Link>
                  </div>
                ) : (
                  <>
                    <ul className="mt-3 divide-y divide-line">
                      {items.map((item) => (
                        <li key={item.name} className="flex items-center justify-between gap-4 py-3">
                          <span className="min-w-0 flex-1 text-sm">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQty(item.name, item.qty - 1)}
                              aria-label={`Намали ${item.name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-terracotta hover:text-terracotta"
                            >
                              −
                            </button>
                            <span className="w-5 text-center text-sm font-semibold">{item.qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(item.name, item.qty + 1)}
                              aria-label={`Увеличи ${item.name}`}
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-terracotta hover:text-terracotta"
                            >
                              +
                            </button>
                          </div>
                          <span className="w-16 text-right text-sm font-semibold text-terracotta">
                            {formatPrice(item.priceCents * item.qty)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-baseline justify-between border-t border-line pt-3">
                      <span className="text-sm text-ink-soft">Общо (без доставка)</span>
                      <span className="text-lg font-semibold">{formatPrice(totalCents)}</span>
                    </div>
                    <Link
                      href="/menu"
                      className="mt-2 inline-block text-sm font-semibold text-terracotta"
                    >
                      + Добави още от менюто
                    </Link>
                  </>
                )}

                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <fieldset className="sm:col-span-2">
                    <legend className="block text-sm font-medium">Начин на получаване</legend>
                    <div className="mt-1.5 grid grid-cols-2 gap-2 rounded-full border border-line bg-cream p-1">
                      {(
                        [
                          ["delivery", "Доставка"],
                          ["pickup", "Вземане от място"],
                        ] as const
                      ).map(([value, label]) => (
                        <label
                          key={value}
                          className={`cursor-pointer rounded-full py-2.5 text-center text-sm font-semibold transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-terracotta ${
                            fulfillment === value ? "bg-terracotta text-cream" : "text-ink-soft"
                          }`}
                        >
                          <input
                            type="radio"
                            name="fulfillment"
                            value={value}
                            checked={fulfillment === value}
                            onChange={() => setFulfillment(value)}
                            className="sr-only"
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="name" className="block text-sm font-medium">
                      Име
                    </label>
                    <input id="name" name="name" required minLength={2} className={inputClass} placeholder="Твоето име" />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium">
                      Телефон
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      className={inputClass}
                      placeholder="08XX XXX XXX"
                    />
                  </div>

                  {fulfillment === "delivery" ? (
                    <div className="sm:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium">
                        Адрес за доставка
                      </label>
                      <input
                        id="address"
                        name="address"
                        required
                        minLength={5}
                        autoComplete="street-address"
                        className={inputClass}
                        placeholder="Улица, номер, блок, вход, етаж"
                      />
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft sm:col-span-2">
                      Вземане от {siteConfig.contact.address}.
                    </p>
                  )}

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium">
                      Кога
                    </label>
                    <select
                      id="time"
                      name="time"
                      required
                      disabled={options === null || closedToday}
                      defaultValue=""
                      key={options ? `${options.asap}-${options.slots[0] ?? ""}` : "loading"}
                      className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <option value="" disabled>
                        {closedToday ? "За днес вече не приемаме" : "Избери час"}
                      </option>
                      {options?.asap && <option value="asap">Възможно най-скоро</option>}
                      {options?.slots.map((t) => (
                        <option key={t} value={t}>
                          Днес, {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="payment" className="block text-sm font-medium">
                      Плащане
                    </label>
                    <select id="payment" name="payment" required defaultValue="cash" className={inputClass}>
                      <option value="cash">В брой при получаване</option>
                      <option value="card">С карта при получаване</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="note" className="block text-sm font-medium">
                      Бележка <span className="font-normal text-ink-soft">(по желание)</span>
                    </label>
                    <textarea
                      id="note"
                      name="note"
                      rows={2}
                      maxLength={500}
                      className={inputClass}
                      placeholder="Алергии, звънец, без лук…"
                    />
                  </div>
                </div>

                {closedToday && (
                  <p className="mt-4 text-sm text-ink-soft">
                    За днес вече не приемаме онлайн поръчки
                    {opening ? ` — заповядай ${opening}.` : "."}
                  </p>
                )}

                {status === "error" && (
                  <p role="alert" className="mt-4 text-sm font-medium text-terracotta-dark">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={status === "submitting" || isEmpty || closedToday}
                  className="mt-6 w-full rounded-full bg-terracotta py-3.5 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
                >
                  {status === "submitting"
                    ? "Изпращане..."
                    : isEmpty
                      ? "Изпрати поръчка"
                      : `Изпрати поръчка · ${formatPrice(totalCents)}`}
                </button>
              </form>
            )}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
