-- Таблица за резервации, направени през inline widget-а на сайта.
-- Документира РЕАЛНАТА структура на вече провизионирания Supabase проект
-- (провери с curl/PostgREST select probes на живо — колоните по-долу
-- съвпадат с това, което вече съществува). Ако таблицата не съществува,
-- изпълни това в Supabase SQL editor.

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_name text not null,
  client_phone text not null,
  date date not null,
  time text not null,
  party_size int not null check (party_size between 1 and 20),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled'))
);

alter table reservations enable row level security;

-- Формата пише директно от браузъра с publishable/anon ключа (не service
-- role) — затова anon ролята се нуждае от изрична INSERT policy. SELECT
-- остава заключен, за да не може произволен посетител да чете чужди
-- резервации (клиентски телефони и т.н.) само с publishable ключа.
create policy "Public can insert reservations"
  on reservations for insert
  to anon
  with check (true);

comment on table reservations is 'Заявки за резервация от reservation widget-а на сайта.';

-- ---------------------------------------------------------------------------

-- Таблица за онлайн поръчки (доставка / вземане от място), направени през
-- секцията за поръчка на сайта. Изпълни това в Supabase SQL editor.

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_name text not null check (char_length(client_name) between 2 and 100),
  client_phone text not null check (char_length(client_phone) between 6 and 30),
  fulfillment text not null check (fulfillment in ('delivery', 'pickup')),
  address text check (char_length(address) <= 300),
  -- 'asap' или час за днес във формат HH:MM.
  requested_time text not null check (requested_time = 'asap' or requested_time ~ '^\d{2}:\d{2}$'),
  payment text not null check (payment in ('cash', 'card')),
  note text check (char_length(note) <= 500),
  -- [{ "name": "Шопска салата", "qty": 2, "price": 3.30 }, ...]
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  -- Смята се в браузъра, затова е ориентировъчна — ресторантът я потвърждава
  -- по телефона заедно с цената на доставката.
  total numeric(10, 2) not null check (total > 0),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  constraint delivery_needs_address check (fulfillment = 'pickup' or address is not null)
);

alter table orders enable row level security;

-- Формата пише директно от браузъра с publishable/anon ключа (не service
-- role) — затова anon ролята се нуждае от изрична INSERT policy. SELECT
-- остава заключен, за да не може произволен посетител да чете чужди
-- поръчки (адреси, телефони) само с publishable ключа. Статусът винаги
-- влиза като 'pending' — сменя го само персоналът.
drop policy if exists "Public can insert pending orders" on orders;
create policy "Public can insert pending orders"
  on orders for insert
  to anon
  with check (status = 'pending');

comment on table orders is 'Онлайн поръчки от секцията за поръчка на сайта.';
