"use server";

import { refresh } from "next/cache";
import { after } from "next/server";
import { ALLERGENS } from "@/lib/allergens";
import type { OrderStatus } from "@/lib/order-status";
import { parsePriceCents } from "@/lib/pricing";
import { isIsoDate } from "@/lib/time";
import { requireOwner, type Owner } from "@/lib/server/auth";
import { getSofiaNow } from "@/lib/server/clock";
import { sendOutboxRow } from "@/lib/server/email/outbox";
import { acceptOrder, advanceOrder, cancelOrder, markPaid, refundOrder, rejectOrder } from "@/lib/server/order-ops";
import { db } from "@/lib/server/supabase";

// Every action re-checks the owner on the server. Nothing here trusts the
// browser beyond the submitted values, which are validated again.

export type ActionResult = { ok: boolean; message?: string };

const ok = (message?: string): ActionResult => ({ ok: true, message });
const fail = (message: string): ActionResult => ({ ok: false, message });
const int = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};
const text = (v: FormDataEntryValue | null, max = 300) => String(v ?? "").trim().slice(0, max);

async function audit(owner: Owner, action: string, entity: string, entityId: string | number | null, details: Record<string, unknown> = {}) {
  await db().from("audit_log").insert({ actor: "owner", actor_id: owner.id, action, entity, entity_id: entityId === null ? null : String(entityId), details: details as never });
}

function done(result: ActionResult) {
  refresh();
  return result;
}

// ---------------------------------------------------------------------------
// Orders

export async function acceptAction(orderId: number) {
  const owner = await requireOwner();
  return done(await acceptOrder(int(orderId), owner, after));
}

export async function rejectAction(orderId: number, reason: string) {
  const owner = await requireOwner();
  return done(await rejectOrder(int(orderId), owner, String(reason ?? "").slice(0, 300), after));
}

export async function advanceAction(orderId: number, to: OrderStatus) {
  const owner = await requireOwner();
  return done(await advanceOrder(int(orderId), owner, to));
}

export async function cancelAction(orderId: number, reason: string, restoreStock: boolean) {
  const owner = await requireOwner();
  return done(await cancelOrder(int(orderId), owner, { reason: String(reason ?? "").slice(0, 300), restoreStock: Boolean(restoreStock) }, after));
}

export async function markPaidAction(orderId: number) {
  const owner = await requireOwner();
  return done(await markPaid(int(orderId), owner));
}

export async function refundAction(orderId: number, amount: string, reason: string) {
  const owner = await requireOwner();
  const cents = parsePriceCents(String(amount ?? "").replace("€", "").trim());
  if (cents === null) return fail("Въведете сума, напр. 4,90.");
  return done(await refundOrder(int(orderId), owner, cents, String(reason ?? "").slice(0, 300), after));
}

export async function acknowledgeAction(orderIds: number[]) {
  await requireOwner();
  const ids = orderIds.map(int).filter((n) => n > 0).slice(0, 100);
  if (ids.length) await db().from("orders").update({ acknowledged_at: new Date().toISOString() }).in("id", ids).is("acknowledged_at", null);
  return ok();
}

export async function retryEmailAction(outboxId: number) {
  const owner = await requireOwner();
  await db().from("email_outbox").update({ attempts: 0, next_attempt_at: new Date().toISOString() }).eq("id", int(outboxId));
  const sent = await sendOutboxRow(int(outboxId), { manual: true });
  await audit(owner, "email.retry", "email", outboxId, { sent });
  return done(sent ? ok("Имейлът е изпратен.") : fail("Имейлът пак не беше изпратен — вижте грешката."));
}

// ---------------------------------------------------------------------------
// Dishes

