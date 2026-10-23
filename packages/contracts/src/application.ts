// Заявка глазами банка: этапы конвейера, проверки, скоринг, кредитное решение, журнал.
// Статус для клиента остаётся applicationStatusSchema из index.ts, этап здесь внутренний.
import { z } from "zod";

import { applicationStatusSchema, innSchema } from "@repo/contracts";

import { apiAutonomySnapshotSchema } from "./api.ts";
import {
  actorSchema,
  applicationCommentSchema,
  applicationHandoffSchema,
  applicationHoldSchema,
  applicationStageSchema,
  employeeRoleSchema,
  offerTermsSchema,
  rejectReasonSchema,
  waitingOnSchema,
} from "./application-parts.ts";
import {
  creditProductIdSchema,
  creditPurposeSchema,
} from "./product-catalog.ts";

export const legalFormSchema = z.enum(["ip", "ooo"]);
export type LegalForm = z.infer<typeof legalFormSchema>;

export {
  actorSchema,
  applicationCommentSchema,
  applicationHandoffSchema,
  applicationHoldSchema,
  applicationStageSchema,
  commentVisibilitySchema,
  employeeRoleSchema,
  offerTermsSchema,
  rejectReasonSchema,
  waitingOnSchema,
  type Actor,
  type ApplicationComment,
  type ApplicationHandoff,
  type ApplicationHold,
  type ApplicationStage,
  type CommentVisibility,
  type EmployeeRole,
  type OfferTerms,
  type RejectReason,
  type WaitingOn,
} from "./application-parts.ts";

export {
  creditProductIdSchema,
  creditProductSchema,
  type CreditProduct,
  type CreditProductId,
} from "./product-catalog.ts";

export const employeeSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: employeeRoleSchema,
  /** Сумма, до которой сотрудник одобряет сам. */
  approvalLimit: z.number(),
});
export type Employee = z.infer<typeof employeeSchema>;

export const applicantSchema = z.object({
  inn: innSchema,
  ogrn: z.string(),
  name: z.string(),
  legalForm: legalFormSchema,
  okved: z.string(),
  region: z.string(),
  registeredAt: z.string(),
  director: z.string(),
  /** Выручка за последние 12 месяцев со слов клиента, ₽. */
  annualRevenue: z.number(),
});
export type Applicant = z.infer<typeof applicantSchema>;

export const loanRequestSchema = z.object({
  productId: creditProductIdSchema,
  amount: z.number(),
  termMonths: z.number().int(),
  purpose: creditPurposeSchema,
});
export type LoanRequest = z.infer<typeof loanRequestSchema>;

/** Источник данных для обогащения заявки. */
export const checkSourceSchema = z.enum(["egrul", "fns", "bki"]);
export type CheckSource = z.infer<typeof checkSourceSchema>;

export const checkStateSchema = z.enum([
  "pending",
  "passed",
  "warning",
  "failed",
  "unavailable",
]);
export type CheckState = z.infer<typeof checkStateSchema>;

export const sourceCheckSchema = z.object({
  source: checkSourceSchema,
  state: checkStateSchema,
  summary: z.string(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })),
  requestedAt: z.string(),
  respondedAt: z.string().nullable(),
  /** Время ответа источника, мс. */
  responseMs: z.number().nullable(),
});
export type SourceCheck = z.infer<typeof sourceCheckSchema>;

/** Вклад одного признака в балл: плюс снижает риск, минус повышает. */
export const scoreFactorSchema = z.object({
  id: z.string(),
  label: z.string(),
  input: z.string(),
  points: z.number(),
  source: z.union([checkSourceSchema, z.literal("application")]),
});
export type ScoreFactor = z.infer<typeof scoreFactorSchema>;

export const riskBandSchema = z.enum(["low", "moderate", "high"]);
export type RiskBand = z.infer<typeof riskBandSchema>;

/** Скоринг: оценка риска, ещё не решение. */
export const scoringResultSchema = z.object({
  model: z.string(),
  modelVersion: z.string().optional(),
  base: z.number(),
  score: z.number(),
  band: riskBandSchema,
  grade: z.enum(["A", "B", "C", "D"]).optional(),
  pd: z.number().min(0).max(1).optional(),
  healthIndex: z.number().min(0).max(100).optional(),
  readinessIndex: z.number().min(0).max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
  recommendation: z
    .enum([
      "approve",
      "counter_offer",
      "request_info",
      "manual_review",
      "reject",
    ])
    .optional(),
  reasons: z.array(z.string()).optional(),
  nextActions: z.array(z.string()).optional(),
  factors: z.array(scoreFactorSchema),
  computedAt: z.string(),
});
export type ScoringResult = z.infer<typeof scoringResultSchema>;

export const ruleOutcomeSchema = z.enum(["pass", "attention", "fail"]);
export type RuleOutcome = z.infer<typeof ruleOutcomeSchema>;

