"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "@/lib/site-config";
import { useSofiaNow } from "@/lib/use-sofia-now";
import { AddToCartButton } from "./AddToCartButton";
import { DishOpener } from "./DishOpener";
import {
  LUNCH_SECTION,
  findMenuEntry,
  lunchDays,
  lunchEntryId,
  menuItemDetails,
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

export function MenuTabs() {
  const [active, setActive] = useState<string>(menuSections[0].name);
  // Винаги започва от понеделник (и след презареждане).
  const [dayIndex, setPickedDay] = useState(0);

  const isSunday = useSofiaNow()?.weekday === 0;

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

      <div className="mt-14 min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={listKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto max-w-4xl divide-y divide-line"
          >
            {items.map((item, i) => {
              const details = menuItemDetails(item);
              const entry = findMenuEntry(
                isLunch ? lunchEntryId(day, item) : sectionEntryId(section.key, item)
              );
              return (
                <div key={`${i}-${item.name}`} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 sm:flex-nowrap">
                  {entry ? (
                    <DishOpener entry={entry} stacked />
                  ) : (
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium">{item.name}</h3>
                      {details && <p className="mt-1 font-sans text-sm text-ink-soft">{details}</p>}
                    </div>
                  )}
                  <div className="ml-auto flex shrink-0 items-center gap-4">
                    <span className="whitespace-nowrap text-sm font-semibold text-terracotta">
                      {item.price}
                    </span>
                    {entry && <AddToCartButton entry={entry} />}
                  </div>
                </div>
              );
            })}
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
