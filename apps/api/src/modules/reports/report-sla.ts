import type { ManagerReportQuery } from "@repo/contracts/reports";

import {
  type ReportRecord,
  bucketStart,
  countShares,
  stageOf,
} from "./report-helpers.ts";

const SLA_TARGETS = [
  ["intake", 240],
  ["completeness", 480],
  ["enrichment", 240],
  ["scoring", 60],
  ["decision", 240],
  ["signing", 1440],
  ["disbursement", 1440],
] as const;

type SlaObservation = {
  record: ReportRecord;
  state: "on_track" | "at_risk" | "overdue" | "paused" | "unknown";
  bucketAt: string;
  targetMinutes: number | null;
};

export function calculateSla(
  records: ReportRecord[],
  query: ManagerReportQuery,
) {
  const slaRecords = records.filter(
    (record) => record.source === "event" && record.kind !== "scoring_failed",
  );
  const observations = slaObservations(slaRecords, query);
  const targets = SLA_TARGETS.map(([stage, targetMinutes]) => {
    const configured = observations.find(
      (item) => stageOf(item.record) === stage && item.targetMinutes,
    )?.targetMinutes;
    return { stage, targetMinutes: configured ?? targetMinutes };
  });
  return {
    policyVersion: "event-metadata-v1",
    targets,
    byState: countShares(
      observations.map((item) => item.state),
      observations.length,
    ).map(({ value, count, share: itemShare }) => ({
      state: value,
      count,
      share: itemShare,
    })),
    series: slaSeries(observations, query),
  };
}

function slaObservations(
  records: ReportRecord[],
  query: ManagerReportQuery,
): SlaObservation[] {
  const byApplication = new Map<string, ReportRecord[]>();
  for (const record of records) {
    const values = byApplication.get(record.applicationId) ?? [];
    values.push(record);
    byApplication.set(record.applicationId, values);
  }
  const result: SlaObservation[] = [];
  for (const values of byApplication.values()) {
    const ordered = [...values].sort(
      (left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) ||
        compareReportSeq(left.eventId, right.eventId),
    );
    let start = 0;
    while (start < ordered.length) {
      const first = ordered[start];
      if (!first) {
        break;
      }
      const stage = stageOf(first);
      let end = start + 1;
      while (end < ordered.length && ordered[end] && stageOf(ordered[end]!) === stage) {
        end += 1;
      }
      const segment = ordered.slice(start, end);
      const latest = segment.at(-1);
      if (!latest) {
        break;
      }
      const nextStart = ordered[end]?.occurredAt ?? query.to;
      const effectiveMinutes = Math.max(
        0,
        (new Date(nextStart).getTime() - new Date(first.occurredAt).getTime()) /
          60_000 -
          heldMinutes(segment, nextStart),
      );
      const targetMinutes =
        latest.slaTargetMinutes ??
        SLA_TARGETS.find(([candidate]) => candidate === stage)?.[1] ??
        null;
      const state =
        stage === null
          ? "unknown"
          : latest.holdState === "active"
            ? "paused"
            : targetMinutes === null
              ? "unknown"
              : effectiveMinutes > targetMinutes
                ? "overdue"
                : effectiveMinutes > targetMinutes * 0.8
                  ? "at_risk"
                  : "on_track";
      result.push({
        record: latest,
        state,
        bucketAt: first.occurredAt,
        targetMinutes,
      });
      start = end;
    }
  }
  return result;
}

function slaSeries(observations: SlaObservation[], query: ManagerReportQuery) {
  const grouped = new Map<string, SlaObservation[]>();
  for (const observation of observations) {
    const key = bucketStart(observation.bucketAt, query.bucket, query.timezone);
    const values = grouped.get(key) ?? [];
    values.push(observation);
    grouped.set(key, values);
  }
  return [...grouped.entries()].map(([key, values]) => ({
    bucketStart: key,
    eligible: values.filter((item) => item.state !== "unknown").length,
    met: values.filter((item) => item.state === "on_track").length,
    overdue: values.filter((item) => item.state === "overdue").length,
    paused: values.filter((item) => item.state === "paused").length,
    unknown: values.filter((item) => item.state === "unknown").length,
  }));
}

function compareReportSeq(left: string, right: string): number {
  const a = BigInt(left);
  const b = BigInt(right);
  return a === b ? 0 : a < b ? -1 : 1;
}

function heldMinutes(records: ReportRecord[], endAt: string): number {
  let total = 0;
  let holdStartedAt: string | null = null;
  for (const record of records) {
    if (record.holdState === "active" && holdStartedAt === null) {
      holdStartedAt = record.occurredAt;
    }
    if (record.holdState !== "active" && holdStartedAt !== null) {
      total +=
        (new Date(record.occurredAt).getTime() -
          new Date(holdStartedAt).getTime()) /
        60_000;
      holdStartedAt = null;
    }
  }
  if (holdStartedAt !== null) {
    total +=
      (new Date(endAt).getTime() - new Date(holdStartedAt).getTime()) / 60_000;
  }
  return Math.max(0, total);
}