export async function saveDishAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const owner = await requireOwner();
  const id = int(form.get("id"));
  const price = parsePriceCents(text(form.get("price"), 20));
  const nameBg = text(form.get("name_bg"), 200);
  const nameEn = text(form.get("name_en"), 200) || null;
  if (!nameBg) return fail("Името на български е задължително.");
  if (price === null || price <= 0) return fail("Невалидна цена. Пример: 4,90");
  const categoryId = int(form.get("category_id"));
  if (!(categoryId > 0)) return fail("Изберете категория.");
  const allergens = form.getAll("allergens").map(String).filter((a) => a in ALLERGENS);
  const isStanding = form.get("is_standing") === "on";
  const capRaw = text(form.get("standing_daily_cap"), 6);
  const cap = isStanding && capRaw ? int(capRaw) : null;
  if (cap !== null && !(cap > 0)) return fail("Дневният лимит трябва да е цяло число над 0 или празно.");
  let enStatus = text(form.get("en_status"), 20);
  if (!["missing", "needs_review", "approved"].includes(enStatus)) enStatus = "missing";
  if (enStatus === "approved" && !nameEn) return fail("За да публикувате на английски, попълнете английското име.");
  if (!nameEn) enStatus = "missing";

  const values = {
    name_bg: nameBg,
    name_en: nameEn,
    description_bg: text(form.get("description_bg"), 600),
    description_en: text(form.get("description_en"), 600) || null,
    en_status: enStatus,
    price_cents: price,
    weight: text(form.get("weight"), 40),
    category_id: categoryId,
    allergens,
    allergens_verified: form.get("allergens_verified") === "on",
    is_visible: form.get("is_visible") === "on",
    is_standing: isStanding,
    standing_daily_cap: cap,
  };

  // Photo upload (optional) to the dish-photos bucket.
  const photo = form.get("photo");
  let imagePath: string | undefined;
  if (photo instanceof File && photo.size > 0) {
    if (!["image/webp", "image/jpeg", "image/png"].includes(photo.type)) return fail("Снимката трябва да е WebP, JPEG или PNG.");
    if (photo.size > 5 * 1024 * 1024) return fail("Снимката е над 5 MB.");
    const ext = photo.type === "image/webp" ? "webp" : photo.type === "image/png" ? "png" : "jpg";
    imagePath = `dish-${crypto.randomUUID()}.${ext}`;
    const { error } = await db().storage.from("dish-photos").upload(imagePath, photo, { contentType: photo.type, upsert: false });
    if (error) return fail(`Снимката не беше качена: ${error.message}`);
  }

  if (id > 0) {
    const { data: before } = await db().from("dishes").select("price_cents, name_bg").eq("id", id).single();
    const { error } = await db().from("dishes").update({ ...values, ...(imagePath ? { image_path: imagePath } : {}) }).eq("id", id);
    if (error) return fail(error.message);
    await audit(owner, "dish.updated", "dish", id, { price_from: before?.price_cents, price_to: price });
    return done(ok("Запазено."));
  }
  const slugBase = nameBg
    .toLowerCase()
    .replace(/[^a-z0-9а-я]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${translit(slugBase).slice(0, 80) || "dish"}-${Date.now().toString(36)}`;
  const { data, error } = await db()
    .from("dishes")
    .insert({ ...values, slug, image_path: imagePath ?? null })
    .select("id")
    .single();
  if (error) return fail(error.message);
  await audit(owner, "dish.created", "dish", data.id, { price_cents: price });
  return done(ok("Ястието е добавено."));
}

const TR: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya" };
function translit(s: string) {
  return s
    .split("")
    .map((c) => TR[c] ?? c)
    .join("")
    .replace(/[^a-z0-9-]/g, "");
}

export async function archiveDishAction(dishId: number, archived: boolean) {
  const owner = await requireOwner();
  const { error } = await db().from("dishes").update({ archived_at: archived ? new Date().toISOString() : null }).eq("id", int(dishId));
  if (error) return fail(error.message);
  await audit(owner, archived ? "dish.archived" : "dish.restored", "dish", dishId);
  return done(ok(archived ? "Ястието е скрито от менюто. Минали поръчки не се променят." : "Ястието е възстановено."));
}

// ---------------------------------------------------------------------------
// Categories

export async function saveCategoryAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const owner = await requireOwner();
  const id = int(form.get("id"));
  const nameBg = text(form.get("name_bg"), 80);
  const nameEn = text(form.get("name_en"), 80) || null;
  if (!nameBg) return fail("Въведете име.");
  if (id > 0) {
    const { error } = await db().from("categories").update({ name_bg: nameBg, name_en: nameEn }).eq("id", id);
    if (error) return fail(error.message);
    await audit(owner, "category.renamed", "category", id, { name_bg: nameBg });
  } else {
    const { data: last } = await db().from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1);
    const slug = `${translit(nameBg.toLowerCase().replace(/\s+/g, "-")).slice(0, 40) || "cat"}-${Date.now().toString(36)}`;
    const { error } = await db().from("categories").insert({ name_bg: nameBg, name_en: nameEn, slug, sort_order: (last?.[0]?.sort_order ?? 0) + 10 });
    if (error) return fail(error.message);
    await audit(owner, "category.created", "category", null, { name_bg: nameBg });
  }
  return done(ok("Запазено."));
}

export async function moveCategoryAction(categoryId: number, direction: -1 | 1) {
  const owner = await requireOwner();
  const { data } = await db().from("categories").select("id, sort_order").order("sort_order").order("id");
  if (!data) return fail("Грешка.");
  const i = data.findIndex((c) => c.id === int(categoryId));
  const j = i + direction;
  if (i < 0 || j < 0 || j >= data.length) return ok();
  const order = [...data];
  [order[i], order[j]] = [order[j], order[i]];
  await Promise.all(order.map((c, k) => db().from("categories").update({ sort_order: k * 10 }).eq("id", c.id)));
  await audit(owner, "category.reordered", "category", categoryId, { direction });
  return done(ok());
}

export async function toggleCategoryHiddenAction(categoryId: number, hidden: boolean) {
  const owner = await requireOwner();
  await db().from("categories").update({ is_hidden: hidden }).eq("id", int(categoryId));
  await audit(owner, hidden ? "category.hidden" : "category.shown", "category", categoryId);
  return done(ok());
}

// ---------------------------------------------------------------------------
// Week planning and stock

function checkDate(date: string) {
  if (!isIsoDate(date)) throw new Error("Невалидна дата.");
  return date;
}

export async function prefillWeekAction(monday: string) {
  const owner = await requireOwner();
  const { data, error } = await db().rpc("prefill_week", { p_monday: checkDate(monday), p_actor_id: owner.id });
  if (error) return fail(error.message === "not_a_monday" ? "Изберете понеделник." : error.message);
  return done(ok(data ? `Създадени ${data} чернови от шаблоните.` : "Всички дни от седмицата вече съществуват."));
}

export async function publishDayAction(date: string, publish: boolean) {
  const owner = await requireOwner();
  const { error } = await db()
    .from("menu_days")
    .update({ status: publish ? "published" : "draft", published_at: publish ? new Date().toISOString() : null })
    .eq("menu_date", checkDate(date));
  if (error) return fail(error.message);
  await audit(owner, publish ? "menu.published" : "menu.unpublished", "menu_day", date);
  return done(ok(publish ? "Денят е публикуван." : "Денят е върнат в чернова."));
}

export async function createDayAction(date: string) {
  const owner = await requireOwner();
  await db().from("menu_days").upsert({ menu_date: checkDate(date), status: "draft" }, { onConflict: "menu_date", ignoreDuplicates: true });
  await audit(owner, "menu.day_created", "menu_day", date);
  return done(ok());
}

export async function setPortionsAction(date: string, dishId: number, portions: number) {
  const owner = await requireOwner();
  const value = int(portions);
  if (!(value >= 0 && value <= 999)) return fail("Порциите са от 0 до 999.");
  const { data: before } = await db().from("menu_day_dishes").select("portions, reserved").eq("menu_date", checkDate(date)).eq("dish_id", int(dishId)).single();
  await db().from("menu_day_dishes").update({ portions: value }).eq("menu_date", date).eq("dish_id", int(dishId));
  await audit(owner, "stock.portions", "menu_day", date, { dish_id: dishId, from: before?.portions, to: value, reserved: before?.reserved });
  return done(ok(before && value < before.reserved ? `Внимание: вече има ${before.reserved} поръчани порции.` : undefined));
}

export async function setSoldOutAction(date: string, dishId: number, soldOut: boolean, kind: "daily" | "standing") {
  const owner = await requireOwner();
  checkDate(date);
  if (kind === "daily") {
    await db().from("menu_day_dishes").update({ sold_out: soldOut }).eq("menu_date", date).eq("dish_id", int(dishId));
  } else {
    await db().from("standing_stock").upsert({ menu_date: date, dish_id: int(dishId), sold_out: soldOut }, { onConflict: "menu_date,dish_id" });
  }
  await audit(owner, soldOut ? "stock.sold_out" : "stock.back_in_stock", kind === "daily" ? "menu_day" : "standing", date, { dish_id: dishId });
  return done(ok());
}

export async function setStandingCapAction(dishId: number, cap: string) {
  const owner = await requireOwner();
  const value = cap.trim() === "" ? null : int(cap);
  if (value !== null && !(value > 0)) return fail("Лимитът е цяло число над 0 или празно (без лимит).");
  await db().from("dishes").update({ standing_daily_cap: value }).eq("id", int(dishId)).eq("is_standing", true);
  await audit(owner, "stock.standing_cap", "dish", dishId, { cap: value });
  return done(ok());
}

export async function addDishToDayAction(date: string, dishId: number, portions: number) {
  const owner = await requireOwner();
  checkDate(date);
  const value = int(portions);
  if (!(value >= 0)) return fail("Невалидни порции.");
  await db().from("menu_days").upsert({ menu_date: date, status: "draft" }, { onConflict: "menu_date", ignoreDuplicates: true });
  const { data: last } = await db().from("menu_day_dishes").select("sort_order").eq("menu_date", date).order("sort_order", { ascending: false }).limit(1);
  const { error } = await db().from("menu_day_dishes").insert({ menu_date: date, dish_id: int(dishId), portions: value, sort_order: (last?.[0]?.sort_order ?? 0) + 1 });
  if (error) return fail(error.code === "23505" ? "Ястието вече е в този ден." : error.message);
  await audit(owner, "menu.dish_added", "menu_day", date, { dish_id: dishId, portions: value });
  return done(ok());
}

export async function removeDishFromDayAction(date: string, dishId: number) {
  const owner = await requireOwner();
  const { data } = await db().from("menu_day_dishes").select("reserved").eq("menu_date", checkDate(date)).eq("dish_id", int(dishId)).single();
  if (data && data.reserved > 0) return fail("Има поръчки с това ястие. Отбележете го като изчерпано вместо да го махате.");
  await db().from("menu_day_dishes").delete().eq("menu_date", date).eq("dish_id", int(dishId));
  await audit(owner, "menu.dish_removed", "menu_day", date, { dish_id: dishId });
  return done(ok());
}

export async function copyDayAction(from: string, to: string) {
  const owner = await requireOwner();
  const { data, error } = await db().rpc("copy_menu_day", { p_from: checkDate(from), p_to: checkDate(to), p_actor_id: owner.id });
  if (error) return fail(error.message === "same_day" ? "Изберете друга дата." : error.message);
  return done(ok(`Копирани ${data} ястия (ако денят е нов, е чернова).`));
}

// ---------------------------------------------------------------------------
// Weekday templates

export async function addTemplateDishAction(weekday: number, dishId: number, portions: number) {
  const owner = await requireOwner();
  const wd = int(weekday);
  if (!(wd >= 1 && wd <= 6)) return fail("Невалиден ден.");
  const { data: last } = await db().from("weekday_templates").select("sort_order").eq("weekday", wd).order("sort_order", { ascending: false }).limit(1);
  const { error } = await db().from("weekday_templates").insert({ weekday: wd, dish_id: int(dishId), default_portions: Math.max(0, int(portions) || 0), sort_order: (last?.[0]?.sort_order ?? 0) + 1 });
  if (error) return fail(error.code === "23505" ? "Ястието вече е в шаблона." : error.message);
  await audit(owner, "template.dish_added", "template", wd, { dish_id: dishId });
  return done(ok());
}

export async function removeTemplateDishAction(weekday: number, dishId: number) {
  const owner = await requireOwner();
  await db().from("weekday_templates").delete().eq("weekday", int(weekday)).eq("dish_id", int(dishId));
  await audit(owner, "template.dish_removed", "template", weekday, { dish_id: dishId });
  return done(ok());
}

export async function setTemplatePortionsAction(weekday: number, dishId: number, portions: number) {
  const owner = await requireOwner();
  const value = int(portions);
  if (!(value >= 0 && value <= 999)) return fail("Порциите са от 0 до 999.");
  await db().from("weekday_templates").update({ default_portions: value }).eq("weekday", int(weekday)).eq("dish_id", int(dishId));
  await audit(owner, "template.portions", "template", weekday, { dish_id: dishId, portions: value });
  return done(ok());
}

// ---------------------------------------------------------------------------
// Settings

const cents = (v: FormDataEntryValue | null) => parsePriceCents(text(v, 20));

export async function saveSettingsAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const owner = await requireOwner();
  const min = cents(form.get("min_subtotal"));
  const freeRaw = text(form.get("free_delivery_from"), 20);
  const free = freeRaw === "" ? null : cents(form.get("free_delivery_from"));
  const pct = Number(text(form.get("pickup_discount"), 6).replace(",", "."));
  const delivery = int(form.get("delivery_estimate"));
  const pickup = int(form.get("pickup_estimate"));
  if (min === null) return fail("Невалидна минимална сума.");
  if (freeRaw !== "" && free === null) return fail("Невалиден праг за безплатна доставка.");
  if (!(pct >= 0 && pct <= 100)) return fail("Отстъпката е от 0 до 100%.");
  if (!(delivery >= 0 && delivery <= 600) || !(pickup >= 0 && pickup <= 600)) return fail("Невалидно време за изпълнение.");
  const email = text(form.get("owner_notification_email"), 254) || null;
  const replyTo = text(form.get("reply_to_email"), 254) || null;
  const emailOk = (e: string | null) => e === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
  if (!emailOk(email) || !emailOk(replyTo)) return fail("Невалиден имейл адрес.");
  const values = {
    min_subtotal_cents: min,
    free_delivery_from_cents: free,
    pickup_discount_bps: Math.round(pct * 100),
    delivery_estimate_minutes: delivery,
    pickup_estimate_minutes: pickup,
    card_payments_enabled: form.get("card_payments_enabled") === "on",
    turnstile_enabled: form.get("turnstile_enabled") === "on",
    ordering_paused: form.get("ordering_paused") === "on",
    pause_message_bg: text(form.get("pause_message_bg"), 300) || null,
    pause_message_en: text(form.get("pause_message_en"), 300) || null,
    owner_notification_email: email,
    reply_to_email: replyTo,
  };
  const { error } = await db().from("settings").update(values).eq("id", 1);
  if (error) return fail(error.message);
  await audit(owner, "settings.updated", "settings", 1, values);
  return done(ok("Настройките са запазени."));
}

export async function saveHoursAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const owner = await requireOwner();
  const rows: { kind: "opening" | "ordering"; weekday: number; opens: string; closes: string }[] = [];
  for (const kind of ["opening", "ordering"] as const) {
    for (let wd = 0; wd <= 6; wd++) {
      if (form.get(`${kind}-${wd}-open`) !== "on") continue;
      const opens = text(form.get(`${kind}-${wd}-opens`), 5);
      const closes = text(form.get(`${kind}-${wd}-closes`), 5);
      if (!/^\d{2}:\d{2}$/.test(opens) || !/^\d{2}:\d{2}$/.test(closes) || opens >= closes) {
        return fail("Проверете часовете: отваряне преди затваряне, формат ЧЧ:ММ.");
      }
      rows.push({ kind, weekday: wd, opens, closes });
    }
  }
  const client = db();
  if (rows.length) {
    const up = await client.from("business_hours").upsert(rows, { onConflict: "kind,weekday" });
    if (up.error) return fail(up.error.message);
  }
  for (const kind of ["opening", "ordering"] as const) {
    const keep = rows.filter((r) => r.kind === kind).map((r) => r.weekday);
    let del = client.from("business_hours").delete().eq("kind", kind);
    if (keep.length) del = del.not("weekday", "in", `(${keep.join(",")})`);
    const res = await del;
    if (res.error) return fail(res.error.message);
  }
  // Changing hours needs a fresh confirmation before checkout reopens.
  await client.from("settings").update({ hours_confirmed_at: null }).eq("id", 1);
  await audit(owner, "settings.hours", "settings", 1, { rows });
  return done(ok("Часовете са запазени. Потвърдете ги, за да се включат онлайн поръчките."));
}

export async function confirmHoursAction(confirm: boolean) {
  const owner = await requireOwner();
  await db().from("settings").update({ hours_confirmed_at: confirm ? new Date().toISOString() : null }).eq("id", 1);
  await audit(owner, confirm ? "settings.hours_confirmed" : "settings.hours_unconfirmed", "settings", 1);
  return done(ok(confirm ? "Часовете са потвърдени — онлайн поръчките са включени." : "Онлайн поръчките са изключени до ново потвърждение."));
}

export async function addClosureAction(date: string, note: string) {
  const owner = await requireOwner();
  const { error } = await db().from("closures").upsert({ closed_on: checkDate(date), note: String(note ?? "").slice(0, 200) || null });
  if (error) return fail(error.message);
  await audit(owner, "settings.closure_added", "closure", date);
  return done(ok());
}

export async function removeClosureAction(date: string) {
  const owner = await requireOwner();
  await db().from("closures").delete().eq("closed_on", checkDate(date));
  await audit(owner, "settings.closure_removed", "closure", date);
  return done(ok());
}

export async function saveDistrictAction(_prev: ActionResult, form: FormData): Promise<ActionResult> {
  const owner = await requireOwner();
  const id = int(form.get("id"));
  const nameBg = text(form.get("name_bg"), 80);
  const fee = cents(form.get("fee"));
  if (!nameBg) return fail("Въведете име на квартала.");
  if (fee === null) return fail("Невалидна цена на доставката.");
  const values = { name_bg: nameBg, name_en: text(form.get("name_en"), 80) || null, fee_cents: fee, is_active: form.get("is_active") === "on" };
  const { error } = id > 0 ? await db().from("districts").update(values).eq("id", id) : await db().from("districts").insert({ ...values, sort_order: 1000 });
  if (error) return fail(error.code === "23505" ? "Квартал с това име вече съществува." : error.message);
  await audit(owner, id > 0 ? "district.updated" : "district.created", "district", id > 0 ? id : null, values);
  return done(ok("Запазено."));
}

export async function todayAction() {
  await requireOwner();
  return (await getSofiaNow()).date;
}
