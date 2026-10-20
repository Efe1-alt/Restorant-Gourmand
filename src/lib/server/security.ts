import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import { db } from "./supabase";

// ---------------------------------------------------------------------------
// Private order-status links: "<order number>.<22 chars of HMAC>". Unguessable
// without the server secret, and nothing token-like is stored in the database.

function sign(number: string) {
  return createHmac("sha256", env.statusLinkSecret).update(`order-status:${number}`).digest("base64url").slice(0, 22);
}

export function statusToken(number: string) {
  return `${number}.${sign(number)}`;
}

// The order number if the token is genuine, else null (constant-time check).
export function verifyStatusToken(token: string): string | null {
  const match = /^(GM-\d{8}-\d{4,})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!match) return null;
  const expected = Buffer.from(sign(match[1]));
  const given = Buffer.from(match[2]);
  return expected.length === given.length && timingSafeEqual(expected, given) ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Rate limits per IP and per phone. Buckets hold a keyed hash, never the raw value.

export const RATE_LIMITS = {
  // Unconfirmed defaults; adjust once real traffic is known.
  ip: { windowSeconds: 10 * 60, max: 6 },
  phone: { windowSeconds: 30 * 60, max: 4 },
};

export function bucket(kind: "ip" | "phone", value: string) {
  return `${kind}:${createHmac("sha256", env.rateLimitSalt).update(value).digest("hex").slice(0, 32)}`;
}

export async function hitRateLimit(kind: "ip" | "phone", value: string) {
  const limit = RATE_LIMITS[kind];
  const { data, error } = await db().rpc("hit_rate_limit", {
    p_bucket: bucket(kind, value),
    p_window_seconds: limit.windowSeconds,
    p_max: limit.max,
  });
  if (error) throw error;
  return data === true;
}

export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

// ---------------------------------------------------------------------------
// Cloudflare Turnstile (switched off by default in the admin settings).

export async function verifyTurnstile(token: string, ip: string) {
  if (!env.turnstileSecret) return false;
  const body = new URLSearchParams({ secret: env.turnstileSecret, response: token, remoteip: ip });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!res.ok) return false;
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}
