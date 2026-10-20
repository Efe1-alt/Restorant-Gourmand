// Shapes the server sends to public pages. No personal data, no secrets.

import type { OrderingConfig, WeekHours } from "./hours";
import type { PricingSettings } from "./pricing";

export type StockKind = "daily" | "standing";

export type PublicDish = {
  id: number;
  slug: string;
  name: string;
  description: string;
  weight: string;
  priceCents: number;
  image: string | null;
  categorySlug: string;
  categoryName: string;
  kind: StockKind;
  // Today only. remaining: null = no limit.
  orderable: boolean;
  remaining: number | null;
  allergens: string[];
  allergensVerified: boolean;
  // English page showing the Bulgarian text until the owner approves English.
  untranslated: boolean;
};

export type MenuDay = {
  date: string;
  weekday: number;
  isToday: boolean;
  dishes: PublicDish[];
};

export type PublicDistrict = { id: number; name: string; feeCents: number };

export type ShopConfig = {
  today: string;
  ordering: OrderingConfig;
  pricing: PricingSettings;
  cardEnabled: boolean;
  turnstileSiteKey: string | null;
  districts: PublicDistrict[];
  pauseMessage: string | null;
};

export type MenuView = {
  today: string;
  todayPublished: boolean;
  // Today's published daily (lunch) dishes, orderable.
  daily: PublicDish[];
  // Standing dishes by category, orderable every ordering day.
  categories: { slug: string; name: string; dishes: PublicDish[] }[];
  // Published days of this week (informational, except today).
  week: MenuDay[];
};

export type { WeekHours };
