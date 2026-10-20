"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { MenuView } from "@/lib/catalog-types";
import { useT } from "@/lib/locale-context";
import { DishCard } from "./DishCard";

// Хапчетата се скролват хоризонтално на един ред на мобилни, а от sm нагоре
// се пренасят и центрират. -mx/px пускат скрола до ръба на екрана.
const pillRow =
  "-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden";

function pillClass(active: boolean, size: "lg" | "sm") {
  const sizing =
    size === "lg" ? "min-h-11 px-5 text-sm sm:min-h-0 sm:py-2.5" : "min-h-11 px-4 text-xs sm:min-h-0 sm:py-1.5";
  return `shrink-0 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 ${sizing} ${
    active ? "bg-terracotta text-cream" : "border border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
  }`;
}

const LUNCH = "lunch";

// Линк към конкретен таб: /menu?tab=soups. Чете се от window след hydration.
const noopSubscribe = () => () => {};
function useTabFromUrl() {
  const search = useSyncExternalStore(noopSubscribe, () => window.location.search, () => "");
  return new URLSearchParams(search).get("tab");
}

export function MenuTabs({ view }: { view: MenuView }) {
  const t = useT();
  const urlTab = useTabFromUrl();
  const tabs = [{ slug: LUNCH, name: t.menu.lunch }, ...view.categories.map((c) => ({ slug: c.slug, name: c.name }))];
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked ?? (tabs.some((tab) => tab.slug === urlTab) ? urlTab! : LUNCH);
  const [pickedDay, setPickedDay] = useState<string | null>(null);

  const todayIndex = view.week.findIndex((d) => d.isToday);
  const day = view.week.find((d) => d.date === pickedDay) ?? view.week[todayIndex] ?? null;
  const showingToday = day?.isToday ?? false;

  const isLunch = active === LUNCH;
  const category = view.categories.find((c) => c.slug === active);
  const dishes = isLunch ? (day?.dishes ?? []) : (category?.dishes ?? []);
  const listKey = isLunch ? `${LUNCH}-${day?.date ?? "none"}` : active;
  const unavailableLabel = isLunch && day && !showingToday ? t.onlyOn[day.weekday] : undefined;

  return (
    <div>
      <div className={pillRow} role="group" aria-label={t.menu.title}>
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            onClick={() => setPicked(tab.slug)}
            aria-pressed={active === tab.slug}
            className={pillClass(active === tab.slug, "lg")}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {isLunch && (
        <div className="mt-5">
          {view.week.length > 0 && (
            <div className={pillRow} role="group" aria-label={t.menu.lunch}>
              {view.week.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setPickedDay(d.date)}
                  aria-pressed={day?.date === d.date}
                  className={pillClass(day?.date === d.date, "sm")}
                >
                  {d.isToday ? t.menu.today : t.weekShort[d.weekday]}
                  <span className="ml-1 font-normal opacity-75">{d.date.slice(8, 10)}.{d.date.slice(5, 7)}</span>
                </button>
              ))}
            </div>
          )}
          {!view.todayPublished && (
            <p role="status" className="mx-auto mt-5 max-w-2xl rounded-xl border border-line bg-cream-soft px-5 py-4 text-center text-sm text-ink-soft">
              {t.menu.notPublished}
            </p>
          )}
          {day && !showingToday && (
            <p className="mt-4 text-center text-sm text-ink-soft">{t.menu.otherDayInfo}</p>
          )}
        </div>
      )}

      <div className="mt-10 min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={listKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto grid max-w-[1200px] grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
          >
            {dishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} unavailableLabel={unavailableLabel} />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
