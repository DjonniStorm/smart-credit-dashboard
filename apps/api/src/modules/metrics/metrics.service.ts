import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

import { collectApplicationsMetrics } from "./metrics.applications.ts";
import { collectAutonomyMetrics } from "./metrics.autonomy.ts";
import { collectEventsMetrics } from "./metrics.events.ts";
import { collectScoringJobsMetrics } from "./metrics.scoring-jobs.ts";
import { collectSourceChecksMetrics } from "./metrics.source-checks.ts";

@Injectable()
export class MetricsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Собирает метрики из БД и отдаёт их текстом в формате Prometheus с комментариями на русском. */
  async collect(): Promise<string> {
    const lines: string[] = [];
    await collectApplicationsMetrics(this.db, lines);
    await collectScoringJobsMetrics(this.db, lines);
    await collectEventsMetrics(this.db, lines);
    await collectSourceChecksMetrics(this.db, lines);
    await collectAutonomyMetrics(this.db, lines);
    return `${lines.join("\n")}\n`;
  }
}
