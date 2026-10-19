// Само за сървъра (/api/order) — не импортирай от клиентски компоненти.

import { findMenuEntry } from "@/data/menu";
import { siteConfig } from "./site-config";
import {
  MAX_QTY,
  orderTotals,
  parsePriceCents,
  paymentLabels,
  sofiaNow,
  timeLabel,
  todaysLunchDayId,
  validateOrderForm,
  type FormErrors,
  type Fulfillment,
  type OrderForm,
  type Payment,
} from "./ordering";
import type { PlacedOrder } from "./placed-order";

export type OrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; status: number; message: string; errors?: FormErrors };

const str = (v: unknown) => (typeof v === "string" ? v : "");

// Номер на поръчката: GM-20261015-0042. Броячът е в паметта на сървъра и се
// нулира при рестарт.
// TODO: при свързване с база вземай поредния номер от нея (sequence), за да
// е уникален и при няколко сървърни инстанции.
const counters = new Map<string, number>();
function nextOrderNumber(ymd: string) {
  const n = (counters.get(ymd) ?? 0) + 1;
  counters.set(ymd, n);
  return `GM-${ymd}-${String(n).padStart(4, "0")}`;
}

// Приема суровото тяло от браузъра и връща готова поръчка. Цените НЕ се
// вземат от браузъра — преизчисляват се от JSON файловете в data/menu.
export function placeOrder(body: unknown, date = new Date()): OrderResult {
  const input = (body ?? {}) as Record<string, unknown>;
  const now = sofiaNow(date);

  const form: OrderForm = {
    fulfillment: str(input.fulfillment) as Fulfillment,
    name: str(input.name).trim(),
    phone: str(input.phone).trim(),
    address: str(input.address).trim(),
    time: str(input.time),
    note: str(input.note).trim(),
    payment: str(input.payment) as Payment,
  };
  const errors = validateOrderForm(form, now);
  if (Object.keys(errors).length > 0) {
    return { ok: false, status: 400, message: "Проверете въведените данни.", errors };
  }

  if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50) {
    return { ok: false, status: 400, message: "Количката е празна." };
  }

  // Събира повторенията на едно и също ястие.
  const quantities = new Map<string, number>();
  for (const raw of input.items as unknown[]) {
    const id = str((raw as { id?: unknown })?.id);
    const quantity = (raw as { quantity?: unknown })?.quantity;
    if (!id || typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
      return { ok: false, status: 400, message: "Невалидна количка." };
    }
    quantities.set(id, Math.min((quantities.get(id) ?? 0) + quantity, MAX_QTY));
  }

  const today = todaysLunchDayId(now);
  const items: PlacedOrder["items"] = [];
  for (const [id, quantity] of quantities) {
    const entry = findMenuEntry(id);
    const price = entry ? parsePriceCents(entry.item.price) : null;
    if (!entry || price === null) {
      return {
        ok: false,
        status: 409,
        message: "Някои ястия вече не са в менюто. Моля, обновете количката.",
      };
    }
    if (entry.day && entry.day !== today) {
      return {
        ok: false,
        status: 409,
        message: `„${entry.item.name}“ е от обедното меню за друг ден. Моля, махнете го от количката.`,
      };
    }
    items.push({
      id,
      name: entry.item.name,
      weight: entry.item.weight,
      quantity,
      price,
      lineTotal: price * quantity,
    });
  }

  const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const totals = orderTotals(subtotal, form.fulfillment);
  if (totals.missingCents > 0) {
    return { ok: false, status: 400, message: "Поръчката е под минималната сума." };
  }

  return {
    ok: true,
    order: {
      number: nextOrderNumber(now.ymd),
      createdAt: date.toISOString(),
      items,
      subtotalCents: totals.subtotalCents,
      deliveryCents: totals.deliveryCents,
      totalCents: totals.totalCents,
      fulfillment: form.fulfillment,
      name: form.name,
      phone: form.phone,
      address: form.fulfillment === "delivery" ? form.address : "",
      time: form.time,
      timeLabel: timeLabel(form.time),
      note: form.note,
      payment: form.payment,
    },
  };
}

// Известява ресторанта за нова поръчка. Засега само я записва в лога на
// сървъра (виж терминала на `npm run dev` или логовете на хостинга).
// TODO: свържи с канала за известяване (имейл, Viber, Supabase таблица `orders`…).
export async function notifyRestaurant(order: PlacedOrder) {
  const lines = [
    `Нова поръчка ${order.number} (${siteConfig.name})`,
    `${order.fulfillment === "delivery" ? "Доставка" : "Вземане от място"} · ${order.timeLabel}`,
    `${order.name} · ${order.phone}`,
    order.address && `Адрес: ${order.address}`,
    ...order.items.map((i) => `  ${i.quantity} × ${i.name} = ${(i.lineTotal / 100).toFixed(2)} €`),
    `Общо: ${(order.totalCents / 100).toFixed(2)} €${order.deliveryCents === null ? " + доставка" : ""}`,
    `Плащане: ${paymentLabels[order.payment]}`,
    order.note && `Бележка: ${order.note}`,
  ].filter(Boolean);
  console.log(lines.join("\n"));
}
