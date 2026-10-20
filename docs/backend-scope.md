# Gourmand: confirmed backend scope

Agreed with the client on 2026-10-20 (grilling rounds 1–4). It replaces the
"private concept demo" status in `src/lib/site-config.ts`. Everything marked
_unconfirmed_ needs the owner's sign-off before launch.

## Boundaries

- The new site **fully replaces Kliento** for taking and processing online orders.
  gourmand.bg is currently the live Kliento (p2pmenu) storefront behind Cloudflare DNS.
- Out of scope: POS, fiscal receipts (separate existing software), courier
  integrations or courier app, live tracking, Kliento order-history migration,
  reservations (remove the `reservations` table from `supabase/schema.sql`),
  the Kliento loyalty club ("Клуб Лоялен Клиент") and customer accounts,
  SMS/Viber/WhatsApp, future-day ordering, analytics.
- Development is local, with Stripe in **test mode**. Deployment, the review subdomain
  (e.g. `new.gourmand.bg`), the gourmand.bg DNS cutover, live Stripe and
  production migrations each need separate authorisation.

## Stack

- Next.js 16 (App Router) with the existing design; drop `output: "export"`.
- Vercel hosting (Pro at production; Hobby is non-commercial).
- Supabase: Postgres, Auth (single owner), Storage (dish photos). Pro at production.
- Stripe Checkout (hosted), the owner's existing account, test keys locally.
- Resend for email from `orders@gourmand.bg`. Sending records go in Cloudflare
  DNS; the domain has no MX today. Reply-To is the owner's address (_unconfirmed_).
- Tests: Vitest (unit), Playwright (end-to-end), Stripe CLI (local webhooks).
- Prices in EUR only.

## Languages and SEO

- Bulgarian at current paths (`/`, `/menu`, `/porachka`); English under `/en/`
  with English slugs (`/en/menu`, `/en/order`); hreflang pairs, canonicals, sitemap.
- Admin in Bulgarian only.
- English dish text: drafted from the Bulgarian and marked "needs review". A dish
  publishes in English only after owner approval.
- Per-language titles and meta descriptions targeting Gourmand Plovdiv, lunch menu
  Plovdiv and food delivery Plovdiv. Structured data built only from verified
  business details.
- Map embed is click-to-load and there's no analytics, so no cookie banner.

## Menu

- Dish fields: BG name (required), EN name (required to publish in EN), BG/EN
  description, category, image, price, weight, allergens (owner-verified;
  **all empty at import**), visibility.
- Categories are owner-managed (add, rename, reorder, hide), seeded with the lunch
  menu plus grill, fish, soups, salads, omelets, desserts, drinks and bread.
- **Daily dishes** are scheduled per date, with a portion count per dish per date.
- **Standing dishes** are available every ordering day while active, with an
  optional daily portion cap; otherwise unlimited until manually sold out. Manual
  sold-out flags reset at midnight Europe/Sofia.
- **Six weekday templates** (Mon–Sat) are seeded from the repo's `lunch-*.json`.
  Each new week is pre-filled from them as an **unpublished draft**; the owner
  edits, sets portions and publishes. Copying a day or dishes to another date is also supported.
- The public menu shows today's published menu (Europe/Sofia). If none is
  published, a clear notice appears and standing dishes stay orderable. Published
  days of the week are browsable but informational only.
- Import: the repo JSON plus existing photos (moved to Storage), cross-checked against
  the live Kliento menu for outdated dishes or prices. Missing data is flagged,
  never invented.
- Removing a dish never alters historical orders (orders store snapshots).

## Stock

