import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FOUNDER_EXPERIMENT, FOUNDER_SOCIALS, estimatedServerTime, founderDestinationsReady, founderExperimentActive, validFounderWindow } from "../lib/founder-experiment";

const window = { startsAt: "2026-10-16T18:00:00.000Z", endsAt: "2026-10-17T04:00:00.000Z" };
const start = Date.parse(window.startsAt);
const end = Date.parse(window.endsAt);

test("fixed campaign is active for exactly ten hours with an exclusive cutoff", () => {
  assert.equal(validFounderWindow(window), true);
  assert.equal(founderExperimentActive(start - 1, window), false);
  assert.equal(founderExperimentActive(start, window), true);
  assert.equal(founderExperimentActive(end - 1, window), true);
  assert.equal(founderExperimentActive(end, window), false);
  assert.equal(founderExperimentActive(end + 60_000, window), false);
  assert.equal(founderExperimentActive(NaN, window), false);
});

test("missing, invalid, reversed, or wrong-duration windows fail closed", () => {
  for (const invalid of [
    { startsAt: "", endsAt: "" },
    { startsAt: "invalid", endsAt: window.endsAt },
    { startsAt: window.endsAt, endsAt: window.startsAt },
    { startsAt: window.startsAt, endsAt: "2026-10-17T03:59:59.999Z" },
    { startsAt: window.startsAt, endsAt: "2026-10-17T04:00:00.001Z" },
  ]) {
    assert.equal(validFounderWindow(invalid), false);
    assert.equal(founderExperimentActive(start, invalid), false);
  }
});

test("client clock changes and device sleep cannot extend the synced deadline", () => {
  assert.equal(estimatedServerTime(start, 1000, -60_000), start + 1000);
  assert.equal(estimatedServerTime(start, 0, 36_000_000), end);
  assert.equal(estimatedServerTime(start, -1000, -1000), start);
  assert.equal(founderExperimentActive(estimatedServerTime(end - 1, 1, 0), window), false);
});

test("the campaign uses only the three requested platforms and verified HTTPS destinations", () => {
  assert.deepEqual(FOUNDER_SOCIALS.map(({ platform }) => platform), ["beehiiv", "telegram", "whatsapp"]);
  assert.equal(FOUNDER_SOCIALS[0].href, "https://filiksyos.beehiiv.com/");
  assert.equal(FOUNDER_SOCIALS[1].href, "https://t.me/filiksyos");
  // This assertion becomes mandatory once the fixed window is configured for launch.
  if (validFounderWindow(FOUNDER_EXPERIMENT)) assert.equal(founderDestinationsReady(), true);
});

test("only repo cards replace the original promotion, retaining the original fallback", () => {
  const source = readFileSync("components/coderabbit-banner.tsx", "utf8");
  assert.match(source, /placement === "repo-card"/);
  assert.match(source, /FounderExperimentSlot fallback=\{original\}/);
  assert.match(source, /const original = <OriginalCodeRabbitBanner/);
  assert.match(source, /https:\/\/coderabbit.link\/filiksyos-destaw/);
  assert.match(readFileSync("components/website-reverse-page.tsx", "utf8"), /placement="website-card"/);
});

test("status is uncached and time-gated on the server", () => {
  const source = readFileSync("app/api/founder-experiment/route.ts", "utf8");
  assert.match(source, /dynamic = "force-dynamic"/);
  assert.match(source, /serverNow = Date.now\(\)/);
  assert.match(source, /founderDestinationsReady\(\) && founderExperimentActive\(serverNow\)/);
  assert.match(source, /no-store/);
});

test("open tabs expire and recheck on focus, visibility, and bfcache return", () => {
  const source = readFileSync("components/founder-card.tsx", "utf8");
  assert.match(source, /cutoffTimer = setTimeout\(\(\) => setActive\(false\)/);
  for (const event of ["visibilitychange", "focus", "pageshow"]) assert.ok(source.includes(`addEventListener("${event}"`));
  assert.match(source, /if \(!isLive\(\)\) \{ event.preventDefault\(\); setActive\(false\); return; \}/);
});

test("impressions require visibility and dwell, clicks identify platform, and QA is labeled", () => {
  const source = readFileSync("components/founder-card.tsx", "utf8");
  assert.match(source, /entry.intersectionRatio >= 0.5/);
  assert.match(source, /document.visibilityState === "visible"/);
  assert.match(source, /\}, 1000\)/);
  assert.match(source, /impressionSent.current = true/);
  assert.match(source, /trackFounder\("Founder Card Impression"\)/);
  assert.match(source, /trackFounder\("Founder Social Click", platform\)/);
  assert.match(source, /qa: new URLSearchParams\(window.location.search\).get\("founder_qa"\) === "1"/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|document.cookie/);
  assert.ok(readFileSync("public/founder/filiksyos.png").length > 100);
});
