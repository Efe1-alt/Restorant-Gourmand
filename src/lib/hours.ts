// When checkout is open and which delivery/pickup times can be chosen.
// Pure: the same rules run in the browser (to build the form) and on the
// server (to validate it).

import { toMinutes, toTime, type SofiaNow } from "./time";

export type DayHours = { opens: string; closes: string } | null;
// Index = weekday, 0 = Sunday … 6 = Saturday. null = closed.
export type WeekHours = DayHours[];

export type Fulfilment = "delivery" | "pickup";

export type OrderingConfig = {
  orderingHours: WeekHours;
  openingHours: WeekHours;
  // "YYYY-MM-DD" dates the restaurant is closed.
  closures: string[];
  hoursConfirmed: boolean;
  paused: boolean;
  deliveryEstimateMinutes: number;
  pickupEstimateMinutes: number;
};

export type ClosedReason =
  | "hours_unconfirmed"
  | "paused"
  | "closure"
  | "closed_today"
  | "not_yet_open"
  | "closed_for_today";

export type CheckoutState =
  | { open: true }
  | { open: false; reason: ClosedReason; opensAt?: string };

export const SLOT_MINUTES = 30;

export function checkoutState(config: OrderingConfig, now: SofiaNow): CheckoutState {
  if (!config.hoursConfirmed) return { open: false, reason: "hours_unconfirmed" };
  if (config.paused) return { open: false, reason: "paused" };
  if (config.closures.includes(now.date)) return { open: false, reason: "closure" };
  const today = config.orderingHours[now.weekday];
  if (!today) return { open: false, reason: "closed_today" };
  if (now.minutes < toMinutes(today.opens)) {
    return { open: false, reason: "not_yet_open", opensAt: today.opens };
  }
  if (now.minutes >= toMinutes(today.closes)) return { open: false, reason: "closed_for_today" };
  return { open: true };
}

export function estimateMinutes(config: OrderingConfig, fulfilment: Fulfilment) {
  return fulfilment === "delivery" ? config.deliveryEstimateMinutes : config.pickupEstimateMinutes;
}

// "As soon as possible" plus 30-minute slots for today. The earliest slot is
// now + the delivery/pickup estimate. The last slot starts no later than the
// ordering close + estimate, and never after the restaurant closes.
export function timeOptions(config: OrderingConfig, now: SofiaNow, fulfilment: Fulfilment) {
  const state = checkoutState(config, now);
  if (!state.open) return { asap: false, slots: [] as string[] };
  const ordering = config.orderingHours[now.weekday]!;
  const opening = config.openingHours[now.weekday];
  const estimate = estimateMinutes(config, fulfilment);

  const earliest = now.minutes + estimate;
  let latest = toMinutes(ordering.closes) + estimate;
  if (opening) latest = Math.min(latest, toMinutes(opening.closes) - SLOT_MINUTES);

  const slots: string[] = [];
  for (let t = Math.ceil(earliest / SLOT_MINUTES) * SLOT_MINUTES; t <= latest; t += SLOT_MINUTES) {
    slots.push(toTime(t));
  }
  return { asap: true, slots };
}

export function isValidTime(config: OrderingConfig, now: SofiaNow, fulfilment: Fulfilment, time: string) {
  const options = timeOptions(config, now, fulfilment);
  return time === "asap" ? options.asap : options.slots.includes(time);
}

// "12:00 – 12:30"
export function slotLabel(time: string) {
  return `${time} – ${toTime(toMinutes(time) + SLOT_MINUTES)}`;
}

// The next day (after today) with ordering hours that isn't a closure.
export function nextOrderingDay(config: OrderingConfig, now: SofiaNow) {
  for (let offset = 1; offset <= 14; offset++) {
    const weekday = (now.weekday + offset) % 7;
    const hours = config.orderingHours[weekday];
    if (!hours) continue;
    const [y, m, d] = now.date.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
    if (config.closures.includes(date)) continue;
    return { offset, weekday, date, opens: hours.opens };
  }
  return null;
}
