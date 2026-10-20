// Контракты: Zod-схемы. Типы через z.infer / enum.
// На клиенте: schemaResolver(schema, { sync: true }) из @mantine/form (Mantine 9, Zod 4).
// На api: createZodDto(schema) из nestjs-zod.

import { z } from "zod";

export enum ServiceName {
  Api = "api",
  Scoring = "scoring",
  Mocks = "mocks",
}

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
});
export type ScoreRequest = z.infer<typeof scoreRequestSchema>;

export const scoreResponseSchema = z.object({
  inn: innSchema,
  score: z.number(),
  model: z.string(),
});
export type ScoreResponse = z.infer<typeof scoreResponseSchema>;

/** Сквозная ручка client -> api -> mocks + scoring. */
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
