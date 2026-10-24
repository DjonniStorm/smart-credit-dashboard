import { createHash } from "node:crypto";

import { BadRequestException } from "@nestjs/common";

import {
  type ManagerReportQuery,
  managerReportQuerySchema,
} from "@repo/contracts/reports";

const MAX_RANGE_DAYS = 366;
const QUERY_FILTER_KEYS = [
  "product",
  "status",
  "assignee",
  "stage",
  "actor",
  "recommendation",
  "autonomy",
  "sla",
] as const;

type RawQuery = Record<string, unknown>;

function firstValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0];
  }
  return undefined;
}

function splitValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => (typeof item === "string" ? item.split(",") : []))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseDate(value: unknown, fallback: Date): string {
  const raw = firstValue(value);
  if (!raw) {
    return fallback.toISOString();
  }
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw}T00:00:00.000Z`
    : raw;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Некорректная дата: ${raw}`);
  }
  return date.toISOString();
}

function validateTimezone(timezone: string): void {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    throw new BadRequestException(`Некорректный часовой пояс: ${timezone}`);
  }
}

function parseLimit(value: unknown): number {
  const raw = firstValue(value);
  if (!raw) {
    return 50;
  }
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new BadRequestException("limit должен быть целым числом от 1 до 100");
  }
  return limit;
}

function queryValue(raw: RawQuery, key: string): unknown {
  return raw[key] ?? raw[`${key}s`];
}

export function parseManagerReportQuery(
  raw: RawQuery,
  now = new Date(),
): ManagerReportQuery {
  const defaultTo = now;
  const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const from = parseDate(raw.from, defaultFrom);
  const to = parseDate(raw.to, defaultTo);
  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime();
  if (toTime <= fromTime) {
    throw new BadRequestException("to должен быть позже from");
  }
  if (toTime - fromTime > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000) {
    throw new BadRequestException(
      "Диапазон отчёта не может превышать 366 дней",
    );
  }

  const timezone = firstValue(raw.timezone) ?? "UTC";
  validateTimezone(timezone);
  const candidate = {
    from,
    to,
    timezone,
    view: firstValue(raw.view) ?? "overview",
    bucket: firstValue(raw.bucket) ?? "day",
    cursor: firstValue(raw.cursor),
    search: firstValue(raw.search) ?? "",
    limit: parseLimit(raw.limit),
    productIds: splitValues(queryValue(raw, QUERY_FILTER_KEYS[0])),
    statuses: splitValues(queryValue(raw, QUERY_FILTER_KEYS[1])),
    assigneeIds: splitValues(queryValue(raw, QUERY_FILTER_KEYS[2])),
    stages: splitValues(queryValue(raw, QUERY_FILTER_KEYS[3])),
    actorKinds: splitValues(queryValue(raw, QUERY_FILTER_KEYS[4])),
    recommendations: splitValues(queryValue(raw, QUERY_FILTER_KEYS[5])),
    autonomyModes: splitValues(queryValue(raw, QUERY_FILTER_KEYS[6])),
    autonomyDispositions: splitValues(queryValue(raw, "autonomyDisposition")),
    slaStates: splitValues(queryValue(raw, QUERY_FILTER_KEYS[7])),
  };
  const parsed = managerReportQuerySchema.safeParse(candidate);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.flatten().fieldErrors);
  }
  return parsed.data;
}

export function reportQueryHash(query: ManagerReportQuery): string {
  const stableQuery = { ...query };
  delete stableQuery.cursor;
  return createHash("sha256")
    .update(JSON.stringify(stableQuery))
    .digest("base64url");
}

export type ReportCursor = {
  occurredAt: string;
  eventId: string;
  queryHash: string;
  watermark: {
    snapshotSeq: string;
    occurredAt: string | null;
    eventId: string | null;
  };
};

export function encodeReportCursor(cursor: ReportCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeReportCursor(
  value: string,
  queryHash: string,
): ReportCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, "base64url").toString("utf8"),
    ) as Partial<ReportCursor>;
    if (
      typeof parsed.occurredAt !== "string" ||
      typeof parsed.eventId !== "string" ||
      typeof parsed.queryHash !== "string" ||
      !parsed.watermark ||
      typeof parsed.watermark !== "object" ||
      typeof parsed.watermark.snapshotSeq !== "string" ||
      !/^\d+$/.test(parsed.watermark.snapshotSeq) ||
      (parsed.watermark.occurredAt !== null &&
        typeof parsed.watermark.occurredAt !== "string") ||
      (parsed.watermark.eventId !== null &&
        typeof parsed.watermark.eventId !== "string") ||
      (parsed.watermark.eventId !== null &&
        !/^\d+$/.test(parsed.watermark.eventId)) ||
      !/^\d+$/.test(parsed.eventId) ||
      parsed.queryHash !== queryHash
    ) {
      throw new Error("invalid cursor");
    }
    return parsed as ReportCursor;
  } catch {
    throw new BadRequestException("Некорректный cursor отчёта");
  }
}
