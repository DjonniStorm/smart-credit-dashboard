import { Injectable } from "@nestjs/common";

import type { ManagerReportQuery } from "@repo/contracts/reports";

import {
  type ReportRecord,
  actorOf,
  autonomyDispositionOf,
  autonomyModeOf,
  bucketStart,
  countShares,
  isDecision,
  metadataQuality,
  recommendationOf,
  slaStateOf,
  stageOf,
} from "./report-helpers.ts";
import { calculateSla } from "./report-sla.ts";
import {
  decodeReportCursor,
  encodeReportCursor,
  reportQueryHash,
} from "./report-query.ts";

@Injectable()
export class ReportSeriesCalculator {
  sla(records: ReportRecord[], query: ManagerReportQuery) {
    return calculateSla(records, query);
  }

  autonomy(records: ReportRecord[], query: ManagerReportQuery) {
    const values = records.filter((record) => autonomyModeOf(record) !== null);
    const dispositions = values.filter(
      (record) => autonomyDispositionOf(record) !== null,
    );
    const grouped = new Map<string, ReportRecord[]>();
    for (const record of values) {
      const key = bucketStart(record.occurredAt, query.bucket, query.timezone);
      grouped.set(key, [...(grouped.get(key) ?? []), record]);
    }
    return {
      byMode: countShares(
        values.map((record) => autonomyModeOf(record) as string),
        values.length,
      ).map(({ value, count, share: itemShare }) => ({
        mode: value,
        count,
        share: itemShare,
      })),
      byDisposition: countShares(
        dispositions.map((record) => autonomyDispositionOf(record) as string),
        dispositions.length,
      ).map(({ value, count, share: itemShare }) => ({
        disposition: value,
        count,
        share: itemShare,
      })),
      series: [...grouped.entries()].map(([key, items]) => ({
        bucketStart: key,
        candidates: items.filter(
          (record) => record.kind === "autonomy_candidate",
        ).length,
        autoOffers: items.filter(
          (record) => autonomyDispositionOf(record) === "auto_offer_sent",
        ).length,
        confirmed: items.filter(
          (record) => autonomyDispositionOf(record) === "confirmed",
        ).length,
        intercepted: items.filter(
          (record) => autonomyDispositionOf(record) === "intercepted",
        ).length,
        expired: items.filter(
          (record) => autonomyDispositionOf(record) === "expired",
        ).length,
        declined: items.filter(
          (record) => autonomyDispositionOf(record) === "declined",
        ).length,
        overrides: items.filter((record) => record.kind === "autonomy_override")
          .length,
      })),
    };
  }

  timeseries(
    population: ReportRecord[],
    records: ReportRecord[],
    query: ManagerReportQuery,
  ) {
    const keys = new Set(
      [...population, ...records].map((record) =>
        bucketStart(record.occurredAt, query.bucket, query.timezone),
      ),
    );
    return [...keys].sort().map((key) => {
      const apps = population.filter(
        (record) =>
          bucketStart(record.occurredAt, query.bucket, query.timezone) === key,
      );
      const events = records.filter(
        (record) =>
          bucketStart(record.occurredAt, query.bucket, query.timezone) === key,
      );
      return {
        bucketStart: key,
        applications: apps.length,
        events: events.length,
        decisions: events.filter(isDecision).length,
        overdue: events.filter((record) => slaStateOf(record) === "overdue")
          .length,
      };
    });
  }

  journal(
    records: ReportRecord[],
    query: ManagerReportQuery,
    watermark: {
      snapshotSeq: string;
      occurredAt: string | null;
      eventId: string | null;
    } | null,
  ) {
    const hash = reportQueryHash(query);
    const cursor = query.cursor ? decodeReportCursor(query.cursor, hash) : null;
    const ordered = records
      .filter(
        (record) =>
          !cursor ||
          record.occurredAt < cursor.occurredAt ||
          (record.occurredAt === cursor.occurredAt &&
            compareReportSeq(record.eventId, cursor.eventId) < 0),
      )
      .sort(
        (left, right) =>
          right.occurredAt.localeCompare(left.occurredAt) ||
          compareReportSeq(right.eventId, left.eventId),
      );
    const page = ordered.slice(0, query.limit);
    const last = page.at(-1);
    const nextCursor =
      last && ordered.length > page.length
        ? encodeReportCursor({
            occurredAt: last.occurredAt,
            eventId: last.eventId,
            queryHash: hash,
            watermark: watermark ?? {
              snapshotSeq: "0",
              occurredAt: null,
              eventId: null,
            },
          })
        : null;
    return {
      items: page.map((record) => ({
        eventId: record.eventId,
        applicationId: record.applicationId,
        applicationNumber: record.applicationNumber,
        occurredAt: record.occurredAt,
        kind: record.kind,
        actor: actorOf(record),
        productId: record.productId,
        status: record.status,
        stage: stageOf(record),
        assigneeId: record.assigneeId,
        recommendation: recommendationOf(record),
        autonomyMode: autonomyModeOf(record),
        autonomyDisposition: autonomyDispositionOf(record),
        slaState: slaStateOf(record),
        metadataQuality: metadataQuality(record),
        title:
          typeof record.payload.title === "string"
            ? record.payload.title
            : record.kind,
        comment:
          typeof record.payload.comment === "string"
            ? record.payload.comment
            : null,
      })),
      nextCursor,
      hasMore: ordered.length > page.length,
    };
  }
}

function compareReportSeq(left: string, right: string): number {
  const a = BigInt(left);
  const b = BigInt(right);
  return a === b ? 0 : a < b ? -1 : 1;
}
