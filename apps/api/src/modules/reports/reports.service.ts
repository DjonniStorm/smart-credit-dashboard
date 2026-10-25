import { Injectable } from "@nestjs/common";

import {
  type ManagerReportResponse,
  managerReportResponseSchema,
} from "@repo/contracts/reports";

import { ReportCalculator } from "./report-calculator.ts";
import {
  latestRecords,
  matchesFilters,
  populationRecord,
  toRecord,
} from "./report-helpers.ts";
import {
  decodeReportCursor,
  parseManagerReportQuery,
  reportQueryHash,
} from "./report-query.ts";
import { ReportSeriesCalculator } from "./report-series.ts";
import { ReportsRepository } from "./reports.repository.ts";

@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly calculator: ReportCalculator,
    private readonly series: ReportSeriesCalculator,
  ) {}

  async getManagerReport(
    rawQuery: Record<string, unknown>,
  ): Promise<ManagerReportResponse> {
    const query = parseManagerReportQuery(rawQuery);
    const cursor = query.cursor
      ? decodeReportCursor(query.cursor, reportQueryHash(query))
      : null;
    const data = await this.repository.readConsistent(
      query,
      cursor ? { occurredAt: cursor.occurredAt, eventId: cursor.eventId } : null,
      cursor?.watermark ?? null,
    );
    const population = data.applications
      .map(populationRecord)
      .filter((record) => matchesFilters(record, query));
    const records = data.records
      .map(toRecord)
      .filter((record) => matchesFilters(record, query))
      .sort(
        (left, right) =>
          left.occurredAt.localeCompare(right.occurredAt) ||
          Number(left.eventId) - Number(right.eventId),
      );
    // Population rows already contain the latest historical event snapshot at
    // the report watermark; activity page rows must not replace that stock.
    const summary = data.summary;
    const fallbackPopulation = query.view === "overview" ? population : [];
    const fallbackRecords = query.view === "overview" ? records : [];
    const response = {
      query: {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        view: query.view,
        bucket: query.bucket,
        search: query.search,
        filters: {
          productIds: query.productIds,
          statuses: query.statuses,
          assigneeIds: query.assigneeIds,
          stages: query.stages,
          actorKinds: query.actorKinds,
          recommendations: query.recommendations,
          autonomyModes: query.autonomyModes,
          autonomyDispositions: query.autonomyDispositions,
          slaStates: query.slaStates,
        },
      },
      eventWatermark: data.watermark,
      coverage:
        summary?.coverage ??
        this.calculator.coverage(fallbackPopulation, fallbackRecords),
      population:
        summary?.population ??
        this.calculator.population(fallbackPopulation, latestRecords(fallbackPopulation)),
      activity: summary?.activity ?? this.calculator.activity(fallbackRecords),
      decisions:
        summary?.decisions ?? this.calculator.decisions(fallbackRecords),
      recommendation:
        summary?.recommendation ?? this.calculator.recommendation(fallbackRecords),
      sla: summary?.sla ?? this.series.sla(fallbackRecords, query),
      autonomy: summary?.autonomy ?? this.series.autonomy(fallbackRecords, query),
      timeseries:
        summary?.timeseries ??
        this.series.timeseries(fallbackPopulation, fallbackRecords, query),
      journal:
        query.view === "journal"
          ? this.series.journal(records, query, data.watermark)
          : null,
    };
    return managerReportResponseSchema.parse(response);
  }
}
