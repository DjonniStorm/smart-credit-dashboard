import { z } from "zod";

import { workflowStatusSchema } from "./application-parts.ts";
import { autonomyDispositionSchema, autonomyModeSchema } from "./autonomy.ts";
import { creditProductIdSchema } from "./product-catalog.ts";

export const reportStageSchema = z.enum([
  "intake",
  "completeness",
  "enrichment",
  "scoring",
  "decision",
  "signing",
  "disbursement",
]);
export type ReportStage = z.infer<typeof reportStageSchema>;

export const reportActorKindSchema = z.enum([
  "employee",
  "system",
  "client",
  "unknown",
]);
export type ReportActorKind = z.infer<typeof reportActorKindSchema>;
export const reportStatusSchema = z.union([
  workflowStatusSchema,
  z.literal("unknown"),
]);
export const reportRecommendationSchema = z.enum([
  "approve",
  "counter_offer",
  "request_info",
  "manual_review",
  "reject",
  "unknown",
]);
export const reportSlaStateSchema = z.enum([
  "on_track",
  "at_risk",
  "overdue",
  "paused",
  "unknown",
]);
export const reportBucketSchema = z.enum(["day", "week"]);
export const reportViewSchema = z.enum(["overview", "journal"]);
export type ReportView = z.infer<typeof reportViewSchema>;
export const reportMetadataQualitySchema = z.enum([
  "complete",
  "partial",
  "unknown",
]);

export const managerReportQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
  to: z.string().datetime({ offset: true }),
  timezone: z.string().min(1),
  view: reportViewSchema.default("overview"),
  bucket: reportBucketSchema.default("day"),
  cursor: z.string().min(1).optional(),
  search: z.string().max(200).default(""),
  limit: z.number().int().min(1).max(100).default(50),
  productIds: z.array(creditProductIdSchema).default([]),
  statuses: z.array(reportStatusSchema).default([]),
  assigneeIds: z.array(z.string().min(1)).default([]),
  stages: z.array(reportStageSchema).default([]),
  actorKinds: z.array(reportActorKindSchema).default([]),
  recommendations: z.array(reportRecommendationSchema).default([]),
  autonomyModes: z.array(autonomyModeSchema).default([]),
  autonomyDispositions: z.array(autonomyDispositionSchema).default([]),
  slaStates: z.array(reportSlaStateSchema).default([]),
});
export type ManagerReportQuery = z.infer<typeof managerReportQuerySchema>;

const managerReportFiltersSchema = z.object({
  productIds: z.array(creditProductIdSchema).default([]),
  statuses: z.array(reportStatusSchema).default([]),
  assigneeIds: z.array(z.string().min(1)).default([]),
  stages: z.array(reportStageSchema).default([]),
  actorKinds: z.array(reportActorKindSchema).default([]),
  recommendations: z.array(reportRecommendationSchema).default([]),
  autonomyModes: z.array(autonomyModeSchema).default([]),
  autonomyDispositions: z.array(autonomyDispositionSchema).default([]),
  slaStates: z.array(reportSlaStateSchema).default([]),
});

const coverageSchema = z.object({
  total: z.number().int().nonnegative(),
  known: z.number().int().nonnegative(),
  unknown: z.number().int().nonnegative(),
  quality: reportMetadataQualitySchema,
});

const countShareSchema = z.object({
  count: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});

const statusAggregateSchema = countShareSchema.extend({
  status: reportStatusSchema,
});

const productAggregateSchema = z.object({
  productId: creditProductIdSchema,
  applications: z.number().int().nonnegative(),
  active: z.number().int().nonnegative(),
  closed: z.number().int().nonnegative(),
  urgentOpen: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
});

const stageAggregateSchema = z.object({
  stage: reportStageSchema,
  count: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});

const actorAggregateSchema = z.object({
  actorKind: reportActorKindSchema,
  count: z.number().int().nonnegative(),
});

const decisionAggregateSchema = countShareSchema.extend({
  medianMinutes: z.number().nonnegative().nullable(),
  p90Minutes: z.number().nonnegative().nullable(),
});

const productDecisionAggregateSchema = z.object({
  productId: creditProductIdSchema,
  decisions: z.number().int().nonnegative(),
  approve: z.number().int().nonnegative(),
  counterOffer: z.number().int().nonnegative(),
  reject: z.number().int().nonnegative(),
  requestInfo: z.number().int().nonnegative(),
});

const recommendationMatrixCellSchema = z.object({
  recommendation: reportRecommendationSchema,
  decision: reportRecommendationSchema,
  count: z.number().int().nonnegative(),
});

const slaTargetSchema = z.object({
  stage: reportStageSchema,
  targetMinutes: z.number().int().positive(),
});

