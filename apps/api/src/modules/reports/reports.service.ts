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
import { parseManagerReportQuery } from "./report-query.ts";
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
    const data = await this.repository.readConsistent(query.from, query.to);
    const population = data.applications
      .map(populationRecord)
      .filter((record) => matchesFilters(record, query));
    const records = [
      ...data.events.map(toRecord),
      ...data.comments.map(toRecord),
    ]
      .filter((record) => matchesFilters(record, query))
      .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
    const latest = latestRecords(records);
    const response = {
      query: {
        from: query.from,
        to: query.to,
        timezone: query.timezone,
        view: query.view,
        bucket: query.bucket,
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
      coverage: this.calculator.coverage(population, records),
      population: this.calculator.population(population, latest),
      activity: this.calculator.activity(records),
      decisions: this.calculator.decisions(records),
      recommendation: this.calculator.recommendation(records),
      sla: this.series.sla(records, query),
      autonomy: this.series.autonomy(records, query),
      timeseries: this.series.timeseries(population, records, query),
      journal:
        query.view === "journal"
          ? this.series.journal(records, query, data.watermark)
          : null,
    };
    return managerReportResponseSchema.parse(response);
  }
}
