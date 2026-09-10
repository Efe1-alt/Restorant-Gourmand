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
