import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types";

// Local test data for 20 Oct 2026: publish that week with 30 portions per
// dish, confirm hours, then drop leftovers from earlier e2e runs and
// recompute reserved portions so every run starts from the same stock.
export default async function globalSetup() {
  execFileSync("node", ["scripts/dev-fixture.mjs", "30", "2026-10-20"], { stdio: "inherit" });
  const db = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
  await db.from("orders").delete().like("customer_name", "E2E%");
  await db.from("menu_day_dishes").update({ sold_out: false }).eq("menu_date", "2026-10-20");
  await db.from("standing_stock").delete().eq("menu_date", "2026-10-20");
  await db.from("settings").update({ ordering_paused: false, card_payments_enabled: true, pickup_discount_bps: 1000, min_subtotal_cents: 500, free_delivery_from_cents: 2500 }).eq("id", 1);

  const { data: held } = await db
    .from("orders")
    .select("order_items(dish_id, quantity, stock_kind)")
    .eq("menu_date", "2026-10-20")
    .eq("stock_held", true);
  const totals = new Map<number, number>();
  for (const o of held ?? []) for (const i of o.order_items) if (i.stock_kind === "daily" && i.dish_id) totals.set(i.dish_id, (totals.get(i.dish_id) ?? 0) + i.quantity);
  const { data: rows } = await db.from("menu_day_dishes").select("dish_id").eq("menu_date", "2026-10-20");
  for (const r of rows ?? []) await db.from("menu_day_dishes").update({ reserved: totals.get(r.dish_id) ?? 0 }).eq("menu_date", "2026-10-20").eq("dish_id", r.dish_id);
  await db.from("rate_limit_hits").delete().gte("created_at", new Date(Date.now() - 3600_000).toISOString());
}
