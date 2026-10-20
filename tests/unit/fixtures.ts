import type { OrderingConfig } from "@/lib/hours";
import type { PricingSettings } from "@/lib/pricing";

// Seeded values: Kliento ordering hours, opening hours, estimates 60/30 min.
export const config = (over: Partial<OrderingConfig> = {}): OrderingConfig => ({
  orderingHours: [null, ...Array(5).fill({ opens: "10:00", closes: "18:15" }), { opens: "10:00", closes: "14:00" }],
  openingHours: [null, ...Array(5).fill({ opens: "08:00", closes: "19:00" }), { opens: "08:00", closes: "14:30" }],
  closures: [],
  hoursConfirmed: true,
  paused: false,
  deliveryEstimateMinutes: 60,
  pickupEstimateMinutes: 30,
  ...over,
});

export const pricing: PricingSettings = { minSubtotalCents: 500, freeDeliveryFromCents: 2500, pickupDiscountBps: 1000 };

// 2026-10-20 is a Tuesday.
export const at = (hhmm: string, date = "2026-10-20", weekday = 2) => {
  const [h, m] = hhmm.split(":").map(Number);
  return { date, weekday, minutes: h * 60 + m };
};
