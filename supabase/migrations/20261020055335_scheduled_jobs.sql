-- Gourmand: database-side scheduled jobs (pg_cron).
--
-- App-side jobs that need email (10-minute owner reminder, email retries)
-- run from /api/cron, triggered by Vercel Cron in production and by
-- `npm run cron` locally.

create extension if not exists pg_cron with schema pg_catalog;

-- Release portions held by card orders whose Checkout session ran out.
select cron.schedule(
  'gourmand-expire-holds',
  '* * * * *',
  $$select public.expire_stale_holds(300)$$
);

-- Anonymise orders older than 12 months, daily at 03:15 UTC.
select cron.schedule(
  'gourmand-anonymise',
  '15 3 * * *',
  $$select public.anonymise_old_orders(interval '12 months')$$
);
