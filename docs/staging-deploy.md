# Staging deploy — step by step

A private staging copy of the new site on Vercel, backed by a Supabase cloud
project, with Stripe in **test mode**. Nothing here touches gourmand.bg,
its Cloudflare DNS or live Stripe.

You do every step yourself in the dashboards and your terminal. Keys go
straight into Supabase, Vercel or your local `.env.local`. Never into chat,
GitHub or a commit.

**Staging URL.** The Vercel project already deploys this repo (`main` →
https://gourmand-plovdiv.vercel.app). Branch `backend-online-orders` gets a
stable branch URL like
`https://<project>-git-backend-online-orders-<team>.vercel.app`; find the
exact one in Vercel → Project → Deployments → that branch. Below it's called
**`STAGING_URL`** (no trailing slash).

> Don't merge PR #1 until you want this to replace the current site:
> merging redeploys `main`, which is production.

---

## 1. Supabase project

1. https://supabase.com/dashboard → **New project**.
   - Name: `gourmand-staging`. Region: **Central EU (Frankfurt)** (closest
     to Vercel `fra1`).
   - Save the database password in your password manager.
   - Free plan is fine for staging; production needs Pro (backups, no pausing).
2. Note the **project ref**: it's the `xxxx` in `https://xxxx.supabase.co`.

## 2. Push the database schema and seed

On your computer, in `Restorant-Gourmand/`:

```bash
npx supabase login
```

The browser login creates a token with full account access. Prefer a scoped
token: Account → Access Tokens → *scoped* to this project, then
`export SUPABASE_ACCESS_TOKEN=…` in your terminal instead of `login`.

```bash
npx supabase link --project-ref <project-ref>
```

```bash
npx supabase db push --include-seed --dry-run
```

Check the list (5 migrations + seed), then run it for real:

```bash
npx supabase db push --include-seed
```

If it stops at `create extension pg_cron`, enable **Cron** under Database →
Extensions (or Integrations → Cron), then run the push again.

Upload the dish photos to Storage (creates the public `dish-photos` bucket):

```bash
npx supabase seed buckets --linked
```

Check: Table Editor → `dishes` has 216 rows; Storage → `dish-photos` has 152 files.

## 3. Supabase Auth settings (dashboard, not `config push`)

`supabase config push` would copy the *local* URLs (localhost) to the cloud
project, so set these by hand:

1. **Authentication → Sign In / Providers**
   - Allow new users to sign up: **off**.
   - Email provider: **on** (needed for the owner's password login).
     Confirm email: on.
2. **Authentication → URL Configuration**
   - Site URL: `STAGING_URL`
   - Redirect URLs: `STAGING_URL/admin/auth/callback`
3. **Authentication → Multi-Factor** → Authenticator app (TOTP): **enabled**.
4. **Authentication → Policies / Passwords**: minimum length **12**.
5. **Authentication → SMTP** (so password-reset emails actually arrive):
   use Resend's SMTP once the domain is verified (step 7). Host
   `smtp.resend.com`, port `465`, user `resend`, password = a Resend API
   key, sender `orders@gourmand.bg`. Until then, Supabase's built-in mailer
   sends only a few emails per hour.

## 4. The owner account

1. Authentication → Users → **Add user** → *Create new user*: the owner's
   email, a strong password, **Auto Confirm User** ticked.
2. SQL Editor, run (with the owner's email):

   ```sql
   update auth.users
   set raw_app_meta_data = raw_app_meta_data || '{"role":"owner"}'
   where email = 'OWNER@EMAIL';
   ```

   The admin only lets in users with this role. Users can't set it themselves.

## 5. Generate the server secrets

Run this three times and keep each value for step 6 (`CRON_SECRET`,
`RATE_LIMIT_SALT`, `STATUS_LINK_SECRET`). Use different values from your
local ones.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 6. Vercel environment variables

Vercel → Project → **Settings → Environment Variables**. For staging, scope
each variable to **Preview** and to the branch `backend-online-orders` only
(the "Preview" dropdown lets you pick a branch). Then production keeps
working untouched. Mark the secret ones **Sensitive**.

| Name | Value | Sensitive |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `STAGING_URL` | no |
| `NEXT_PUBLIC_SITE_INDEXABLE` | `false` | no |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | no |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys → **Publishable** key | no |
| `SUPABASE_SECRET_KEY` | same page → **Secret** key (create one named `vercel-staging`) | **yes** |
| `CRON_SECRET` | from step 5 | **yes** |
| `RATE_LIMIT_SALT` | from step 5 | **yes** |
| `STATUS_LINK_SECRET` | from step 5 | **yes** |
| `STRIPE_SECRET_KEY` | Stripe **test** restricted key `rk_test_…` (step 8) | **yes** |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` from the staging webhook (step 8) | **yes** |
| `RESEND_API_KEY` | Resend API key (step 7) | **yes** |
| `EMAIL_FROM` | `Gourmand <orders@gourmand.bg>` | no |
| `OWNER_NOTIFICATION_EMAIL` | the owner's email (fallback; also settable in the admin) | no |

Don't set `ALLOW_TEST_CLOCK`, `DEV_OWNER_*` or the Turnstile keys on staging.

Then redeploy the branch: Deployments → latest `backend-online-orders` →
**Redeploy** (variables only apply to new deployments).

**Deployment Protection.** Previews are protected by Vercel Authentication by
default. You'll be able to open the site while signed in to Vercel, but
Supabase and Stripe can't get past it. Either:
- Settings → Deployment Protection → **Protection Bypass for Automation** →
  create a secret (used in steps 8 and 9), or
- turn protection off for previews. The site is noindex anyway, but then
  anyone with the URL can see it.

## 7. Resend (email)

1. https://resend.com → Domains → **Add domain** `gourmand.bg` (EU region).
2. Resend shows the DNS records (SPF/DKIM, optional DMARC). Adding them in
   Cloudflare **changes gourmand.bg DNS**: needs your explicit go-ahead.
   They are sending records only and don't affect the Kliento storefront.
3. Once verified, create an API key (sending access only) → `RESEND_API_KEY`
   in Vercel.
4. In the admin later: Настройки → set the owner's notification email and
   Reply-To (both still to be confirmed by the owner).

Until the domain is verified, emails show as "failed" in Админ → Имейли and
can be retried; orders still work.

## 8. Stripe (test mode)

Use a separate Stripe **sandbox** for staging if the owner's account allows,
otherwise the account's test mode. Never live keys.

1. Developers → API keys → **Create restricted key** (test). Permissions:
   Checkout Sessions **write**, PaymentIntents **write**, Refunds **write**,
   everything else none. → `STRIPE_SECRET_KEY`.
2. Developers → Webhooks → **Add endpoint**:
   - URL: `STAGING_URL/api/stripe/webhook`. With Deployment Protection on, use
     `STAGING_URL/api/stripe/webhook?x-vercel-protection-bypass=<bypass secret>`.
   - Events: `checkout.session.completed`,
     `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`,
     `payment_intent.payment_failed`, `payment_intent.canceled`,
     `payment_intent.succeeded`, `refund.created`, `refund.updated`,
     `refund.failed`.
   - Copy the signing secret `whsec_…` → `STRIPE_WEBHOOK_SECRET`.
3. Redeploy the branch again after adding the Stripe variables.

## 9. Point the every-minute job at staging

Supabase → **SQL Editor**, run with your values:

```sql
select private.set_app_cron_target('STAGING_URL/api/cron', 'CRON_SECRET_FROM_STEP_5');
```

Only if Deployment Protection is on:

```sql
select vault.create_secret('BYPASS_SECRET', 'vercel_protection_bypass');
```

Check after a minute:

```sql
select status_code, left(content, 120), created
from net._http_response order by id desc limit 3;
```

Expect `200 {"expiredHolds":…}`. A `401` means `CRON_SECRET` differs from
Vercel's value (or the bypass is missing). No rows means the target isn't set.

## 10. Smoke test on staging

1. Open `STAGING_URL/admin` → sign in as the owner. Optionally Сигурност →
   enable the authenticator app.
2. Настройки: check districts, fees, minimum, discount, hours. Click
   **Потвърждавам часовете** (checkout stays closed until then).
3. Седмица: **Попълни от шаблоните**, set portions for today, **Публикувай**.
4. In a private window: `STAGING_URL/menu` → add dishes → checkout:
   - cash delivery order → appears in the admin queue within 5 s (tap
     **Включи звука** first to hear it);
   - card order with test card `4242 4242 4242 4242` (any future date, any
     CVC) → reaches the queue only after payment → **Приеми** captures it
     (Stripe → Payments shows *Succeeded*) → refund part of it from the order
     page.
5. `STAGING_URL/en` and `/en/menu` load in English.
6. Админ → Имейли: owner and customer emails are *sent* (or *failed* with a
   clear reason if Resend isn't set up yet).

## Rolling back

Staging lives only on the branch's Preview deployments and the separate
Supabase project. Production (`main`) is untouched. To remove staging:
delete the branch-scoped variables in Vercel, pause or delete the Supabase
project, and delete the Stripe test webhook.
