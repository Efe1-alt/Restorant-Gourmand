"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  addDishToDayAction,
  copyDayAction,
  createDayAction,
  prefillWeekAction,
  publishDayAction,
  removeDishFromDayAction,
  setPortionsAction,
  setSoldOutAction,
  setStandingCapAction,
} from "@/app/(admin)/admin/actions";
import type { getStandingToday, getWeek } from "@/lib/server/admin-data";
import { addDays } from "@/lib/time";
import { Button, Card, Input, Notice, Select, buttonClass } from "./ui";

type Week = Awaited<ReturnType<typeof getWeek>>;
type Result = { ok: boolean; message?: string };

const DAY_NAMES = ["Неделя", "Понеделник", "Вторник", "Сряда", "Четвъртък", "Петък", "Събота"];
const short = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}`;

function useRunner() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<Result | null>(null);
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.message ? r : r.ok ? null : { ok: false, message: "Грешка." });
    });
  return { pending, msg, run };
}

export function WeekPlanner({ monday, today, week }: { monday: string; today: string; week: Week }) {
  const { pending, msg, run } = useRunner();
  const names = new Map(week.dishes.map((d) => [d.id, d.name_bg]));
  const dailyDishes = week.dishes.filter((d) => !d.is_standing && !d.archived_at);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Link href={`?w=${addDays(monday, -7)}`} className={buttonClass("secondary", "sm")}>
          ← Предишна
        </Link>
        <span className="px-2 font-semibold">
          {short(monday)} – {short(addDays(monday, 5))}
        </span>
        <Link href={`?w=${addDays(monday, 7)}`} className={buttonClass("secondary", "sm")}>
          Следваща →
        </Link>
        <Button tone="primary" size="sm" disabled={pending} onClick={() => run(() => prefillWeekAction(monday))}>
          Попълни от шаблоните (чернова)
        </Button>
      </div>
      {msg?.message && (
        <div className="mb-4">
          <Notice tone={msg.ok ? "ok" : "error"}>{msg.message}</Notice>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {week.dates.map((date, i) => {
          const day = week.days.find((d) => d.menu_date === date);
          return (
            <DayCard
              key={date}
              date={date}
              dayName={DAY_NAMES[(i + 1) % 7]}
              isToday={date === today}
              isPast={date < today}
              day={day ?? null}
              names={names}
              dailyDishes={dailyDishes}
              onRun={run}
              pending={pending}
            />
          );
        })}
      </div>
    </div>
  );
}

function DayCard({
  date,
  dayName,
  isToday,
  isPast,
  day,
  names,
  dailyDishes,
  onRun,
  pending,
}: {
  date: string;
  dayName: string;
  isToday: boolean;
  isPast: boolean;
  day: Week["days"][number] | null;
  names: Map<number, string>;
  dailyDishes: Week["dishes"];
  onRun: (fn: () => Promise<Result>) => void;
  pending: boolean;
}) {
  const [addId, setAddId] = useState("");
  const [addPortions, setAddPortions] = useState("10");
  const [copyTo, setCopyTo] = useState("");
  const rows = [...(day?.menu_day_dishes ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const published = day?.status === "published";
  const onDay = new Set(rows.map((r) => r.dish_id));

  return (
    <Card className={isToday ? "border-terracotta" : ""}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold">
          {dayName} <span className="font-normal text-ink-soft">{short(date)}</span>
          {isToday && <span className="ml-2 rounded-full bg-terracotta px-2 py-0.5 text-xs text-cream">днес</span>}
        </h3>
        {day ? (
          <span className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${published ? "bg-olive/15 text-olive-dark" : "bg-gold/25"}`}>
              {published ? "Публикуван" : "Чернова"}
            </span>
            <Button size="sm" tone={published ? "secondary" : "olive"} disabled={pending || isPast} onClick={() => onRun(() => publishDayAction(date, !published))}>
              {published ? "Скрий" : "Публикувай"}
            </Button>
          </span>
        ) : (
          <Button size="sm" disabled={pending || isPast} onClick={() => onRun(() => createDayAction(date))}>
            Създай ден
          </Button>
        )}
      </header>

      {day && (
        <>
          <ul className="mt-3 divide-y divide-line">
            {rows.map((r) => (
              <li key={r.dish_id} className="flex flex-wrap items-center gap-2 py-2">
                <span className={`min-w-0 basis-full text-sm sm:basis-auto sm:flex-1 ${r.sold_out ? "text-ink-soft line-through" : ""}`}>{names.get(r.dish_id)}</span>
                <span className={`text-xs ${r.reserved >= r.portions && r.portions > 0 ? "font-semibold text-terracotta-dark" : "text-ink-soft"}`}>
                  поръчани {r.reserved} от
                </span>
                <Input
                  aria-label={`Порции: ${names.get(r.dish_id)}`}
                  inputMode="numeric"
                  defaultValue={r.portions}
                  className="!w-20 !px-2 !py-2 text-center"
                  onBlur={(e) => {
                    const v = Number(e.target.value);
                    if (v !== r.portions) onRun(() => setPortionsAction(date, r.dish_id, v));
                  }}
                />
                <Button size="sm" tone={r.sold_out ? "olive" : "secondary"} disabled={pending} onClick={() => onRun(() => setSoldOutAction(date, r.dish_id, !r.sold_out, "daily"))}>
                  {r.sold_out ? "Пусни" : "Изчерпано"}
                </Button>
                <Button size="sm" tone="quiet" aria-label={`Махни ${names.get(r.dish_id)}`} disabled={pending} onClick={() => onRun(() => removeDishFromDayAction(date, r.dish_id))}>
                  ✕
                </Button>
              </li>
            ))}
            {rows.length === 0 && <li className="py-3 text-sm text-ink-soft">Няма ястия.</li>}
          </ul>

          <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
            <Select aria-label="Добави ястие" value={addId} onChange={(e) => setAddId(e.target.value)} className="min-w-0 basis-full sm:!w-auto sm:basis-auto sm:flex-1">
              <option value="">+ Добави ястие…</option>
              {dailyDishes
                .filter((d) => !onDay.has(d.id))
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name_bg}
                  </option>
                ))}
            </Select>
            <Input aria-label="Порции" inputMode="numeric" value={addPortions} onChange={(e) => setAddPortions(e.target.value)} className="!w-20 text-center" />
            <Button size="md" disabled={pending || !addId} onClick={() => onRun(async () => { const r = await addDishToDayAction(date, Number(addId), Number(addPortions)); if (r.ok) setAddId(""); return r; })}>
              Добави
            </Button>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label htmlFor={`copy-${date}`} className="text-sm text-ink-soft">
              Копирай деня към:
            </label>
            <Input id={`copy-${date}`} type="date" value={copyTo} onChange={(e) => setCopyTo(e.target.value)} className="!w-auto" />
            <Button size="sm" disabled={pending || !copyTo} onClick={() => onRun(() => copyDayAction(date, copyTo))}>
              Копирай
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

