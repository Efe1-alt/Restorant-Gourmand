-- Gourmand: core schema (menu, stock, settings, orders, payments, refunds,
-- notifications, audit).
--
-- Access model
-- ------------
-- Nothing in `public` is reachable through the Data API for `anon` or
-- `authenticated`: config.toml sets `auto_expose_new_tables = false`, this
-- migration revokes defaults, and RLS is enabled on every table with no
-- policies for those roles. The Next.js server is the only client. It uses
-- the secret (service_role) key, checks the owner session itself, and calls
-- the functions in the next migration for anything that must be atomic.
--
-- Money is stored in euro cents (integer). Dates that mean "a menu day" are
-- Europe/Sofia calendar dates.

-- ---------------------------------------------------------------------------
-- Helpers

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Menu

create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name_bg text not null check (char_length(name_bg) between 1 and 80),
  name_en text check (char_length(name_en) between 1 and 80),
  sort_order integer not null default 0,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.categories is 'Owner-managed menu categories (add, rename, reorder, hide).';

create table public.dishes (
  id bigint generated always as identity primary key,
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,120}$'),
  category_id bigint not null references public.categories (id) on delete restrict,
  name_bg text not null check (char_length(name_bg) between 1 and 200),
  name_en text check (char_length(name_en) between 1 and 200),
  description_bg text not null default '' check (char_length(description_bg) <= 600),
  description_en text check (char_length(description_en) <= 600),
  -- English text is drafted from the Bulgarian and shown only once approved.
  en_status text not null default 'missing' check (en_status in ('missing', 'needs_review', 'approved')),
  price_cents integer not null check (price_cents between 1 and 100000),
  -- Free text exactly as on the menu: "350 г", "2 бр.", "500 мл".
  weight text not null default '' check (char_length(weight) <= 40),
  -- EU FIC 1169/2011 Annex II codes. Owner-verified; empty at import.
  allergens text[] not null default '{}' check (
    allergens <@ array['gluten','crustaceans','eggs','fish','peanuts','soybeans','milk','nuts',
                       'celery','mustard','sesame','sulphites','lupin','molluscs']::text[]
  ),
  allergens_verified boolean not null default false,
  -- Object path inside the `dish-photos` storage bucket.
  image_path text check (char_length(image_path) <= 200),
  is_visible boolean not null default true,
  -- Standing dishes are orderable every ordering day while visible; daily
  -- (lunch) dishes only on dates they are scheduled and published.
  is_standing boolean not null default false,
  -- Optional per-day cap for standing dishes. null = unlimited.
  standing_daily_cap integer check (standing_daily_cap > 0),
  sort_order integer not null default 0,
  -- Soft delete: historical orders keep their own snapshots either way.
  archived_at timestamptz,
  -- Import flags for the owner (missing data, conflicting variants, ...).
  import_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint en_approved_needs_name check (en_status <> 'approved' or name_en is not null),
  constraint cap_only_for_standing check (is_standing or standing_daily_cap is null)
);
create index dishes_category_id_idx on public.dishes (category_id);
comment on table public.dishes is 'Every dish the restaurant sells. Orders snapshot name and price, so edits never change history.';

-- Six weekday templates (Mon–Sat). Each new week is pre-filled from these as
-- an unpublished draft.
create table public.weekday_templates (
  weekday smallint not null check (weekday between 1 and 6),
  dish_id bigint not null references public.dishes (id) on delete cascade,
  default_portions integer not null default 10 check (default_portions >= 0),
  sort_order integer not null default 0,
  primary key (weekday, dish_id)
);
create index weekday_templates_dish_id_idx on public.weekday_templates (dish_id);

create table public.menu_days (
  menu_date date primary key,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_has_time check (status = 'draft' or published_at is not null)
);

-- Daily dishes scheduled on a date, with that date's portion count.
create table public.menu_day_dishes (
  menu_date date not null references public.menu_days (menu_date) on delete cascade,
  dish_id bigint not null references public.dishes (id) on delete restrict,
  portions integer not null check (portions >= 0),
  -- Portions held by orders (awaiting payment or placed). May exceed
  -- `portions` if the owner lowers the count after orders came in.
  reserved integer not null default 0 check (reserved >= 0),
  sold_out boolean not null default false,
  sort_order integer not null default 0,
  primary key (menu_date, dish_id)
);
create index menu_day_dishes_dish_id_idx on public.menu_day_dishes (dish_id);

