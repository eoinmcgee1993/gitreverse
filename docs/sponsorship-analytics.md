# Sponsorship audience analytics

## Source and metric

Read-only verification on 2026-10-08 confirmed the GitReverse Supabase project (`frkskfspunayclkiwdmk`) receives Vercel Web Analytics in `public.vercel_analytics_events_raw`. Filter to Vercel project `prj_z7TUohej5S9f0TFdK6BKZX0FkDaF`, `production`, `pageview`, and the exact canonical hostnames `www.gitreverse.com` / `gitreverse.com` over HTTPS. The `origin` column contains full URLs, not just origins. Generated subdomains and Vercel preview/deployment hostnames must not be included in the canonical sponsor audience.

The visitor measure is `COUNT(DISTINCT (UTC event date, device_id))`, excluding null device IDs. Vercel resets anonymous visitor hashes daily. This is daily-unique visits summed over the window, **not unique people across an entire month**. Repeated visits on different days can count again. Do not call this a session count; `session_id` is absent from many newer events.

Requested UI: “35K visitors last month”, populated from the previous complete UTC calendar month aggregate. A tooltip must identify the month and explain: “Returning visitors may count again on different days.” Do not describe 35K as a daily number: daily uniqueness is the counting method within the monthly total. Include measurement date/time and exact bounds in accessible detail. The rolling-30-day row is optional and must not replace the calendar-month value under this label.

Sources: [Vercel Analytics](https://vercel.com/docs/analytics), [privacy](https://vercel.com/docs/analytics/privacy-policy), [drain schema](https://vercel.com/docs/drains/reference/analytics).

## Verified snapshots (not live fallback values)

- September `[2026-09-01T00:00:00Z, 2026-10-01T00:00:00Z)`: **35,087 daily-unique visits**; 74,693 raw pageview events; events on all 30 UTC dates. First/last event: Sep 1 00:00:41.718 / Sep 30 23:45:40.040 UTC
- Exact raw-payload duplicate check for September: 74,660 distinct payloads, i.e. 33 duplicate rows. Visitor DISTINCT is already insensitive to identical retries. **Do not present raw_pageview_events as deduplicated pageviews**
- Rolling 30 days measured `2026-10-08T07:39:39.154368Z`: **32,785 daily-unique visits**, 68,622 raw pageview events, zero missing device IDs, latest event `2026-10-08T07:37:54.932Z`. This window touches 31 UTC dates because its endpoints are within a day
- Recorded canonical history: **141,101 daily-unique visits**, 317,546 raw pageview events, first event `2026-06-11T05:14:46.782Z`, latest `2026-10-08T07:37:54.932Z`, all 120 UTC dates represented, zero missing device IDs

The owner-reported “250K+ lifetime visitors” predates this drain's known coverage and is not independently verified by it. Never relabel the drain's recorded-history sum as lifetime. Owner-reported “35K September” is consistent with the verified daily-unique measure.

Presence on every date does not prove lossless ingestion. Drain errors, sampling or intermittent gaps cannot be excluded from these aggregates alone. Vercel documents upstream User-Agent bot exclusion; the drain itself applies no additional bot filter. September `client_type` values were browser/mobile app/null; do not discard legitimate mobile or missing-classification events using invented heuristics.

## Server-only aggregate RPC

Deployment SQL: `docs/sql/sponsorship-audience-rpc.sql`. It has no arguments; callers cannot alter host, project, event or date filters. It returns two rows, keyed by `rolling_30_days` and `previous_calendar_month`, and only aggregate fields:

- `window_key`, `window_start`, `window_end` (exclusive), `measured_at`
- `daily_unique_visits`, `raw_pageview_events`
- `first_event_at`, `latest_event_at`, `active_utc_dates`, `missing_device_events`

`SECURITY INVOKER` preserves the caller's privileges. The existing service_role already has SELECT on the source (verified read-only). Execute permission is revoked from PUBLIC, anon and authenticated and granted only to service_role in the same transaction. It adds no table grants, raw-data access, credentials, new RLS policies or SECURITY DEFINER bypass. Review and explicitly verify deployment before relying on it.

The query scans only two bounded indexed date ranges (30 days and the previous calendar month), using the existing `(event_type, event_timestamp DESC)` index. It does not transfer raw rows to the app. A bounded paginated REST alternative would fetch roughly 69 thousand rows over roughly 69 requests at a 1,000-row cap per refresh at current traffic, which is needlessly expensive.

Call only from a server-only module using the existing admin client; never import that module into client code. Cache successful results for one hour, coalesce concurrent refreshes, and abort the HTTP RPC request after a bounded timeout (e.g. 15 seconds). An HTTP abort bounds app waiting, not necessarily database execution: retain the deployment's existing database statement timeout and do not claim cancellation proves the backend query stopped. Do not launch unbounded retries.

If credentials/RPC/data are unavailable, omit the live metric. Never substitute a historical snapshot as a current automatic value. The owner-provided September 2026 snapshot may appear only during October 2026, clearly labeled as an audience snapshot rather than automatic/live data; it expires at the next month boundary. A cached success may be retained only with its original measurement timestamp and explicit stale labeling. Reject invalid/negative/nonfinite results, stale current-window latest_event_at, missing device identifiers or nonsensical date bounds. Do not describe coverage as complete solely because all dates have traffic. A published public endpoint, if used, must return only these fixed aggregates; no visitor identifiers, paths, query strings, referrers, raw payloads or credentials.

## Post-deployment verification

1. Confirm SECURITY INVOKER, fixed search path/timezone, and execute privileges (anon/authenticated false, service_role true)
2. Test via the app's existing service-role client, confirming two rows and agreement with the direct read-only definition
3. Verify unavailable/stale/timeout UI states and server-only import boundary
4. Confirm cache hits do not issue new database calls; no client request may control RPC filters
5. Check output timestamps and current freshness rather than comparing moving rolling totals to a hardcoded historical number

## Deployment status

The server-only aggregate function has not yet been installed. Prepared frontend code caches the aggregate RPC for one hour, returns a labeled owner snapshot only when its historical month matches the previous calendar month, and otherwise shows monthly traffic unavailable. Do not claim automatic updating is active until the RPC is installed and verified.