- Portions are reserved atomically at submission; availability is rechecked server-side.
- Card orders hold portions for the length of the Stripe Checkout session
  (**30 min**, Stripe's minimum). Holds are released on expiry or failure. A late
  successful payment is reconciled: it's accepted if stock allows, otherwise
  released and refunded automatically. It's never silently lost.
- Cash and pay-at-pickup orders reserve portions immediately.
- Cancelling before preparation restores portions automatically. After that, the
  owner decides.

## Checkout

- Guest checkout. Required: name and phone (BG format). Optional: email, notes.
  Delivery needs an address and a district.
- **Delivery by district**: 21 Plovdiv districts with per-district fees, seeded
  from Kliento (€0 / €1.00 / €1.50). Minimum food subtotal **€5**, free
  delivery from **€25**. All of it is owner-editable and _unconfirmed_.
- **Pickup**: a **10% discount** on the food subtotal (editable, can be set to 0).
- Timing: "as soon as possible" or a 30-minute slot today. The earliest slot is
  now plus the relevant estimate (delivery or pickup).
- Payment: Stripe card online, or cash (delivery) / pay at the restaurant (pickup).
  No card payment at the door.
- Server validates prices, district, fees, discount, hours, stock and totals.
- Abuse protection: rate limits per IP and phone, a hidden spam-trap field, and
  Cloudflare Turnstile wired up but switched off.

## Payments

- Stripe Checkout with **manual capture**: the payment is authorised at checkout
  and captured when the owner taps **Accept**. Rejecting cancels the authorisation.
- Payment is confirmed only through verified webhooks. Webhook handling is
  idempotent, and checkout creation uses idempotency keys.
- Payment states: pending, authorised, paid, failed, expired, partially refunded,
  refunded. Payment state is kept separate from fulfilment state.
- Refunds (full or partial) go to the original card after the owner confirms the
  amount. Each refund records reason, amount, time and Stripe result, and counts as
  successful only once Stripe confirms it.
- Cash and pay-at-pickup orders are marked paid by the owner.

## Orders and statuses

- Delivery: New → Accepted → Preparing → Out for delivery → Delivered; also
  Rejected, Cancelled, Delivery failed.
- Pickup: New → Accepted → Preparing → Ready for pickup → Picked up; also
  Rejected, Cancelled, Not collected.
- Card orders reach "New" only after authorisation; awaiting-payment orders are
  hidden from the processing queue.
- Order numbers look like `GM-YYYYMMDD-NNNN`, generated from a database sequence.
- Cancellation requests come in by phone. Before preparation: full refund
  including delivery. After: the owner decides. If the restaurant can't fulfil:
  full refund. Substitutions only with the customer's consent.

## Owner admin

- One owner account: Supabase email and password, reset by email, optional
  authenticator-app second factor. No public sign-up. Authorisation is enforced
  server-side, and secrets never reach the browser.
- Order screens are phone- and tablet-first: a live queue, visual and sound alerts
  (one tap on "Enable sound"), and a persistent unacknowledged indicator. Order
  details show items, contact details, address, notes, totals, and payment method
  and status.
- Accept or reject, status updates, refunds, mark-as-paid, search and filters.
- Menu, templates, week planning, portions, categories and photos. Desktop is
  comfortable; tablet works.
- Settings: delivery districts, fees, minimum, free-delivery threshold, pickup
  discount, **opening hours** (display, seeded 08:00–19:00 / Sat 08:00–14:30),
  **ordering hours** (checkout, seeded from Kliento: 10:00–18:15 / Sat
  10:00–14:00), closures, pause ordering, delivery and pickup estimates.
  **Checkout stays disabled until the owner confirms the hours.**
- An audit log of status changes, stock adjustments, refunds and settings changes.

## Notifications

- The owner gets an email for every new order: card orders after authorisation,
  cash and pickup orders on submission. It includes the number, items, phone,
  address, notes, total, payment method and a link to the admin. A reminder goes
  out if the order is still New after **10 min**. There's no automatic rejection.
- Failed emails are logged and can be retried; the order stays visible in the panel.
- Customers always see an on-site confirmation and a **private order-status page**
  reached through an unguessable link. With an email they also get: received,
  accepted or rejected, cancelled, and refund updates. Without one, material
  changes are handled by phone.

## Privacy

- Privacy policy and terms pages, with wording confirmed by the owner (they must
  reflect the cancellation and refund rules).
- Customer name, phone, address and email are anonymised on orders older than
  12 months; items and amounts are kept.
- No personal data in public pages or routine logs.

## Owner must confirm before launch

Delivery districts and fees, minimum order, free-delivery threshold, pickup
discount, opening and ordering hours, address, phone, notification and Reply-To
email, menu content, translations, prices, weights, allergens, and the
cancellation, refund and privacy terms. Tell customers that the loyalty club ends.
