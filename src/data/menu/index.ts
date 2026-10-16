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
  // Date.getDay(): 1 = понеделник … 6 = събота.
  weekday: number;
  label: string;
  name: string;
  // „Само в понеделник“ / „Само във вторник“.
  onlyLabel: string;
  items: MenuItem[];
};

export const lunchDays: LunchDay[] = [
  { id: "mon", weekday: 1, label: "Пон", name: "Понеделник", onlyLabel: "Само в понеделник", items: lunchMonday },
  { id: "tue", weekday: 2, label: "Вт", name: "Вторник", onlyLabel: "Само във вторник", items: lunchTuesday },
  { id: "wed", weekday: 3, label: "Ср", name: "Сряда", onlyLabel: "Само в сряда", items: lunchWednesday },
  { id: "thu", weekday: 4, label: "Чет", name: "Четвъртък", onlyLabel: "Само в четвъртък", items: lunchThursday },
  { id: "fri", weekday: 5, label: "Пет", name: "Петък", onlyLabel: "Само в петък", items: lunchFriday },
  { id: "sat", weekday: 6, label: "Съб", name: "Събота", onlyLabel: "Само в събота", items: lunchSaturday },
];

export const LUNCH_SECTION = "Обедно меню";

// Редът на табовете. „Обедно меню“ няма items тук — ястията му са по дни.
export const menuSections: { key: string; name: string; items: MenuItem[] }[] = [
  { key: "lunch", name: LUNCH_SECTION, items: [] },
  { key: "grill", name: "Скара", items: grill },
  { key: "fish", name: "Риба", items: fish },
  { key: "soups", name: "Супи", items: soups },
  { key: "salads", name: "Салати", items: salads },
  { key: "omelets", name: "Омлети", items: omelets },
  { key: "desserts", name: "Десерти", items: desserts },
  { key: "drinks", name: "Напитки", items: drinks },
  { key: "bread", name: "Хляб", items: bread },
];

// Ястие + къде се намира в менюто. id-то е „секция:име“ (имената в една
// секция са уникални), за обедното меню — „lunch-mon:име“. Така е стабилно
// при пренареждане на JSON-а и сървърът намира цената по него.
export type MenuEntry = {
  id: string;
  item: MenuItem;
  category: string;
  // Само за обедното меню: id на деня ("mon"…"sat").
  day?: string;
};

export const menuEntries: MenuEntry[] = [
  ...menuSections.flatMap((s) =>
    s.items.map((item) => ({ id: `${s.key}:${item.name}`, item, category: s.name }))
  ),
  ...lunchDays.flatMap((d) =>
    d.items.map((item) => ({
      id: `lunch-${d.id}:${item.name}`,
      item,
      category: LUNCH_SECTION,
      day: d.id,
    }))
  ),
];

const entriesById = new Map(menuEntries.map((e) => [e.id, e]));

export function findMenuEntry(id: string) {
  return entriesById.get(id);
}

export function lunchEntryId(day: LunchDay, item: MenuItem) {
  return `lunch-${day.id}:${item.name}`;
}

export function sectionEntryId(sectionKey: string, item: MenuItem) {
  return `${sectionKey}:${item.name}`;
}

// „350 г · Описание“ — или само едното, ако другото липсва.
export function menuItemDetails(item: MenuItem) {
  return [item.weight, item.description].filter(Boolean).join(" · ");
}
