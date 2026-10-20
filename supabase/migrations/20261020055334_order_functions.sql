-- Gourmand: transactional functions. All are SECURITY INVOKER and executable
-- only by service_role (the Next.js server).
--
-- Lock order, used everywhere to avoid deadlocks:
--   1. the order row (when one exists)
--   2. menu_day_dishes rows, by dish_id
--   3. standing_stock rows, by dish_id

-- ---------------------------------------------------------------------------
-- place_order: validates stock and prices under row locks, reserves the
-- portions and creates the order, its items and its payment row in one
-- transaction.
--
-- p_order: {
--   menu_date, locale, fulfilment, payment_method, customer_name,
--   customer_phone, customer_email, address, district_id, district_name,
--   notes, requested_time, subtotal_cents, discount_cents,
--   delivery_fee_cents, total_cents,
--   hold_minutes (card only)
-- }
-- p_items: [{ dish_id, stock_kind, quantity, unit_price_cents, name_bg, name_en, weight }]
--
-- Errors (SQLSTATE P0001, message = code, detail = JSON):
--   not_available, out_of_stock, price_changed, invalid_items
create or replace function public.place_order(p_order jsonb, p_items jsonb)
returns table (order_id bigint, order_number text)
language plpgsql
set search_path = ''
as $$
declare
  v_date date := (p_order ->> 'menu_date')::date;
  v_is_card boolean := (p_order ->> 'payment_method') = 'card';
  v_item record;
  v_row record;
  v_available integer;
  v_order_id bigint;
  v_number text;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  -- One line per dish.
  if (select count(distinct (i ->> 'dish_id')) from jsonb_array_elements(p_items) i) <> jsonb_array_length(p_items) then
    raise exception 'invalid_items' using errcode = 'P0001', detail = '{"reason":"duplicate_dish"}';
  end if;

  -- Standing stock rows exist from first use.
  insert into public.standing_stock (menu_date, dish_id)
  select v_date, (i ->> 'dish_id')::bigint
  from jsonb_array_elements(p_items) i
  where i ->> 'stock_kind' = 'standing'
  on conflict do nothing;

  -- Daily dishes: lock, then check.
  for v_item in
    select (i ->> 'dish_id')::bigint as dish_id,
           (i ->> 'quantity')::integer as quantity,
           (i ->> 'unit_price_cents')::integer as unit_price_cents
    from jsonb_array_elements(p_items) i
    where i ->> 'stock_kind' = 'daily'
    order by (i ->> 'dish_id')::bigint
  loop
    select mdd.portions, mdd.reserved, mdd.sold_out, md.status, d.price_cents,
           d.is_visible, d.archived_at, c.is_hidden
    into v_row
    from public.menu_day_dishes mdd
    join public.menu_days md on md.menu_date = mdd.menu_date
    join public.dishes d on d.id = mdd.dish_id
    join public.categories c on c.id = d.category_id
    where mdd.menu_date = v_date and mdd.dish_id = v_item.dish_id
    for update of mdd;

    if not found or v_row.status <> 'published' or not v_row.is_visible
       or v_row.archived_at is not null or v_row.is_hidden then
      raise exception 'not_available' using errcode = 'P0001',
        detail = jsonb_build_object('dish_id', v_item.dish_id)::text;
    end if;
    if v_row.price_cents <> v_item.unit_price_cents then
      raise exception 'price_changed' using errcode = 'P0001',
        detail = jsonb_build_object('dish_id', v_item.dish_id)::text;
    end if;
    v_available := case when v_row.sold_out then 0 else greatest(v_row.portions - v_row.reserved, 0) end;
    if v_available < v_item.quantity then
      raise exception 'out_of_stock' using errcode = 'P0001',
        detail = jsonb_build_object('dish_id', v_item.dish_id, 'available', v_available)::text;
    end if;
  end loop;

  -- Standing dishes: lock, then check.
  for v_item in
    select (i ->> 'dish_id')::bigint as dish_id,
           (i ->> 'quantity')::integer as quantity,
           (i ->> 'unit_price_cents')::integer as unit_price_cents
    from jsonb_array_elements(p_items) i
    where i ->> 'stock_kind' = 'standing'
    order by (i ->> 'dish_id')::bigint
  loop
    select ss.reserved, ss.sold_out, d.is_standing, d.standing_daily_cap, d.price_cents,
           d.is_visible, d.archived_at, c.is_hidden
    into v_row
    from public.standing_stock ss
    join public.dishes d on d.id = ss.dish_id
    join public.categories c on c.id = d.category_id
    where ss.menu_date = v_date and ss.dish_id = v_item.dish_id
    for update of ss;

    if not found or not v_row.is_standing or not v_row.is_visible
       or v_row.archived_at is not null or v_row.is_hidden then
      raise exception 'not_available' using errcode = 'P0001',
        detail = jsonb_build_object('dish_id', v_item.dish_id)::text;
    end if;
    if v_row.price_cents <> v_item.unit_price_cents then
      raise exception 'price_changed' using errcode = 'P0001',
        detail = jsonb_build_object('dish_id', v_item.dish_id)::text;
    end if;
    v_available := case
      when v_row.sold_out then 0
      when v_row.standing_daily_cap is null then 2147483647
      else greatest(v_row.standing_daily_cap - v_row.reserved, 0)
    end;
    if v_available < v_item.quantity then
      raise exception 'out_of_stock' using errcode = 'P0001',
        detail = jsonb_build_object('dish_id', v_item.dish_id, 'available', v_available)::text;
    end if;
  end loop;

  -- Reserve.
  update public.menu_day_dishes mdd
  set reserved = mdd.reserved + (i ->> 'quantity')::integer
  from jsonb_array_elements(p_items) i
  where i ->> 'stock_kind' = 'daily'
    and mdd.menu_date = v_date and mdd.dish_id = (i ->> 'dish_id')::bigint;

  update public.standing_stock ss
  set reserved = ss.reserved + (i ->> 'quantity')::integer
  from jsonb_array_elements(p_items) i
  where i ->> 'stock_kind' = 'standing'
    and ss.menu_date = v_date and ss.dish_id = (i ->> 'dish_id')::bigint;

  v_number := 'GM-' || to_char(v_date, 'YYYYMMDD') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  insert into public.orders (
    number, menu_date, locale, fulfilment, status, payment_method, payment_status,
    customer_name, customer_phone, customer_email, address, district_id, district_name, notes,
    requested_time, subtotal_cents, discount_cents, delivery_fee_cents, total_cents,
    stock_held, hold_expires_at
  ) values (
    v_number,
    v_date,
    coalesce(p_order ->> 'locale', 'bg'),
    p_order ->> 'fulfilment',
    case when v_is_card then 'awaiting_payment' else 'new' end,
    p_order ->> 'payment_method',
    'pending',
    p_order ->> 'customer_name',
    nullif(p_order ->> 'customer_phone', ''),
    nullif(p_order ->> 'customer_email', ''),
    nullif(p_order ->> 'address', ''),
    (p_order ->> 'district_id')::bigint,
    nullif(p_order ->> 'district_name', ''),
    nullif(p_order ->> 'notes', ''),
    p_order ->> 'requested_time',
    (p_order ->> 'subtotal_cents')::integer,
    (p_order ->> 'discount_cents')::integer,
    (p_order ->> 'delivery_fee_cents')::integer,
    (p_order ->> 'total_cents')::integer,
    true,
    case when v_is_card
      then now() + make_interval(mins => coalesce((p_order ->> 'hold_minutes')::integer, 30))
    end
  )
  returning id into v_order_id;

  insert into public.order_items (order_id, dish_id, stock_kind, name_bg, name_en, weight, unit_price_cents, quantity, line_total_cents)
  select v_order_id,
         (i ->> 'dish_id')::bigint,
         i ->> 'stock_kind',
         i ->> 'name_bg',
         nullif(i ->> 'name_en', ''),
         coalesce(i ->> 'weight', ''),
         (i ->> 'unit_price_cents')::integer,
         (i ->> 'quantity')::integer,
         (i ->> 'unit_price_cents')::integer * (i ->> 'quantity')::integer
  from jsonb_array_elements(p_items) i;

  insert into public.payments (order_id, provider, amount_cents, status)
  values (v_order_id, case when v_is_card then 'stripe' else 'cash' end, (p_order ->> 'total_cents')::integer, 'pending');

  insert into public.audit_log (actor, action, entity, entity_id, details)
  values ('customer', 'order.placed', 'order', v_order_id::text,
          jsonb_build_object('number', v_number, 'payment_method', p_order ->> 'payment_method',
                             'total_cents', (p_order ->> 'total_cents')::integer));

  return query select v_order_id, v_number;
