import "server-only";
import { slotLabel } from "@/lib/hours";
import { localizeWeight } from "@/lib/i18n";
import { METHOD_LABELS_BG } from "@/lib/order-status";
import { formatCents } from "@/lib/pricing";
import { siteConfig } from "@/lib/site-config";

// Plain, robust HTML for six transactional emails. Owner emails are in
// Bulgarian; customer emails follow the language the order was placed in.

export type EmailOrder = {
  id: number;
  number: string;
  locale: "bg" | "en";
  fulfilment: "delivery" | "pickup";
  payment_method: "card" | "cash" | "pay_at_pickup";
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  address: string | null;
  district_name: string | null;
  notes: string | null;
  requested_time: string;
  subtotal_cents: number;
  discount_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  reason: string | null;
  items: { name_bg: string; name_en: string | null; weight: string; quantity: number; line_total_cents: number }[];
};

export type RenderedEmail = { subject: string; html: string; text: string };

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function layout(title: string, body: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#faf5ec;font-family:Arial,Helvetica,sans-serif;color:#221c15">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf5ec;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf9;border:1px solid #e4d8c2;border-radius:12px">
<tr><td style="padding:24px 24px 8px;font-family:Georgia,serif;font-size:22px;color:#b3512e">Gourmand</td></tr>
<tr><td style="padding:8px 24px 24px;font-size:15px;line-height:1.55">${body}</td></tr>
</table>
<p style="font-size:12px;color:#4a4034;margin:16px 0 0">${esc(siteConfig.contact.address)} · ${esc(siteConfig.contact.phone)}</p>
</td></tr></table></body></html>`;
}

function button(href: string, label: string) {
  return `<p style="margin:20px 0"><a href="${esc(href)}" style="display:inline-block;background:#b3512e;color:#faf5ec;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:999px">${esc(label)}</a></p>`;
}

function itemsTable(order: EmailOrder, locale: "bg" | "en") {
  const rows = order.items
    .map((i) => {
      const name = locale === "en" ? (i.name_en ?? i.name_bg) : i.name_bg;
      const weight = i.weight ? ` <span style="color:#4a4034">(${esc(localizeWeight(i.weight, locale))})</span>` : "";
      return `<tr><td style="padding:6px 0;border-bottom:1px solid #e4d8c2">${i.quantity} × ${esc(name)}${weight}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #e4d8c2;white-space:nowrap">${formatCents(i.line_total_cents, locale)}</td></tr>`;
    })
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:bold" : "color:#4a4034"}">${esc(label)}</td><td align="right" style="padding:4px 0;${bold ? "font-weight:bold" : ""}">${esc(value)}</td></tr>`;
  const t = locale === "bg"
    ? { food: "Храна", discount: "Отстъпка за вземане", delivery: "Доставка", total: "Общо" }
    : { food: "Food", discount: "Pickup discount", delivery: "Delivery", total: "Total" };
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:12px 0">${rows}
${line(t.food, formatCents(order.subtotal_cents, locale))}
${order.discount_cents ? line(t.discount, formatCents(-order.discount_cents, locale)) : ""}
${order.fulfilment === "delivery" ? line(t.delivery, formatCents(order.delivery_fee_cents, locale)) : ""}
${line(t.total, formatCents(order.total_cents, locale), true)}</table>`;
}

function timeText(order: EmailOrder, locale: "bg" | "en") {
  if (order.requested_time === "asap") return locale === "bg" ? "Възможно най-скоро" : "As soon as possible";
  return `${locale === "bg" ? "Днес" : "Today"}, ${slotLabel(order.requested_time)}`;
}

function itemsText(order: EmailOrder, locale: "bg" | "en") {
  return order.items
    .map((i) => `${i.quantity} x ${locale === "en" ? (i.name_en ?? i.name_bg) : i.name_bg} = ${formatCents(i.line_total_cents, locale)}`)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Owner

export function ownerNewOrder(order: EmailOrder, adminUrl: string, reminder = false): RenderedEmail {
  const kind = order.fulfilment === "delivery" ? "Доставка" : "Вземане";
  const subject = `${reminder ? "НАПОМНЯНЕ: чака потвърждение — " : "Нова поръчка "}${order.number} · ${kind} · ${formatCents(order.total_cents)}`;
  const details = [
    ["Клиент", order.customer_name],
    ["Телефон", order.customer_phone ?? "—"],
    order.fulfilment === "delivery" ? ["Адрес", `${order.address ?? ""}${order.district_name ? ` (${order.district_name})` : ""}`] : null,
    ["Кога", timeText(order, "bg")],
    ["Плащане", `${METHOD_LABELS_BG[order.payment_method]}${order.payment_method === "card" ? " — резервирана, изтегля се при „Приеми“" : ""}`],
    order.notes ? ["Бележка", order.notes] : null,
  ].filter((x): x is [string, string] => x !== null);
  const html = layout(
    subject,
    `<p style="font-size:18px;margin:0 0 4px"><strong>${esc(order.number)}</strong> — ${esc(kind)}</p>
