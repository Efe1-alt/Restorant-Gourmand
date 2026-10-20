// Checkout form rules. The browser runs them for instant feedback; the
// server runs them again and is the only one that counts.

import { isValidTime, type Fulfilment, type OrderingConfig } from "./hours";
import { getDictionary } from "./i18n";
import type { Locale } from "./routes";
import type { SofiaNow } from "./time";

export type PaymentMethod = "card" | "cash" | "pay_at_pickup";

export type CheckoutForm = {
  fulfilment: Fulfilment;
  name: string;
  phone: string;
  email: string;
  districtId: string;
  address: string;
  time: string;
  payment: PaymentMethod;
  notes: string;
};

export type FormErrors = Partial<Record<keyof CheckoutForm, string>>;

export const FIELD_ORDER: (keyof CheckoutForm)[] = [
  "fulfilment",
  "name",
  "phone",
  "email",
  "districtId",
  "address",
  "time",
  "payment",
  "notes",
];

export const MAX_QTY = 20;
export const MAX_LINES = 50;

// 08XXXXXXXX or +359XXXXXXXXX (also 00359…); spaces, dashes and brackets ignored.
export function normalizePhone(phone: string) {
  const compact = phone.replace(/[\s\-()./]/g, "");
  if (/^00359\d{8,9}$/.test(compact)) return `+${compact.slice(2)}`;
  // National format: 10 digits for mobiles (08…), 9 for landlines (032 …).
  if (/^0[1-9]\d{7,8}$/.test(compact)) return `+359${compact.slice(1)}`;
  return compact;
}

// Bulgarian mobile (+3598…) and landline numbers (+359 2…, +359 32… Plovdiv).
export function isValidBgPhone(phone: string) {
  return /^\+359[1-9]\d{7,8}$/.test(normalizePhone(phone));
}

export function isValidEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function allowedPayments(fulfilment: Fulfilment, cardEnabled: boolean): PaymentMethod[] {
  const offline: PaymentMethod = fulfilment === "delivery" ? "cash" : "pay_at_pickup";
  return cardEnabled ? ["card", offline] : [offline];
}

export function validateCheckout(
  form: CheckoutForm,
  ctx: {
    locale: Locale;
    now: SofiaNow;
    config: OrderingConfig;
    activeDistrictIds: string[];
    cardEnabled: boolean;
  }
): FormErrors {
  const t = getDictionary(ctx.locale).errors;
  const errors: FormErrors = {};

  if (form.fulfilment !== "delivery" && form.fulfilment !== "pickup") {
    errors.fulfilment = t.fulfilment;
    return errors;
  }

  const name = form.name.trim();
  if (name.length < 2) errors.name = t.name;
  else if (name.length > 100) errors.name = t.nameLong;

  if (!form.phone.trim()) errors.phone = t.phone;
  else if (!isValidBgPhone(form.phone)) errors.phone = t.phoneFormat;

  if (form.email.trim() && !isValidEmail(form.email.trim())) errors.email = t.email;

  if (form.fulfilment === "delivery") {
    if (!ctx.activeDistrictIds.includes(form.districtId)) errors.districtId = t.district;
    const address = form.address.trim();
    if (address.length < 5) errors.address = t.address;
    else if (address.length > 300) errors.address = t.addressLong;
  }

  if (!form.time) errors.time = t.time;
  else if (!isValidTime(ctx.config, ctx.now, form.fulfilment, form.time)) errors.time = t.timeGone;

  if (!allowedPayments(form.fulfilment, ctx.cardEnabled).includes(form.payment)) {
    errors.payment = form.payment === "card" ? t.paymentCardOff : t.payment;
  }

  if (form.notes.length > 500) errors.notes = t.notes;
  return errors;
}

// +359888123456 → "0888 123 456"; +35932123456 → "032 123 456". Display only.
export function formatPhone(phone: string | null) {
  if (!phone) return "";
  const m = /^\+359(\d{8,9})$/.exec(phone);
  if (!m) return phone;
  const local = `0${m[1]}`;
  return local.length === 10
    ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`
    : `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}