-- Usage of standing dishes per date. Rows are created on first use, so the
-- manual sold-out flag "resets" at midnight Europe/Sofia by construction.
create table public.standing_stock (
  menu_date date not null,
  dish_id bigint not null references public.dishes (id) on delete restrict,
  reserved integer not null default 0 check (reserved >= 0),
  sold_out boolean not null default false,
  primary key (menu_date, dish_id)
);
create index standing_stock_dish_id_idx on public.standing_stock (dish_id);

-- ---------------------------------------------------------------------------
-- Delivery and settings

create table public.districts (
  id bigint generated always as identity primary key,
  name_bg text not null unique check (char_length(name_bg) between 1 and 80),
  name_en text check (char_length(name_en) between 1 and 80),
  fee_cents integer not null check (fee_cents between 0 and 10000),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Single-row settings. Everything here is owner-editable and unconfirmed
-- until the owner signs off (see docs/backend-scope.md).
create table public.settings (
  id smallint primary key default 1 check (id = 1),
  min_subtotal_cents integer not null default 500 check (min_subtotal_cents >= 0),
  -- null = delivery is never free.
  free_delivery_from_cents integer check (free_delivery_from_cents >= 0),
  -- Basis points: 1000 = 10%.
  pickup_discount_bps integer not null default 1000 check (pickup_discount_bps between 0 and 10000),
  delivery_estimate_minutes integer not null default 60 check (delivery_estimate_minutes between 0 and 600),
  pickup_estimate_minutes integer not null default 30 check (pickup_estimate_minutes between 0 and 600),
  -- Checkout stays disabled until the owner confirms the hours.
  hours_confirmed_at timestamptz,
  ordering_paused boolean not null default false,
  pause_message_bg text check (char_length(pause_message_bg) <= 300),
  pause_message_en text check (char_length(pause_message_en) <= 300),
  card_payments_enabled boolean not null default true,
  turnstile_enabled boolean not null default false,
  owner_notification_email text check (owner_notification_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  reply_to_email text check (reply_to_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  updated_at timestamptz not null default now()
);

-- Opening hours (shown on the site) and ordering hours (checkout). A missing
-- row means closed that weekday. weekday: 0 = Sunday … 6 = Saturday.
create table public.business_hours (
  kind text not null check (kind in ('opening', 'ordering')),
  weekday smallint not null check (weekday between 0 and 6),
  opens time not null,
  closes time not null,
  primary key (kind, weekday),
  constraint opens_before_closes check (opens < closes)
);

create table public.closures (
  closed_on date primary key,
  note text check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Orders

-- GM-YYYYMMDD-NNNN. NNNN comes from this sequence.
create sequence public.order_number_seq as bigint start with 1;

create table public.orders (
  id bigint generated always as identity primary key,
  -- The private status link is <number>.<HMAC(number)> signed with a server
  -- secret (STATUS_LINK_SECRET), so no token is stored here.
  number text not null unique check (number ~ '^GM-\d{8}-\d{4,}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  menu_date date not null,
  locale text not null default 'bg' check (locale in ('bg', 'en')),
  fulfilment text not null check (fulfilment in ('delivery', 'pickup')),
  status text not null check (status in (
    'awaiting_payment', 'abandoned',
    'new', 'accepted', 'preparing',
    'out_for_delivery', 'delivered', 'delivery_failed',
    'ready_for_pickup', 'picked_up', 'not_collected',
    'rejected', 'cancelled'
  )),
  status_changed_at timestamptz not null default now(),
  payment_method text not null check (payment_method in ('card', 'cash', 'pay_at_pickup')),
  payment_status text not null check (payment_status in (
    'pending', 'authorised', 'paid', 'failed', 'expired', 'cancelled',
    'partially_refunded', 'refunded'
  )),
  -- Personal data. Anonymised after 12 months (see anonymise_old_orders).
  customer_name text not null check (char_length(customer_name) between 1 and 100),
  customer_phone text check (char_length(customer_phone) between 6 and 20),
  customer_email text check (char_length(customer_email) <= 254),
  address text check (char_length(address) <= 300),
  notes text check (char_length(notes) <= 500),
  anonymised_at timestamptz,
  district_id bigint references public.districts (id) on delete set null,
  district_name text,
  -- 'asap' or a 30-minute slot today, "HH:MM".
  requested_time text not null check (requested_time = 'asap' or requested_time ~ '^\d{2}:\d{2}$'),
  subtotal_cents integer not null check (subtotal_cents > 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents > 0),
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  -- True while the order's portions are counted in `reserved`.
  stock_held boolean not null default false,
  hold_expires_at timestamptz,
  acknowledged_at timestamptz,
  owner_notified_at timestamptz,
  reminder_sent_at timestamptz,
  reason text check (char_length(reason) <= 500),
  constraint totals_add_up check (total_cents = subtotal_cents - discount_cents + delivery_fee_cents),
  constraint refund_not_above_total check (refunded_cents <= total_cents),
  constraint delivery_has_address check (
    fulfilment = 'pickup' or anonymised_at is not null or (address is not null and district_name is not null)
  ),
  constraint method_matches_fulfilment check (
    payment_method = 'card'
    or (payment_method = 'cash' and fulfilment = 'delivery')
    or (payment_method = 'pay_at_pickup' and fulfilment = 'pickup')
  )
);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_created_at_idx on public.orders (created_at);
create index orders_district_id_idx on public.orders (district_id);
create index orders_awaiting_hold_idx on public.orders (hold_expires_at) where status = 'awaiting_payment';
create index orders_phone_idx on public.orders (customer_phone) where customer_phone is not null;

create table public.order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  dish_id bigint references public.dishes (id) on delete set null,
  stock_kind text not null check (stock_kind in ('daily', 'standing')),
  -- Snapshots at the time of ordering.
  name_bg text not null,
  name_en text,
  weight text not null default '',
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_cents integer not null,
  constraint line_total check (line_total_cents = unit_price_cents * quantity)
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_dish_id_idx on public.order_items (dish_id);

create table public.payments (
  id bigint generated always as identity primary key,
  order_id bigint not null unique references public.orders (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'cash')),
  amount_cents integer not null check (amount_cents > 0),
  status text not null check (status in (
    'pending', 'authorised', 'paid', 'failed', 'expired', 'cancelled',
    'partially_refunded', 'refunded'
  )),
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  checkout_url text,
  authorised_at timestamptz,
  captured_at timestamptz,
  cancelled_at timestamptz,
  failure_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refunds (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  payment_id bigint not null references public.payments (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  reason text not null check (char_length(reason) between 1 and 300),
  -- Counts towards refunded_cents only once Stripe reports it succeeded.
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  stripe_refund_id text unique,
  stripe_status text,
  failure_reason text,
  idempotency_key text not null unique,
  requested_by uuid,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index refunds_order_id_idx on public.refunds (order_id);
create index refunds_payment_id_idx on public.refunds (payment_id);

-- Stripe webhook events already processed (idempotency).
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text
);

-- ---------------------------------------------------------------------------
-- Notifications, abuse protection, audit

create table public.email_outbox (
  id bigint generated always as identity primary key,
  order_id bigint references public.orders (id) on delete cascade,
  kind text not null check (kind in (
    'owner_new_order', 'owner_reminder',
    'customer_received', 'customer_accepted', 'customer_rejected',
    'customer_cancelled', 'customer_refund'
  )),
  to_address text,
  subject text not null,
  html text not null,
  text_body text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  last_error text,
  provider_message_id text,
  -- One email per order event; also sent to Resend as its idempotency key.
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  next_attempt_at timestamptz not null default now()
);
create index email_outbox_order_id_idx on public.email_outbox (order_id);
create index email_outbox_due_idx on public.email_outbox (next_attempt_at) where status in ('pending', 'failed');

-- Rate limiting. Buckets hold a keyed hash of the IP or phone, never the raw value.
create table public.rate_limit_hits (
  id bigint generated always as identity primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_hits_bucket_created_idx on public.rate_limit_hits (bucket, created_at);

-- Status changes, stock adjustments, refunds and settings changes. No
-- customer personal data goes in here.
create table public.audit_log (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  actor text not null check (actor in ('owner', 'system', 'stripe', 'customer')),
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb
);
create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers

create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger dishes_updated_at before update on public.dishes
  for each row execute function public.set_updated_at();
create trigger menu_days_updated_at before update on public.menu_days
  for each row execute function public.set_updated_at();
create trigger districts_updated_at before update on public.districts
  for each row execute function public.set_updated_at();
create trigger settings_updated_at before update on public.settings
  for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security and grants

alter table public.categories enable row level security;
alter table public.dishes enable row level security;
alter table public.weekday_templates enable row level security;
alter table public.menu_days enable row level security;
alter table public.menu_day_dishes enable row level security;
alter table public.standing_stock enable row level security;
alter table public.districts enable row level security;
alter table public.settings enable row level security;
alter table public.business_hours enable row level security;
alter table public.closures enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.stripe_events enable row level security;
alter table public.email_outbox enable row level security;
alter table public.rate_limit_hits enable row level security;
alter table public.audit_log enable row level security;

-- No policies for anon/authenticated: deny all. Revoke anything a default
-- privilege may have granted, then grant the server role what it needs.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