${reminder ? `<p style="color:#8a3c20;font-weight:bold">Поръчката е „Нова“ от повече от 10 минути.</p>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:14px;margin:8px 0">${details
      .map(([k, v]) => `<tr><td style="padding:3px 12px 3px 0;color:#4a4034;vertical-align:top">${esc(k)}</td><td style="padding:3px 0">${esc(v)}</td></tr>`)
      .join("")}</table>
${itemsTable(order, "bg")}
${button(adminUrl, "Отвори в админа")}`
  );
  const text = [
    subject,
    ...details.map(([k, v]) => `${k}: ${v}`),
    "",
    itemsText(order, "bg"),
    `Общо: ${formatCents(order.total_cents)}`,
    "",
    `Админ: ${adminUrl}`,
  ].join("\n");
  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Customer

type CustomerKind = "received" | "accepted" | "rejected" | "cancelled" | "refund";

const COPY = {
  bg: {
    received: { subject: (n: string) => `Получихме поръчка ${n}`, lead: "Благодарим! Получихме поръчката ви и ще я потвърдим възможно най-скоро." },
    accepted: { subject: (n: string) => `Поръчка ${n} е приета`, lead: "Поръчката ви е приета и се приготвя." },
    rejected: { subject: (n: string) => `Поръчка ${n} не може да бъде изпълнена`, lead: "За съжаление не можем да изпълним поръчката ви. Ако сте платили с карта, резервираната сума се освобождава автоматично." },
    cancelled: { subject: (n: string) => `Поръчка ${n} е анулирана`, lead: "Поръчката ви е анулирана. Ако е платена с карта, сумата се възстановява по картата." },
    refund: { subject: (n: string) => `Възстановена сума по поръчка ${n}`, lead: "Възстановихме сума по картата, с която платихте." },
    hello: (name: string) => `Здравейте, ${name},`,
    status: "Виж статуса на поръчката",
    refundLine: (amount: string) => `Възстановена сума: ${amount}. Може да отнеме 5–10 работни дни, докато се появи по сметката ви.`,
    reason: "Причина",
    call: (phone: string) => `Въпроси? Обадете се на ${phone}.`,
    time: "Кога",
  },
  en: {
    received: { subject: (n: string) => `We've received order ${n}`, lead: "Thank you! We've received your order and will confirm it as soon as we can." },
    accepted: { subject: (n: string) => `Order ${n} is accepted`, lead: "Your order has been accepted and is being prepared." },
    rejected: { subject: (n: string) => `We can't fulfil order ${n}`, lead: "Sorry, we can't fulfil your order. If you paid by card, the reserved amount is released automatically." },
    cancelled: { subject: (n: string) => `Order ${n} is cancelled`, lead: "Your order has been cancelled. If it was paid by card, the amount is refunded to your card." },
    refund: { subject: (n: string) => `Refund for order ${n}`, lead: "We've refunded an amount to the card you paid with." },
    hello: (name: string) => `Hello ${name},`,
    status: "View your order status",
    refundLine: (amount: string) => `Refunded: ${amount}. It can take 5–10 business days to appear on your statement.`,
    reason: "Reason",
    call: (phone: string) => `Questions? Call us on ${phone}.`,
    time: "When",
  },
};

export function customerEmail(kind: CustomerKind, order: EmailOrder, statusUrl: string, extra?: { refundCents?: number }): RenderedEmail {
  const locale = order.locale;
  const c = COPY[locale];
  const subject = c[kind].subject(order.number);
  const reason = (kind === "rejected" || kind === "cancelled") && order.reason ? `<p><strong>${esc(c.reason)}:</strong> ${esc(order.reason)}</p>` : "";
  const refund = kind === "refund" && extra?.refundCents ? `<p><strong>${esc(c.refundLine(formatCents(extra.refundCents, locale)))}</strong></p>` : "";
  const html = layout(
    subject,
    `<p>${esc(c.hello(order.customer_name))}</p>
<p>${esc(c[kind].lead)}</p>${reason}${refund}
<p style="color:#4a4034">${esc(c.time)}: ${esc(timeText(order, locale))}</p>
${kind === "received" || kind === "accepted" ? itemsTable(order, locale) : ""}
${button(statusUrl, c.status)}
<p style="color:#4a4034;font-size:13px">${esc(c.call(siteConfig.contact.phone))}</p>`
  );
  const text = [
    c.hello(order.customer_name),
    c[kind].lead,
    kind === "refund" && extra?.refundCents ? c.refundLine(formatCents(extra.refundCents, locale)) : "",
    (kind === "rejected" || kind === "cancelled") && order.reason ? `${c.reason}: ${order.reason}` : "",
    kind === "received" || kind === "accepted" ? `\n${itemsText(order, locale)}\n${formatCents(order.total_cents, locale)}` : "",
    "",
    `${c.status}: ${statusUrl}`,
    c.call(siteConfig.contact.phone),
  ]
    .filter(Boolean)
    .join("\n");
  return { subject, html, text };
}