type StandingRow = Awaited<ReturnType<typeof getStandingToday>>[number];

export function StandingStock({ today, rows }: { today: string; rows: StandingRow[] }) {
  const { pending, msg, run } = useRunner();
  return (
    <Card>
      <p className="mb-3 text-sm text-ink-soft">Продават се всеки ден за поръчки. „Изчерпано“ важи само за днес и се нулира в полунощ.</p>
      {msg?.message && <Notice tone={msg.ok ? "ok" : "error"}>{msg.message}</Notice>}
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
            <span className={`min-w-0 basis-full text-sm sm:basis-auto sm:flex-1 ${r.sold_out ? "text-ink-soft line-through" : ""}`}>
              {r.name_bg} <span className="text-xs text-ink-soft">· {(r.categories as { name_bg: string } | null)?.name_bg}</span>
            </span>
            <span className="text-xs text-ink-soft">поръчани {r.reserved}</span>
            <Input
              aria-label={`Дневен лимит: ${r.name_bg}`}
              placeholder="∞"
              inputMode="numeric"
              defaultValue={r.standing_daily_cap ?? ""}
              className="!w-20 !px-2 !py-2 text-center"
              onBlur={(e) => {
                if (e.target.value !== String(r.standing_daily_cap ?? "")) run(() => setStandingCapAction(r.id, e.target.value));
              }}
            />
            <Button size="sm" tone={r.sold_out ? "olive" : "secondary"} disabled={pending} onClick={() => run(() => setSoldOutAction(today, r.id, !r.sold_out, "standing"))}>
              {r.sold_out ? "Пусни" : "Изчерпано"}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
