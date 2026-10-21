// Calendar and clock helpers, always in Europe/Sofia regardless of where the
// browser or the server runs. Dates are "YYYY-MM-DD" strings; times of day
// are minutes after midnight. Used on the client and the server.

export const TIME_ZONE = "Europe/Sofia";

export type SofiaNow = {
  // "2026-10-20"
  date: string;
  // 0 = Sunday … 6 = Saturday
  weekday: number;
  // minutes after midnight
  minutes: number;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function sofiaNow(date: Date = new Date()): SofiaNow {
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAYS.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// Calendar arithmetic on plain dates (no time zone involved).
function toUtc(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}
function fromUtc(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  return fromUtc(toUtc(date) + days * 86_400_000);
}

export function weekdayOf(date: string) {
  return new Date(toUtc(date)).getUTCDay();
}

// Monday of the week containing `date` (Sunday belongs to the week before).
export function mondayOf(date: string) {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

export function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUtc(toUtc(value)) === value;
}

export function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function toTime(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// "20261020" for order numbers.
export function compactDate(date: string) {
  return date.replace(/-/g, "");
}
