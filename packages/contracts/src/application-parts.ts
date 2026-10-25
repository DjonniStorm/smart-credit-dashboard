// Общие части заявки без зависимостей от api.ts: на них опираются и application.ts, и api.ts.
import { z } from "zod";

import { creditProductIdSchema } from "./product-catalog.ts";

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

export const offerTermsSchema = z.object({
  productId: creditProductIdSchema,
  amount: z.number(),
  termMonths: z.number().int(),
  ratePct: z.number(),
});
export type OfferTerms = z.infer<typeof offerTermsSchema>;

export const rejectReasonSchema = z.enum([
  "company_inactive",
  "bki_overdue",
  "tax_debt",
  "debt_load",
  "low_score",
  "other",
]);
export type RejectReason = z.infer<typeof rejectReasonSchema>;

export const actorSchema = z.object({
  kind: z.enum(["system", "employee", "client"]),
  name: z.string(),
});
export type Actor = z.infer<typeof actorSchema>;

export const commentVisibilitySchema = z.enum([
  "client",
  "internal",
  "handoff",
]);
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

/** Кто и когда включил срочный режим. Срочность управляющая, публичным статусом не становится. */
export const urgentSourceSchema = z.object({
  by: z.enum(["client", "employee"]),
  at: z.string(),
});
export type UrgentSource = z.infer<typeof urgentSourceSchema>;

/** Запрос клиента на срочный режим. Сам по себе не меняет действующий режим: решает менеджер. */
export const urgentRequestSchema = z.object({
  state: z.enum(["pending", "accepted", "declined"]),
  reason: z.string(),
  requestedAt: z.string(),
  resolvedAt: z.string().nullable().default(null),
  resolvedBy: actorSchema.nullable().default(null),
  declineReason: z.string().nullable().default(null),
});
export type UrgentRequest = z.infer<typeof urgentRequestSchema>;

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

/** Бизнес-статус заявки в хранилище. Пауза и блокировка живут в hold и статус не меняют. */
export const workflowStatusSchema = z.enum([
  "draft",
  "in_review",
  "needs_client",
  "approved",
  "counter_offer",
  /** Клиент принял условия, система готовит договор. */
  "accepted",
  /** Договор подготовлен и ждёт подписи кодом. */
  "signing",
  /** Договор подписан, кредит выдан. */
  "funded",
  "rejected",
  "cancelled",
]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;

export const attachedDocumentSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["statement", "reporting", "tax_certificate", "other"]),
  sizeBytes: z.number().int().nonnegative(),
  addedAt: z.string(),
});
export type AttachedDocument = z.infer<typeof attachedDocumentSchema>;

export const clientAnswerSchema = z.object({
  text: z.string().min(1).max(1000),
  documents: z.array(attachedDocumentSchema),
});
export type ClientAnswer = z.infer<typeof clientAnswerSchema>;

/** Ответ клиента на последний запрос документов. */
export const clientReplySchema = clientAnswerSchema.extend({
  answeredAt: z.string(),
});
export type ClientReply = z.infer<typeof clientReplySchema>;

/** Сделка после принятия предложения: подписание и выдача. */
export const applicationDealSchema = z.object({
  offerKind: z.enum(["initial", "counter"]),
  acceptedAt: z.string(),
  /** Когда клиент последний раз запросил код подписи; без запроса подписать нельзя. */
  codeRequestedAt: z.string().nullable().default(null),
  signedAt: z.string().nullable(),
  disbursedAt: z.string().nullable(),
  account: z.string(),
});
export type ApplicationDeal = z.infer<typeof applicationDealSchema>;
