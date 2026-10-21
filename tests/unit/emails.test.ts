import { describe, expect, it } from "vitest";
import { customerEmail, ownerNewOrder, type EmailOrder } from "@/lib/server/email/templates";

const order: EmailOrder = {
  id: 7,
  number: "GM-20261020-0007",
  locale: "bg",
  fulfilment: "delivery",
  payment_method: "cash",
  customer_name: "Мария <script>",
  customer_phone: "+359888123456",
  customer_email: "m@example.test",
  address: "ул. Тест 1",
  district_name: "Тракия",
  notes: "без лук",
  requested_time: "13:30",
  subtotal_cents: 940,
  discount_cents: 0,
  delivery_fee_cents: 100,
  total_cents: 1040,
  reason: null,
  items: [{ name_bg: "Боб чорба", name_en: "Bean soup", weight: "350 мл", quantity: 2, line_total_cents: 480 }],
};

describe("owner email", () => {
  it("has number, items, phone, address, notes, total, payment and an admin link", () => {
    const e = ownerNewOrder(order, "http://localhost:3000/admin/porachki/7");
    expect(e.subject).toContain("GM-20261020-0007");
    for (const s of ["Боб чорба", "+359888123456", "ул. Тест 1", "Тракия", "без лук", "10,40 €", "В брой", "/admin/porachki/7"]) {
      expect(e.html).toContain(s);
    }
  });
  it("escapes customer input", () => {
    expect(ownerNewOrder(order, "x").html).not.toContain("<script>");
  });
  it("marks the 10-minute reminder", () => {
    expect(ownerNewOrder(order, "x", true).subject).toMatch(/^НАПОМНЯНЕ/);
  });
});

describe("customer emails", () => {
  it("follow the order language", () => {
    expect(customerEmail("accepted", { ...order, locale: "en" }, "http://s").subject).toBe("Order GM-20261020-0007 is accepted");
    expect(customerEmail("accepted", order, "http://s").subject).toBe("Поръчка GM-20261020-0007 е приета");
  });
  it("include the private status link and refund amount", () => {
    const e = customerEmail("refund", order, "http://localhost:3000/porachka/status/T", { refundCents: 500 });
    expect(e.html).toContain("/porachka/status/T");
    expect(e.text).toContain("5,00 €");
  });
});