const slaStateAggregateSchema = z.object({
  state: reportSlaStateSchema,
  count: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});

const slaBucketSchema = z.object({
  bucketStart: z.string().datetime({ offset: true }),
  eligible: z.number().int().nonnegative(),
  met: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
  paused: z.number().int().nonnegative(),
  unknown: z.number().int().nonnegative(),
});

const autonomyModeAggregateSchema = z.object({
  mode: autonomyModeSchema,
  count: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});

const autonomyDispositionAggregateSchema = z.object({
  disposition: autonomyDispositionSchema,
  count: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});

const autonomyBucketSchema = z.object({
  bucketStart: z.string().datetime({ offset: true }),
  candidates: z.number().int().nonnegative(),
  autoOffers: z.number().int().nonnegative(),
  confirmed: z.number().int().nonnegative(),
  intercepted: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  declined: z.number().int().nonnegative(),
  overrides: z.number().int().nonnegative(),
});

const timeseriesBucketSchema = z.object({
  bucketStart: z.string().datetime({ offset: true }),
  applications: z.number().int().nonnegative(),
  events: z.number().int().nonnegative(),
  decisions: z.number().int().nonnegative(),
  overdue: z.number().int().nonnegative(),
});

const journalItemSchema = z.object({
  eventId: z.string(),
  applicationId: z.string(),
  applicationNumber: z.string(),
  occurredAt: z.string().datetime({ offset: true }),
  kind: z.string(),
  actor: z.object({
    kind: reportActorKindSchema,
    id: z.string().nullable(),
    name: z.string(),
  }),
  productId: creditProductIdSchema,
  status: reportStatusSchema.nullable(),
  stage: reportStageSchema.nullable(),
  assigneeId: z.string().nullable(),
  recommendation: reportRecommendationSchema,
  autonomyMode: autonomyModeSchema.nullable(),
  autonomyDisposition: autonomyDispositionSchema.nullable(),
  slaState: reportSlaStateSchema,
  metadataQuality: reportMetadataQualitySchema,
  title: z.string(),
  comment: z.string().nullable(),
});

export const managerReportResponseSchema = z.object({
  query: z.object({
    from: z.string().datetime({ offset: true }),
    to: z.string().datetime({ offset: true }),
    timezone: z.string(),
    view: reportViewSchema,
    bucket: reportBucketSchema,
    search: z.string(),
    filters: managerReportFiltersSchema,
  }),
  eventWatermark: z
    .object({
      snapshotSeq: z.string(),
      occurredAt: z.string().datetime({ offset: true }).nullable(),
      eventId: z.string().nullable(),
    })
    .nullable(),
  coverage: z.object({
    population: coverageSchema,
    activity: coverageSchema,
    recommendation: coverageSchema,
    sla: coverageSchema,
    autonomy: coverageSchema,
  }),
  population: z.object({
    applications: z.number().int().nonnegative(),
    byStatus: z.array(statusAggregateSchema),
    byProduct: z.array(productAggregateSchema),
    byStage: z.array(stageAggregateSchema),
  }),
  activity: z.object({
    events: z.number().int().nonnegative(),
    applications: z.number().int().nonnegative(),
    byActor: z.array(actorAggregateSchema),
    byStage: z.array(stageAggregateSchema),
    byStatus: z.array(statusAggregateSchema),
  }),
  decisions: z.object({
    total: z.number().int().nonnegative(),
    approve: decisionAggregateSchema,
    counterOffer: decisionAggregateSchema,
    reject: decisionAggregateSchema,
    requestInfo: z.number().int().nonnegative(),
    byProduct: z.array(productDecisionAggregateSchema),
  }),
  recommendation: z.object({
    matched: z.number().int().nonnegative(),
    overridden: z.number().int().nonnegative(),
    unknown: z.number().int().nonnegative(),
    overrideRate: z.number().min(0).max(1).nullable(),
    matrix: z.array(recommendationMatrixCellSchema),
  }),
  sla: z.object({
    policyVersion: z.string(),
    targets: z.array(slaTargetSchema),
    byState: z.array(slaStateAggregateSchema),
    series: z.array(slaBucketSchema),
  }),
  autonomy: z.object({
    byMode: z.array(autonomyModeAggregateSchema),
    byDisposition: z.array(autonomyDispositionAggregateSchema),
    series: z.array(autonomyBucketSchema),
  }),
  timeseries: z.array(timeseriesBucketSchema),
  journal: z
    .object({
      items: z.array(journalItemSchema),
      nextCursor: z.string().nullable(),
      hasMore: z.boolean(),
    })
    .nullable(),
});
export type ManagerReportResponse = z.infer<typeof managerReportResponseSchema>;
export type ManagerJournalItem = z.infer<typeof journalItemSchema>;
