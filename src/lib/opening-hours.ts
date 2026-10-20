// "Понеделник – Петък 08:00 – 19:00" rows from the weekly hours (Mon → Sun).

import type { WeekHours } from "./hours";
import { getDictionary } from "./i18n";
import type { Locale } from "./routes";

export function hoursRows(week: WeekHours, locale: Locale) {
  const t = getDictionary(locale);
  const order = [1, 2, 3, 4, 5, 6, 0];
  const rows: { days: string; time: string }[] = [];
  let i = 0;
  while (i < order.length) {
    const start = order[i];
    const key = JSON.stringify(week[start]);
    let j = i;
    while (j + 1 < order.length && JSON.stringify(week[order[j + 1]]) === key) j++;
    const h = week[start];
    const days = i === j ? t.weekCap[start] : `${t.weekCap[start]} – ${t.weekCap[order[j]]}`;
    rows.push({ days, time: h ? `${h.opens} – ${h.closes}` : t.closedDay });
    i = j + 1;
  }
  return rows;
}

export function earliestOpening(week: WeekHours) {
  return week.filter((h) => h !== null).map((h) => h!.opens).sort()[0] ?? null;
}
