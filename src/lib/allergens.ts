// The 14 allergens of EU Regulation 1169/2011, Annex II. Codes match the
// check constraint on dishes.allergens.

import type { Locale } from "./routes";

export const ALLERGENS = {
  gluten: { bg: "Глутен", en: "Gluten" },
  crustaceans: { bg: "Ракообразни", en: "Crustaceans" },
  eggs: { bg: "Яйца", en: "Eggs" },
  fish: { bg: "Риба", en: "Fish" },
  peanuts: { bg: "Фъстъци", en: "Peanuts" },
  soybeans: { bg: "Соя", en: "Soya" },
  milk: { bg: "Мляко", en: "Milk" },
  nuts: { bg: "Ядки", en: "Tree nuts" },
  celery: { bg: "Целина", en: "Celery" },
  mustard: { bg: "Горчица", en: "Mustard" },
  sesame: { bg: "Сусам", en: "Sesame" },
  sulphites: { bg: "Сулфити", en: "Sulphites" },
  lupin: { bg: "Лупина", en: "Lupin" },
  molluscs: { bg: "Мекотели", en: "Molluscs" },
} as const;

export type AllergenCode = keyof typeof ALLERGENS;

export function allergenLabels(codes: string[], locale: Locale) {
  return codes.map((c) => ALLERGENS[c as AllergenCode]?.[locale] ?? c).join(", ");
}
