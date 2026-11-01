# Renaissance Customer Engine
## Independent product specification, v0.1

**Umbrella:** The Digital Renaissance  
**Engineering identity:** DegenDev  
**Working product name:** Renaissance Customer Engine  
**Positioning:** A measurable customer-acquisition and ascension system for expert-led service businesses.  
**Tagline:** Turn attention into evidence. Evidence into customers.

## 1. Product thesis

Implement an ethical, measurable version of the low-ticket buyer-filter model. Help an expert business package a useful entry product, acquire paid customers, deliver promised value, qualify fit and intent, and make a relevant premium-service invitation. Do not imply guaranteed customer volume, income, or automatic premium conversion.

## 2. Initial customer segment

Start with expert-led service businesses that can create a useful, bounded digital product and have a legitimate premium service behind it. Online fitness coaches are one possible vertical template, not a market-size claim. Validate one narrow ICP before building generic tooling.

## 3. Differentiation

- Contribution-margin dashboard, not vanity ROAS.
- Explicit buyer-fit scoring separate from purchase amount.
- Evidence-backed claims and verified case studies.
- Consent, privacy, and preference centre included from day one.
- Payment and fulfilment reconciliation.
- Cohort analysis and payback visibility.
- Transparent automation with opt-out and human review.
- Reusable vertical playbooks without copying competitor course material.

## 4. Customer journey

1. Prospect lands via attributable campaign.
2. Prospect reads a vertical-specific offer page.
3. Prospect purchases an entry product or chooses a free educational path.
4. Payment provider webhook is signature-verified and idempotently recorded.
5. Entitlement is granted and delivery is sent.
6. Product onboarding requests a small, useful action.
7. Optional qualification asks goal, challenge, timeframe, support preference and budget range.
8. Rules engine calculates fit and readiness independently from spend.
9. Suitable customers can request a consultation or review a premium service.
10. Other customers receive only consented educational follow-up.
11. Customer can manage preferences, access, support and data rights.

## 5. Product modules

### A. Offer Workshop
- ICP and problem definition.
- Entry-product idea generator.
- Value/effort assessment.
- Price and packaging hypotheses.
- Claims substantiation checklist.
- Offer-page outline and CTA map.

### B. Funnel Builder
- Landing page, checkout hand-off, confirmation and delivery pages.
- Mobile-first, fast, accessible templates.
- Per-campaign URL and UTM capture.
- Versioned copy and experiment assignment.
- Independent brand system and original creative.

### C. Buyer Intelligence
- Purchase event as one signal, not a lead score by itself.
- Fit inputs: problem match, goal, geography, timeframe, support need, budget readiness.
- Intent inputs: product usage, requested support, application, consultation request.
- Explainable score with reason codes.
- Human approval for high-ticket outreach.

### D. Fulfilment and Lifecycle
- Entitlement records.
- Secure delivery links.
- Onboarding sequences.
- Support requests.
- Refund and dispute state handling.
- Access revocation rules.

### E. Revenue Intelligence
- Gross receipts and settled receipts.
- Refunds, chargebacks, taxes, processor fees, ad spend and variable delivery cost.
- Front-end contribution and blended contribution.
- AOV and upsell take rate.
- CAC by cohort and campaign.
- Premium conversion and payback.
- Scenario model for unproven assumptions.

### F. Consent and Governance
- Separate transactional and marketing permissions.
- Consent timestamp, source, copy version and purpose.
- Preference centre and unsubscribe.
- Data export and deletion workflow.
- Configurable retention.
- Role-based access and audit log.

## 6. Suggested architecture

Prefer a small, maintainable modular application first:
- Frontend: Next.js / React, TypeScript.
- Backend: Next.js route handlers or a small Node service.
- Database: managed PostgreSQL. Avoid Supabase as a default dependency.
- Payments: Stripe or another provider selected per jurisdiction, with signed webhooks.
- Email: provider with transactional and marketing separation.
- Jobs: managed queue or scheduled jobs for retries, reconciliation and lifecycle events.
- Analytics: first-party event model plus consent-gated ad-platform integrations.
- Hosting: Vercel or Netlify, selected after deployment constraints are validated.

No database provider or vendor should be hardwired into the domain model. Use adapters and migrations.

## 7. Core entities

Workspace, User, Role, Prospect, ConsentRecord, AttributionTouch, Campaign, Offer, Product, Order, OrderLine, PaymentEvent, Refund, Dispute, Entitlement, DeliveryEvent, Qualification, Opportunity, Conversation, Experiment, AuditEvent.

Payment events must be append-only and idempotent. Order status is a derived state reconciled against the payment provider.

## 8. Event taxonomy

page_view, offer_view, checkout_started, payment_succeeded, payment_failed, order_refunded, dispute_opened, entitlement_granted, product_accessed, onboarding_completed, qualification_submitted, premium_offer_viewed, consultation_requested, opportunity_accepted, opportunity_declined, marketing_opt_in, marketing_opt_out.

Each event requires event ID, timestamp, workspace, anonymous/session identifier where lawful, source, campaign attribution, schema version and minimal payload.

## 9. MVP acceptance criteria

- Prospect can view an original offer page and reach a hosted test checkout.
- Test payment webhooks are signature verified and safe against duplicate delivery.
- Successful test payment creates one order and one entitlement.
- Failed/refunded test payment produces the correct state and access outcome.
- Marketing messages are blocked without valid consent.
- UTM values are stored without overwriting original first-touch data.
- Dashboard calculates gross receipts, net receipts, ad spend and contribution margin separately.
- Fit and intent scores show reason codes and never use spend as a proxy for affordability.
- Customer can unsubscribe and request account/data actions.
- Automated tests cover payment idempotency, webhook replay, consent gating, refunds, access, attribution and scoring.
- No live payment, ad spend, or outbound marketing is activated until explicitly configured and approved.

## 10. Commercial model hypotheses

Test, do not assume:
- Entry product: $19 to $49.
- Optional complementary order bump: $9 to $29.
- Core implementation toolkit: $79 to $199.
- Premium service: bespoke, scoped and priced to delivery capacity.
- Optional software subscription only after the tool demonstrates recurring value.

Do not use fake crossed-out values, fabricated bonuses, fake countdown timers, unverified testimonials, or guaranteed results.

## 11. Build sequence

1. Validate one ICP and one painful recurring problem.
2. Create the entry product and a premium service that logically follows from it.
3. Build a single landing page and checkout test path.
4. Instrument payment, fulfilment, consent and contribution margin.
5. Test with a small, capped pilot budget.
6. Review at least one meaningful cohort window.
7. Improve the offer before increasing traffic.
8. Generalize the workflow only after repeatability is demonstrated.

## 12. Out of scope for v0.1

- Fully autonomous high-ticket sales outreach.
- Ad-account auto-spend or autonomous campaign scaling.
- Scraping personal data from social networks.
- Guaranteed revenue claims.
- White-label marketplace.
- Multi-tenant enterprise permissions before core lifecycle is stable.
