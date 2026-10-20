# Backend build — status report (20 Oct 2026)

Local build of the scope in [backend-scope.md](backend-scope.md). Nothing is
committed, pushed or deployed. Stripe is test mode only; gourmand.bg and its
DNS are untouched.

**Test results (local):** ESLint and `tsc` clean · `next build` passes ·
Vitest **114/114** (67 unit + 47 against local Supabase) · Playwright
**45/45** on desktop (1440×900) and phone (Pixel 7). Screenshots of the key
flows: `../baseline-screenshots/backend-2026-10-20/` (outside the repo).

## Blocked on keys (only you can add them, in `.env.local`)

| Needs | What's verified without it | What's still unverified |
|---|---|---|
| `STRIPE_SECRET_KEY` (test) + `stripe login` + `STRIPE_WEBHOOK_SECRET` | Webhook signature checks (real Stripe library), idempotent event handling, authorise → New, capture on Accept, void on Reject, session expiry, both late-payment outcomes, full/partial refunds counted only on Stripe confirmation, Dashboard refunds recorded — all with Stripe's API mocked (`tests/db/payments.test.ts`) | A real Checkout session in test mode, the hosted payment page, real webhook delivery via `npm run stripe:listen`, a real capture/refund. Card payment is hidden on the site until a key exists. |
| `RESEND_API_KEY`, `EMAIL_FROM` (+ verified sending domain) | Every email is queued, rendered and logged; failures keep the error, back off and can be retried from the admin; one email per order event; 10-minute reminder sent once | Actual delivery, Reply-To, SPF/DKIM for orders@gourmand.bg (needs Cloudflare DNS records — not touched) |

## Owner must confirm (all seeded, all editable in the admin)

- **Hours**: opening 08:00–19:00 / Sat 08:00–14:30; ordering (from Kliento)
  10:00–18:15 / Sat 10:00–14:00. Checkout stays off until confirmed in
  Админ → Настройки.
- **Delivery**: 21 Kliento districts and fees (€0 / €1.00 / €1.50), €5 minimum,
  free from €25. *Interpretation:* the minimum applies to delivery only.
- **Pickup** discount 10%. **Estimates** 60 min delivery / 30 min pickup are
  placeholders that set the earliest time slot.
- **Menu**: 216 dishes imported; see [menu-import-report.md](menu-import-report.md).
  Kliento shows "Мариновани червени чушки" at 3,50 € (repo 2,81 €), sells
  "Fuzetea горски плодове" (not in the repo), and the repo text for "Пълнени
  чушки със сирене" has the typo "чице" (Kliento: "яйце"). Nothing was changed.
- **Allergens**: empty for every dish; shown only once marked "Проверено".
- **English**: all 216 dishes drafted, all "За преглед". Until approved, /en
  shows the Bulgarian name and text (dishes stay orderable) — my reading of
  "publishes in English only after owner approval".
- **Weekday templates** have 0 portions: each week's draft needs portions set.
- **Business details** for structured data: address and phone as on the
  current site. **Notification and Reply-To email**: not set.
- **Privacy and terms**: drafts at `/poveritelnost`, `/obshti-usloviya`
  (and /en), with `[…]` placeholders for the legal entity, contact email,
  storage region and VAT wording, plus the loyalty-club notice.
- **Rate limits** (6 orders / 10 min per IP, 4 / 30 min per phone) are guesses.

## Acceptance criteria → where they're verified

