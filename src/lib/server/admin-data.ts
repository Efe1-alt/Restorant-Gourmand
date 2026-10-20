import "server-only";
import { QUEUE_STATUSES } from "@/lib/order-status";
import { addDays } from "@/lib/time";
import { db, photoUrl } from "./supabase";

const QUEUE_COLUMNS =
  "id, number, created_at, status, status_changed_at, fulfilment, payment_method, payment_status, customer_name, customer_phone, address, district_name, notes, requested_time, total_cents, acknowledged_at, order_items(quantity, name_bg, weight)";

// Processing queue: orders that need the owner. Awaiting-payment and
// abandoned card orders never appear here.
export async function getQueue() {
  const { data, error } = await db()
    .from("orders")
    .select(QUEUE_COLUMNS)
    .in("status", QUEUE_STATUSES)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  const unacknowledged = data.filter((o) => o.status === "new" && !o.acknowledged_at).length;
  return { orders: data, unacknowledged, serverTime: new Date().toISOString() };
}
export type QueueOrder = Awaited<ReturnType<typeof getQueue>>["orders"][number];

export async function listOrders(filters: { q?: string; status?: string; date?: string; page?: number }) {
  const page = Math.max(1, filters.page ?? 1);
  let query = db()
    .from("orders")
    .select("id, number, created_at, status, fulfilment, payment_method, payment_status, customer_name, customer_phone, total_cents, refunded_cents", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * 30, page * 30 - 1);
  if (filters.status === "active") query = query.in("status", QUEUE_STATUSES);
  else if (filters.status) query = query.eq("status", filters.status);
  if (filters.date) query = query.eq("menu_date", filters.date);
  const q = filters.q?.trim();
  if (q) {
    const digits = q.replace(/\D/g, "");
    const clean = q.replace(/[%,()*]/g, "");
    const ors = [`number.ilike.%${clean}%`, `customer_name.ilike.%${clean}%`];
    if (digits.length >= 4) ors.push(`customer_phone.ilike.%${digits.slice(-8)}%`);
    query = query.or(ors.join(","));
  }
  const { data, error, count } = await query;
  if (error) throw error;
  return { orders: data, count: count ?? 0, page, pages: Math.max(1, Math.ceil((count ?? 0) / 30)) };
}

export async function getOrderDetail(id: number) {
  const client = db();
  const [order, emails, audit] = await Promise.all([
    client.from("orders").select("*, order_items(*), payments(*), refunds(*)").eq("id", id).maybeSingle(),
    client.from("email_outbox").select("id, kind, to_address, status, attempts, last_error, created_at, sent_at").eq("order_id", id).order("id"),
    client.from("audit_log").select("id, created_at, actor, action, details").eq("entity", "order").eq("entity_id", String(id)).order("id"),
  ]);
  if (order.error) throw order.error;
  if (!order.data) return null;
  return { order: order.data, emails: emails.data ?? [], audit: audit.data ?? [] };
}

export async function getDishes() {
  const [dishes, categories] = await Promise.all([
    db().from("dishes").select("*, categories(slug, name_bg)").order("sort_order"),
    db().from("categories").select("*").order("sort_order"),
  ]);
  if (dishes.error) throw dishes.error;
  if (categories.error) throw categories.error;
  return {
    dishes: dishes.data.map((d) => ({ ...d, imageUrl: photoUrl(d.image_path) })),
    categories: categories.data,
  };
}

export async function getWeek(monday: string) {
  const dates = Array.from({ length: 6 }, (_, i) => addDays(monday, i));
  const [days, dishes] = await Promise.all([
    db()
      .from("menu_days")
      .select("menu_date, status, published_at, menu_day_dishes(dish_id, portions, reserved, sold_out, sort_order)")
      .in("menu_date", dates),
    db().from("dishes").select("id, name_bg, is_standing, archived_at, price_cents").order("name_bg"),
  ]);
  if (days.error) throw days.error;
  if (dishes.error) throw dishes.error;
  return { dates, days: days.data, dishes: dishes.data };
}

export async function getStandingToday(date: string) {
  const [dishes, stock] = await Promise.all([
    db().from("dishes").select("id, name_bg, standing_daily_cap, is_visible, categories(name_bg, sort_order)").eq("is_standing", true).is("archived_at", null).order("sort_order"),
    db().from("standing_stock").select("dish_id, reserved, sold_out").eq("menu_date", date),
  ]);
  if (dishes.error) throw dishes.error;
  const byId = new Map((stock.data ?? []).map((s) => [s.dish_id, s]));
  return dishes.data.map((d) => ({ ...d, reserved: byId.get(d.id)?.reserved ?? 0, sold_out: byId.get(d.id)?.sold_out ?? false }));
}
