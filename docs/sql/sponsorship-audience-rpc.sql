-- Reviewed deployment SQL, not an automatically applied migration.
-- Execute this entire transaction atomically. Never expose raw analytics grants.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_sponsorship_audience()
RETURNS TABLE (
  window_key text,
  window_start timestamptz,
  window_end timestamptz,
  daily_unique_visits bigint,
  raw_pageview_events bigint,
  first_event_at timestamptz,
  latest_event_at timestamptz,
  active_utc_dates bigint,
  missing_device_events bigint,
  measured_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
SET timezone = 'UTC'
AS $function$
  WITH bounds AS (
    SELECT statement_timestamp() AS measured,
      date_trunc('month', statement_timestamp()) AS month_start
  ), windows AS (
    SELECT 'rolling_30_days'::text AS key,
      measured - interval '30 days' AS start_at,
      measured AS end_at, measured
    FROM bounds
    UNION ALL
    SELECT 'previous_calendar_month'::text,
      month_start - interval '1 month', month_start, measured
    FROM bounds
  )
  SELECT w.key, w.start_at, w.end_at,
    a.daily_unique_visits, a.raw_pageview_events,
    a.first_event_at, a.latest_event_at, a.active_utc_dates,
    a.missing_device_events, w.measured
  FROM windows AS w
  CROSS JOIN LATERAL (
    SELECT
      count(DISTINCT ((e.event_timestamp AT TIME ZONE 'UTC')::date, e.device_id))
        FILTER (WHERE e.device_id IS NOT NULL) AS daily_unique_visits,
      count(*) AS raw_pageview_events,
      min(e.event_timestamp) AS first_event_at,
      max(e.event_timestamp) AS latest_event_at,
      count(DISTINCT (e.event_timestamp AT TIME ZONE 'UTC')::date) AS active_utc_dates,
      count(*) FILTER (WHERE e.device_id IS NULL) AS missing_device_events
    FROM public.vercel_analytics_events_raw AS e
    WHERE e.project_id = 'prj_z7TUohej5S9f0TFdK6BKZX0FkDaF'
      AND e.vercel_environment = 'production'
      AND e.event_type = 'pageview'
      AND e.origin ~ '^https://(www\.)?gitreverse\.com([/?#]|$)'
      AND e.event_timestamp >= w.start_at
      AND e.event_timestamp < w.end_at
  ) AS a;
$function$;

REVOKE ALL ON FUNCTION public.get_sponsorship_audience() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_sponsorship_audience() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sponsorship_audience() TO service_role;
COMMENT ON FUNCTION public.get_sponsorship_audience() IS
  'Server-only fixed-window sponsor audience aggregates. Daily-reset Vercel identifiers are not unique people across days. No raw rows are returned.';
COMMIT;