| Scope item | Implementation | Verified by |
|---|---|---|
| Static export removed; Next 16 App Router | `next.config.ts` | `next build` (all data pages dynamic) |
| BG at current paths, EN under /en with English slugs, hreflang, canonicals, sitemap | `src/lib/routes.ts`, `(bg)`/`(en)` root layouts, `sitemap.ts`, `robots.ts` | e2e public: home/EN/sitemap; unit routes |
| Per-language titles/descriptions; structured data from verified details only (hours only once confirmed) | `src/lib/content.ts`, `HomePage.tsx` | e2e public (title, JSON-LD) |
| No analytics, click-to-load map, no cookie banner | `ClickToLoadMap.tsx` | e2e: no Google request before click |
| Admin in Bulgarian | `app/(admin)` | e2e admin |
| Dish fields, owner-managed categories (add, rename, reorder, hide) | `dishes`, `categories`; Админ → Ястия, Категории | e2e dish edit; DB schema checks |
| EN text drafted, "needs review", published only after approval | `en_status`; `DishForm` | e2e "English needs a name before it can be approved" |
| Daily dishes per date with portions; standing dishes with optional cap; sold-out resets at midnight | `menu_day_dishes`, `standing_stock` (per-date rows) | DB reservations tests; e2e sold-out |
| Six weekday templates; new week pre-filled as unpublished draft; copy day/dishes | `prefill_week`, `copy_menu_day`; Админ → Седмица, Шаблони | DB (prefill via fixture), e2e week page |
| Public menu = today's published menu (Sofia); notice if none; week browsable but informational | `getMenuView`, `MenuTabs` | e2e "today's lunch… other days informational" |
| Import from JSON + photos to Storage, Kliento cross-check, missing data flagged | `scripts/build-seed.mjs`, `config.toml` bucket | `menu-import-report.md` |
| Removing a dish never alters history (snapshots) | `order_items` snapshots, soft delete | DB "stores snapshots" test |
| Atomic reservation, server recheck | `place_order` (row locks, fixed lock order) | DB: 10 parallel orders for 5 portions → 5 succeed |
| Card holds for the 30-min session; released on expiry/failure; late payment reconciled, never lost | `place_order` hold, `expire_stale_holds` (pg_cron), webhook handler | DB payments + reservations tests |
| Cash/pickup reserve immediately; cancel before prep restores portions; after, owner decides | `cancelOrder`, `transition_order` | DB + e2e cancel tests |
| Guest checkout, BG phone, optional email/notes, district + address for delivery | `validation.ts`, `CheckoutForm` | unit validation; e2e validation |
| District fees, €5 minimum, free from €25, pickup 10% (editable, can be 0) | `pricing.ts`, settings | unit pricing; DB placeOrder; e2e checkout |
| ASAP or 30-min slot today; earliest = now + estimate | `hours.ts` | unit hours |
| Card online, cash on delivery, pay at pickup; no card at the door | `allowedPayments` | unit + e2e |
| Server validates prices, district, fees, discount, hours, stock, totals | `place-order.ts` + `place_order` | DB placeOrder (browser totals ignored), e2e api |
| Rate limits per IP and phone, hidden spam trap, Turnstile wired but off | `security.ts`, `hit_rate_limit`, honeypot field | DB placeOrder + security; e2e api (422) |
| Private order-status page via unguessable link | signed `<number>.<HMAC>` link | unit security; e2e tampered link → 404 |
| Stripe Checkout, manual capture, capture on Accept, cancel on Reject | `stripe.ts`, `order-ops.ts` | DB payments (mocked API) — **real test mode blocked on key** |
| Payment only via verified webhooks; idempotent; idempotency keys on create/capture/cancel/refund | webhook route, `stripe_events` | DB payments (signature, duplicate event) |
| Payment states separate from fulfilment states | `payment_status` vs `status` | DB tests |
| Full/partial refunds to card after owner confirms; recorded; successful only once Stripe confirms | `refundOrder`, `apply_refund_result`, confirm step in UI | DB refund tests |
| Cash/pickup marked paid by owner | `markPaid` | DB + e2e |
| Delivery and pickup status flows; awaiting-payment hidden from queue | `order-status.ts`, `QUEUE_STATUSES` | unit statuses; e2e full delivery flow |
| Order numbers GM-YYYYMMDD-NNNN from a sequence | `order_number_seq` | DB test |
| One owner (email + password), reset by email, optional TOTP, no public sign-up, server-side authorisation | Supabase Auth, `app_metadata.role`, `getClaims()`, aal2 check, `config.toml` | e2e login/401; sign-up refused (`signup_disabled`) checked by hand |
| Phone/tablet-first queue: live, sound after one tap, persistent unacknowledged indicator | `QueueBoard` (5 s poll, Web Audio chime, banner + tab title) | e2e queue (desktop + phone); sound itself checked by hand only |
| Accept/reject, statuses, refunds, mark-paid, search and filters | Админ → Поръчки | e2e admin |
| Settings incl. hours, closures, pause, estimates; checkout gated until hours confirmed | Админ → Настройки | e2e settings + "checkout closed" |
| Audit log of status changes, stock adjustments, refunds, settings | `audit_log`, Админ → Дневник | e2e settings audit; DB |
| Owner email per new order (card after authorisation), 10-min reminder, failures logged + retry | `outbox.ts`, `jobs.ts` | DB notifications — **delivery blocked on key** |
| Customer on-site confirmation + status page; emails if address given | `OrderStatus`, customer templates | e2e status pages; unit emails |
| Anonymise personal data after 12 months, keep items and amounts | `anonymise_old_orders` (pg_cron daily) | DB anonymisation test |
| No personal data in public pages or routine logs | status API returns the customer's own order only; logs carry ids | e2e api; code review |
| Privacy and terms pages reflecting cancellation/refund rules | `LegalPage.tsx` | e2e legal pages |

## Notable decisions

- **Data access**: the browser never talks to the database. The server uses the
  secret key after its own checks; RLS denies everything else.
- **Status links** are signed (`number.HMAC`) rather than stored, so later
  emails can include the link. Rotating `STATUS_LINK_SECRET` invalidates old links.
- **Checkout session**: one Stripe line item with the exact server total
  (Checkout can't express the pickup discount as a negative line).
- **Cart** persists in `localStorage`; lunch items from another day are dropped.
- **Reload behaviour**: the existing "reload returns to the home page" script is
  kept, except on checkout and order-status pages.
- **Images** stay unoptimised (already sized WebP) to avoid optimiser cost.
- Local Supabase runs on ports **553xx** because another local project uses 543xx.
- `supabase/schema.sql` (with the `reservations` table) was deleted; migrations replace it.

## Still to do before launch (needs your go-ahead)

1. Add Stripe test keys, run a real card order end to end, then repeat on a
   separate Stripe sandbox; switch to a restricted live key only at launch.
2. Verify the Resend domain (DNS records in Cloudflare), set owner and Reply-To.
3. Owner sign-off on everything in "Owner must confirm".
4. Supabase Pro + Vercel Pro projects, production migrations, owner account
   (`app_metadata.role = owner`), then the review subdomain and DNS cutover.
