# Ten-hour founder social experiment

Only the `repo-card` CodeRabbit slot is temporarily replaced. The original affiliate creative, tracking, website-card slot, and sponsor purchase placements remain unchanged. After the fixed window the original repo-card promotion is rendered automatically; no future deployment or scheduled job is required.

## Launch

Scheduled activation: 2026-10-17 04:25:00 UTC. Exclusive automatic cutoff: 2026-10-17 14:25:00 UTC.

WhatsApp channel supplied by the owner on October 17: https://whatsapp.com/channel/0029VbEVL3dC1FuC80tKFz1u

The source of truth is `lib/founder-experiment.ts`. The start and exclusive end are absolute UTC timestamps exactly ten hours apart. Do not publish an active window until all three destinations are verified and the production deployment can be verified before that start. If a deployment misses the proposed start, replace the window before launch rather than shorten the experiment.

`GET /api/founder-experiment` is forced dynamic and uncached. The card requires a valid, active server-time response. The browser uses elapsed monotonic and wall-clock durations from that response; a clock rollback or sleeping device cannot extend the deadline. A deadline timer restores CodeRabbit in open tabs, with additional status checks on focus, visibility, bfcache resume, and each minute while pending/active. Status failures fail closed. Late clicks are blocked and do not generate founder events.

## Measurement

Reuse the existing Vercel Web Analytics SDK and Supabase drain; no database migration, new visitor ID, cookie, storage key, email, or phone-number collection is added.

- `Founder Card Impression`: once per component mount, after at least 50% of the card is visible continuously for one second in a visible tab
- `Founder Social Click`: each left/keyboard/modified-left or middle-button activation, with `platform` equal to `beehiiv`, `telegram`, or `whatsapp`
- Both carry `experiment=founder-socials-2026-10-17`, `placement=repo-card`, and `qa` boolean
- Verification uses `?founder_qa=1`. Exclude those events, deployment/preview hosts, non-production environments, and events outside the half-open window

An impression is a viewable card exposure, not a pageview or a unique person. Repeat clicks are counted. Context-menu copies/opens and blocked analytics may not be recorded. Outbound clicks do not establish newsletter subscriptions or Telegram/WhatsApp joins. Vercel's existing identifiers reset daily; a run crossing midnight cannot claim deduplicated people across both dates. Report distinct `(UTC date, device_id)` only as device-days, plus missing-ID counts. Clicks per 100 viewable impressions is an event ratio and can exceed 100; do not call it a unique-visitor conversion rate.

Use the read-only query in `docs/sql/founder-experiment-report.sql`, setting the exact deployed UTC window. Allow ingestion lag after cutoff and compare the latest received/event timestamps before final reporting. Query QA separately to validate delivery without contaminating campaign results.

## Verification

Run the full credential-free `node --import tsx --test tests/*.test.ts` suite, TypeScript, lint for changed files, and production build. A local build needs a non-secret local-only `VIEWS_IP_SALT` placeholder because the existing app intentionally rejects an absent production salt; do not change or retrieve production credentials for that test.

Verify production status before activation and again during the window. Use an existing cached public repository page, visually inspect the photo, copy and all buttons at desktop and mobile widths, save screenshots, verify all destination URLs, and confirm QA-tagged impression/click events reach the drain. After cutoff confirm the endpoint is inactive and CodeRabbit has returned, including an open tab. Keep QA-tagged verification separate in the report.
