import { describe, expect, it } from "vitest";
import { checkoutState, isValidTime, nextOrderingDay, slotLabel, timeOptions } from "@/lib/hours";
import { sofiaNow } from "@/lib/time";
import { at, config } from "./fixtures";

describe("checkout gate", () => {
  it("stays closed until the owner confirms the hours", () => {
    expect(checkoutState(config({ hoursConfirmed: false }), at("12:00"))).toEqual({ open: false, reason: "hours_unconfirmed" });
  });
  it("is open inside ordering hours", () => {
    expect(checkoutState(config(), at("12:00")).open).toBe(true);
  });
  it("closes before 10:00 and from 18:15", () => {
    expect(checkoutState(config(), at("09:59"))).toEqual({ open: false, reason: "not_yet_open", opensAt: "10:00" });
    expect(checkoutState(config(), at("18:15"))).toEqual({ open: false, reason: "closed_for_today" });
  });
  it("is closed on Sunday, on closures and when paused", () => {
    expect(checkoutState(config(), at("12:00", "2026-10-25", 0)).open).toBe(false);
    expect(checkoutState(config({ closures: ["2026-10-20"] }), at("12:00"))).toEqual({ open: false, reason: "closure" });
    expect(checkoutState(config({ paused: true }), at("12:00"))).toEqual({ open: false, reason: "paused" });
  });
  it("finds the next ordering day, skipping Sunday", () => {
    expect(nextOrderingDay(config(), at("19:00", "2026-10-24", 6))).toMatchObject({ date: "2026-10-26", opens: "10:00", offset: 2 });
  });
});

describe("time slots", () => {
  it("earliest delivery slot is now + 60 min, rounded up to 30", () => {
    const { asap, slots } = timeOptions(config(), at("12:10"), "delivery");
    expect(asap).toBe(true);
    expect(slots[0]).toBe("13:30");
  });
  it("earliest pickup slot is now + 30 min", () => {
    expect(timeOptions(config(), at("12:10"), "pickup").slots[0]).toBe("13:00");
  });
  it("last slot ends when the restaurant closes", () => {
    const delivery = timeOptions(config(), at("17:00"), "delivery").slots;
    expect(delivery.at(-1)).toBe("18:30");
    expect(slotLabel("18:30")).toBe("18:30 – 19:00");
  });
  it("Saturday slots stop at 14:00 (opening hours end 14:30)", () => {
    const sat = at("11:00", "2026-10-24", 6);
    expect(timeOptions(config(), sat, "delivery").slots).toEqual(["12:00", "12:30", "13:00", "13:30", "14:00"]);
  });
  it("offers nothing while checkout is closed", () => {
    expect(timeOptions(config({ hoursConfirmed: false }), at("12:00"), "delivery")).toEqual({ asap: false, slots: [] });
  });
  it("validates a submitted time against the same rules", () => {
    expect(isValidTime(config(), at("12:10"), "delivery", "asap")).toBe(true);
    expect(isValidTime(config(), at("12:10"), "delivery", "13:00")).toBe(false);
    expect(isValidTime(config(), at("12:10"), "delivery", "13:30")).toBe(true);
  });
});

describe("Europe/Sofia clock", () => {
  it("uses Sofia time whatever the server's zone", () => {
    expect(sofiaNow(new Date("2026-10-20T21:30:00Z"))).toEqual({ date: "2026-10-21", weekday: 3, minutes: 30 });
  });
  it("handles the end of summer time (25 Oct 2026)", () => {
    expect(sofiaNow(new Date("2026-10-25T00:30:00Z")).minutes).toBe(3 * 60 + 30); // EEST +3
    expect(sofiaNow(new Date("2026-10-25T02:30:00Z")).minutes).toBe(4 * 60 + 30); // EET +2
  });
});
