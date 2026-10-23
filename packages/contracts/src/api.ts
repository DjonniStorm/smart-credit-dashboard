import { z } from "zod";

import {
  autonomyConfigSchema,
  autonomyMetricsSchema,
} from "./autonomy.js";
import {
  companyProfileResponseSchema,
  companySourceSnapshotSchema,
} from "./company-profile.js";

import {
  type CreditProduct,
  type CreditProductId,
  creditProductIdSchema,
  creditProductSchema,
} from "./product-catalog.js";

const apiOfferTermsSchema = z.object({
  productId: creditProductIdSchema,
  amount: z.number(),
  termMonths: z.number().int(),
  ratePct: z.number(),
});

export const apiProductIdSchema = creditProductIdSchema;
export type ApiProductId = CreditProductId;

export const apiCreditProductSchema = creditProductSchema;
export type ApiCreditProduct = CreditProduct;

export const apiProductCatalogSchema = z.object({
  keyRate: z.number(),
  keyRateDate: z.string(),
  products: z.array(apiCreditProductSchema),
});
export type ApiProductCatalog = z.infer<typeof apiProductCatalogSchema>;

export const publicApplicationStatusSchema = z.enum([
  "DRAFT",
  "SUBMITTED",
  "VALIDATING",
  "UNDER_REVIEW",
  "NEEDS_INFO",
  "OFFERED",
  "ACCEPTED",
  "SIGNING",
  "FUNDED",
  "REJECTED",
  "CANCELLED",
  "BLOCKED",
]);
export type PublicApplicationStatus = z.infer<
  typeof publicApplicationStatusSchema
>;

export const offerKindSchema = z.enum(["initial", "counter"]);
export type OfferKind = z.infer<typeof offerKindSchema>;

export const apiScoreFactorSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  impact: z.number(),
  source: z.string().optional(),
});
export type ApiScoreFactor = z.infer<typeof apiScoreFactorSchema>;

export const apiScoringSchema = z.object({
  score: z.number().min(0).max(100),
  model: z.string(),
  modelVersion: z.string(),
  grade: z.enum(["A", "B", "C", "D"]),
  riskBand: z.enum(["low", "moderate", "high"]),
  pd: z.number().min(0).max(1),
  healthIndex: z.number().min(0).max(100),
  readinessIndex: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  recommendation: z.enum([
    "approve",
    "counter_offer",
    "request_info",
    "manual_review",
    "reject",
  ]),
  factors: z.array(apiScoreFactorSchema),
  reasons: z.array(z.string()),
  nextActions: z.array(z.string()),
});
export type ApiScoring = z.infer<typeof apiScoringSchema>;

export const apiDecisionRuleSchema = z.object({
  id: z.string(),
  outcome: z.enum(["pass", "attention", "fail"]),
  detail: z.string(),
});
export type ApiDecisionRule = z.infer<typeof apiDecisionRuleSchema>;

export const apiDecisionSchema = z.object({
  recommendation: apiScoringSchema.shape.recommendation,
  reasons: z.array(z.string()),
  rules: z.array(apiDecisionRuleSchema),
  autonomyMode: z.enum(["shadow", "assist", "controlled"]),
});
export type ApiDecision = z.infer<typeof apiDecisionSchema>;

export const apiCheckSnapshotSchema = companySourceSnapshotSchema;
export type ApiCheckSnapshot = z.infer<typeof apiCheckSnapshotSchema>;

export const apiAuditEventSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  kind: z.string(),
  at: z.string(),
  metadata: z.record(z.string(), z.unknown()),
});
export type ApiAuditEvent = z.infer<typeof apiAuditEventSchema>;

export const apiAutonomySnapshotSchema = z.object({
  config: autonomyConfigSchema,
  metrics: autonomyMetricsSchema,
  eligibility: z.object({
    eligible: z.boolean(),
    reasons: z.array(z.string()),
    controlWindow: z.enum(["open", "closed"]),
  }),
});
export type ApiAutonomySnapshot = z.infer<
  typeof apiAutonomySnapshotSchema
>;

export const apiJobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
]);
export type ApiJobStatus = z.infer<typeof apiJobStatusSchema>;

export const apiApplicationSchema = z.object({
  id: z.string(),
  number: z.string(),
  inn: z.string().regex(/^\d{10,12}$/),
  productId: apiProductIdSchema,
  amount: z.number().positive(),
  termMonths: z.number().int().positive(),
  purpose: z.string(),
  status: publicApplicationStatusSchema,
  offerKind: offerKindSchema.nullable(),
  offer: apiOfferTermsSchema.nullable().default(null),
  requestedInfo: z.array(z.string()).default([]),
  rejectReason: z.string().nullable().default(null),
  assigneeId: z.string().nullable().default(null),
  urgent: z.boolean().default(false),
  urgentReason: z.string().nullable().default(null),
  comments: z.array(z.object({
    id: z.string(),
    applicationId: z.string(),
    at: z.string(),
    author: z.object({ kind: z.enum(["system", "employee", "client"]), name: z.string() }),
    visibility: z.enum(["client", "internal", "handoff"]),
    body: z.string(),
  })).default([]),
  checkJobId: z.string().nullable(),
  scoring: apiScoringSchema.nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApiApplication = z.infer<typeof apiApplicationSchema>;

export const apiApplicationContextSchema = z.object({
  application: apiApplicationSchema,
  companyProfile: companyProfileResponseSchema,
  checks: z.array(apiCheckSnapshotSchema),
  decision: apiDecisionSchema.nullable(),
  autonomy: apiAutonomySnapshotSchema,
  audit: z.array(apiAuditEventSchema),
});
export type ApiApplicationContext = z.infer<
  typeof apiApplicationContextSchema
>;

export const apiCreateApplicationSchema = z.object({
  inn: z.string().regex(/^\d{10,12}$/),
  productId: apiProductIdSchema,
  amount: z.number().positive(),
  termMonths: z.number().int().positive(),
  purpose: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8).max(128),
});
export type ApiCreateApplication = z.infer<
  typeof apiCreateApplicationSchema
>;

export const apiApplicationResponseSchema = z.object({
  application: apiApplicationSchema,
  checkJob: z.object({
    id: z.string(),
    status: apiJobStatusSchema,
  }),
});
export type ApiApplicationResponse = z.infer<
  typeof apiApplicationResponseSchema
>;

export const apiCheckRequestSchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
});
export type ApiCheckRequest = z.infer<typeof apiCheckRequestSchema>;

export const apiJobSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  status: apiJobStatusSchema,
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  result: apiScoringSchema.nullable(),
});
export type ApiJob = z.infer<typeof apiJobSchema>;

export const demoAccountApiSchema = z.object({
  id: z.string(),
  person: z.string(),
  role: z.string(),
  company: z.object({
    inn: z.string().regex(/^\d{10,12}$/),
    ogrn: z.string(),
    form: z.enum(["ip", "ooo"]),
    name: z.string(),
    registeredAt: z.string(),
    okved: z.string(),
    okvedName: z.string(),
    address: z.string(),
    head: z.string(),
  }),
  scenario: z.string(),
  knownFinancials: z.object({
    revenueLastYear: z.number().nonnegative(),
    avgMonthlyTurnover: z.number().nonnegative(),
    monthlyDebtPayments: z.number().nonnegative(),
    employees: z.number().int().nonnegative(),
  }),
});
export type DemoAccountApi = z.infer<typeof demoAccountApiSchema>;

export const demoSessionSchema = z.object({
  account: demoAccountApiSchema,
  role: z.enum(["client", "analyst", "lead"]),
});
export type DemoSession = z.infer<typeof demoSessionSchema>;
