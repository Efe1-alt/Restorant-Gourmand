import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
  auth: { persistSession: false },
});
export const anon = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
  auth: { persistSession: false },
});

// A far-future Monday per test file so tests never touch real data.
export function testDate(offsetWeeks: number) {
  const d = new Date(Date.UTC(2099, 0, 5 + offsetWeeks * 7)); // 2099-01-05 is a Monday
  return d.toISOString().slice(0, 10);
}

export async function categoryId(slug: string) {
  const { data } = await admin.from("categories").select("id").eq("slug", slug).single();
  return data!.id;
}

export async function makeDish(opts: { standing?: boolean; price?: number; cap?: number | null } = {}) {
  const { data, error } = await admin
    .from("dishes")
    .insert({
      slug: `test-${randomUUID().slice(0, 8)}`,
      category_id: await categoryId(opts.standing ? "grill" : "lunch"),
      name_bg: `Тестово ястие ${randomUUID().slice(0, 4)}`,
      price_cents: opts.price ?? 500,
      is_standing: opts.standing ?? false,
      standing_daily_cap: opts.cap ?? null,
    })
    .select("id, price_cents, name_bg")
    .single();
  if (error) throw error;
  return data;
}

export async function publishDay(date: string, dishes: { id: number; portions: number }[], status: "published" | "draft" = "published") {
  await admin.from("menu_days").upsert({ menu_date: date, status, published_at: status === "published" ? new Date().toISOString() : null });
  if (dishes.length) await admin.from("menu_day_dishes").upsert(dishes.map((d) => ({ menu_date: date, dish_id: d.id, portions: d.portions })));
}

export function orderPayload(date: string, over: Record<string, unknown> = {}) {
  return {
    menu_date: date,
    locale: "bg",
    fulfilment: "pickup",
    payment_method: "pay_at_pickup",
    customer_name: "Тест",
    customer_phone: "+359888000111",
    customer_email: null,
    address: null,
    district_id: null,
    district_name: null,
    notes: null,
    requested_time: "asap",
    subtotal_cents: 500,
    discount_cents: 0,
    delivery_fee_cents: 0,
    total_cents: 500,
    ...over,
  };
}

export const item = (dish: { id: number; price_cents: number; name_bg: string }, quantity: number, kind: "daily" | "standing" = "daily") => ({
  dish_id: dish.id,
  stock_kind: kind,
  quantity,
  unit_price_cents: dish.price_cents,
  name_bg: dish.name_bg,
  name_en: null,
  weight: "",
});

export async function place(date: string, items: ReturnType<typeof item>[], over: Record<string, unknown> = {}) {
  const subtotal = items.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0);
  return admin.rpc("place_order", {
    p_order: orderPayload(date, { subtotal_cents: subtotal, total_cents: subtotal, ...over }),
    p_items: items,
  });
}

export async function cleanup(dates: string[], dishIds: number[]) {
  await admin.from("orders").delete().in("menu_date", dates);
  await admin.from("standing_stock").delete().in("menu_date", dates);
  await admin.from("menu_days").delete().in("menu_date", dates);
  if (dishIds.length) await admin.from("dishes").delete().in("id", dishIds);
}
