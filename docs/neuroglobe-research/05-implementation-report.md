# Implementation report

**Date:** 2026-10-12 UTC  
**Repository:** https://github.com/eoinmcgee1993/gitreverse  
**Feature branch:** `feature/neuroglobe-evidence-product`

## 1. What was inspected

- Public repository metadata and default branch.
- `README.md`, `package.json`, `tsconfig.json`, `eslint.config.mjs`, `app/page.tsx`, `components/reverse-prompt-home.tsx`, `app/api/reverse-prompt/route.ts`, `app/website/[slug]/page.tsx`, `components/website-reverse-page.tsx`, `app/api/reverse-website/route.ts`, `lib/parse-website-input.ts`, `lib/system-prompt.ts`, and an existing Node test.
- Public Neuroglobe homepage and product page.
- REA setup and browser-observation documentation.

## 2. Verified existing capabilities

- Next.js App Router, React 19, TypeScript and Tailwind CSS.
- Existing codebase prompt workflow and a website reverse workflow already exposed by the UI and `/api/reverse-website`.
- Five quick-LLM provider options documented in README.
- Existing Zod dependency, Node's test runner, and `tsx` development dependency.
- Existing lint/build scripts and a focused test script.

Reusable components: URL parsing/slug validation, existing website reverse pipeline, provider configuration, markdown display, existing Zod dependency, and Node test infrastructure.

## 3. Gaps identified

- The existing website workflow synthesizes a prompt, rather than a typed evidence dossier with source excerpts, timestamps, confidence, uncertainty and claim-level citations.
- The current user-facing result contract is prompt-oriented; structured research should be additive and should not silently alter existing output.
- REA's MCP/browser observation is a local-agent capability. The hosted session could review docs but could not inspect the user's local installation or run a browser capture.
- Existing test commands include a game kernel test and title test; no dedicated provenance/schema test was documented in package scripts at initial inspection.
- Full lint/build/tests cannot be run from the GitHub connector alone.

## 4. Proposed implementation

- Add a structured Zod schema for research records, claim status, provenance and unresolved unknowns.
- Add a bounded retry helper for transient failures with caller-controlled retry eligibility and injectable sleep for deterministic tests.
- Add unit tests for valid/invalid records, contradictory evidence, missing source provenance, retry success and retry exhaustion.
- Keep research/product assets under `docs/neuroglobe-research/` and avoid modifying existing routes until local integration tests prove compatibility.
- Add a future additive endpoint or job that collects only permitted public-page observations, validates model output, stores provenance, and refuses to label claims as supported without source records.
- Add CI for lint, typecheck, schema tests and build once the branch is checked out and secrets/config are available.

## 5. What was implemented on the branch

The branch now contains:
- Research dossier and source/claim ledger.
- Original product specification and 30-day curriculum.
- Commercial copy, launch emails, social plan and validation hypotheses.
- Provenance schema and retry utility with tests.

No production route has been changed by this first pass. This is deliberate: wiring an untested research generator into the existing public endpoint could break the current website workflow or create SSRF, ungrounded claims, or data-handling issues.

## 6. Test status

**Local tests not executed in this hosted session.** GitHub Actions was configured to run schema tests, type-check, lint and build. The first observed run stopped at `pnpm/action-setup` before any project checks ran; the workflow was corrected to pin pnpm 9.15.9. A successful follow-up run has not yet been verified, so no test is reported as passing. The GitHub connector does not provide a checked-out working tree or local Node execution. Do not interpret the presence of test files as passing tests. Required commands from a checkout:

```bash
pnpm install --frozen-lockfile
pnpm exec tsx --test scripts/test-research-output-schema.ts
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Existing environment variables may be required by some unrelated scripts; do not print or commit secrets. `scripts/test-titles.mjs` requires external API credentials and Supabase values according to its comments and is not needed for the schema unit tests.

## 7. Deployment status and next steps

The branch includes the research assets, schema, retry utility and test suite. A branch commit is not a production deployment. The Vercel project lookup returned no project named or matching `gitreverse`, and no GitReverse deployment was found in the deployment query. Therefore this branch has not been deployed. Do not create a duplicate Vercel project or deploy the main branch as a substitute. A Vercel project linked to this repository (or the intended deployment target) must be identified/configured before a preview deployment can be verified.

Recommended next steps:
1. Confirm branch contents and commit history.
2. Run the commands above in a real checkout.
3. Fix any failures and update this report with actual logs/results.
4. Verify the Vercel preview deployment, if configured.
5. Only then integrate a research endpoint behind a feature flag and test it against allowed public URLs.
6. Complete manual review of refund/terms pages and original scientific publications before product launch.