end;
$$;

-- ---------------------------------------------------------------------------
-- release_order_stock: gives an order's portions back. Idempotent.

create or replace function public.release_order_stock(p_order_id bigint, p_actor text default 'system', p_actor_id uuid default null)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_order record;
begin
  select id, menu_date, stock_held into v_order
  from public.orders where id = p_order_id for update;
  if not found or not v_order.stock_held then
    return false;
  end if;

  perform 1 from public.menu_day_dishes mdd
  where mdd.menu_date = v_order.menu_date
    and mdd.dish_id in (select oi.dish_id from public.order_items oi where oi.order_id = p_order_id and oi.stock_kind = 'daily')
  order by mdd.dish_id
  for update;

  perform 1 from public.standing_stock ss
  where ss.menu_date = v_order.menu_date
    and ss.dish_id in (select oi.dish_id from public.order_items oi where oi.order_id = p_order_id and oi.stock_kind = 'standing')
  order by ss.dish_id
  for update;

  update public.menu_day_dishes mdd
  set reserved = greatest(mdd.reserved - oi.quantity, 0)
  from public.order_items oi
  where oi.order_id = p_order_id and oi.stock_kind = 'daily'
    and mdd.menu_date = v_order.menu_date and mdd.dish_id = oi.dish_id;

  update public.standing_stock ss
  set reserved = greatest(ss.reserved - oi.quantity, 0)
  from public.order_items oi
  where oi.order_id = p_order_id and oi.stock_kind = 'standing'
    and ss.menu_date = v_order.menu_date and ss.dish_id = oi.dish_id;

  update public.orders set stock_held = false where id = p_order_id;

  insert into public.audit_log (actor, actor_id, action, entity, entity_id)
  values (p_actor, p_actor_id, 'stock.released', 'order', p_order_id::text);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- rereserve_order_stock: for a card payment that succeeded after its hold
