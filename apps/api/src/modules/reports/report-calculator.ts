import { Injectable } from "@nestjs/common";

import { reportStageSchema } from "@repo/contracts/reports";

import {
  type ReportRecord,
  actorOf,
  autonomyModeOf,
  countShares,
  decisionDuration,
  decisionOf,
  isDecision,
  isProductId,
  metadataQuality,
  recommendationOf,
  share,
  stageOf,
} from "./report-helpers.ts";

@Injectable()
export class ReportCalculator {
  coverage(population: ReportRecord[], records: ReportRecord[]) {
    const quality = (items: ReportRecord[]) => {
      const unknown = items.filter(
        (item) => metadataQuality(item) === "unknown",
      ).length;
      const partial = items.filter(
        (item) => metadataQuality(item) === "partial",
      ).length;
      return {
        total: items.length,
        known: items.length - unknown,
        unknown,
        quality: unknown > 0 ? "unknown" : partial > 0 ? "partial" : "complete",
      } as const;
    };
    return {
      population: quality(population),
      activity: quality(records),
      recommendation: quality(records.filter(isDecision)),
      sla: quality(records),
      autonomy: quality(
        records.filter((record) => autonomyModeOf(record) !== null),
      ),
    };
  }

  population(population: ReportRecord[], latest: Map<string, ReportRecord>) {
    const statuses = countShares(
      population.map((item) => item.status),
      population.length,
    );
    const products = new Map<string, ReportRecord[]>();
    for (const item of population) {
      const current = products.get(item.productId) ?? [];
      current.push(item);
      products.set(item.productId, current);
    }
    const byProduct = [...products.entries()]
      .filter(([productId]) => isProductId(productId))
      .map(([productId, items]) => ({
        productId,
        applications: items.length,
        active: items.filter(
          (item) => !["rejected", "cancelled", "funded"].includes(item.status),
        ).length,
        closed: items.filter((item) =>
          ["rejected", "cancelled", "funded"].includes(item.status),
        ).length,
        urgentOpen: items.filter(
          (item) =>
            Boolean(item.payload.urgent) &&
            !["rejected", "cancelled", "funded"].includes(item.status),
        ).length,
        overdue: 0,
      }));
    const stages = population
      .map((item) => stageOf(latest.get(item.applicationId) ?? item))
      .filter((value): value is string => Boolean(value));
    return {
      applications: population.length,
      byStatus: statuses.map(({ value, count, share: itemShare }) => ({
        status: value,
        count,
        share: itemShare,
      })),
      byProduct,
      byStage: countShares(stages, population.length)
        .filter(({ value }) => reportStageSchema.safeParse(value).success)
        .map(({ value, count, share: itemShare }) => ({
          stage: value,
          count,
          share: itemShare,
        })),
    };
  }

  activity(records: ReportRecord[]) {
    return {
      events: records.length,
      applications: new Set(records.map((record) => record.applicationId)).size,
      byActor: countShares(
        records.map((record) => actorOf(record).kind),
        records.length,
      ).map(({ value, count }) => ({ actorKind: value, count })),
      byStage: countShares(
        records.map(stageOf).filter((value): value is string => Boolean(value)),
        records.length,
      )
        .filter(({ value }) => reportStageSchema.safeParse(value).success)
        .map(({ value, count, share: itemShare }) => ({
          stage: value,
          count,
          share: itemShare,
        })),
      byStatus: countShares(
        records.map((record) => record.status),
        records.length,
      ).map(({ value, count, share: itemShare }) => ({
        status: value,
        count,
        share: itemShare,
      })),
    };
  }

  decisions(records: ReportRecord[]) {
    const decisionRecords = records.filter(isDecision);
    const aggregate = (decision: string) => {
      const values = decisionRecords.filter(
        (record) => decisionOf(record) === decision,
      );
      const durations = values
        .map(decisionDuration)
        .filter((value): value is number => value !== null)
        .sort((a, b) => a - b);
      return {
        count: values.length,
        share: share(values.length, decisionRecords.length),
        medianMinutes: durations.length
          ? durations[Math.floor(durations.length / 2)]
          : null,
        p90Minutes: durations.length
          ? durations[Math.floor(durations.length * 0.9)]
          : null,
      };
    };
    const byProduct = new Map<string, ReportRecord[]>();
    for (const record of decisionRecords) {
      const values = byProduct.get(record.productId) ?? [];
      values.push(record);
      byProduct.set(record.productId, values);
    }
    return {
      total: decisionRecords.length,
      approve: aggregate("approve"),
      counterOffer: aggregate("counter_offer"),
      reject: aggregate("reject"),
      requestInfo: decisionRecords.filter(
        (record) => decisionOf(record) === "request_info",
      ).length,
      byProduct: [...byProduct.entries()]
        .filter(([productId]) => isProductId(productId))
        .map(([productId, values]) => ({
          productId,
          decisions: values.length,
          approve: values.filter((record) => decisionOf(record) === "approve")
            .length,
          counterOffer: values.filter(
            (record) => decisionOf(record) === "counter_offer",
          ).length,
          reject: values.filter((record) => decisionOf(record) === "reject")
            .length,
          requestInfo: values.filter(
            (record) => decisionOf(record) === "request_info",
          ).length,
        })),
    };
  }

  recommendation(records: ReportRecord[]) {
    let matched = 0;
    let overridden = 0;
    let unknown = 0;
    const matrix = new Map<string, number>();
    for (const record of records.filter(isDecision)) {
      const recommendation = recommendationOf(record);
      const decision = decisionOf(record) ?? "unknown";
      if (recommendation === "unknown") unknown += 1;
      else if (recommendation === decision) matched += 1;
      else overridden += 1;
      const key = `${recommendation}:${decision}`;
      matrix.set(key, (matrix.get(key) ?? 0) + 1);
    }
    return {
      matched,
      overridden,
      unknown,
      overrideRate:
        matched + overridden === 0 ? null : overridden / (matched + overridden),
      matrix: [...matrix.entries()].map(([key, count]) => {
        const [recommendation, decision] = key.split(":");
        return { recommendation, decision, count };
      }),
    };
  }
}
