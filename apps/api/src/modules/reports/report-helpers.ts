import { creditProductIdSchema } from "@repo/contracts/product-catalog";
import {
  type ManagerReportQuery,
  reportActorKindSchema,
  reportRecommendationSchema,
  reportSlaStateSchema,
  reportStageSchema,
} from "@repo/contracts/reports";

import type {
  ReportApplicationRow,
  ReportCommentRow,
  ReportEventRow,
} from "./reports.repository.ts";

export type ReportRecord = {
  eventId: string;
  applicationId: string;
  applicationNumber: string;
  occurredAt: string;
  kind: string;
  payload: Record<string, unknown>;
  productId: string;
  status: string;
  amount: number;
  assigneeId: string | null;
};

export type ReportContext = Record<string, unknown>;

export function share(count: number, total: number): number {
  return total === 0 ? 0 : count / total;
}

function localDateParts(
  value: string,
  timezone: string,
): [number, number, number] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return [
    Number(values.get("year")),
    Number(values.get("month")),
    Number(values.get("day")),
  ];
}

export function bucketStart(
  value: string,
  bucket: "day" | "week",
  timezone = "UTC",
): string {
  const [year, month, day] = localDateParts(value, timezone);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (bucket === "week") {
    const day = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  }
  return date.toISOString();
}

export function metadataQuality(
  record: ReportRecord,
): "complete" | "partial" | "unknown" {
  if (record.payload.reportContext) return "complete";
  if (Object.keys(record.payload).length > 0) return "partial";
  return "unknown";
}

export function latestRecords(
  records: ReportRecord[],
): Map<string, ReportRecord> {
  const latest = new Map<string, ReportRecord>();
  for (const record of records) {
    const previous = latest.get(record.applicationId);
    if (!previous || previous.occurredAt <= record.occurredAt) {
      latest.set(record.applicationId, record);
    }
  }
  return latest;
}

export function countShares<T extends string>(values: T[], total: number) {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({
    value,
    count,
    share: share(count, total),
  }));
}

export function decisionDuration(record: ReportRecord): number | null {
  const context = record.payload.reportContext;
  if (!context || typeof context !== "object") return null;
  const startedAt = (context as Record<string, unknown>).stageStartedAt;
  if (typeof startedAt !== "string") return null;
  const duration =
    (new Date(record.occurredAt).getTime() - new Date(startedAt).getTime()) /
    60_000;
  return duration >= 0 ? duration : null;
}

export function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function contextOf(payload: Record<string, unknown>): ReportContext {
  return asObject(payload.reportContext);
}

export function stringValue(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function contextString(
  payload: Record<string, unknown>,
  key: string,
): string | null {
  return stringValue(contextOf(payload), key) ?? stringValue(payload, key);
}

export function stageOf(record: ReportRecord): string | null {
  const explicit = contextString(record.payload, "stage");
  if (explicit && reportStageSchema.safeParse(explicit).success) {
    return explicit;
  }
  if (["draft"].includes(record.status)) return "intake";
  if (["needs_client"].includes(record.status)) return "completeness";
  if (["in_review"].includes(record.status)) return "decision";
  if (["approved", "counter_offer", "accepted"].includes(record.status)) {
    return "signing";
  }
  if (["signing"].includes(record.status)) return "signing";
  if (["funded"].includes(record.status)) return "disbursement";
  return "decision";
}

export function recommendationOf(record: ReportRecord): string {
  const value = contextString(record.payload, "recommendation");
  return value && reportRecommendationSchema.safeParse(value).success
    ? value
    : "unknown";
}

export function autonomyModeOf(record: ReportRecord): string | null {
  const value = contextString(record.payload, "autonomyMode");
  return value === "shadow" || value === "assist" || value === "controlled"
    ? value
    : null;
}

export function autonomyDispositionOf(record: ReportRecord): string | null {
  const value = contextString(record.payload, "autonomyDisposition");
  return value &&
    [
      "manual_required",
      "auto_offer_sent",
      "confirmed",
      "intercepted",
      "expired",
      "declined",
    ].includes(value)
    ? value
    : null;
}

export function slaStateOf(record: ReportRecord): string {
  const value = contextString(record.payload, "slaState");
  return value && reportSlaStateSchema.safeParse(value).success
    ? value
    : "unknown";
}

export function actorOf(record: ReportRecord): {
  kind: "employee" | "system" | "client";
  id: string | null;
  name: string;
} {
  const kind = contextString(record.payload, "actorKind");
  const safeKind =
    kind && reportActorKindSchema.safeParse(kind).success ? kind : "system";
  return {
    kind: safeKind as "employee" | "system" | "client",
    id: contextString(record.payload, "actorId"),
    name: contextString(record.payload, "actorName") ?? "Система",
  };
}

export function isProductId(value: string): boolean {
  return creditProductIdSchema.safeParse(value).success;
}

export function isDecision(record: ReportRecord): boolean {
  const action = contextString(record.payload, "actionType");
  return ["approve", "counter_offer", "reject", "request_info"].includes(
    action ?? "",
  );
}

export function decisionOf(record: ReportRecord): string | null {
  const action = contextString(record.payload, "actionType");
  if (action === "approve") return "approve";
  if (action === "counter_offer") return "counter_offer";
  if (action === "reject") return "reject";
  if (action === "request_info") return "request_info";
  return null;
}

export function matchesFilters(
  record: ReportRecord,
  query: ManagerReportQuery,
): boolean {
  const stage = stageOf(record);
  const actor = actorOf(record);
  const mode = autonomyModeOf(record);
  const disposition = autonomyDispositionOf(record);
  const sla = slaStateOf(record);
  return (
    (query.productIds.length === 0 ||
      query.productIds.includes(record.productId as never)) &&
    (query.statuses.length === 0 ||
      query.statuses.includes(record.status as never)) &&
    (query.assigneeIds.length === 0 ||
      query.assigneeIds.includes(record.assigneeId ?? "")) &&
    (query.stages.length === 0 || query.stages.includes(stage as never)) &&
    (query.actorKinds.length === 0 || query.actorKinds.includes(actor.kind)) &&
    (query.recommendations.length === 0 ||
      query.recommendations.includes(recommendationOf(record) as never)) &&
    (query.autonomyModes.length === 0 ||
      query.autonomyModes.includes(mode as never)) &&
    (query.autonomyDispositions.length === 0 ||
      query.autonomyDispositions.includes(disposition as never)) &&
    (query.slaStates.length === 0 || query.slaStates.includes(sla as never))
  );
}

export function toRecord(row: ReportEventRow | ReportCommentRow): ReportRecord {
  if ("kind" in row && "amount" in row) {
    return row;
  }
  return {
    ...row,
    kind: "comment_added",
    amount: 0,
  };
}

export function populationRecord(row: ReportApplicationRow): ReportRecord {
  return {
    eventId: `application:${row.applicationId}`,
    applicationId: row.applicationId,
    applicationNumber: row.applicationNumber,
    occurredAt: row.createdAt,
    kind: "application_created",
    payload: {
      actorKind: "system",
      actorName: "Кредитный конвейер",
      stage: "intake",
      status: row.status,
      assigneeId: row.assigneeId,
      urgent: row.urgent,
      hold: row.hold,
    },
    productId: row.productId,
    status: row.status,
    amount: row.amount,
    assigneeId: row.assigneeId,
  };
}
