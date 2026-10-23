import { z } from "zod";

/** Operational state of an autonomous decision policy. */
export const autonomyLevelSchema = z.enum([
  "new",
  "verified",
  "stable",
  "paused",
]);
export type AutonomyLevel = z.infer<typeof autonomyLevelSchema>;

export const autonomyConfigSchema = z.object({
  id: z.string(),
  modelVersion: z.string(),
  productId: z.string(),
  policyVersion: z.string(),
  amountBand: z.object({
    min: z.number().nonnegative(),
    max: z.number().positive(),
  }),
  level: autonomyLevelSchema,
  controlWindowEndsAt: z.string().nullable(),
  minClosedCases: z.number().int().nonnegative().default(100),
  maxManualOverrideRate: z.number().min(0).max(1).default(0.1),
  maxCalibrationError: z.number().min(0).max(1).default(0.05),
  minConfidence: z.number().min(0).max(1).default(0.8),
  minGrade: z.enum(["A", "B", "C", "D"]).default("B"),
  controlWindowMinutes: z.number().int().positive().default(30),
  revision: z.number().int().nonnegative().default(0),
});
export type AutonomyConfig = z.infer<typeof autonomyConfigSchema>;

export const autonomyMetricsSchema = z.object({
  closedCases: z.number().int().nonnegative(),
  manualOverrideRate: z.number().min(0).max(1),
  calibrationError: z.number().min(0).max(1),
  driftDetected: z.boolean(),
  manualHold: z.boolean().default(false),
  eligibleCases: z.number().int().nonnegative().default(0),
  manualOverrides: z.number().int().nonnegative().default(0),
  calibrationSamples: z.number().int().nonnegative().default(0),
  calibrationStatus: z.enum(["available", "unavailable"]).default("available"),
  driftStatus: z.enum(["clear", "detected", "unavailable"]).default("clear"),
  computedAt: z.string().default("1970-01-01T00:00:00.000Z"),
});
export type AutonomyMetrics = z.infer<typeof autonomyMetricsSchema>;

export const autonomyModeSchema = z.enum(["shadow", "assist", "controlled"]);
export type AutonomyMode = z.infer<typeof autonomyModeSchema>;

export const autonomyDispositionSchema = z.enum([
  "manual_required",
  "auto_offer_sent",
  "confirmed",
  "intercepted",
  "expired",
  "declined",
]);
export type AutonomyDisposition = z.infer<typeof autonomyDispositionSchema>;

export const autonomyCaseSchema = z.object({
  policyId: z.string(),
  policyVersion: z.string(),
  policyRevision: z.number().int().nonnegative(),
  mode: autonomyModeSchema,
  recommendation: z.string(),
  eligible: z.boolean(),
  reasons: z.array(z.string()),
  disposition: autonomyDispositionSchema,
  controlWindowOpenedAt: z.string().nullable(),
  controlWindowEndsAt: z.string().nullable(),
  overrideCounted: z.boolean(),
  closed: z.boolean(),
  autoDecisionAt: z.string().nullable(),
});
export type AutonomyCase = z.infer<typeof autonomyCaseSchema>;

export const autonomyAuditSchema = z.object({
  id: z.string(),
  configId: z.string(),
  at: z.string(),
  actor: z.string(),
  fromLevel: autonomyLevelSchema,
  toLevel: autonomyLevelSchema,
  reason: z.string().min(1),
  metrics: autonomyMetricsSchema,
});
export type AutonomyAudit = z.infer<typeof autonomyAuditSchema>;

export type AutonomyEligibility = {
  eligible: boolean;
  reasons: string[];
  controlWindow: "open" | "closed";
};

/** Pure policy gate. It never changes the config and is safe to call in UI/API. */
export function checkAutonomyEligibility(
  config: AutonomyConfig,
  metrics: AutonomyMetrics,
  now = new Date(),
): AutonomyEligibility {
  const reasons: string[] = [];
  const windowClosed =
    config.controlWindowEndsAt !== null &&
    now >= new Date(config.controlWindowEndsAt);
  if (config.level === "paused")
    reasons.push(
      "Автономность приостановлена оператором или контролем качества",
    );
  if (config.level === "new")
    reasons.push("Недостаточно подтверждений для автономного решения");
  if (config.level === "verified")
    reasons.push("Уровень допускает только assist-контроль");
  if (metrics.closedCases < config.minClosedCases)
    reasons.push(`Нужно закрытых кейсов: ${config.minClosedCases}`);
  if (metrics.manualOverrideRate > config.maxManualOverrideRate)
    reasons.push("Доля ручных переопределений выше порога");
  if (metrics.calibrationError > config.maxCalibrationError)
    reasons.push("Ошибка калибровки выше порога");
  if (metrics.driftDetected)
    reasons.push("Обнаружен drift входных данных или PD");
  if (metrics.calibrationStatus === "unavailable")
    reasons.push("Калибровка ещё недоступна");
  if (metrics.driftStatus === "detected")
    reasons.push("Последняя проверка обнаружила drift");
  if (metrics.manualHold)
    reasons.push("Включена ручная блокировка автономности");
  if (windowClosed) reasons.push("Контрольное окно завершено");
  return {
    eligible: reasons.length === 0,
    reasons,
    controlWindow: windowClosed ? "closed" : "open",
  };
}

export function applyManualAutonomyOverride(
  config: AutonomyConfig,
  level: AutonomyLevel,
  reason: string,
  actor: string,
  metrics: AutonomyMetrics,
  at = new Date(),
): { config: AutonomyConfig; audit: AutonomyAudit } {
  const audit: AutonomyAudit = {
    id: `${config.id}-${at.getTime()}`,
    configId: config.id,
    at: at.toISOString(),
    actor,
    fromLevel: config.level,
    toLevel: level,
    reason,
    metrics,
  };
  return { config: { ...config, level }, audit };
}
