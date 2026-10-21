import "server-only";
import { cache } from "react";
import type { MenuDay, MenuView, PublicDish, ShopConfig } from "@/lib/catalog-types";
import type { OrderingConfig, WeekHours } from "@/lib/hours";
import type { Locale } from "@/lib/routes";
import { addDays, mondayOf, weekdayOf } from "@/lib/time";
import { getSofiaNow } from "./clock";
import { env } from "./env";
import { db, photoUrl } from "./supabase";

// ---------------------------------------------------------------------------
// Settings, hours, districts

function toWeek(rows: { weekday: number; opens: string; closes: string }[]): WeekHours {
  const week: WeekHours = [null, null, null, null, null, null, null];
  for (const r of rows) week[r.weekday] = { opens: r.opens.slice(0, 5), closes: r.closes.slice(0, 5) };
  return week;
}

export const loadSettings = cache(async (today: string) => {
  const client = db();
  const [settings, hours, closures, districts] = await Promise.all([
    client.from("settings").select("*").eq("id", 1).single(),
    client.from("business_hours").select("kind, weekday, opens, closes"),
    client
      .from("closures")
      .select("closed_on, note")
      .gte("closed_on", today)
      .lte("closed_on", addDays(today, 60))
      .order("closed_on"),
    client.from("districts").select("id, name_bg, name_en, fee_cents, is_active, sort_order").order("sort_order").order("name_bg"),
  ]);
  for (const r of [settings, hours, closures, districts]) if (r.error) throw r.error;
  const s = settings.data!;
  const ordering: OrderingConfig = {
    orderingHours: toWeek(hours.data!.filter((h) => h.kind === "ordering")),
    openingHours: toWeek(hours.data!.filter((h) => h.kind === "opening")),
    closures: closures.data!.map((c) => c.closed_on),
    hoursConfirmed: s.hours_confirmed_at !== null,
    paused: s.ordering_paused,
    deliveryEstimateMinutes: s.delivery_estimate_minutes,
    pickupEstimateMinutes: s.pickup_estimate_minutes,
  };
  return { settings: s, ordering, districts: districts.data!, closures: closures.data! };
});

export const getShopConfig = cache(async (locale: Locale): Promise<ShopConfig> => {
  const now = await getSofiaNow();
  const { settings, ordering, districts } = await loadSettings(now.date);
  return {
    today: now.date,
    ordering,
    pricing: {
      minSubtotalCents: settings.min_subtotal_cents,
      freeDeliveryFromCents: settings.free_delivery_from_cents,
      pickupDiscountBps: settings.pickup_discount_bps,
    },
    cardEnabled: settings.card_payments_enabled && Boolean(env.stripeSecretKey),
    turnstileSiteKey:
      settings.turnstile_enabled && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        ? process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        : null,
    districts: districts
      .filter((d) => d.is_active)
      .map((d) => ({ id: d.id, name: locale === "en" ? (d.name_en ?? d.name_bg) : d.name_bg, feeCents: d.fee_cents })),
    pauseMessage: settings.ordering_paused
      ? (locale === "en" ? settings.pause_message_en : settings.pause_message_bg) ?? null
      : null,
  };
});

// ---------------------------------------------------------------------------
// Menu

type DishRow = {
  id: number;
  slug: string;
  name_bg: string;
  name_en: string | null;
  description_bg: string;
  description_en: string | null;
  en_status: string;
  price_cents: number;
  weight: string;
  allergens: string[];
  allergens_verified: boolean;
  image_path: string | null;
  is_standing: boolean;
  standing_daily_cap: number | null;
  sort_order: number;
  categories: { slug: string; name_bg: string; name_en: string | null; sort_order: number; is_hidden: boolean };
};

const DISH_COLUMNS =
  "id, slug, name_bg, name_en, description_bg, description_en, en_status, price_cents, weight, allergens, allergens_verified, image_path, is_standing, standing_daily_cap, sort_order, categories!inner(slug, name_bg, name_en, sort_order, is_hidden)";

