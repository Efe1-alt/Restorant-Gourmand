"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "@/lib/site-config";
import { useSofiaNow } from "@/lib/use-sofia-now";
import { DishCard } from "./DishCard";
import {
  LUNCH_SECTION,
  findMenuEntry,
  lunchDays,
  lunchEntryId,
  menuSections,
  sectionEntryId,
} from "@/data/menu";

// Хапчетата се скролват хоризонтално на един ред на мобилни, а от sm нагоре
// се пренасят и центрират. -mx/px пускат скрола до ръба на екрана.
const pillRow =
  "-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden";

function pillClass(active: boolean, size: "lg" | "sm") {
  // На мобилни поне 44px височина (min-h-11), за да се натискат лесно.
  const sizing =
    size === "lg"
      ? "min-h-11 px-5 text-sm sm:min-h-0 sm:py-2.5"
      : "min-h-11 px-4 text-xs sm:min-h-0 sm:py-1.5";
  return `shrink-0 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 ${sizing} ${
    active
      ? "bg-terracotta text-cream"
      : "border border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
  }`;
}

// Линк към конкретен таб: /menu?tab=soups (key на секцията). Чете се от
// window след hydration — сайтът е static export, а useSearchParams би
// изисквал Suspense.
const noopSubscribe = () => () => {};
function useTabFromUrl() {
  const search = useSyncExternalStore(noopSubscribe, () => window.location.search, () => "");
  const tab = new URLSearchParams(search).get("tab");
  return menuSections.find((s) => s.key === tab)?.name ?? null;
}

export function MenuTabs() {
  const urlSection = useTabFromUrl();
  const [pickedSection, setActive] = useState<string | null>(null);
  const active = pickedSection ?? urlSection ?? menuSections[0].name;
  const [pickedDay, setPickedDay] = useState<number | null>(null);

  // По подразбиране — днешният ден; в неделя (и преди hydration) — понеделник.
  const weekday = useSofiaNow()?.weekday ?? null;
  const isSunday = weekday === 0;
  const todayIndex = weekday === null || isSunday ? 0 : weekday - 1;
  const dayIndex = pickedDay ?? todayIndex;

  const isLunch = active === LUNCH_SECTION;
  const section = menuSections.find((s) => s.name === active) ?? menuSections[0];
  const day = lunchDays[dayIndex];
  const items = isLunch ? day.items : section.items;
  const listKey = isLunch ? `${active}-${day.id}` : active;

  return (
    <div>
      <div className={pillRow}>
        {menuSections.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setActive(s.name)}
            aria-pressed={active === s.name}
            className={pillClass(active === s.name, "lg")}
          >
            {s.name}
          </button>
        ))}
      </div>

      {isLunch && (
        <div className="mt-5">
          <div className={pillRow}>
            {lunchDays.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setPickedDay(i)}
                aria-pressed={dayIndex === i}
                className={pillClass(dayIndex === i, "sm")}
              >
                {d.label}
              </button>
            ))}
          </div>
          {isSunday && dayIndex === 0 && (
            <p className="mt-4 text-center text-sm text-ink-soft">
              В неделя сме затворени. Ето менюто за понеделник.
            </p>
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
            {items.map((item, i) => (
              <DishCard
                key={`${i}-${item.name}`}
                item={item}
                entry={findMenuEntry(
                  isLunch ? lunchEntryId(day, item) : sectionEntryId(section.key, item)
                )}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-16 text-center">
        <a
          href={siteConfig.menuPdfUrl}
          className="inline-block rounded-full border border-line px-7 py-3.5 text-sm font-semibold text-ink transition-colors duration-200 hover:border-terracotta hover:text-terracotta"
        >
          Пълно меню (PDF)
        </a>
      </div>
    </div>
  );
}
