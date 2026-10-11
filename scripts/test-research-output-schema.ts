import assert from "node:assert/strict";
import test from "node:test";
import { researchDossierSchema } from "../lib/research-output-schema";
import { withRetry } from "../lib/research-retry";

const validDossier = {
  schemaVersion: "1.0.0",
  targetUrl: "https://example.com",
  researchedAt: "2026-10-12T10:00:00Z",
  summary: "A public page was inspected.",
  sources: [{
    id: "S1",
    url: "https://example.com",
    title: "Example",
    sourceType: "target_page",
    accessedAt: "2026-10-12T10:00:00Z",
    notes: "Public page text.",
  }],
  evidence: [{
    id: "E1",
    sourceId: "S1",
    sourceUrl: "https://example.com",
    excerpt: "Example heading",
    observation: "The page has a heading.",
    observedAt: "2026-10-12T10:00:00Z",
    confidence: "high",
    evidenceKind: "direct_observation",
    limitations: [],
  }],
  claims: [{
    id: "C1",
    claim: "The page contains a heading.",
    assessment: "supported",
    evidenceIds: ["E1"],
    sourceIds: ["S1"],
    rationale: "Directly visible in the source.",
    safeWording: "The page displays a heading.",
    requiresHumanReview: false,
  }],
  unknowns: ["Checkout behaviour not inspected."],
  limitations: ["No runtime capture."],
};

test("accepts a dossier with traceable source and evidence IDs", () => {
  assert.equal(researchDossierSchema.safeParse(validDossier).success, true);
});

test("rejects supported claims without provenance", () => {
  const invalid = structuredClone(validDossier);
  invalid.claims[0].sourceIds = [];
  invalid.claims[0].evidenceIds = [];
  assert.equal(researchDossierSchema.safeParse(invalid).success, false);
});

test("rejects evidence referring to a missing source", () => {
  const invalid = structuredClone(validDossier);
  invalid.evidence[0].sourceId = "MISSING";
  assert.equal(researchDossierSchema.safeParse(invalid).success, false);
});

test("preserves unknowns and contradictions instead of requiring certainty", () => {
  const mixed = structuredClone(validDossier);
  mixed.claims.push({
    id: "C2",
    claim: "An unverified outcome claim.",
    assessment: "contradicted",
    evidenceIds: ["E1"],
    sourceIds: ["S1"],
    rationale: "The source does not establish this outcome.",
    safeWording: "Outcome is unknown.",
    requiresHumanReview: true,
  });
  mixed.unknowns.push("Original study context not resolved.");
  const result = researchDossierSchema.safeParse(mixed);
  assert.equal(result.success, true);
  if (result.success) {
    assert.ok(result.data.unknowns.includes("Original study context not resolved."));
    assert.equal(result.data.claims[1].assessment, "contradicted");
  }
});

test("retries a transient failure and returns on success", async () => {
  let calls = 0;
  const result = await withRetry(async () => {
    calls += 1;
    if (calls === 1) throw new Error("temporary");
    return "ok";
  }, {
    maxAttempts: 3,
    shouldRetry: () => true,
    sleep: async () => {},
  });
  assert.equal(result, "ok");
  assert.equal(calls, 2);
});

test("stops when a failure is not classified as retryable", async () => {
  let calls = 0;
  await assert.rejects(() => withRetry(async () => {
    calls += 1;
    throw new Error("permanent");
  }, {
    maxAttempts: 5,
    shouldRetry: () => false,
    sleep: async () => {},
  }), /permanent/);
  assert.equal(calls, 1);
});

test("surfaces the last failure after retry exhaustion", async () => {
  let calls = 0;
  await assert.rejects(() => withRetry(async () => {
    calls += 1;
    throw new Error("temporary");
  }, {
    maxAttempts: 2,
    shouldRetry: () => true,
    sleep: async () => {},
  }), /temporary/);
  assert.equal(calls, 2);
});
