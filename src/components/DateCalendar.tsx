"use client";

import { useEffect, useRef, useState } from "react";

const MONTHS = [
  "Януари", "Февруари", "Март", "Април", "Май", "Юни",
  "Юли", "Август", "Септември", "Октомври", "Ноември", "Декември",
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDisplayDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function buildGrid(viewDate: Date) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0..Sun=6
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = Array(firstWeekday).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DateCalendar({
  name,
  value,
  onChange,
  required,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  const today = startOfDay(new Date());
  const minMonth = startOfMonth(today);
  const maxMonth = addMonths(minMonth, 1);

  const [viewDate, setViewDate] = useState(minMonth);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const canGoBack = viewDate.getTime() > minMonth.getTime();
  const canGoForward = viewDate.getTime() < maxMonth.getTime();

  const cells = buildGrid(viewDate);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />

      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className="mt-0 flex w-full items-center justify-between rounded-lg border border-line bg-cream px-4 py-3 text-left text-base outline-none transition-colors focus:border-terracotta"
      >
        <span className={value ? "text-ink" : "text-ink-soft/60"}>
          {value ? formatDisplayDate(value) : "Избери дата"}
        </span>
        <span className="text-ink-soft/60" aria-hidden="true">
          📅
        </span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          className="absolute left-0 top-full z-20 mt-2 w-full min-w-[280px] rounded-xl border border-line bg-cream-soft p-4 shadow-lg sm:w-auto"
        >
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Предишен месец"
              disabled={!canGoBack}
              onClick={() => setViewDate((v) => addMonths(v, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-colors duration-200 hover:border-terracotta hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft"
            >
              ‹
            </button>
            <p className="font-serif-heading text-base font-medium capitalize">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </p>
            <button
              type="button"
              aria-label="Следващ месец"
              disabled={!canGoForward}
              onClick={() => setViewDate((v) => addMonths(v, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-ink-soft transition-colors duration-200 hover:border-terracotta hover:text-terracotta disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-ink-soft"
            >
              ›
            </button>
          </div>

          <div className="mt-4 grid grid-cols-7 gap-y-1 text-center">
            {WEEKDAYS.map((w) => (
              <span key={w} className="text-xs font-medium uppercase tracking-wide text-ink-soft/60">
                {w}
              </span>
            ))}

            {cells.map((cellDate, i) => {
              if (!cellDate) return <span key={i} />;

              const iso = toISODate(cellDate);
              const isPast = cellDate.getTime() <= today.getTime();
              const isSelected = value === iso;

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={isPast}
                  aria-pressed={isSelected}
                  onClick={() => {
                    onChange(iso);
                    setIsOpen(false);
                  }}
                  className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors duration-200 ${
                    isPast
                      ? "cursor-not-allowed text-ink-soft/30"
                      : isSelected
                        ? "bg-terracotta font-semibold text-cream"
                        : "text-ink hover:bg-terracotta/15"
                  }`}
                >
                  {cellDate.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
