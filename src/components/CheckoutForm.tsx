"use client";

import { useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { checkoutState, nextOrderingDay, slotLabel, timeOptions, type Fulfilment } from "@/lib/hours";
import { localizeWeight, percentLabel } from "@/lib/i18n";
import { useLocale, useT } from "@/lib/locale-context";
import { computeQuote, formatCents } from "@/lib/pricing";
import { href } from "@/lib/routes";
import { useShop } from "@/lib/shop-context";
import { siteConfig } from "@/lib/site-config";
import { useSofiaNow } from "@/lib/use-sofia-now";
import {
  FIELD_ORDER,
  allowedPayments,
  validateCheckout,
  type CheckoutForm as Form,
  type FormErrors,
  type PaymentMethod,
} from "@/lib/validation";

const inputClass =
  "mt-1.5 w-full rounded-lg border bg-cream px-4 py-3 text-base outline-none transition-colors focus:border-terracotta";

function Field({ id, label, error, hint, children, className = "" }: { id: string; label: ReactNode; error?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm font-medium text-terracotta-dark">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

// Pill radio buttons, in the style of the menu tabs.
function PillChoice<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  hint,
  error,
}: {
  name: string;
  legend: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  hint?: string;
  error?: string;
}) {
  return (
    <fieldset aria-describedby={hint || error ? `${name}-hint` : undefined}>
      <legend className="block text-sm font-medium">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-11 cursor-pointer items-center rounded-full px-5 text-sm font-semibold transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-terracotta has-[:focus-visible]:ring-offset-2 ${
              value === o.value ? "bg-terracotta text-cream" : "border border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
      {(error || hint) && (
        <p id={`${name}-hint`} className={`mt-1.5 text-sm ${error ? "font-medium text-terracotta-dark" : "text-ink-soft"}`}>
          {error ?? hint}
        </p>
      )}
    </fieldset>
  );
}

export function CheckoutForm() {
  const router = useRouter();
  const locale = useLocale();
  const dict = useT();
  const t = dict.checkout;
  const { config } = useShop();
  const { items, count, loaded, clear, openCart } = useCart();
  const now = useSofiaNow();
  const formRef = useRef<HTMLFormElement>(null);

  const [fulfilment, setFulfilment] = useState<Fulfilment>("delivery");
  const [payment, setPayment] = useState<PaymentMethod>(config.cardEnabled ? "card" : "cash");
  const [districtId, setDistrictId] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "redirecting">("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const district = config.districts.find((d) => String(d.id) === districtId) ?? null;
  const quote = useMemo(
    () =>
      computeQuote({
        lines: items.map((i) => ({ unitPriceCents: i.priceCents, quantity: i.quantity })),
        fulfilment,
        districtFeeCents: district?.feeCents ?? null,
        settings: config.pricing,
      }),
    [items, fulfilment, district, config.pricing]
  );
  const state = now ? checkoutState(config.ordering, now) : null;
  const options = now ? timeOptions(config.ordering, now, fulfilment) : null;
  const payments = allowedPayments(fulfilment, config.cardEnabled);
  const effectivePayment = payments.includes(payment) ? payment : payments[payments.length - 1];
  const discountLabel = percentLabel(config.pricing.pickupDiscountBps, locale);

  if (!loaded || status === "redirecting") {
    return <p className="py-24 text-center text-ink-soft">{status === "redirecting" ? t.redirecting : "…"}</p>;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="text-ink-soft">{t.emptyCart}</p>
        <Link href={href("menu", locale)} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-terracotta px-7 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark">
          {t.browseMenu}
        </Link>
      </div>
    );
  }

  function closedMessage() {
    if (!state || state.open || !now) return null;
    const c = t.closed;
    let text = state.reason === "not_yet_open" ? c.not_yet_open(state.opensAt!) : c[state.reason];
    if (state.reason !== "hours_unconfirmed" && state.reason !== "not_yet_open" && state.reason !== "paused") {
      const next = nextOrderingDay(config.ordering, now);
      if (next) text += c.next(next.offset === 1 ? c.tomorrow(next.opens) : c.onDay(dict.week[next.weekday], next.opens));
    }
    return (
      <div role="status" className="rounded-xl border border-gold/60 bg-cream px-5 py-4 text-sm">
        <p className="font-medium">{text}</p>
        {config.pauseMessage && <p className="mt-1 text-ink-soft">{config.pauseMessage}</p>}
        <p className="mt-1 text-ink-soft">
          <a href={`tel:${siteConfig.contact.phoneE164}`} className="font-semibold text-terracotta hover:text-terracotta-dark">
            {c.callUs(siteConfig.contact.phone)}
          </a>
        </p>
      </div>
    );
  }

  function readForm(form: HTMLFormElement): Form {
    const data = new FormData(form);
    const get = (key: string) => String(data.get(key) ?? "");
    return {
      fulfilment,
      payment: effectivePayment,
      districtId,
      name: get("name").trim(),
      phone: get("phone").trim(),
      email: get("email").trim(),
      address: get("address").trim(),
      time: get("time"),
      notes: get("notes").trim(),
    };
  }

  function focusFirstError(found: FormErrors) {
    const first = FIELD_ORDER.find((key) => found[key]);
    if (first) formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!now || status !== "idle") return;
    setServerError(null);
    const formEl = e.currentTarget;
    const form = readForm(formEl);
    const found = validateCheckout(form, {
      locale,
      now,
      config: config.ordering,
      activeDistrictIds: config.districts.map((d) => String(d.id)),
      cardEnabled: config.cardEnabled,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }
    const extra = new FormData(formEl);
    setStatus("submitting");
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          locale,
          website: String(extra.get("website") ?? ""),
          turnstileToken: String(extra.get("cf-turnstile-response") ?? ""),
          items: items.map((i) => ({ dishId: i.dishId, quantity: i.quantity })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        statusUrl?: string;
        checkoutUrl?: string | null;
        message?: string;
        errors?: FormErrors;
      };
      if (res.ok && data.statusUrl) {
        // The order now holds the items; a new basket starts empty.
        clear();
        if (data.checkoutUrl) {
          setStatus("redirecting");
          window.location.assign(data.checkoutUrl);
        } else {
          router.push(data.statusUrl);
        }
        return;
      }
      setStatus("idle");
      if (data.errors && Object.keys(data.errors).length > 0) {
        setErrors(data.errors);
        focusFirstError(data.errors);
      } else {
        setServerError(data.message ?? t.genericError(siteConfig.contact.phone));
      }
    } catch {
      setStatus("idle");
      setServerError(t.genericError(siteConfig.contact.phone));
    }
  }

  const fieldProps = (name: keyof Form) => ({
    id: name,
    name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
    className: `${inputClass} ${errors[name] ? "border-terracotta-dark" : "border-line"}`,
  });

  const closed = state !== null && !state.open;
  const belowMinimum = fulfilment === "delivery" && quote.missingForMinimumCents > 0;
  const summaryTitle = t.summaryTitle(count, formatCents(quote.totalCents, locale));

  const summary = (
    <div>
      <ul className="divide-y divide-line">
        {items.map((item) => (
          <li key={item.dishId} className="flex justify-between gap-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">
                {item.quantity} × {item.name}
              </p>
              {item.weight && <p className="mt-0.5 text-ink-soft">{localizeWeight(item.weight, locale)}</p>}
            </div>
            <span className="shrink-0 font-semibold text-terracotta">{formatCents(item.priceCents * item.quantity, locale)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1.5 border-t border-line pt-3 text-sm" aria-live="polite">
        <div className="flex justify-between">
          <dt className="text-ink-soft">{t.subtotal}</dt>
          <dd>{formatCents(quote.subtotalCents, locale)}</dd>
        </div>
        {fulfilment === "pickup" && quote.discountCents > 0 && (
          <div className="flex justify-between">
            <dt className="text-ink-soft">{t.discount(discountLabel)}</dt>
            <dd className="text-olive">{formatCents(-quote.discountCents, locale)}</dd>
          </div>
        )}
        {fulfilment === "delivery" && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">{t.deliveryFee}</dt>
            <dd className="text-right">
              {quote.freeDelivery ? t.free : district ? formatCents(quote.deliveryFeeCents, locale) : t.chooseDistrict}
            </dd>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
          <dt>{t.total}</dt>
          <dd data-testid="order-total">{formatCents(quote.totalCents, locale)}</dd>
        </div>
      </dl>
      {fulfilment === "delivery" && quote.missingForFreeDeliveryCents !== null && quote.missingForFreeDeliveryCents > 0 && !belowMinimum && (
        <p className="mt-2 text-xs text-ink-soft">{t.freeDeliveryFrom(formatCents(quote.missingForFreeDeliveryCents, locale))}</p>
      )}
      <button type="button" onClick={openCart} className="mt-3 min-h-11 text-sm font-semibold text-terracotta hover:text-terracotta-dark">
        {t.editCart}
      </button>
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      {config.turnstileSiteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}

      {/* On phones the summary sits on top, folded. */}
      <details className="group rounded-2xl border border-line bg-cream-soft lg:hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          {summaryTitle}
          <span aria-hidden className="text-terracotta transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="px-5 pb-4">{summary}</div>
      </details>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="rounded-2xl border border-line bg-cream-soft p-5 sm:p-8 lg:col-span-7">
        {closed && <div className="mb-6">{closedMessage()}</div>}

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <PillChoice
              name="fulfilment"
              legend={t.fulfilment}
              value={fulfilment}
              onChange={setFulfilment}
              options={[
                { value: "delivery", label: t.delivery },
                {
                  value: "pickup",
                  label: (
                    <>
                      {t.pickup}
                      {config.pricing.pickupDiscountBps > 0 && (
                        <span className={`ml-2 rounded-full px-2 py-0.5 text-[11px] ${fulfilment === "pickup" ? "bg-cream/20" : "bg-olive/10 text-olive"}`}>
                          −{discountLabel}
                        </span>
                      )}
                    </>
                  ),
                },
              ]}
            />
          </div>

          <Field id="name" label={t.name} error={errors.name}>
            <input {...fieldProps("name")} autoComplete="name" placeholder={t.namePlaceholder} maxLength={100} />
          </Field>

          <Field id="phone" label={t.phone} error={errors.phone}>
            <input {...fieldProps("phone")} type="tel" inputMode="tel" autoComplete="tel" placeholder={t.phonePlaceholder} maxLength={20} />
          </Field>

          <Field
            id="email"
            label={
              <>
                {t.email} <span className="font-normal text-ink-soft">{t.optional}</span>
              </>
            }
            error={errors.email}
            hint={t.emailHint}
            className="sm:col-span-2"
          >
            <input {...fieldProps("email")} type="email" inputMode="email" autoComplete="email" maxLength={254} />
          </Field>

          {fulfilment === "delivery" ? (
            <>
              <Field id="districtId" label={t.district} error={errors.districtId}>
                <select {...fieldProps("districtId")} value={districtId} onChange={(e) => setDistrictId(e.target.value)}>
                  <option value="" disabled>
                    {t.districtPlaceholder}
                  </option>
                  {config.districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.feeCents === 0 ? t.districtFree : t.districtFee(formatCents(d.feeCents, locale))}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="address" label={t.address} error={errors.address}>
                <input {...fieldProps("address")} autoComplete="street-address" placeholder={t.addressPlaceholder} maxLength={300} />
              </Field>
            </>
          ) : (
            <p className="text-sm text-ink-soft sm:col-span-2">{t.pickupFrom(siteConfig.contact.address)}</p>
          )}

          <Field id="time" label={t.time} error={errors.time} className="sm:col-span-2">
            <select key={`${fulfilment}-${options?.slots[0] ?? ""}`} {...fieldProps("time")} defaultValue={options?.asap ? "asap" : ""} disabled={!options || closed}>
              <option value="" disabled>
                {t.chooseTime}
              </option>
              {options?.asap && <option value="asap">{t.asap}</option>}
              {options?.slots.map((slot) => (
                <option key={slot} value={slot}>
                  {t.slot(slotLabel(slot))}
                </option>
              ))}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <PillChoice
              name="payment"
              legend={t.payment}
              value={effectivePayment}
              onChange={setPayment}
              options={payments.map((p) => ({
                value: p,
                label: p === "card" ? t.payCard : p === "cash" ? t.payCash : t.payAtPickup,
              }))}
              hint={effectivePayment === "card" ? t.cardNote : fulfilment === "delivery" ? t.noCardAtDoor : undefined}
              error={errors.payment}
            />
          </div>

          <Field
            id="notes"
            label={
              <>
                {t.notes} <span className="font-normal text-ink-soft">{t.optional}</span>
              </>
            }
            error={errors.notes}
            className="sm:col-span-2"
          >
            <textarea {...fieldProps("notes")} rows={2} maxLength={500} placeholder={t.notesPlaceholder} />
          </Field>

          {/* Spam trap: hidden from people and screen readers, tempting to bots. */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
          </div>

          {config.turnstileSiteKey && (
            <div className="cf-turnstile sm:col-span-2" data-sitekey={config.turnstileSiteKey} data-language={locale} />
          )}
        </div>

        {belowMinimum && (
          <p className="mt-5 text-sm font-medium text-terracotta-dark">{t.minimum(formatCents(quote.missingForMinimumCents, locale))}</p>
        )}

        {serverError && (
          <p role="alert" className="mt-5 text-sm font-medium text-terracotta-dark">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={status !== "idle" || closed || belowMinimum || now === null}
          className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-terracotta px-8 text-sm font-semibold text-cream transition-colors duration-200 hover:bg-terracotta-dark disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {status === "submitting" ? t.submitting : effectivePayment === "card" ? t.submitCard : t.submitCash}
          {status === "idle" && <span className="ml-2 font-normal opacity-90">· {formatCents(quote.totalCents, locale)}</span>}
        </button>

        <p className="mt-4 text-xs text-ink-soft">
          {(() => {
            const c = t.consent(t.privacyLink, t.termsLink);
            return (
              <>
                {c.before}
                <Link href={href("privacy", locale)} className="underline hover:text-terracotta">
                  {c.privacy}
                </Link>
                {c.middle}
                <Link href={href("terms", locale)} className="underline hover:text-terracotta">
                  {c.terms}
                </Link>
                {c.after}
              </>
            );
          })()}
        </p>
      </form>

      <aside className="hidden lg:col-span-5 lg:block">
        <div className="sticky top-28 rounded-2xl border border-line bg-cream-soft p-6">
          <h2 className="text-xl font-medium">{t.summary}</h2>
          <div className="mt-2">{summary}</div>
        </div>
      </aside>
    </div>
  );
}
