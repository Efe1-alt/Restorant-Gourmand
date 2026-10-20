import { describe, expect, it } from "vitest";
import { allowedPayments, isValidBgPhone, normalizePhone, validateCheckout, type CheckoutForm } from "@/lib/validation";
import { at, config } from "./fixtures";

const base: CheckoutForm = {
  fulfilment: "delivery",
  name: "Иван Иванов",
  phone: "0888 123 456",
  email: "",
  districtId: "3",
  address: "ул. Гевгели 44",
  time: "asap",
  payment: "cash",
  notes: "",
};
const ctx = { locale: "bg" as const, now: at("12:00"), config: config(), activeDistrictIds: ["3"], cardEnabled: true };

describe("checkout validation", () => {
  it("accepts a complete delivery order", () => {
    expect(validateCheckout(base, ctx)).toEqual({});
  });
  it("requires name and a Bulgarian phone", () => {
    const e = validateCheckout({ ...base, name: "", phone: "12345" }, ctx);
    expect(e.name).toBeTruthy();
    expect(e.phone).toMatch(/08XXXXXXXX/);
  });
  it("delivery needs a district and an address; pickup doesn't", () => {
    const e = validateCheckout({ ...base, districtId: "", address: "" }, ctx);
    expect(e.districtId).toBeTruthy();
    expect(e.address).toBeTruthy();
    expect(validateCheckout({ ...base, fulfilment: "pickup", payment: "pay_at_pickup", districtId: "", address: "" }, ctx)).toEqual({});
  });
  it("rejects an inactive district id", () => {
    expect(validateCheckout({ ...base, districtId: "999" }, ctx).districtId).toBeTruthy();
  });
  it("checks the optional email only when given", () => {
    expect(validateCheckout({ ...base, email: "not-an-email" }, ctx).email).toBeTruthy();
    expect(validateCheckout({ ...base, email: "a@b.bg" }, ctx).email).toBeUndefined();
  });
  it("cash is delivery-only, pay-at-pickup is pickup-only, no card at the door", () => {
    expect(validateCheckout({ ...base, payment: "pay_at_pickup" }, ctx).payment).toBeTruthy();
    expect(validateCheckout({ ...base, fulfilment: "pickup", payment: "cash" }, ctx).payment).toBeTruthy();
    expect(allowedPayments("delivery", true)).toEqual(["card", "cash"]);
    expect(allowedPayments("pickup", false)).toEqual(["pay_at_pickup"]);
  });
  it("refuses card when card payments are off", () => {
    expect(validateCheckout({ ...base, payment: "card" }, { ...ctx, cardEnabled: false }).payment).toBeTruthy();
  });
  it("refuses a slot that's no longer available", () => {
    expect(validateCheckout({ ...base, time: "12:00" }, ctx).time).toBeTruthy();
  });
  it("caps notes at 500 characters", () => {
    expect(validateCheckout({ ...base, notes: "x".repeat(501) }, ctx).notes).toBeTruthy();
  });
  it("speaks English on /en", () => {
    expect(validateCheckout({ ...base, name: "" }, { ...ctx, locale: "en" }).name).toBe("Please enter your name.");
  });
});

describe("Bulgarian phone numbers", () => {
  it.each(["0888123456", "088 812 3456", "+359888123456", "00359 888 123 456", "032 123 456", "(032) 62-12-34"])("accepts %s", (p) => {
    expect(isValidBgPhone(p)).toBe(true);
  });
  it.each(["123", "+44 20 7946 0958", "08881234567890", "0088812345"])("rejects %s", (p) => {
    expect(isValidBgPhone(p)).toBe(false);
  });
  it("normalises to E.164", () => {
    expect(normalizePhone("0888 123 456")).toBe("+359888123456");
  });
});

describe("phone display", async () => {
  const { formatPhone } = await import("@/lib/validation");
  it("shows numbers the way the owner dials them", () => {
    expect(formatPhone("+359888123456")).toBe("0888 123 456");
    expect(formatPhone("+35932123456")).toBe("032 123 456");
    expect(formatPhone(null)).toBe("");
  });
});
