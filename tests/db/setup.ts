import { readFileSync } from "node:fs";

// Local Supabase credentials and secrets from .env.development.local.
for (const line of readFileSync(new URL("../../.env.development.local", import.meta.url), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) {
  throw new Error("DB tests run only against the local Supabase stack.");
}
// Never talk to real Stripe or Resend from tests.
process.env.STRIPE_SECRET_KEY = "sk_test_dummy_for_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
delete process.env.RESEND_API_KEY;
