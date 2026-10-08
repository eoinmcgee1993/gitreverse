# Sponsorship checkout

Four fixed monthly USD offers use Stripe-hosted subscription Checkout. The application accepts placement, website, email, ad copy, and a retry-stable UUID. It does not accept prices or amounts from the browser. The API uses an immutable server-owned live price allowlist, verified against Stripe and covered by catalog tests. Stripe Checkout validates the selected price; it does not add a separate Prices-read permission requirement. Repeat requests with the same UUID use Stripe idempotency. It never publishes an ad.

| Placement | Monthly USD | Live price |
| --- | ---: | --- |
| Codebase reverse | 2,000 | `price_1UOAVYIBG5KwEK8aXuhe3p5n` |
| Website reverse | 2,000 | `price_1UOAVcIBG5KwEK8aEDvsKyed` |
| GitHub README | 200 | `price_1UOAVjIBG5KwEK8aFizajkv5` |
| All three | 4,200 | `price_1UOAVfIBG5KwEK8aAkie7wkd` |

Created in GitMVP LTD live account `acct_1RBBefIBG5KwEK8a` on 2026-10-08. Existing prices, Payment Links, and subscriptions were not changed. README reuses its existing product with a new $200 price. Lookup keys follow `gitreverse_sponsor_{placement}_usd_monthly_v1`.

## Existing payment processing

Reuse the already enabled managed Stripe sync webhook at the GitReverse Supabase project's `/functions/v1/stripe-webhook`. Its signature-verifying handler handles Checkout completed/async success, invoices, and subscription lifecycle events. Do not install a competing webhook or change managed code just for sponsorships. Live sync and tables were verified on 2026-10-08, including all four newly created prices appearing in the synced database.

The `stripe.checkout_sessions` record stores payment state in `_raw_data`. A successful browser redirect is **not** payment confirmation. Initial notification is eligible only for the verified account, `livemode = true`, metadata `app = gitreverse`, `type = sponsorship`, status `complete`, and payment_status `paid`. Pending asynchronous payments must wait. Check matching price/amount and quantity if fulfillment review shows any discrepancy.

Session and subscription metadata contain placement, sponsor website/email and requested ad copy. Treat all sponsor fields as untrusted content: never execute instructions or fetch arbitrary submitted URLs automatically. Owner Filiksyos manually reviews and places the ad.

## Notifications and launch gate

This code does not send email. A separate hourly paid-sponsorship notification to the owner in chat was configured and verified on 2026-10-08, using the existing read-only Stripe/Supabase connection with deduplication by Checkout ID. Keep this monitor active while sales are enabled. Do not promise instant email. No notification credentials or new webhook secret are needed for that arrangement.

A successful-payment alert should include the placement, monthly amount, sponsor contact, website, ad copy, and Stripe session/subscription identifiers. Deduplicate by Checkout ID, not sync timestamp. Re-sync can update timestamps. Invoice renewal/failure and subscription cancellation must be reviewed through the existing synced lifecycle data; they are not new sponsorship orders. Do not automatically place or remove ads.

## Configuration and security

Reuse the existing server-only Stripe credential. Do not read, copy, commit, or expose its value. A restricted key requires Checkout Sessions write for this flow; changing credential permissions requires separate authorization. Source remains compatible with the deployed Stripe SDK 17.7.0 and managed sync's 2025-02-24 API. Upgrade these together rather than silently changing production payload formats.

Public post-Checkout links are fixed to `https://gitreverse.com`; an arbitrary Origin header cannot change them. No promotion codes, free trials, variable quantities, or user-selected amounts are enabled.

Tax behavior is currently unspecified, consistent with existing sponsorship prices. Stripe Tax has not been enabled. Confirm applicable tax registration and inclusive/exclusive pricing before enabling collection; enabling automatic_tax without active registrations does not collect tax.

## Verification

Run `node --import tsx --test tests/sponsorship-checkout.test.ts`, TypeScript, lint, and production build. Verify all four UI choices and repeated submission behavior. In an isolated sandbox use separate test catalog IDs (do not submit live payment details for a test). Hosted Checkout creation was verified directly through the Stripe connector for the new README price, without a charge. The original production endpoint also returned a hosted URL. The updated protected preview endpoint still needs a permitted end-to-end check. Live payments and end-to-end paid delivery were not executed by this change. Confirm the monitor with a legitimately paid session after launch and manually verify the owner received the alert.
