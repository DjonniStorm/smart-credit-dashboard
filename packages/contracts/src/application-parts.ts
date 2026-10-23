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
  "rejected",
  "cancelled",
]);
export type WorkflowStatus = z.infer<typeof workflowStatusSchema>;
