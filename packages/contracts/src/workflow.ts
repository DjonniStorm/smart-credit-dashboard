import { z } from "zod";

import {
  apiCreateApplicationSchema,
  apiDecisionSchema,
  apiScoringSchema,
} from "./api.ts";
import {
  actorSchema,
  applicationDealSchema,
  applicationHandoffSchema,
  applicationHoldSchema,
  clientReplySchema,
  offerTermsSchema,
  urgentRequestSchema,
  urgentSourceSchema,
  workflowStatusSchema,
} from "./application-parts.ts";
import {
  creditProductIdSchema,
  employeeActionSchema,
  rejectReasonSchema,
} from "./application.ts";
import { autonomyCaseSchema } from "./autonomy.ts";
import { creditPurposeSchema } from "./product-catalog.ts";

export {
  workflowStatusSchema,
  type WorkflowStatus,
} from "./application-parts.ts";

/** Команда создания заявки из кабинета клиента: та же схема, что у API. */
export const createApplicationRequestSchema = apiCreateApplicationSchema;
export type CreateApplicationRequest = z.infer<
  typeof createApplicationRequestSchema
>;

export const applicationWorkflowSchema = z.object({
  id: z.string(),
  number: z.string(),
  inn: z.string().regex(/^\d{10,12}$/),
  productId: creditProductIdSchema,
  amount: z.number(),
  termMonths: z.number().int(),
  purpose: creditPurposeSchema,
  status: workflowStatusSchema,
  offer: offerTermsSchema.nullable().default(null),
  requestedInfo: z.array(z.string()).default([]),
  rejectReason: rejectReasonSchema.nullable().default(null),
  hold: applicationHoldSchema.nullable().default(null),
  urgent: z.boolean().default(false),
  urgentReason: z.string().nullable().default(null),
  urgentSource: urgentSourceSchema.nullable().default(null),
  urgentRequest: urgentRequestSchema.nullable().default(null),
  assigneeId: z.string().nullable().default(null),
  handoff: applicationHandoffSchema.nullable().default(null),
  clientReply: clientReplySchema.nullable().default(null),
  deal: applicationDealSchema.nullable().default(null),
  cancelledBy: actorSchema.shape.kind.nullable().default(null),
  /** Статус до отмены: по нему кабинет показывает, на каком этапе путь закончился. */
  cancelledFrom: workflowStatusSchema.nullable().default(null),
  checkJobId: z.string().nullable(),
  decision: apiDecisionSchema.nullable(),
  scoring: z
    .object({
      score: z.number().min(0).max(100),
      model: z.string(),
      recommendation: z.string().optional(),
      details: apiScoringSchema.optional(),
    })
    .nullable(),
  autonomyCase: autonomyCaseSchema.nullable().default(null),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApplicationWorkflow = z.infer<typeof applicationWorkflowSchema>;

export const createApplicationResponseSchema = z.object({
  application: applicationWorkflowSchema,
  checkJob: z.object({
    id: z.string(),
    status: z.enum(["queued", "running", "succeeded", "failed"]),
  }),
});
export type CreateApplicationResponse = z.infer<
  typeof createApplicationResponseSchema
>;

export const applicationCheckRequestSchema = z.object({
  idempotencyKey: z.string().min(8).max(128),
});
export type ApplicationCheckRequest = z.infer<
  typeof applicationCheckRequestSchema
>;

export const jobStatusSchema = z.enum([
  "queued",
  "running",
  "succeeded",
  "failed",
]);
export type JobStatus = z.infer<typeof jobStatusSchema>;

export const scoringJobSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  status: jobStatusSchema,
  idempotencyKey: z.string(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  error: z.string().nullable(),
  attempts: z.number().int().nonnegative().default(0),
  result: z
    .object({
      score: z.number().min(0).max(100),
      model: z.string(),
      recommendation: z.string().optional(),
      details: apiScoringSchema.optional(),
    })
    .nullable(),
});
export type ScoringJob = z.infer<typeof scoringJobSchema>;

/** Команда сотрудника по заявке. Повтор с тем же ключом не выполняется второй раз. */
export const applicationActionRequestSchema = z.object({
  action: employeeActionSchema,
  idempotencyKey: z.string().min(8).max(128),
});
export type ApplicationActionRequest = z.infer<
  typeof applicationActionRequestSchema
>;
