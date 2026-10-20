-- Gourmand: run the app's every-minute jobs (/api/cron: owner reminders,
-- email retries, expired holds) from pg_cron instead of Vercel Cron, so the
-- app deploys on any Vercel plan.
--
-- The target URL and bearer secret live in Supabase Vault, set once per
-- environment with:
--   select private.set_app_cron_target('https://<app host>/api/cron', '<CRON_SECRET>');
-- Until both are set, the job does nothing. On a Vercel preview with
-- Deployment Protection, also store the "Protection Bypass for Automation"
-- secret:
--   select vault.create_secret('<bypass secret>', 'vercel_protection_bypass');

create extension if not exists pg_net with schema extensions;

-- Not exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.call_app_cron()
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_bypass text;
  v_headers jsonb;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'app_cron_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'app_cron_secret';
  select decrypted_secret into v_bypass from vault.decrypted_secrets where name = 'vercel_protection_bypass';
  if v_url is null or v_secret is null then
    return null;
  end if;
  v_headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret);
  if v_bypass is not null then
    v_headers := v_headers || jsonb_build_object('x-vercel-protection-bypass', v_bypass);
  end if;
  -- Asynchronous: pg_net queues the request and returns its id at once.
  return net.http_get(url := v_url, headers := v_headers, timeout_milliseconds := 30000);
end;
$$;

create or replace function private.set_app_cron_target(p_url text, p_secret text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if p_url !~ '^https?://' or length(coalesce(p_secret, '')) < 16 then
    raise exception 'invalid_cron_target' using errcode = 'P0001';
  end if;
  select id into v_id from vault.secrets where name = 'app_cron_url';
  if v_id is null then
    perform vault.create_secret(p_url, 'app_cron_url', 'Gourmand: URL of the app''s /api/cron');
  else
    perform vault.update_secret(v_id, p_url);
  end if;
  select id into v_id from vault.secrets where name = 'app_cron_secret';
  if v_id is null then
    perform vault.create_secret(p_secret, 'app_cron_secret', 'Gourmand: CRON_SECRET bearer token');
  else
    perform vault.update_secret(v_id, p_secret);
  end if;
end;
$$;

revoke execute on function private.call_app_cron() from public, anon, authenticated, service_role;
revoke execute on function private.set_app_cron_target(text, text) from public, anon, authenticated, service_role;

select cron.schedule('gourmand-app-jobs', '* * * * *', $$select private.call_app_cron()$$);
