import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource, EntityManager } from "typeorm";

import type {
  ManagerReportQuery,
  ManagerReportResponse,
} from "@repo/contracts/reports";

import { reportAggregateSql } from "./reports.aggregate-sql.ts";
import { reportDataSql } from "./reports.journal-sql.ts";

type Row = Record<string, unknown>;

export type ReportWatermark = {
  snapshotSeq: string;
  occurredAt: string | null;
  eventId: string | null;
};

export type ReportEventRow = {
  eventId: string;
  reportSeq: string;
  applicationId: string;
  applicationNumber: string;
  occurredAt: string;
  kind: string;
  payload: Record<string, unknown>;
  productId: string;
  amount: number;
  status: string;
  stage: string | null;
  assigneeId: string | null;
  actorKind: string | null;
  actorId: string | null;
  actorName: string | null;
  recommendation: string;
  autonomyMode: string | null;
  autonomyDisposition: string | null;
  slaState: string;
  holdState: string | null;
  stageStartedAt: string | null;
  slaTargetMinutes: number | null;
  source: "event" | "comment";
};

export type ReportApplicationRow = {
  applicationId: string;
  applicationNumber: string;
  createdAt: string;
  productId: string;
  amount: number;
  status: string;
  stage: string | null;
  assigneeId: string | null;
  urgent: boolean;
};

export type ReportData = {
  applications: ReportApplicationRow[];
  records: ReportEventRow[];
  watermark: ReportWatermark | null;
  summary: ReportSummary | null;
};

export type ReportSummary = Pick<
  ManagerReportResponse,
  | "coverage"
  | "population"
  | "activity"
  | "decisions"
  | "recommendation"
  | "sla"
  | "autonomy"
  | "timeseries"
>;

function rowsOf(value: unknown): Row[] {
  if (Array.isArray(value) && Array.isArray(value[0])) return value[0] as Row[];
  return value as Row[];
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function iso(value: unknown): string {
  return new Date(String(value)).toISOString();
}

function nullable(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

const REPORT_STATUSES = new Set([
  "draft",
  "in_review",
  "needs_client",
  "approved",
  "counter_offer",
  "accepted",
  "signing",
  "funded",
  "rejected",
  "cancelled",
]);

function status(value: unknown): string {
  const candidate = nullable(value) ?? "unknown";
  return REPORT_STATUSES.has(candidate) ? candidate : "unknown";
}

function eventFromRow(row: Row): ReportEventRow {
  return {
    eventId: String(row.event_id),
    reportSeq: String(row.report_seq),
    applicationId: String(row.application_id),
    applicationNumber: String(row.application_number),
    occurredAt: iso(row.occurred_at),
    kind: String(row.kind),
    payload: object(row.payload),
    productId: String(row.product_id),
    amount: Number(row.amount),
    status: status(row.event_status),
    stage: nullable(row.event_stage),
    assigneeId: nullable(row.event_assignee_id),
    actorKind: nullable(row.actor_kind),
    actorId: nullable(row.actor_id),
    actorName: nullable(row.actor_name),
    recommendation: String(row.recommendation ?? "unknown"),
    autonomyMode: nullable(row.autonomy_mode),
    autonomyDisposition: nullable(row.autonomy_disposition),
    slaState: String(row.sla_value ?? "unknown"),
    holdState: nullable(row.hold_state),
    stageStartedAt: nullable(row.stage_started_at),
    slaTargetMinutes:
      row.sla_target_minutes === null || row.sla_target_minutes === undefined
        ? null
        : Number(row.sla_target_minutes),
    source: row.source === "comment" ? "comment" : "event",
  };
}

function applicationFromRow(row: Row): ReportApplicationRow {
  return {
    applicationId: String(row.id),
    applicationNumber: String(row.number),
    createdAt: iso(row.created_at),
    productId: String(row.product_id),
    amount: Number(row.amount),
    status: status(row.status_value),
    stage: nullable(row.stage_value),
    assigneeId: nullable(row.assignee_value),
    urgent: Boolean(row.urgent),
  };
}

@Injectable()
export class ReportsRepository {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async readConsistent(
    query: ManagerReportQuery,
    cursor: { occurredAt: string; eventId: string } | null,
    watermark: ReportWatermark | null,
  ): Promise<ReportData> {
    return this.db.transaction(async (manager) => {
      const currentWatermark = watermark ?? (await this.findWatermark(query, manager));
      const params = [
        query.from,
        query.to,
        currentWatermark?.snapshotSeq ?? "0",
        currentWatermark?.eventId ?? null,
        query.productIds,
        query.statuses,
        query.assigneeIds,
        query.stages,
        query.actorKinds,
        query.recommendations,
        query.autonomyModes,
        query.autonomyDispositions,
        query.slaStates,
        query.search.toLowerCase(),
        cursor?.occurredAt ?? null,
        cursor?.eventId ?? null,
        query.limit + 1,
        query.view,
      ];
      const rows =
        query.view === "journal"
          ? rowsOf(await manager.query(reportDataSql, params))
          : [];
      const summaryRows = rowsOf(
        await manager.query(reportAggregateSql, [
          query.from,
          query.to,
          currentWatermark?.snapshotSeq ?? "0",
          query.productIds,
          query.statuses,
          query.assigneeIds,
          query.stages,
          query.actorKinds,
          query.recommendations,
          query.autonomyModes,
          query.autonomyDispositions,
          query.slaStates,
          query.search.toLowerCase(),
          query.timezone,
          query.bucket,
        ]),
      );
      const summary = summaryRows[0]
        ? (object(summaryRows[0].summary) as ReportSummary)
        : null;
      const applications = rows
        .filter((row) => row.row_type === "application")
        .map(applicationFromRow);
      const records = rows
        .filter((row) => row.row_type === "event")
        .map(eventFromRow);
      return {
        applications,
        records,
        watermark: currentWatermark,
        summary,
      };
    });
  }

  private async findWatermark(
    query: ManagerReportQuery,
    manager: EntityManager,
  ): Promise<ReportWatermark | null> {
    const rows = rowsOf(
      await manager.query(
        `select
           coalesce((select max(report_seq)::text from manager_report_events), '0') as snapshot_seq,
           (select occurred_at from manager_report_events
             where occurred_at >= $1 and occurred_at < $2
             order by occurred_at desc, report_seq desc limit 1) as occurred_at,
           (select event_id from manager_report_events
             where occurred_at >= $1 and occurred_at < $2
             order by occurred_at desc, report_seq desc limit 1) as event_id`,
        [query.from, query.to],
      ),
    );
    const row = rows[0];
    return row
      ? {
          snapshotSeq: String(row.snapshot_seq),
          occurredAt: row.occurred_at ? iso(row.occurred_at) : null,
          eventId: nullable(row.event_id),
        }
      : { snapshotSeq: "0", occurredAt: null, eventId: null };
  }
}
