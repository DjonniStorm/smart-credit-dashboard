import { z } from "zod";

import {
  applicationCommentSchema,
  applicationHandoffSchema,
  applicationHoldSchema,
  creditProductIdSchema,
  offerTermsSchema,
} from "./application.js";
import { apiDecisionSchema, apiScoringSchema } from "./api.js";

/** Команда создания заявки из кабинета клиента. */
export const createApplicationRequestSchema = z.object({
  inn: z.string().regex(/^\d{10,12}$/),
  productId: creditProductIdSchema,
  amount: z.number().positive(),
  termMonths: z.number().int().positive(),
  purpose: z.string().min(1).max(500),
  idempotencyKey: z.string().min(8).max(128),
});
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
  purpose: z.string(),
  status: z.enum([
    "draft",
    "in_review",
    "needs_client",
    "approved",
    "rejected",
    "cancelled",
    "blocked",
  ]),
  checkJobId: z.string().nullable(),
  decision: apiDecisionSchema.nullable(),
  offer: offerTermsSchema.nullable().default(null),
  offerKind: z.enum(["initial", "counter"]).nullable().default(null),
  requestedInfo: z.array(z.string()).default([]),
  rejectReason: z.string().nullable().default(null),
  assigneeId: z.string().nullable().default(null),
  urgent: z.boolean().default(false),
  urgentReason: z.string().nullable().default(null),
  hold: applicationHoldSchema.nullable().default(null),
  comments: z.array(applicationCommentSchema).default([]),
  handoff: applicationHandoffSchema.nullable().default(null),
  scoring: z
    .object({
      score: z.number().min(0).max(100),
      model: z.string(),
      recommendation: z.string().optional(),
      details: apiScoringSchema.optional(),
    })
    .nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ApplicationWorkflow = z.infer<typeof applicationWorkflowSchema>;

export const createApplicationResponseSchema = z.object({
  application: applicationWorkflowSchema,
  checkJob: z.object({ id: z.string(), status: z.enum(["queued", "running", "succeeded", "failed"]) }),
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

export const jobStatusSchema = z.enum(["queued", "running", "succeeded", "failed"]);
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
