import { describe, expect, it } from "vitest";
import { computeQuote, formatCents, parsePriceCents, percentOf } from "@/lib/pricing";
import { pricing } from "./fixtures";

const lines = (...cents: number[]) => cents.map((c) => ({ unitPriceCents: c, quantity: 1 }));

describe("delivery pricing", () => {
  it("adds the district fee", () => {
    const q = computeQuote({ lines: lines(490, 450), fulfilment: "delivery", districtFeeCents: 150, settings: pricing });
    expect(q).toMatchObject({ subtotalCents: 940, discountCents: 0, deliveryFeeCents: 150, totalCents: 1090, missingForMinimumCents: 0 });
  });

  it("is free from the €25 threshold (food subtotal)", () => {
    const q = computeQuote({ lines: [{ unitPriceCents: 500, quantity: 5 }], fulfilment: "delivery", districtFeeCents: 150, settings: pricing });
    expect(q.freeDelivery).toBe(true);
    expect(q.deliveryFeeCents).toBe(0);
    expect(q.totalCents).toBe(2500);
  });

  it("charges the fee just below the threshold and says how much is missing", () => {
    const q = computeQuote({ lines: lines(2490), fulfilment: "delivery", districtFeeCents: 100, settings: pricing });
    expect(q.deliveryFeeCents).toBe(100);
    expect(q.missingForFreeDeliveryCents).toBe(10);
  });

  it("enforces the €5 minimum food subtotal", () => {
    const q = computeQuote({ lines: lines(240), fulfilment: "delivery", districtFeeCents: 0, settings: pricing });
    expect(q.missingForMinimumCents).toBe(260);
  });

  it("€0 districts have no fee and no free-delivery hint", () => {
    const q = computeQuote({ lines: lines(600), fulfilment: "delivery", districtFeeCents: 0, settings: pricing });
    expect(q.deliveryFeeCents).toBe(0);
    expect(q.missingForFreeDeliveryCents).toBeNull();
  });

  it("never-free delivery when the threshold is null", () => {
    const q = computeQuote({ lines: lines(9000), fulfilment: "delivery", districtFeeCents: 100, settings: { ...pricing, freeDeliveryFromCents: null } });
    expect(q.deliveryFeeCents).toBe(100);
  });
});

describe("pickup pricing", () => {
  it("takes 10% off the food and has no fee or minimum", () => {
    const q = computeQuote({ lines: lines(470), fulfilment: "pickup", districtFeeCents: 150, settings: pricing });
    expect(q).toMatchObject({ subtotalCents: 470, discountCents: 47, deliveryFeeCents: 0, totalCents: 423, missingForMinimumCents: 0 });
  });

  it("rounds the discount half up to the cent", () => {
    expect(percentOf(495, 1000)).toBe(50);
    expect(percentOf(494, 1000)).toBe(49);
  });

  it("can be switched off (0%)", () => {
    const q = computeQuote({ lines: lines(1000), fulfilment: "pickup", districtFeeCents: null, settings: { ...pricing, pickupDiscountBps: 0 } });
    expect(q.discountCents).toBe(0);
    expect(q.totalCents).toBe(1000);
  });
});

describe("money formatting", () => {
  it("formats in Bulgarian and English", () => {
    expect(formatCents(490)).toBe("4,90 €");
    expect(formatCents(490, "en")).toBe("€4.90");
    expect(formatCents(-47)).toBe("−0,47 €");
  });
  it("parses menu prices without floats", () => {
    expect(parsePriceCents("4,90 €")).toBe(490);
    expect(parsePriceCents("2,8 €")).toBe(280);
    expect(parsePriceCents("7")).toBe(700);
    expect(parsePriceCents("4.5")).toBe(450);
    expect(parsePriceCents("abc")).toBeNull();
  });
});
