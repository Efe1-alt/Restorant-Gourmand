import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/supabase", () => ({ db: () => ({}) }));
const { statusToken, verifyStatusToken, bucket } = await import("@/lib/server/security");

describe("private status links", () => {
  it("round-trips a signed token", () => {
    const token = statusToken("GM-20261020-0001");
    expect(token).toMatch(/^GM-20261020-0001\.[A-Za-z0-9_-]{22}$/);
    expect(verifyStatusToken(token)).toBe("GM-20261020-0001");
  });
  it("rejects tampering and guessing", () => {
    const token = statusToken("GM-20261020-0001");
    expect(verifyStatusToken(token.replace("0001", "0002"))).toBeNull();
    expect(verifyStatusToken(`${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`)).toBeNull();
    expect(verifyStatusToken("GM-20261020-0001")).toBeNull();
    expect(verifyStatusToken("'; drop table orders;--")).toBeNull();
  });
  it("rate-limit buckets never contain the raw IP or phone", () => {
    const b = bucket("phone", "+359888123456");
    expect(b).toMatch(/^phone:[0-9a-f]{32}$/);
    expect(b).not.toContain("888123456");
  });
});
