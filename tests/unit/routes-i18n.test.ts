import { describe, expect, it } from "vitest";
import { localizeWeight, percentLabel } from "@/lib/i18n";
import { hoursRows } from "@/lib/opening-hours";
import { alternates, localeFromPath, statusHref, switchLocalePath } from "@/lib/routes";
import { config } from "./fixtures";

describe("BG/EN routing", () => {
  it("keeps Bulgarian at the current paths and English under /en with English slugs", () => {
    expect(switchLocalePath("/porachka", "en")).toBe("/en/order");
    expect(switchLocalePath("/en/menu", "bg")).toBe("/menu");
    expect(switchLocalePath("/", "en")).toBe("/en");
    expect(localeFromPath("/en/order")).toBe("en");
    expect(localeFromPath("/menu")).toBe("bg");
  });
  it("builds hreflang pairs with an x-default", () => {
    expect(alternates("menu", "en")).toEqual({ canonical: "/en/menu", languages: { bg: "/menu", en: "/en/menu", "x-default": "/menu" } });
  });
  it("private status links per language", () => {
    expect(statusHref("T", "bg")).toBe("/porachka/status/T");
    expect(statusHref("T", "en")).toBe("/en/order/status/T");
  });
});

describe("English presentation", () => {
  it("translates weights", () => {
    expect(localizeWeight("350 г", "en")).toBe("350 g");
    expect(localizeWeight("1 бр.", "en")).toBe("1 pc");
    expect(localizeWeight("2 бр.", "en")).toBe("2 pcs");
    expect(localizeWeight("500 мл", "en")).toBe("500 ml");
    expect(localizeWeight("350 г", "bg")).toBe("350 г");
  });
  it("percent labels", () => {
    expect(percentLabel(1000, "bg")).toBe("10%");
    expect(percentLabel(1250, "bg")).toBe("12,5%");
  });
  it("groups opening hours", () => {
    expect(hoursRows(config().openingHours, "bg")).toEqual([
      { days: "Понеделник – Петък", time: "08:00 – 19:00" },
      { days: "Събота", time: "08:00 – 14:30" },
      { days: "Неделя", time: "Почивен ден" },
    ]);
  });
});
