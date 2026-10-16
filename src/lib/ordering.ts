// Общи правила за поръчките — ползват се и в браузъра, и в /api/order, за да
// се валидира по един и същи начин. Всички суми са в центове (цели числа).

import { siteConfig } from "./site-config";

// ---------------------------------------------------------------------------
// Пари

// "4,90 €" → 490. Само с цели числа — без parseFloat, за да няма грешки от
// закръгляне. Невалиден формат → null.
export function parsePriceCents(price: string): number | null {
  const match = /^(\d+)(?:,(\d{1,2}))?\s*€$/.exec(price.trim());
  if (!match) return null;
  const euros = Number.parseInt(match[1], 10);
  const cents = match[2] ? Number.parseInt(match[2].padEnd(2, "0"), 10) : 0;
  return euros * 100 + cents;
}

// 490 → "4,90 €"
export function formatCents(cents: number) {
  const euros = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, "0");
  return `${euros},${rest} €`;
}

// ---------------------------------------------------------------------------
// Време — винаги по софийско време, независимо от часовата зона на
// посетителя или на сървъра.

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type SofiaTime = {
  // 0 = неделя … 6 = събота
  weekday: number;
  // минути от полунощ
  minutes: number;
  // "20261015"
  ymd: string;
};

export function sofiaNow(date = new Date()): SofiaTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Sofia",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: WEEKDAYS.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    ymd: `${get("year")}${get("month")}${get("day")}`,
  };
}

// id на днешния ден в обедното меню ("mon"…"sat"), null в неделя.
const LUNCH_DAY_IDS = [null, "mon", "tue", "wed", "thu", "fri", "sat"];
export function todaysLunchDayId(now: SofiaTime) {
  return LUNCH_DAY_IDS[now.weekday] ?? null;
}

const SLOT_STEP_MINUTES = 30;

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// Поръчки само за днес: "възможно най-скоро" (ако сме отворени) + слотове
// през 30 мин. до последната поръчка преди затваряне.
export function todaysTimeOptions(now: SofiaTime) {
  const today = siteConfig.orderHours[now.weekday];
  if (!today) return { asap: false, slots: [] as string[] };
  const { lastOrderMinutesBeforeClose, minLeadMinutes } = siteConfig.ordering;
  const openMin = toMinutes(today.open);
  const lastMin = toMinutes(today.close) - lastOrderMinutesBeforeClose;

  const asap = now.minutes >= openMin && now.minutes <= lastMin;
  const earliest = Math.max(openMin, now.minutes + minLeadMinutes);
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

const DAY_NAMES = ["неделя", "понеделник", "вторник", "сряда", "четвъртък", "петък", "събота"];

// "утре от 08:00" / "в понеделник от 08:00" — следващото отваряне след днес.
export function nextOpening(now: SofiaTime) {
  for (let offset = 1; offset <= 7; offset++) {
    const day = (now.weekday + offset) % 7;
    const hours = siteConfig.orderHours[day];
    if (hours) return `${offset === 1 ? "утре" : `в ${DAY_NAMES[day]}`} от ${hours.open}`;
  }
  return null;
}

export function timeLabel(time: string) {
  return time === "asap" ? "Възможно най-скоро" : `Днес в ${time}`;
}

// ---------------------------------------------------------------------------
// Суми

export type Fulfillment = "delivery" | "pickup";
export type Payment = "cash" | "card";

export const paymentLabels: Record<Payment, string> = {
  cash: "В брой",
  card: "С карта при доставка",
};

export const fulfillmentLabels: Record<Fulfillment, string> = {
  delivery: "Доставка",
  pickup: "Вземане от място",
};

// Доставката е null, докато клиентът не потвърди цената — тогава не влиза в
// сумата и се показва „Уточнява се по телефона“.
export function orderTotals(subtotalCents: number, fulfillment: Fulfillment | null) {
  const { deliveryFeeCents, minOrderCents } = siteConfig.ordering;
  const deliveryCents = fulfillment === "pickup" ? 0 : deliveryFeeCents;
  const totalCents = subtotalCents + (deliveryCents ?? 0);
  const missingCents = minOrderCents === null ? 0 : Math.max(0, minOrderCents - subtotalCents);
  return { subtotalCents, deliveryCents, totalCents, missingCents };
}

// ---------------------------------------------------------------------------
// Формата

export const MAX_QTY = 20;

export type OrderForm = {
  fulfillment: Fulfillment;
  name: string;
  phone: string;
  address: string;
  time: string;
  note: string;
  payment: Payment;
};

export type OrderRequest = OrderForm & {
  items: { id: string; quantity: number }[];
};

// 08XXXXXXXX или +359XXXXXXXXX; интервали, тирета и скоби се игнорират.
export function normalizePhone(phone: string) {
  return phone.replace(/[\s\-()]/g, "");
}
export function isValidBgPhone(phone: string) {
  return /^(08\d{8}|\+359\d{9})$/.test(normalizePhone(phone));
}

export type FormErrors = Partial<Record<keyof OrderForm, string>>;

export function validateOrderForm(form: OrderForm, now: SofiaTime): FormErrors {
  const errors: FormErrors = {};
  if (form.fulfillment !== "delivery" && form.fulfillment !== "pickup") {
    errors.fulfillment = "Изберете доставка или вземане от място.";
  }
  if (form.name.trim().length < 2) errors.name = "Моля, въведете име.";
  else if (form.name.length > 100) errors.name = "Името е твърде дълго.";
  if (!form.phone.trim()) errors.phone = "Моля, въведете телефон.";
  else if (!isValidBgPhone(form.phone)) {
    errors.phone = "Невалиден номер. Използвайте формат 08XXXXXXXX или +359XXXXXXXXX.";
  }
  if (form.fulfillment === "delivery") {
    if (form.address.trim().length < 5) errors.address = "Моля, въведете адрес за доставка.";
    else if (form.address.length > 300) errors.address = "Адресът е твърде дълъг.";
  }
  const options = todaysTimeOptions(now);
  if (!form.time) errors.time = "Моля, изберете час.";
  else if (form.time === "asap" ? !options.asap : !options.slots.includes(form.time)) {
    errors.time = "Този час вече не е достъпен. Моля, изберете друг.";
  }
  if (form.note.length > 500) errors.note = "Бележката е до 500 символа.";
  if (form.payment !== "cash" && form.payment !== "card") {
    errors.payment = "Изберете начин на плащане.";
  }
  return errors;
}
