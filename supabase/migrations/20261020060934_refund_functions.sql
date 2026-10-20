-- Gourmand: refund bookkeeping.
--
-- A refund counts towards orders.refunded_cents only once Stripe reports it
-- succeeded. Stripe may tell us twice (API response and webhook), so the
-- update is done here, once, under a row lock.

create or replace function public.apply_refund_result(
  p_refund_id bigint,
  p_status text,
  p_stripe_status text default null,
  p_failure text default null
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  v_refund record;
  v_order record;
  v_refunded integer;
  v_payment_status text;
begin
  if p_status not in ('pending', 'succeeded', 'failed', 'canceled') then
    raise exception 'invalid_refund_status' using errcode = 'P0001';
  end if;

  select id, order_id, payment_id, amount_cents, status into v_refund
  from public.refunds where id = p_refund_id for update;
  if not found then
    return false;
  end if;
  -- Succeeded is final.
  if v_refund.status = 'succeeded' then
    return false;
  end if;

  update public.refunds
  set status = p_status,
      stripe_status = coalesce(p_stripe_status, stripe_status),
      failure_reason = coalesce(p_failure, failure_reason),
      confirmed_at = case when p_status in ('succeeded', 'failed', 'canceled') then now() else confirmed_at end
  where id = p_refund_id;

  if p_status = 'succeeded' then
    select id, total_cents, refunded_cents into v_order
    from public.orders where id = v_refund.order_id for update;
    v_refunded := least(v_order.refunded_cents + v_refund.amount_cents, v_order.total_cents);
    v_payment_status := case when v_refunded >= v_order.total_cents then 'refunded' else 'partially_refunded' end;
    update public.orders set refunded_cents = v_refunded, payment_status = v_payment_status where id = v_order.id;
    update public.payments set status = v_payment_status where id = v_refund.payment_id;
  end if;

  insert into public.audit_log (actor, action, entity, entity_id, details)
  values ('stripe', 'refund.' || p_status, 'order', v_refund.order_id::text,
          jsonb_build_object('refund_id', p_refund_id, 'amount_cents', v_refund.amount_cents));
  return true;
end;
$$;

revoke execute on function public.apply_refund_result(bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.apply_refund_result(bigint, text, text, text) to service_role;