-- was released. Reserves again only if every line still fits; otherwise
-- changes nothing and returns false.

create or replace function public.rereserve_order_stock(p_order_id bigint)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_order record;
  v_short integer;
begin
  select id, menu_date, stock_held into v_order
  from public.orders where id = p_order_id for update;
  if not found then
    return false;
  end if;
  if v_order.stock_held then
    return true;
  end if;

  insert into public.standing_stock (menu_date, dish_id)
  select v_order.menu_date, oi.dish_id
  from public.order_items oi
  where oi.order_id = p_order_id and oi.stock_kind = 'standing' and oi.dish_id is not null
  on conflict do nothing;

  perform 1 from public.menu_day_dishes mdd
  where mdd.menu_date = v_order.menu_date
    and mdd.dish_id in (select oi.dish_id from public.order_items oi where oi.order_id = p_order_id and oi.stock_kind = 'daily')
  order by mdd.dish_id
  for update;

  perform 1 from public.standing_stock ss
  where ss.menu_date = v_order.menu_date
    and ss.dish_id in (select oi.dish_id from public.order_items oi where oi.order_id = p_order_id and oi.stock_kind = 'standing')
  order by ss.dish_id
  for update;

  select count(*) into v_short
  from public.order_items oi
  left join public.menu_day_dishes mdd
    on oi.stock_kind = 'daily' and mdd.menu_date = v_order.menu_date and mdd.dish_id = oi.dish_id
  left join public.standing_stock ss
    on oi.stock_kind = 'standing' and ss.menu_date = v_order.menu_date and ss.dish_id = oi.dish_id
  left join public.dishes d on d.id = oi.dish_id
  where oi.order_id = p_order_id
    and (
      oi.dish_id is null
      or (oi.stock_kind = 'daily' and (mdd.dish_id is null or mdd.sold_out or mdd.portions - mdd.reserved < oi.quantity))
      or (oi.stock_kind = 'standing' and (ss.dish_id is null or ss.sold_out
          or (d.standing_daily_cap is not null and d.standing_daily_cap - ss.reserved < oi.quantity)))
    );

  if v_short > 0 then
    return false;
  end if;

  update public.menu_day_dishes mdd
  set reserved = mdd.reserved + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.stock_kind = 'daily'
    and mdd.menu_date = v_order.menu_date and mdd.dish_id = oi.dish_id;

  update public.standing_stock ss
  set reserved = ss.reserved + oi.quantity
  from public.order_items oi
  where oi.order_id = p_order_id and oi.stock_kind = 'standing'
    and ss.menu_date = v_order.menu_date and ss.dish_id = oi.dish_id;

  update public.orders set stock_held = true where id = p_order_id;

  insert into public.audit_log (actor, action, entity, entity_id)
  values ('stripe', 'stock.rereserved', 'order', p_order_id::text);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- transition_order: compare-and-set status change with optional stock
