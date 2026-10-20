import "server-only";

// Server-side configuration. Secrets are read here and nowhere else; none of
// them may be prefixed NEXT_PUBLIC_.

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabasePublishableKey() {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY");
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  // Stripe is optional locally: without a key, card payment is unavailable.
  get stripeSecretKey() {
    const key = process.env.STRIPE_SECRET_KEY ?? "";
    if (key && process.env.NODE_ENV !== "production" && /^[rs]k_live_/.test(key)) {
      throw new Error("Refusing to use a LIVE Stripe key outside production.");
    }
    return key;
  },
  get stripeWebhookSecret() {
    return process.env.STRIPE_WEBHOOK_SECRET ?? "";
  },
  get resendApiKey() {
    return process.env.RESEND_API_KEY ?? "";
  },
  get emailFrom() {
    return process.env.EMAIL_FROM || "Gourmand <orders@gourmand.bg>";
  },
  get ownerNotificationEmail() {
    return process.env.OWNER_NOTIFICATION_EMAIL ?? "";
  },
  get cronSecret() {
    return process.env.CRON_SECRET ?? "";
  },
  get rateLimitSalt() {
    return required("RATE_LIMIT_SALT");
  },
  get statusLinkSecret() {
    return required("STATUS_LINK_SECRET");
  },
  get turnstileSecret() {
    return process.env.TURNSTILE_SECRET_KEY ?? "";
  },
  get allowTestClock() {
    return process.env.NODE_ENV !== "production" && process.env.ALLOW_TEST_CLOCK === "1";
  },
};
