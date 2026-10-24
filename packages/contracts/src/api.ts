import { z } from "zod";

import {
  actorSchema,
  applicationCommentSchema,
  applicationDealSchema,
  applicationHandoffSchema,
  applicationHoldSchema,
  applicationStageSchema,
  clientReplySchema,
  offerTermsSchema,
  rejectReasonSchema,
  urgentRequestSchema,
  urgentSourceSchema,
  waitingOnSchema,
  workflowStatusSchema,
} from "./application-parts.ts";
import {
  autonomyCaseSchema,
  autonomyConfigSchema,
  autonomyLevelSchema,
  autonomyMetricsSchema,
} from "./autonomy.ts";
import {
  companyProfileResponseSchema,
  companySourceSnapshotSchema,
} from "./company-profile.ts";
import {
  type CreditProduct,
  type CreditProductId,
  creditProductIdSchema,
  creditProductSchema,
  creditPurposeSchema,
  productViolations,
} from "./product-catalog.ts";

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
  case: autonomyCaseSchema.nullable().default(null),
  eligibility: z.object({
    eligible: z.boolean(),
    reasons: z.array(z.string()),
    controlWindow: z.enum(["open", "closed"]),
  }),
});
export type ApiAutonomySnapshot = z.infer<typeof apiAutonomySnapshotSchema>;

export const autonomyPolicyActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pause"), reason: z.string().min(1).max(500) }),
  z.object({
    type: z.literal("set_level"),
    level: autonomyLevelSchema.extract(["new", "verified", "stable"]),
    reason: z.string().min(1).max(500),
  }),
]);
export const autonomyPolicyActionRequestSchema = z.object({
  action: autonomyPolicyActionSchema,
  idempotencyKey: z.string().min(8).max(128),
  expectedRevision: z.number().int().nonnegative(),
});
export type AutonomyPolicyActionRequest = z.infer<
  typeof autonomyPolicyActionRequestSchema
>;

export const apiAutonomyAuditSchema = z.object({
  productId: z.string(),
  policyId: z.string(),
  applicationId: z.string().nullable(),
  actorId: z.string(),
  actorRole: z.string(),
  action: z.string(),
  fromLevel: autonomyLevelSchema,
  toLevel: autonomyLevelSchema,
  reason: z.string(),
  idempotencyKey: z.string(),
  metricsBefore: autonomyMetricsSchema,
  metricsAfter: autonomyMetricsSchema,
  createdAt: z.string(),
});
export type ApiAutonomyAudit = z.infer<typeof apiAutonomyAuditSchema>;

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
  purpose: creditPurposeSchema,
  status: publicApplicationStatusSchema,
  offerKind: offerKindSchema.nullable(),
  checkJobId: z.string().nullable(),
  scoring: apiScoringSchema.nullable(),
  autonomyCase: autonomyCaseSchema.nullable().default(null),
  /** Условия, которые сотрудник предложил клиенту. */
  offer: offerTermsSchema.nullable().default(null),
  requestedInfo: z.array(z.string()).default([]),
  rejectReason: rejectReasonSchema.nullable().default(null),
  clientReply: clientReplySchema.nullable().default(null),
  deal: applicationDealSchema.nullable().default(null),
  /** Кто закрыл заявку отменой: клиент отказался от предложения или сотрудник её отменил. */
  cancelledBy: actorSchema.shape.kind.nullable().default(null),
  /** Рабочий статус до отмены; заполнен только для CANCELLED. */
  cancelledFrom: workflowStatusSchema.nullable().default(null),
  /** Запрос клиента на срочный режим и решение банка по нему. Автора решения клиенту не показываем. */
  urgentRequest: urgentRequestSchema
    .omit({ resolvedBy: true })
    .nullable()
    .default(null),
  /** Кто включил срочный режим сейчас: клиент или банк. Null, если режим выключен. */
  urgentBy: urgentSourceSchema.shape.by.nullable().default(null),
  /** Комментарии сотрудника с видимостью client; внутренние сюда не попадают. */
  clientComments: z.array(applicationCommentSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApiApplication = z.infer<typeof apiApplicationSchema>;

/** Управленческое состояние заявки: видно только сотрудникам. */
export const apiApplicationManagementSchema = z.object({
  /** Бизнес-статус без учёта блокировки: публичный BLOCKED его скрывает. */
  businessStatus: workflowStatusSchema,
  stage: applicationStageSchema,
  waitingOn: waitingOnSchema,
  blocker: z.string(),
  hold: applicationHoldSchema.nullable(),
  urgent: z.boolean(),
  urgentReason: z.string().nullable(),
  urgentSource: urgentSourceSchema.nullable(),
  urgentRequest: urgentRequestSchema.nullable(),
  assigneeId: z.string().nullable(),
  handoff: applicationHandoffSchema.nullable(),
  comments: z.array(applicationCommentSchema),
});
export type ApiApplicationManagement = z.infer<
  typeof apiApplicationManagementSchema
>;

/** Строка очереди АРМ: заявка и её управленческое состояние. */
export const apiQueueItemSchema = z.object({
  application: apiApplicationSchema,
  management: apiApplicationManagementSchema,
});
export type ApiQueueItem = z.infer<typeof apiQueueItemSchema>;

export const apiApplicationContextSchema = z.object({
  application: apiApplicationSchema,
  management: apiApplicationManagementSchema,
  companyProfile: companyProfileResponseSchema,
  checks: z.array(apiCheckSnapshotSchema),
  decision: apiDecisionSchema.nullable(),
  autonomy: apiAutonomySnapshotSchema,
  audit: z.array(apiAuditEventSchema),
});
export type ApiApplicationContext = z.infer<typeof apiApplicationContextSchema>;

export const apiCreateApplicationSchema = z
  .object({
    inn: z.string().regex(/^\d{10,12}$/),
    productId: apiProductIdSchema,
    amount: z.number().positive(),
    termMonths: z.number().int().positive(),
    purpose: creditPurposeSchema,
    idempotencyKey: z.string().min(8).max(128),
  })
  .superRefine((input, ctx) => {
    for (const violation of productViolations(input)) {
      ctx.addIssue({
        code: "custom",
        path: [violation.path],
        message: violation.message,
      });
    }
  });
export type ApiCreateApplication = z.infer<typeof apiCreateApplicationSchema>;

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

export const employeeSessionRequestSchema = z.object({
  employeeId: z.string().min(1),
});
export type EmployeeSessionRequest = z.infer<
  typeof employeeSessionRequestSchema
>;

export const demoSessionSchema = z.object({
  account: demoAccountApiSchema,
  role: z.enum(["client", "analyst", "lead"]),
});
export type DemoSession = z.infer<typeof demoSessionSchema>;
