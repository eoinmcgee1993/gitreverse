-- Read-only report for the exact deployed UTC campaign window.
WITH bounds AS (
  SELECT '2026-10-17T04:25:00Z'::timestamptz AS start_at,
         '2026-10-17T14:25:00Z'::timestamptz AS end_at
), scoped AS MATERIALIZED (
  SELECT event_name, event_data ->> 'platform' AS platform, device_id,
         (event_timestamp AT TIME ZONE 'UTC')::date AS utc_date,
         event_timestamp, received_at
  FROM public.vercel_analytics_events_raw
  WHERE project_id = 'prj_z7TUohej5S9f0TFdK6BKZX0FkDaF'
    AND vercel_environment = 'production'
    AND origin ~ '^https://(www\.)?gitreverse\.com([/?#]|$)'
    AND event_type = 'event'
    AND event_name IN ('Founder Card Impression', 'Founder Social Click')
    AND event_data ->> 'experiment' = 'founder-socials-2026-10-17'
    AND event_data ->> 'placement' = 'repo-card'
    AND event_data ->> 'qa' = 'false'
    AND event_timestamp >= (SELECT start_at FROM bounds)
    AND event_timestamp < (SELECT end_at FROM bounds)
), groups AS (
  SELECT 'impressions'::text AS metric
  UNION ALL SELECT 'all_clicks'
  UNION ALL SELECT 'beehiiv'
  UNION ALL SELECT 'telegram'
  UNION ALL SELECT 'whatsapp'
)
SELECT g.metric, count(s.event_name) AS event_count,
       count(DISTINCT (s.utc_date, s.device_id)) FILTER (WHERE s.device_id IS NOT NULL) AS device_days,
       count(s.event_name) FILTER (WHERE s.device_id IS NULL) AS events_missing_device_id,
       min(s.event_timestamp) AS first_event_at,
       max(s.event_timestamp) AS latest_event_at,
       max(s.received_at) AS latest_received_at,
       statement_timestamp() AS measured_at
FROM groups g
LEFT JOIN scoped s ON
  (g.metric = 'impressions' AND s.event_name = 'Founder Card Impression') OR
  (g.metric = 'all_clicks' AND s.event_name = 'Founder Social Click') OR
  (g.metric = s.platform AND s.event_name = 'Founder Social Click')
GROUP BY g.metric
ORDER BY g.metric;
