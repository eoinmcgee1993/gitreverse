import test from "node:test";
import assert from "node:assert/strict";
import type Stripe from "stripe";
import { parseSponsorshipInput, sponsorshipSessionParams, SPONSORSHIP_PRICE_IDS, validSponsorshipPrice, createSponsorshipSession, safeStripeFailure } from "../lib/sponsorship-checkout";
import { SPONSORSHIP_PLACEMENTS } from "../lib/sponsorship-config";
const base = { placement: "codebase", website: "example.com", email: "Owner@Example.com", adCopy: "Ship faster", requestId: "aba712c6-062e-4058-987f-7708b34af71d" };
test("normalizes valid input and rejects unknown placement/client supplied pricing", () => {
  assert.equal(parseSponsorshipInput(base).website, "https://example.com/");
  assert.equal(parseSponsorshipInput(base).email, "owner@example.com");
  assert.throws(() => parseSponsorshipInput({ ...base, placement: "other" }));
  assert.throws(() => parseSponsorshipInput(null));
  assert.throws(() => parseSponsorshipInput([]));
});
test("rejects unsafe URLs, malformed details, and missing idempotency token", () => {
  for (const website of ["javascript:alert(1)", "https://user:password@example.com", "file:///etc/passwd", "localhost", "a".repeat(451)]) assert.throws(() => parseSponsorshipInput({ ...base, website }));
  for (const adCopy of ["abcd", "a".repeat(121), "line\nbreak"]) assert.throws(() => parseSponsorshipInput({ ...base, adCopy }));
  assert.throws(() => parseSponsorshipInput({ ...base, requestId: "" }));
  assert.throws(() => parseSponsorshipInput({ ...base, email: "bad" }));
});
test("all four placements use server prices and identical session/subscription metadata", () => {
  for (const placement of Object.keys(SPONSORSHIP_PLACEMENTS) as (keyof typeof SPONSORSHIP_PLACEMENTS)[]) {
    const input = parseSponsorshipInput({ ...base, placement, amount: 1, priceId: "attacker" });
    const params = sponsorshipSessionParams(input);
    assert.equal(params.mode, "subscription");
    assert.deepEqual(params.line_items, [{ price: SPONSORSHIP_PRICE_IDS[placement], quantity: 1 }]);
    assert.deepEqual(params.metadata, params.subscription_data?.metadata);
    assert.equal(params.metadata?.placement, placement);
    assert.equal(params.success_url, "https://gitreverse.com/sponsor?checkout=success");
    assert.equal(params.payment_method_types, undefined);
    assert.equal(params.allow_promotion_codes, undefined);
  }
});
test("price verification fails closed for incorrect amount, recurrence, mode or activity", () => {
  const price = { id: SPONSORSHIP_PRICE_IDS.codebase, active: true, livemode: true, currency: "usd", unit_amount: 200000, type: "recurring", recurring: { interval: "month", interval_count: 1, usage_type: "licensed" } } as Stripe.Price;
  assert.equal(validSponsorshipPrice(price, "codebase"), true);
  for (const patch of [{unit_amount: 1}, {active:false}, {livemode:false}, {currency:"eur"}, {recurring:null}, {id:"other"}]) assert.equal(validSponsorshipPrice({...price,...patch} as Stripe.Price,"codebase"),false);
});

test("checkout creation needs only Checkout permission and preserves retry idempotency", async () => {
  const calls: { params: Stripe.Checkout.SessionCreateParams; options: Stripe.RequestOptions }[] = [];
  const stripe = { checkout: { sessions: { create: async (params: Stripe.Checkout.SessionCreateParams, options: Stripe.RequestOptions) => {
    calls.push({ params, options });
    return { url: "https://checkout.stripe.com/c/pay/example" };
  } } } } as unknown as Pick<Stripe, "checkout">;
  const input = parseSponsorshipInput(base);
  await createSponsorshipSession(stripe, input);
  await createSponsorshipSession(stripe, input);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0].options.idempotencyKey, `gitreverse-sponsor-${base.requestId}`);
  assert.deepEqual(calls[0].params.line_items, [{ price: SPONSORSHIP_PRICE_IDS.codebase, quantity: 1 }]);
});
test("safe Stripe diagnostics never include raw error or personal data", () => {
  const safe = safeStripeFailure({ type: "StripePermissionError", statusCode: 403, code: "secret-value", message: "customer@example.com", raw: { apiKey: "secret" } });
  assert.deepEqual(safe, { stage: "create_checkout", type: "StripePermissionError", code: "unclassified", status: 403 });
  assert.equal(JSON.stringify(safe).includes("secret"), false);
  assert.equal(safeStripeFailure({ type: "customer@example.com", statusCode: NaN }).type, "unknown");
});
