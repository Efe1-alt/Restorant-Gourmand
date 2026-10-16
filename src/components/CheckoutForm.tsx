"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { siteConfig } from "@/lib/site-config";
import { useSofiaNow } from "@/lib/use-sofia-now";
import { LAST_ORDER_KEY, type PlacedOrder } from "@/lib/placed-order";
import {
  formatCents,
  nextOpening,
  orderTotals,
  todaysTimeOptions,
  validateOrderForm,
  type FormErrors,
  type Fulfillment,
  type OrderForm,
  type OrderRequest,
  type Payment,
} from "@/lib/ordering";

const inputClass =
  "mt-1.5 w-full rounded-lg border bg-cream px-4 py-3 text-base outline-none transition-colors focus:border-terracotta aria-[invalid=true]:border-terracotta-dark";

const FIELD_ORDER: (keyof OrderForm)[] = ["fulfillment", "name", "phone", "address", "time", "payment", "note"];

function Field({
  id,
  label,
  error,
  children,
  className = "",
}: {
  id: string;
  label: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-terracotta-dark">
          {error}
        </p>
      )}
    </div>
  );
}

// Хапчета за избор (радио бутони), в стила на табовете в менюто.
function PillChoice<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
}: {
  name: string;
  legend: string;
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map(([optionValue, label]) => (
          <label
            key={optionValue}
            className={`flex min-h-11 cursor-pointer items-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-terracotta has-[:focus-visible]:ring-offset-2 ${
              value === optionValue
                ? "bg-terracotta text-cream"
                : "border border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
              className="sr-only"
            />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Summary({ fulfillment }: { fulfillment: Fulfillment }) {
  const { items, subtotalCents, openCart } = useCart();
  const totals = orderTotals(subtotalCents, fulfillment);
  return (
    <div>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">
                {item.quantity} × {item.name}
              </p>
              {item.weight && <p className="mt-0.5 text-ink-soft">{item.weight}</p>}
            </div>
            <span className="shrink-0 font-semibold text-terracotta">
              {formatCents(item.price * item.quantity)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">Междинна сума</dt>
          <dd>{formatCents(totals.subtotalCents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Доставка</dt>
          {/* ПОТВЪРДИ С КЛИЕНТА: цената идва от siteConfig.ordering.deliveryFeeCents */}
          <dd className="text-right">
            {totals.deliveryCents === null ? "Уточнява се по телефона" : formatCents(totals.deliveryCents)}
          </dd>
        </div>
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
          <dt>Общо</dt>
          <dd>{formatCents(totals.totalCents)}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={openCart}
        className="mt-3 min-h-11 text-sm font-semibold text-terracotta hover:text-terracotta-dark"
      >
        Промени количката
      </button>
    </div>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const { items, count, subtotalCents, clear } = useCart();
  const now = useSofiaNow();
  const formRef = useRef<HTMLFormElement>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [payment, setPayment] = useState<Payment>("cash");
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const options = now ? todaysTimeOptions(now) : null;
  const closedToday = options !== null && !options.asap && options.slots.length === 0;
  const totals = orderTotals(subtotalCents, fulfillment);

  if (status === "done") {
    return <p className="py-24 text-center text-ink-soft">Пренасочване…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-ink-soft">Количката е празна</p>
        <Link
          href="/menu"
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-terracotta px-7 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark"
        >
          Разгледай менюто
        </Link>
      </div>
    );
  }

  function readForm(form: HTMLFormElement): OrderForm {
    const data = new FormData(form);
    const get = (key: string) => String(data.get(key) ?? "");
    return {
      fulfillment,
      payment,
      name: get("name").trim(),
      phone: get("phone").trim(),
      address: get("address").trim(),
      time: get("time"),
      note: get("note").trim(),
    };
  }

  function focusFirstError(found: FormErrors) {
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!now || status === "submitting") return;
    setServerError(null);

    const form = readForm(e.currentTarget);
    const found = validateOrderForm(form, now);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }

    setStatus("submitting");
    const payload: OrderRequest = {
      ...form,
      items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
    };

    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        order?: PlacedOrder;
        message?: string;
        errors?: FormErrors;
      };

      if (res.ok && data.order) {
        try {
          window.sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify(data.order));
        } catch {}
        setStatus("done");
        router.push("/porachka/blagodarim");
        clear();
        return;
      }

      setStatus("idle");
      if (data.errors && Object.keys(data.errors).length > 0) {
        setErrors(data.errors);
        focusFirstError(data.errors);
      } else if (res.status === 409 && data.message) {
        setServerError(data.message);
      } else {
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
    } catch {
      setStatus("idle");
      setServerError(
        `Нещо се обърка. Моля, опитайте отново или се обадете на ${siteConfig.contact.phone}.`
      );
    }
  }

  const fieldProps = (name: keyof OrderForm) => ({
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: `${inputClass} ${errors[name] ? "border-terracotta-dark" : "border-line"}`,
  });

  const summaryTitle = `Вашата поръчка · ${count} · ${formatCents(totals.totalCents)}`;
  const blocked = totals.missingCents > 0;

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      {/* На мобилни обобщението е отгоре, сгънато. */}
      <details className="group rounded-2xl border border-line bg-cream-soft lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {summaryTitle}
          <span aria-hidden className="text-terracotta transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="px-5 pb-4">
          <Summary fulfillment={fulfillment} />
        </div>
      </details>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="rounded-2xl border border-line bg-cream-soft p-5 sm:p-8 lg:col-span-7"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <PillChoice
              name="fulfillment"
              legend="Начин на получаване"
              value={fulfillment}
              onChange={setFulfillment}
              options={[
                ["delivery", "Доставка"],
                ["pickup", "Вземане от място"],
              ]}
            />
          </div>

          <Field id="name" label="Име" error={errors.name}>
            <input {...fieldProps("name")} autoComplete="name" placeholder="Вашето име" />
          </Field>

          <Field id="phone" label="Телефон" error={errors.phone}>
            <input
              {...fieldProps("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="08XXXXXXXX"
            />
          </Field>

          {fulfillment === "delivery" ? (
            <Field id="address" label="Адрес за доставка" error={errors.address} className="sm:col-span-2">
              <input
                {...fieldProps("address")}
                autoComplete="street-address"
                placeholder="Улица, номер, блок, вход, етаж"
              />
            </Field>
          ) : (
            <p className="text-sm text-ink-soft sm:col-span-2">Вземане от {siteConfig.contact.address}.</p>
          )}

          {/* ПОТВЪРДИ С КЛИЕНТА: часовете идват от siteConfig.orderHours (работното време). */}
          <Field id="time" label="Желан час" error={errors.time}>
            <select
              key={options ? `${options.asap}-${options.slots[0] ?? ""}` : "loading"}
              {...fieldProps("time")}
              defaultValue=""
              disabled={options === null || closedToday}
            >
              <option value="" disabled>
                {closedToday ? "За днес вече не приемаме" : "Изберете час"}
              </option>
              {options?.asap && <option value="asap">Възможно най-скоро</option>}
              {options?.slots.map((t) => (
                <option key={t} value={t}>
                  Днес в {t}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <PillChoice
              name="payment"
              legend="Начин на плащане"
              value={payment}
              onChange={setPayment}
              options={[
                ["cash", "В брой"],
                ["card", fulfillment === "delivery" ? "С карта при доставка" : "С карта на място"],
              ]}
            />
          </div>

          <Field
            id="note"
            label={
              <>
                Бележка <span className="font-normal text-ink-soft">(по избор)</span>
              </>
            }
            error={errors.note}
            className="sm:col-span-2"
          >
            <textarea
              {...fieldProps("note")}
              rows={2}
              maxLength={500}
              placeholder="Напр. без лук, звънецът не работи"
            />
          </Field>
        </div>

        {closedToday && now && (
          <p className="mt-5 text-sm text-ink-soft">
            За днес вече не приемаме онлайн поръчки
            {nextOpening(now) ? ` — заповядайте ${nextOpening(now)}.` : "."}
          </p>
        )}

        {blocked && (
          <p className="mt-5 text-sm font-medium text-terracotta-dark">
            Остават {formatCents(totals.missingCents)} до минималната поръчка
          </p>
        )}

        {serverError && (
          <p role="alert" className="mt-5 text-sm font-medium text-terracotta-dark">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={status === "submitting" || closedToday || blocked || now === null}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-terracotta px-8 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {status === "submitting" ? "Изпращане…" : "Изпрати поръчката"}
        </button>
      </form>

      <aside className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-28 rounded-2xl border border-line bg-cream-soft p-6">
          <h2 className="text-xl font-medium">Вашата поръчка</h2>
          <div className="mt-2">
            <Summary fulfillment={fulfillment} />
          </div>
        </div>
      </aside>
    </div>
  );
}
