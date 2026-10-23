// Контракты: Zod-схемы. Типы через z.infer / enum.
// На клиенте: schemaResolver(schema, { sync: true }) из @mantine/form (Mantine 9, Zod 4).
// На api: createZodDto(schema) из nestjs-zod.
import { z } from "zod";

export enum ServiceName {
  Api = "api",
  Scoring = "scoring",
}

export * from "./autonomy.js";
export * from "./product-catalog.js";

export enum HealthStatus {
  Ok = "ok",
  Degraded = "degraded",
}

export enum CheckState {
  Up = "up",
  Down = "down",
}

export const serviceNameSchema = z.enum(ServiceName);

export const healthResponseSchema = z.object({
  status: z.enum(HealthStatus),
  service: serviceNameSchema,
  checks: z.record(z.string(), z.enum(CheckState)).optional(),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const innSchema = z.string().regex(/^\d{10,12}$/);

export const innParamSchema = z.object({
  inn: innSchema,
});
export type InnParam = z.infer<typeof innParamSchema>;

/** Заглушка ЕГРЮЛ/ЕГРИП. */
export const egrulRecordSchema = z.object({
  inn: innSchema,
  ogrn: z.string(),
  name: z.string(),
  status: z.string(),
  registeredAt: z.string(),
  okved: z.string(),
});
export type EgrulRecord = z.infer<typeof egrulRecordSchema>;

/** Заглушка бюро кредитных историй. */
export const bkiReportSchema = z.object({
  inn: innSchema,
  activeLoans: z.number().int(),
  totalDebtRub: z.number(),
  overdueDays: z.number().int(),
});
export type BkiReport = z.infer<typeof bkiReportSchema>;

/** Заглушка ФНС «Прозрачный бизнес». */
export const fnsProfileSchema = z.object({
  inn: innSchema,
  taxDebtRub: z.number(),
  employees: z.number().int(),
  massRegistrationAddress: z.boolean(),
});
export type FnsProfile = z.infer<typeof fnsProfileSchema>;

export const scoreRequestSchema = z.object({
  inn: innSchema,
  egrul: egrulRecordSchema,
  bki: bkiReportSchema,
  fns: fnsProfileSchema,
  requestedAmount: z.number().nonnegative().optional(),
  termMonths: z.number().int().nonnegative().optional(),
  annualRevenue: z.number().nonnegative().optional(),
  monthlyExpenses: z.number().nonnegative().optional(),
  currentPayments: z.number().nonnegative().optional(),
  documentsComplete: z.boolean().optional(),
  consentBki: z.boolean().optional(),
  collateralConfirmed: z.boolean().optional(),
});
export type ScoreRequest = z.infer<typeof scoreRequestSchema>;

export const scoreFactorResponseSchema = z.object({
  id: z.string(),
  label: z.string(),
  value: z.string(),
  impact: z.number(),
});
export type ScoreFactorResponse = z.infer<typeof scoreFactorResponseSchema>;

export const scoreResponseSchema = z.object({
  inn: innSchema,
  score: z.number().min(0).max(100),
  model: z.string(),
  /** Объяснение baseline/ML-модели; optional для обратной совместимости. */
  factors: z.array(scoreFactorResponseSchema).optional(),
  model_version: z.string().optional(),
  grade: z.enum(["A", "B", "C", "D"]).optional(),
  pd: z.number().min(0).max(1).optional(),
  risk_band: z.enum(["low", "moderate", "high"]).optional(),
  health_index: z.number().min(0).max(100).optional(),
  readiness_index: z.number().min(0).max(100).optional(),
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
  next_actions: z.array(z.string()).optional(),
});
export type ScoreResponse = z.infer<typeof scoreResponseSchema>;

/** Сквозная ручка client -> api -> scoring. */
export const companyCheckResponseSchema = z.object({
  inn: innSchema,
  sources: z.object({
    egrul: egrulRecordSchema,
    bki: bkiReportSchema,
    fns: fnsProfileSchema,
  }),
  scoring: scoreResponseSchema,
});
export type CompanyCheckResponse = z.infer<typeof companyCheckResponseSchema>;

/** Статус заявки: один словарь для кабинета клиента, АРМ и api. */
export const applicationStatusSchema = z.enum([
  "draft",
  "in_review",
  "needs_client",
  "counter_offer",
  "approved",
  "disbursed",
  "rejected",
]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