-- release, in one transaction. The allowed transitions live in
-- src/lib/order-status.ts; this function guarantees nobody else changed the
-- order in between. Returns false if the order was no longer in p_from.

create or replace function public.transition_order(
  p_order_id bigint,
  p_from text,
  p_to text,
  p_actor text,
  p_actor_id uuid default null,
  p_release_stock boolean default false,
  p_reason text default null,
  p_payment_status text default null
)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.orders
  set status = p_to,
      status_changed_at = now(),
      reason = coalesce(p_reason, reason),
      payment_status = coalesce(p_payment_status, payment_status),
      acknowledged_at = case when p_actor = 'owner' then coalesce(acknowledged_at, now()) else acknowledged_at end
  where id = p_order_id and status = p_from;
  if not found then
    return false;
  end if;

  if p_payment_status is not null then
    update public.payments set status = p_payment_status where order_id = p_order_id;
  end if;

  if p_release_stock then
    perform public.release_order_stock(p_order_id, p_actor, p_actor_id);
  end if;

  insert into public.audit_log (actor, actor_id, action, entity, entity_id, details)
  values (p_actor, p_actor_id, 'order.status', 'order', p_order_id::text,
          jsonb_strip_nulls(jsonb_build_object('from', p_from, 'to', p_to,
            'payment_status', p_payment_status, 'stock_released', p_release_stock)));
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_stale_holds: card orders whose Checkout session has run out. Runs
-- from pg_cron every minute and from the app. The grace period leaves room
-- for Stripe's own expiry and a delayed webhook; a payment that still lands
-- later is reconciled by the webhook handler.

create or replace function public.expire_stale_holds(p_grace_seconds integer default 300)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_id bigint;
  v_count integer := 0;
begin
  for v_id in
    select id from public.orders
    where status = 'awaiting_payment'
      and hold_expires_at < now() - make_interval(secs => p_grace_seconds)
    order by id
    for update skip locked
  loop
    perform public.transition_order(v_id, 'awaiting_payment', 'abandoned', 'system', null, true,
                                    'payment_expired', 'expired');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- hit_rate_limit: records a hit and returns true if it is within the limit.

create or replace function public.hit_rate_limit(p_bucket text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_bucket, 0));
  select count(*) into v_count
  from public.rate_limit_hits
  where bucket = p_bucket and created_at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_max then
    return false;
  end if;
  insert into public.rate_limit_hits (bucket) values (p_bucket);
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Week planning

-- Pre-fills Mon–Sat of the week starting p_monday from the weekday templates.
-- Days that already exist are left alone. New days are unpublished drafts.
create or replace function public.prefill_week(p_monday date, p_actor_id uuid default null)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_day date;
  v_created integer := 0;
