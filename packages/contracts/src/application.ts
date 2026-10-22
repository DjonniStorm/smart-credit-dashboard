// Заявка глазами банка: этапы конвейера, проверки, скоринг, кредитное решение, журнал.
// Статус для клиента остаётся applicationStatusSchema из index.ts, этап здесь внутренний.
import { z } from "zod";

import { applicationStatusSchema, innSchema } from "@repo/contracts";

export const legalFormSchema = z.enum(["ip", "ooo"]);
export type LegalForm = z.infer<typeof legalFormSchema>;

export const creditProductIdSchema = z.enum([
  "express",
  "working_capital",
  "credit_line",
  "investment",
  "cash_gap",
  "equipment",
  "development",
]);
export type CreditProductId = z.infer<typeof creditProductIdSchema>;

/** Кредитный продукт и его правила. Значения синтетические. */
export const creditProductSchema = z.object({
  id: creditProductIdSchema,
  name: z.string(),
  purpose: z.string(),
  minAmount: z.number(),
  maxAmount: z.number(),
  minTermMonths: z.number().int(),
  maxTermMonths: z.number().int(),
  /** Базовая ставка, % годовых. */
  ratePct: z.number(),
  /** Минимальный балл скоринга для одобрения без изменения условий. */
  minScore: z.number(),
  /** Предел долговой нагрузки: долг после выдачи к годовой выручке. */
  maxDebtLoad: z.number(),
  /** Минимальный срок жизни бизнеса, месяцев. */
  minBusinessAgeMonths: z.number().int(),
  /** Обеспечение по продукту; null — не требуется. */
  collateral: z.string().nullable().optional(),
});
export type CreditProduct = z.infer<typeof creditProductSchema>;

/** Внутренний этап конвейера. */
export const applicationStageSchema = z.enum([
  "intake",
  "completeness",
  "enrichment",
  "scoring",
  "decision",
  "signing",
  "disbursement",
]);
export type ApplicationStage = z.infer<typeof applicationStageSchema>;

/** За кем ход по заявке, с точки зрения сотрудника. */
export const waitingOnSchema = z.enum([
  "employee",
  "client",
  "system",
  "nobody",
]);
export type WaitingOn = z.infer<typeof waitingOnSchema>;

export const employeeRoleSchema = z.enum(["analyst", "lead"]);
export type EmployeeRole = z.infer<typeof employeeRoleSchema>;

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
  purpose: z.string(),
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
  base: z.number(),
  score: z.number(),
  band: riskBandSchema,
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

export const offerTermsSchema = z.object({
  productId: creditProductIdSchema,
  amount: z.number(),
  termMonths: z.number().int(),
  ratePct: z.number(),
});
export type OfferTerms = z.infer<typeof offerTermsSchema>;

export const recommendationSchema = z.enum([
  "approve",
  "counter_offer",
  "request_info",
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

export const rejectReasonSchema = z.enum([
  "company_inactive",
  "bki_overdue",
  "tax_debt",
  "debt_load",
  "low_score",
  "other",
]);
export type RejectReason = z.infer<typeof rejectReasonSchema>;

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

export const actorSchema = z.object({
  kind: z.enum(["system", "employee", "client"]),
  name: z.string(),
});
export type Actor = z.infer<typeof actorSchema>;

export const commentVisibilitySchema = z.enum(["client", "internal", "handoff"]);
export type CommentVisibility = z.infer<typeof commentVisibilitySchema>;

export const applicationCommentSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  at: z.string(),
  author: actorSchema,
  visibility: commentVisibilitySchema,
  body: z.string().min(1).max(2_000),
});
export type ApplicationComment = z.infer<typeof applicationCommentSchema>;

export const applicationHandoffSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  at: z.string(),
  from: actorSchema,
  toEmployeeId: z.string(),
  summary: z.string().min(1).max(1_000),
  verifiedFacts: z.array(z.string()).max(20),
  openQuestions: z.array(z.string()).max(20),
  requestedItems: z.array(z.string()).max(20),
  nextStep: z.string().min(1).max(500),
});
export type ApplicationHandoff = z.infer<typeof applicationHandoffSchema>;

export const applicationHoldSchema = z.object({
  state: z.enum(["paused", "blocked"]),
  reason: z.string().min(1).max(500),
  at: z.string(),
  by: actorSchema,
  previousWaitingOn: waitingOnSchema,
  previousBlocker: z.string(),
});
export type ApplicationHold = z.infer<typeof applicationHoldSchema>;

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