export const loadMenu = cache(async (today: string) => {
  const client = db();
  // This week's Mon–Sat; on Sunday, the coming week.
  const start = weekdayOf(today) === 0 ? addDays(today, 1) : mondayOf(today);
  const end = addDays(start, 5);
  const [dishes, days, standing] = await Promise.all([
    client
      .from("dishes")
      .select(DISH_COLUMNS)
      .eq("is_visible", true)
      .is("archived_at", null)
      .eq("categories.is_hidden", false)
      .order("sort_order"),
    client
      .from("menu_days")
      .select("menu_date, menu_day_dishes(dish_id, portions, reserved, sold_out, sort_order)")
      .eq("status", "published")
      .gte("menu_date", start < today ? start : today)
      .lte("menu_date", end > today ? end : today),
    client.from("standing_stock").select("dish_id, reserved, sold_out").eq("menu_date", today),
  ]);
  for (const r of [dishes, days, standing]) if (r.error) throw r.error;
  return {
    dishes: dishes.data as unknown as DishRow[],
    days: days.data!,
    standing: standing.data!,
  };
});

function localizeDish(row: DishRow, locale: Locale) {
  const english = locale === "en" && row.en_status === "approved" && row.name_en;
  return {
    name: english ? row.name_en! : row.name_bg,
    description: english ? (row.description_en ?? "") : row.description_bg,
    untranslated: locale === "en" && !english,
    categoryName: locale === "en" ? (row.categories.name_en ?? row.categories.name_bg) : row.categories.name_bg,
  };
}

function toPublic(row: DishRow, locale: Locale, kind: PublicDish["kind"], remaining: number | null, orderable: boolean): PublicDish {
  const text = localizeDish(row, locale);
  return {
    id: row.id,
    slug: row.slug,
    name: text.name,
    description: text.description,
    weight: row.weight,
    priceCents: row.price_cents,
    image: photoUrl(row.image_path),
    categorySlug: row.categories.slug,
    categoryName: text.categoryName,
    kind,
    orderable,
    remaining,
    allergens: row.allergens_verified ? row.allergens : [],
    allergensVerified: row.allergens_verified,
    untranslated: text.untranslated,
  };
}

export async function getMenuView(locale: Locale): Promise<MenuView> {
  const now = await getSofiaNow();
  const today = now.date;
  const { dishes, days, standing } = await loadMenu(today);
  const byId = new Map(dishes.map((d) => [d.id, d]));
  const standingToday = new Map(standing.map((s) => [s.dish_id, s]));

  const dayView = (day: (typeof days)[number]): MenuDay => {
    const isToday = day.menu_date === today;
    const list = [...day.menu_day_dishes]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((entry) => {
        const row = byId.get(entry.dish_id);
        if (!row || row.is_standing) return [];
        const remaining = entry.sold_out ? 0 : Math.max(entry.portions - entry.reserved, 0);
        return [toPublic(row, locale, "daily", isToday ? remaining : null, isToday && remaining > 0)];
      });
    return { date: day.menu_date, weekday: weekdayOf(day.menu_date), isToday, dishes: list };
  };

  const week = days.map(dayView).sort((a, b) => a.date.localeCompare(b.date));
  const todayDay = week.find((d) => d.isToday);

  const categoryMap = new Map<string, { slug: string; name: string; order: number; dishes: PublicDish[] }>();
  for (const row of dishes) {
    if (!row.is_standing) continue;
    const s = standingToday.get(row.id);
    const remaining = s?.sold_out
      ? 0
      : row.standing_daily_cap === null
        ? null
        : Math.max(row.standing_daily_cap - (s?.reserved ?? 0), 0);
    const dish = toPublic(row, locale, "standing", remaining, remaining === null || remaining > 0);
    const key = row.categories.slug;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, { slug: key, name: dish.categoryName, order: row.categories.sort_order, dishes: [] });
    }
    categoryMap.get(key)!.dishes.push(dish);
  }

  return {
    today,
    todayPublished: Boolean(todayDay),
    daily: todayDay?.dishes ?? [],
    categories: [...categoryMap.values()].sort((a, b) => a.order - b.order).map((c) => ({ slug: c.slug, name: c.name, dishes: c.dishes })),
    week,
  };
}

// Dishes for the cart's "add to your lunch" row and the home page.
export async function getFeaturedDishes(locale: Locale, slugs: string[]) {
  const view = await getMenuView(locale);
  const all = [...view.daily, ...view.categories.flatMap((c) => c.dishes)];
  return slugs.map((slug) => all.find((d) => d.slug === slug)).filter((d): d is PublicDish => Boolean(d));
}
