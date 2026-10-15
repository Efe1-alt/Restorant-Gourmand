"use client";

import { useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { siteConfig } from "@/lib/site-config";
import { AddToCartButton } from "./AddToCartButton";
import { LUNCH_SECTION, lunchDays, menuItemDetails, menuSections } from "@/data/menu";

// Днешният ден по софийско време: 0 = неделя … 6 = събота. На сървъра (и при
// първия клиентски render) е null, за да няма hydration разминаване.
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const subscribeNoop = () => () => {};
function getSofiaWeekday() {
  const short = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Europe/Sofia",
  }).format(new Date());
  return WEEKDAYS.indexOf(short);
}

// Хапчетата се скролват хоризонтално на един ред на мобилни, а от sm нагоре
// се пренасят и центрират. -mx/px пускат скрола до ръба на екрана.
const pillRow =
  "-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden";

function pillClass(active: boolean, size: "lg" | "sm") {
  const sizing = size === "lg" ? "px-5 py-2.5 text-sm" : "px-4 py-1.5 text-xs";
  return `shrink-0 whitespace-nowrap rounded-full font-semibold transition-colors duration-200 ${sizing} ${
    active
      ? "bg-terracotta text-cream"
      : "border border-line text-ink-soft hover:border-terracotta hover:text-terracotta"
  }`;
}

export function MenuTabs() {
  const [active, setActive] = useState<string>(menuSections[0].name);
  const [pickedDay, setPickedDay] = useState<number | null>(null);

  const weekday = useSyncExternalStore(subscribeNoop, getSofiaWeekday, () => null);
  const isSunday = weekday === 0;
  // В неделя (и преди hydration) показваме понеделник.
  const todayIndex = weekday === null || isSunday ? 0 : weekday - 1;
  const dayIndex = pickedDay ?? todayIndex;

  const isLunch = active === LUNCH_SECTION;
  const items = isLunch
    ? lunchDays[dayIndex].items
    : (menuSections.find((s) => s.name === active) ?? menuSections[0]).items;
  const listKey = isLunch ? `${active}-${lunchDays[dayIndex].id}` : active;

  return (
    <div>
      <div className={pillRow}>
        {menuSections.map((section) => (
          <button
            key={section.name}
            type="button"
            onClick={() => setActive(section.name)}
            aria-pressed={active === section.name}
            className={pillClass(active === section.name, "lg")}
          >
            {section.name}
          </button>
        ))}
      </div>

      {isLunch && (
        <div className="mt-5">
          <div className={pillRow}>
            {lunchDays.map((day, i) => (
              <button
                key={day.id}
                type="button"
                onClick={() => setPickedDay(i)}
                aria-pressed={dayIndex === i}
                className={pillClass(dayIndex === i, "sm")}
              >
                {day.label}
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
            className="mx-auto max-w-2xl divide-y divide-line"
          >
            {items.map((item, i) => {
              const details = menuItemDetails(item);
              return (
                <div key={`${i}-${item.name}`} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <h3 className="font-medium">{item.name}</h3>
                    {details && <p className="mt-1 font-sans text-sm text-ink/65">{details}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-4">
                    <span className="whitespace-nowrap text-sm font-semibold text-terracotta">
                      {item.price}
                    </span>
                    <AddToCartButton name={item.name} price={item.price} />
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
