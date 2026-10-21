// Order totals in euro cents (integers only). Pure: the browser shows the
// same numbers the server charges, but only the server's result is used.

import type { Fulfilment } from "./hours";

export type PricingSettings = {
  minSubtotalCents: number;
  // null = delivery is never free.
  freeDeliveryFromCents: number | null;
  // Basis points: 1000 = 10%.
  pickupDiscountBps: number;
};

export type Quote = {
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  // How much more food is needed to reach the delivery minimum (0 = enough).
  missingForMinimumCents: number;
  // Delivery was free thanks to the threshold.
  freeDelivery: boolean;
  // How much more food would make delivery free (null = not applicable).
  missingForFreeDeliveryCents: number | null;
};

export function percentOf(cents: number, bps: number) {
  // Round half up: 10% of 4,95 € = 0,50 €.
  return Math.floor((cents * bps + 5000) / 10000);
}

export function computeQuote(input: {
  lines: { unitPriceCents: number; quantity: number }[];
  fulfilment: Fulfilment;
  // Fee of the chosen district; null if none chosen yet.
  districtFeeCents: number | null;
  settings: PricingSettings;
}): Quote {
  const { lines, fulfilment, districtFeeCents, settings } = input;
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);

  if (fulfilment === "pickup") {
    const discountCents = percentOf(subtotalCents, settings.pickupDiscountBps);
    return {
      subtotalCents,
      discountCents,
      deliveryFeeCents: 0,
      totalCents: subtotalCents - discountCents,
      missingForMinimumCents: 0,
      freeDelivery: false,
      missingForFreeDeliveryCents: null,
    };
  }

  const threshold = settings.freeDeliveryFromCents;
  const freeDelivery = threshold !== null && subtotalCents >= threshold;
  const deliveryFeeCents = freeDelivery ? 0 : (districtFeeCents ?? 0);
  return {
    subtotalCents,
    discountCents: 0,
    deliveryFeeCents,
    totalCents: subtotalCents + deliveryFeeCents,
    missingForMinimumCents: Math.max(0, settings.minSubtotalCents - subtotalCents),
    freeDelivery,
    missingForFreeDeliveryCents:
      threshold === null || freeDelivery || (districtFeeCents ?? 0) === 0 ? null : threshold - subtotalCents,
  };
}

// 490 → "4,90 €" (Bulgarian) or "€4.90" (English).
export function formatCents(cents: number, locale: "bg" | "en" = "bg") {
  const sign = cents < 0 ? "−" : "";
  const abs = Math.abs(cents);
  const euros = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return locale === "bg" ? `${sign}${euros},${rest} €` : `${sign}€${euros}.${rest}`;
}

// "4,90 €" → 490. null if the format is unexpected.
export function parsePriceCents(price: string): number | null {
  const match = /^(\d+)(?:[.,](\d{1,2}))?\s*€?$/.exec(price.trim().replace(/^€\s*/, ""));
  if (!match) return null;
  return Number(match[1]) * 100 + (match[2] ? Number(match[2].padEnd(2, "0")) : 0);
}
