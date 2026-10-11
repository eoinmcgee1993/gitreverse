import { z } from "zod";

export const evidenceConfidenceSchema = z.enum(["high", "medium", "low"]);
export const claimAssessmentSchema = z.enum([
  "supported",
  "partially_supported",
  "unverified",
  "contradicted",
]);

export const sourceRecordSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  sourceType: z.enum([
    "target_page",
    "official_documentation",
    "primary_research",
    "systematic_review",
    "guideline",
    "other",
  ]),
  accessedAt: z.string().datetime({ offset: true }),
  publicationDate: z.string().optional(),
  notes: z.string().min(1),
});

export const evidenceRecordSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  sourceUrl: z.string().url(),
  excerpt: z.string().min(1).max(2000),
  observation: z.string().min(1),
  observedAt: z.string().datetime({ offset: true }),
  confidence: evidenceConfidenceSchema,
  evidenceKind: z.enum(["direct_observation", "source_summary", "inference"]),
  limitations: z.array(z.string()).default([]),
});

export const claimRecordSchema = z.object({
  id: z.string().min(1),
  claim: z.string().min(1),
  assessment: claimAssessmentSchema,
  evidenceIds: z.array(z.string()).default([]),
  sourceIds: z.array(z.string()).default([]),
  rationale: z.string().min(1),
  safeWording: z.string().min(1),
  requiresHumanReview: z.boolean().default(true),
});

export const researchDossierSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  targetUrl: z.string().url(),
  researchedAt: z.string().datetime({ offset: true }),
  summary: z.string().min(1),
  sources: z.array(sourceRecordSchema).min(1),
  evidence: z.array(evidenceRecordSchema),
  claims: z.array(claimRecordSchema),
  unknowns: z.array(z.string()),
  limitations: z.array(z.string()),
}).superRefine((dossier, ctx) => {
  const sourceIds = new Set(dossier.sources.map((source) => source.id));
  const evidenceIds = new Set(dossier.evidence.map((item) => item.id));

  dossier.evidence.forEach((item, index) => {
    if (!sourceIds.has(item.sourceId)) {
      ctx.addIssue({
        code: "custom",
        path: ["evidence", index, "sourceId"],
        message: `Unknown sourceId: ${item.sourceId}`,
      });
    }
  });

  dossier.claims.forEach((claim, index) => {
    claim.sourceIds.forEach((id) => {
      if (!sourceIds.has(id)) {
        ctx.addIssue({
          code: "custom",
          path: ["claims", index, "sourceIds"],
          message: `Unknown sourceId: ${id}`,
        });
      }
    });
    claim.evidenceIds.forEach((id) => {
      if (!evidenceIds.has(id)) {
        ctx.addIssue({
          code: "custom",
          path: ["claims", index, "evidenceIds"],
          message: `Unknown evidenceId: ${id}`,
        });
      }
    });
    if (claim.assessment === "supported" && claim.sourceIds.length === 0 && claim.evidenceIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["claims", index, "assessment"],
        message: "A supported claim must cite at least one source or evidence record.",
      });
    }
  });
});

export type ResearchDossier = z.infer<typeof researchDossierSchema>;
export type SourceRecord = z.infer<typeof sourceRecordSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type ClaimRecord = z.infer<typeof claimRecordSchema>;