export const decisionRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  outcome: ruleOutcomeSchema,
  detail: z.string(),
});
export type DecisionRule = z.infer<typeof decisionRuleSchema>;

export const recommendationSchema = z.enum([
  "approve",
  "counter_offer",
  "request_info",
  "manual_review",
  "reject",
]);
export type Recommendation = z.infer<typeof recommendationSchema>;

/** Кредитная логика: правила продукта поверх скоринга и проверок. */
export const creditDecisionSchema = z.object({
  recommendation: recommendationSchema,
  rules: z.array(decisionRuleSchema),
  terms: offerTermsSchema.nullable(),
  explanation: z.string(),
  computedAt: z.string(),
});
export type CreditDecision = z.infer<typeof creditDecisionSchema>;

/** Действие сотрудника по заявке. */
export const employeeActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("approve"), comment: z.string() }),
  z.object({
    type: z.literal("counter_offer"),
    terms: offerTermsSchema,
    comment: z.string(),
  }),
  z.object({
    type: z.literal("request_info"),
    items: z.array(z.string()).min(1),
    comment: z.string(),
  }),
  z.object({
    type: z.literal("reject"),
    reason: rejectReasonSchema,
    comment: z.string(),
  }),
  z.object({ type: z.literal("assign"), assigneeId: z.string() }),
  z.object({ type: z.literal("rerun_check"), source: checkSourceSchema }),
  z.object({
    type: z.literal("pause"),
    reason: z.string().min(1).max(500),
  }),
  z.object({
    type: z.literal("block"),
    reason: z.string().min(1).max(500),
  }),
  z.object({
    type: z.literal("resume"),
    comment: z.string().max(500).default(""),
  }),
  z.object({
    type: z.literal("comment"),
    visibility: z.enum(["client", "internal", "handoff"]),
    body: z.string().min(1).max(2_000),
  }),
  z.object({
    type: z.literal("handoff"),
    assigneeId: z.string(),
    summary: z.string().min(1).max(1_000),
    verifiedFacts: z.array(z.string()).max(20),
    openQuestions: z.array(z.string()).max(20),
    requestedItems: z.array(z.string()).max(20),
    nextStep: z.string().min(1).max(500),
  }),
  z.object({
    type: z.literal("cancel"),
    reason: z.string().min(1).max(500),
  }),
  z.object({
    type: z.literal("set_urgent"),
    enabled: z.boolean(),
    reason: z.string().max(500).default(""),
  }),
]);
export type EmployeeAction = z.infer<typeof employeeActionSchema>;
/** Команда АРМ: employeeActionSchema является версируемым command-контрактом. */
export const applicationCommandSchema = employeeActionSchema;
export type ApplicationCommand = EmployeeAction;

/** Ответ клиента. В прототипе АРМ его моделирует сотрудник вместо кабинета клиента. */
export const clientResponseSchema = z.enum([
  "documents_sent",
  "offer_accepted",
  "contract_signed",
]);
export type ClientResponse = z.infer<typeof clientResponseSchema>;

export const applicationEventSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  at: z.string(),
  actor: actorSchema,
  title: z.string(),
  comment: z.string().nullable(),
  fromStatus: applicationStatusSchema.nullable(),
  toStatus: applicationStatusSchema.nullable(),
  /** Тип аудита; optional для чтения старых событий. */
  kind: z
    .enum(["status_changed", "action", "comment_added", "handoff", "hold"])
    .optional(),
  /** Небольшой набор структурированных параметров без сырых payload. */
  metadata: z.record(z.string(), z.string()).optional(),
});
export type ApplicationEvent = z.infer<typeof applicationEventSchema>;

export const applicationSchema = z.object({
  id: z.string(),
  number: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: applicationStatusSchema,
  stage: applicationStageSchema,
  waitingOn: waitingOnSchema,
  hold: applicationHoldSchema.nullable().default(null),
  urgent: z.boolean().default(false),
  urgentReason: z.string().nullable().default(null),
  autonomy: apiAutonomySnapshotSchema.optional(),
  comments: z.array(applicationCommentSchema).default([]),
  handoff: applicationHandoffSchema.nullable().default(null),
  /** Что мешает решению, одной фразой. */
  blocker: z.string(),
  assigneeId: z.string().nullable(),
  applicant: applicantSchema,
  request: loanRequestSchema,
  checks: z.array(sourceCheckSchema),
  scoring: scoringResultSchema.nullable(),
  decision: creditDecisionSchema.nullable(),
  offer: offerTermsSchema.nullable(),
  requestedInfo: z.array(z.string()),
  rejectReason: rejectReasonSchema.nullable(),
  events: z.array(applicationEventSchema),
});
export type Application = z.infer<typeof applicationSchema>;