begin
  if extract(isodow from p_monday) <> 1 then
    raise exception 'not_a_monday' using errcode = 'P0001';
  end if;
  for i in 0..5 loop
    v_day := p_monday + i;
    insert into public.menu_days (menu_date, status) values (v_day, 'draft')
    on conflict do nothing;
    if found then
      insert into public.menu_day_dishes (menu_date, dish_id, portions, sort_order)
      select v_day, wt.dish_id, wt.default_portions, wt.sort_order
      from public.weekday_templates wt
      join public.dishes d on d.id = wt.dish_id
      where wt.weekday = i + 1 and d.archived_at is null;
      v_created := v_created + 1;
    end if;
  end loop;
  insert into public.audit_log (actor, actor_id, action, entity, entity_id, details)
  values ('owner', p_actor_id, 'menu.prefill_week', 'menu_week', p_monday::text,
          jsonb_build_object('days_created', v_created));
  return v_created;
end;
$$;

-- Copies a day's dishes (or just p_dish_ids) to another date. Dishes already
-- on the target date are kept as they are. A new target day is a draft.
create or replace function public.copy_menu_day(p_from date, p_to date, p_dish_ids bigint[] default null, p_actor_id uuid default null)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_from = p_to then
    raise exception 'same_day' using errcode = 'P0001';
  end if;
  insert into public.menu_days (menu_date, status) values (p_to, 'draft') on conflict do nothing;
  insert into public.menu_day_dishes (menu_date, dish_id, portions, sort_order)
  select p_to, mdd.dish_id, mdd.portions, mdd.sort_order
  from public.menu_day_dishes mdd
  where mdd.menu_date = p_from and (p_dish_ids is null or mdd.dish_id = any (p_dish_ids))
  on conflict do nothing;
  get diagnostics v_count = row_count;
  insert into public.audit_log (actor, actor_id, action, entity, entity_id, details)
  values ('owner', p_actor_id, 'menu.copy', 'menu_day', p_to::text,
          jsonb_build_object('from', p_from, 'dishes', v_count));
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privacy: anonymise personal data on orders older than 12 months. Items and
-- amounts are kept. Also purges old rate-limit hits.

create or replace function public.anonymise_old_orders(p_older_than interval default interval '12 months')
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  with old as (
    update public.orders
    set customer_name = 'Анонимизиран клиент',
        customer_phone = null,
        customer_email = null,
        address = null,
        notes = null,
        anonymised_at = now()
    where created_at < now() - p_older_than and anonymised_at is null
    returning id
  )
  select count(*) into v_count from old;

  update public.email_outbox e
  set to_address = null, html = '', text_body = ''
  from public.orders o
  where e.order_id = o.id and o.anonymised_at is not null and (e.to_address is not null or e.html <> '');

  delete from public.rate_limit_hits where created_at < now() - interval '2 days';

  if v_count > 0 then
    insert into public.audit_log (actor, action, entity, details)
    values ('system', 'privacy.anonymised', 'order', jsonb_build_object('orders', v_count));
  end if;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: server only.

revoke execute on function public.place_order(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.release_order_stock(bigint, text, uuid) from public, anon, authenticated;
revoke execute on function public.rereserve_order_stock(bigint) from public, anon, authenticated;
revoke execute on function public.transition_order(bigint, text, text, text, uuid, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.expire_stale_holds(integer) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.prefill_week(date, uuid) from public, anon, authenticated;
revoke execute on function public.copy_menu_day(date, date, bigint[], uuid) from public, anon, authenticated;
revoke execute on function public.anonymise_old_orders(interval) from public, anon, authenticated;

grant execute on function public.place_order(jsonb, jsonb) to service_role;
grant execute on function public.release_order_stock(bigint, text, uuid) to service_role;
grant execute on function public.rereserve_order_stock(bigint) to service_role;
grant execute on function public.transition_order(bigint, text, text, text, uuid, boolean, text, text) to service_role;
grant execute on function public.expire_stale_holds(integer) to service_role;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
grant execute on function public.prefill_week(date, uuid) to service_role;
grant execute on function public.copy_menu_day(date, date, bigint[], uuid) to service_role;
grant execute on function public.anonymise_old_orders(interval) to service_role;
