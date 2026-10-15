// Менюто на Gourmand. Всяка секция е отделен JSON файл в тази папка —
// редактира се директно там. Полетата са низове точно както са в менюто
// (цената е вече форматирана: „4,90 €“), празно поле = "".

import lunchMonday from "./lunch-monday.json";
import lunchTuesday from "./lunch-tuesday.json";
import lunchWednesday from "./lunch-wednesday.json";
import lunchThursday from "./lunch-thursday.json";
import lunchFriday from "./lunch-friday.json";
import lunchSaturday from "./lunch-saturday.json";
import grill from "./grill.json";
import fish from "./fish.json";
import soups from "./soups.json";
import salads from "./salads.json";
import omelets from "./omelets.json";
import desserts from "./desserts.json";
import drinks from "./drinks.json";
import bread from "./bread.json";

export type MenuItem = {
  name: string;
  weight: string;
  price: string;
  description: string;
};

export type LunchDay = {
  id: string;
  label: string;
  items: MenuItem[];
};

// Обедното меню по дни. Индексът съвпада с Date.getDay() - 1 (пон = 0).
export const lunchDays: LunchDay[] = [
  { id: "mon", label: "Пон", items: lunchMonday },
  { id: "tue", label: "Вт", items: lunchTuesday },
  { id: "wed", label: "Ср", items: lunchWednesday },
  { id: "thu", label: "Чет", items: lunchThursday },
  { id: "fri", label: "Пет", items: lunchFriday },
  { id: "sat", label: "Съб", items: lunchSaturday },
];

export const LUNCH_SECTION = "Обедно меню";

// Редът на табовете. „Обедно меню“ няма items тук — ястията му са по дни.
export const menuSections: { name: string; items: MenuItem[] }[] = [
  { name: LUNCH_SECTION, items: [] },
  { name: "Скара", items: grill },
  { name: "Риба", items: fish },
  { name: "Супи", items: soups },
  { name: "Салати", items: salads },
  { name: "Омлети", items: omelets },
  { name: "Десерти", items: desserts },
  { name: "Напитки", items: drinks },
  { name: "Хляб", items: bread },
];

// „350 г · Описание“ — или само едното, ако другото липсва.
export function menuItemDetails(item: MenuItem) {
  return [item.weight, item.description].filter(Boolean).join(" · ");
}
