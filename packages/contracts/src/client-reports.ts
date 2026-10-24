import { z } from "zod";

export const clientReportStatusSchema = z.enum(["draft", "in_review", "needs_client", "counter_offer", "approved", "accepted", "signing", "funded", "rejected", "cancelled"]);

export const clientReportQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.preprocess((value) => value === undefined ? [] : Array.isArray(value) ? value : [value], z.array(clientReportStatusSchema)).default([]),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});
export type ClientReportQuery = z.infer<typeof clientReportQuerySchema>;

export const clientReportApplicationSchema = z.object({
  id: z.string(), number: z.string(), status: clientReportStatusSchema,
  productId: z.string(), amount: z.number(), termMonths: z.number().int(),
  createdAt: z.string(), updatedAt: z.string(),
});
export type ClientReportApplication = z.infer<typeof clientReportApplicationSchema>;

export const clientReportEventSchema = z.object({
  id: z.string(), at: z.string(), text: z.string(),
});
export type ClientReportEvent = z.infer<typeof clientReportEventSchema>;

export const clientReportEventKindSchema = z.enum(["application_created", "check_requested", "scoring_completed", "client_action"]);
export type ClientReportEventKind = z.infer<typeof clientReportEventKindSchema>;

export const clientReportListSchema = z.object({
  items: z.array(clientReportApplicationSchema), nextCursor: z.string().nullable(),
  watermark: z.string(),
});
export type ClientReportList = z.infer<typeof clientReportListSchema>;

export const clientReportDetailSchema = z.object({
  application: clientReportApplicationSchema,
  events: z.array(clientReportEventSchema),
  changes: z.array(z.object({ at: z.string(), text: z.string() })),
});
export type ClientReportDetail = z.infer<typeof clientReportDetailSchema>;
