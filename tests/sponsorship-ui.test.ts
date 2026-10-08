import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatSponsorPrice, isSponsorshipPlacement, SPONSORSHIP_PLACEMENTS, sponsorshipMonthLabel } from "../lib/sponsorship-config";
import { isPremiumOnlySubscription } from "../lib/premium-subscription";
import { STRIPE_PRICE_IDS } from "../lib/billing-config";

test("sponsorship catalog uses the approved monthly USD amounts", () => {
  assert.deepEqual(Object.values(SPONSORSHIP_PLACEMENTS).map((p) => p.amount), [200000, 200000, 20000, 420000]);
  assert.equal(formatSponsorPrice(SPONSORSHIP_PLACEMENTS.bundle.amount), "$4,200");
  assert.equal(isSponsorshipPlacement("bundle"), true);
  for (const value of ["__proto__", "constructor", "invalid", null, {}, 200]) assert.equal(isSponsorshipPlacement(value), false);
});

test("Premium cancellation excludes sponsorships, unknown prices and mixed subscriptions", () => {
  const subscription = (ids: string[], metadata = {}, has_more = false) => ({ metadata, items: { data: ids.map((id) => ({ price: { id } })), has_more } });
  assert.equal(isPremiumOnlySubscription(subscription([STRIPE_PRICE_IDS.starter])), true);
  assert.equal(isPremiumOnlySubscription(subscription([STRIPE_PRICE_IDS.partner])), false);
  assert.equal(isPremiumOnlySubscription(subscription([STRIPE_PRICE_IDS.readmeSponsor])), false);
  assert.equal(isPremiumOnlySubscription(subscription([STRIPE_PRICE_IDS.starter, "sponsor_price"])), false);
  assert.equal(isPremiumOnlySubscription(subscription([STRIPE_PRICE_IDS.starter], { type: "sponsorship" })), false);
  assert.equal(isPremiumOnlySubscription(subscription([STRIPE_PRICE_IDS.starter], {}, true)), false);
  assert.equal(isPremiumOnlySubscription(subscription([])), false);
});

test("website reverse replaces its sponsor and keeps codebase sponsorship unchanged", () => {
  const website = readFileSync("components/website-reverse-page.tsx", "utf8");
  const codebase = readFileSync("components/reverse-prompt-home.tsx", "utf8");
  const banner = readFileSync("components/afterpack-banner.tsx", "utf8");
  assert.match(website, /AfterpackBanner/);
  assert.doesNotMatch(website, /CodeRabbitBanner/);
  assert.match(codebase, /CodeRabbitBanner/);
  assert.match(banner, /https:\/\/afterpack.dev/);
  assert.match(banner, /Want to make your website irreversible\?/);
});

test("sponsor page uses owner snapshot and doesn't claim payment from a URL", () => {
  const page = readFileSync("components/partner-page.tsx", "utf8");
  assert.doesNotMatch(page, /35,000|1,000\+|3,000\+|Payment received|within 24 hours/);
  assert.match(page, /Once verified/);
});


test("sponsorship month label rolls forward in UTC", () => {
  assert.equal(sponsorshipMonthLabel(new Date("2026-10-08T07:00:00Z")), "October");
  assert.equal(sponsorshipMonthLabel(new Date("2026-10-31T23:59:59Z")), "October");
  assert.equal(sponsorshipMonthLabel(new Date("2026-11-01T00:00:00Z")), "November");
});

test("sponsor page has requested audience snapshot and logos, with contact only below checkout", () => {
  const page = readFileSync("components/partner-page.tsx", "utf8");
  assert.match(page, /Reach a massive/);
  assert.match(page, /250K\+/);
  assert.match(page, /visitors last month/);
  assert.doesNotMatch(page.split("</header>")[0], /mailto:/);
  for (const asset of ["coderabbit.png", "make-design.png", "arcumet.png"]) {
    assert.match(page, new RegExp(asset.replace(".", "\\.")));
    assert.ok(readFileSync(`public/sponsors/${asset}`).length > 100);
  }
  const route = readFileSync("app/partner/page.tsx", "utf8");
  assert.match(route, /permanentRedirect/);
  assert.match(route, /URLSearchParams/);
  assert.match(route, /\/sponsor/);
  assert.match(readFileSync("app/sponsor/page.tsx", "utf8"), /canonical: "\/sponsor"/);
});


test("home footer replaces Discord with the internal Advertise link", () => {
  const home = readFileSync("components/reverse-prompt-home.tsx", "utf8");
  const footer = home.slice(home.indexOf("<footer"), home.indexOf("</footer>"));
  assert.match(footer, /<Link\s+href="\/sponsor"[\s\S]*?>\s+Advertise\s+<\/Link>/);
  assert.doesNotMatch(footer, /Discord|discord\.gg/);
  assert.match(footer, /href="https:\/\/filiksyos.com"/);
});


test("website sponsor includes the official local Afterpack logo", () => {
  const banner = readFileSync("components/afterpack-banner.tsx", "utf8");
  assert.match(banner, /src="\/sponsors\/afterpack\.svg"/);
  assert.match(banner, /alt="Afterpack"/);
  const logo = readFileSync("public/sponsors/afterpack.svg", "utf8");
  assert.match(logo, /viewBox="0 0 152 34"/);
  assert.doesNotMatch(logo, /<script|<foreignObject|https?:\/\/(?!www\.w3\.org)/i);
});
