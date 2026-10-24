import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import type { DataSource } from "typeorm";

type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as Row[];
  }
  return result as Row[];
}

function number(value: unknown): number {
  return Number(value ?? 0);
}

function label(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function metricLine(
  name: string,
  value: number | string,
  labels?: Record<string, string>,
): string {
  const labelPart =
    labels && Object.keys(labels).length > 0
      ? `{${Object.entries(labels)
          .map(([key, item]) => {
            return `${key}="${label(item)}"`;
          })
          .join(",")}}`
      : "";
  return `${name}${labelPart} ${value}`;
}

@Injectable()
export class MetricsService {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /** Собирает метрики из БД и отдаёт их текстом в формате Prometheus с комментариями на русском. */
  async collect(): Promise<string> {
    const lines: string[] = [];
    await this.collectApplications(lines);
    await this.collectScoringJobs(lines);
    await this.collectEvents(lines);
    await this.collectSourceChecks(lines);
    await this.collectAutonomy(lines);
    return `${lines.join("\n")}\n`;
  }

  private async collectApplications(lines: string[]): Promise<void> {
    const totalRows = rowsOf(
      await this.db.query("select count(*)::int as n from applications"),
    );
    lines.push("# HELP smart_credit_applications Всего заявок в системе");
    lines.push("# TYPE smart_credit_applications gauge");
    lines.push(
      metricLine("smart_credit_applications", number(totalRows[0]?.n)),
    );

    const statusRows = rowsOf(
      await this.db.query(
        "select status, count(*)::int as n from applications group by status order by status",
      ),
    );
    lines.push(
      "# HELP smart_credit_applications_by_status Заявки по бизнес-статусу",
    );
    lines.push("# TYPE smart_credit_applications_by_status gauge");
    for (const row of statusRows) {
      lines.push(
        metricLine("smart_credit_applications_by_status", number(row.n), {
          status: String(row.status),
        }),
      );
    }

    const decisionRows = rowsOf(
      await this.db.query(
        "select count(*)::int as n from applications where decision is not null",
      ),
    );
    lines.push(
      "# HELP smart_credit_decisions Заявки с зафиксированным решением",
    );
    lines.push("# TYPE smart_credit_decisions gauge");
    lines.push(
      metricLine("smart_credit_decisions", number(decisionRows[0]?.n)),
    );
  }

  private async collectScoringJobs(lines: string[]): Promise<void> {
    const rows = rowsOf(
      await this.db.query(
        `select
           count(*)::int as total,
           count(*) filter (where status='succeeded')::int as succeeded,
           count(*) filter (where status='failed')::int as failed,
           count(*) filter (where status='queued')::int as queued,
           count(*) filter (where status='running')::int as running,
           coalesce(avg(extract(epoch from (finished_at - started_at)) * 1000), 0) as avg_duration_ms,
           coalesce(max(extract(epoch from (finished_at - started_at)) * 1000), 0) as max_duration_ms
         from scoring_jobs`,
      ),
    );
    const row = rows[0] ?? {};

    lines.push("# HELP smart_credit_scoring_jobs Всего задач скоринга");
    lines.push("# TYPE smart_credit_scoring_jobs gauge");
    lines.push(metricLine("smart_credit_scoring_jobs", number(row.total)));

    lines.push(
      "# HELP smart_credit_scoring_jobs_by_outcome Задачи скоринга по исходу",
    );
    lines.push("# TYPE smart_credit_scoring_jobs_by_outcome gauge");
    const outcomes: [string, unknown][] = [
      ["succeeded", row.succeeded],
      ["failed", row.failed],
      ["queued", row.queued],
      ["running", row.running],
    ];
    for (const [outcome, count] of outcomes) {
      lines.push(
        metricLine("smart_credit_scoring_jobs_by_outcome", number(count), {
          outcome,
        }),
      );
    }

    lines.push(
      "# HELP smart_credit_scoring_queue_depth Задачи скоринга в очереди",
    );
    lines.push("# TYPE smart_credit_scoring_queue_depth gauge");
    lines.push(
      metricLine("smart_credit_scoring_queue_depth", number(row.queued)),
    );

    lines.push(
      "# HELP smart_credit_scoring_job_duration_ms_avg Среднее время выполнения задачи скоринга в миллисекундах",
    );
    lines.push("# TYPE smart_credit_scoring_job_duration_ms_avg gauge");
    lines.push(
      metricLine(
        "smart_credit_scoring_job_duration_ms_avg",
        number(row.avg_duration_ms),
      ),
    );

    lines.push(
      "# HELP smart_credit_scoring_job_duration_ms_max Максимальное время выполнения задачи скоринга в миллисекундах",
    );
    lines.push("# TYPE smart_credit_scoring_job_duration_ms_max gauge");
    lines.push(
      metricLine(
        "smart_credit_scoring_job_duration_ms_max",
        number(row.max_duration_ms),
      ),
    );
  }

  private async collectEvents(lines: string[]): Promise<void> {
    const rows = rowsOf(
      await this.db.query("select count(*)::int as n from application_events"),
    );
    lines.push(
      "# HELP smart_credit_application_events_total Всего событий по заявкам (переходы, аудит)",
    );
    lines.push("# TYPE smart_credit_application_events_total counter");
    lines.push(
      metricLine("smart_credit_application_events_total", number(rows[0]?.n)),
    );
  }

  private async collectSourceChecks(lines: string[]): Promise<void> {
    const rows = rowsOf(
      await this.db.query(
        `select
           count(*)::int as total,
           count(*) filter (where status='failed')::int as failed
         from source_checks`,
      ),
    );
    const row = rows[0] ?? {};

    lines.push(
      "# HELP smart_credit_source_checks_total Всего проверок источников",
    );
    lines.push("# TYPE smart_credit_source_checks_total counter");
    lines.push(
      metricLine("smart_credit_source_checks_total", number(row.total)),
    );

    lines.push(
      "# HELP smart_credit_source_checks_failed_total Проверки источников с ошибкой",
    );
    lines.push("# TYPE smart_credit_source_checks_failed_total counter");
    lines.push(
      metricLine("smart_credit_source_checks_failed_total", number(row.failed)),
    );
  }

  private async collectAutonomy(lines: string[]): Promise<void> {
    const totalRows = rowsOf(
      await this.db.query("select count(*)::int as n from autonomy_policies"),
    );
    lines.push(
      "# HELP smart_credit_autonomy_policies Всего политик автономности",
    );
    lines.push("# TYPE smart_credit_autonomy_policies gauge");
    lines.push(
      metricLine("smart_credit_autonomy_policies", number(totalRows[0]?.n)),
    );

    const policyRows = rowsOf(
      await this.db.query(
        "select product_id, payload, revision from autonomy_policies order by product_id",
      ),
    );

    lines.push(
      "# HELP smart_credit_autonomy_policy_info Параметры политики автономности по продукту",
    );
    lines.push("# TYPE smart_credit_autonomy_policy_info gauge");
    lines.push(
      "# HELP smart_credit_autonomy_eligible_cases Кейсы, прошедшие политику автоодобрения, по продукту",
    );
    lines.push("# TYPE smart_credit_autonomy_eligible_cases gauge");
    lines.push(
      "# HELP smart_credit_autonomy_manual_overrides Ручные переопределения решения по продукту",
    );
    lines.push("# TYPE smart_credit_autonomy_manual_overrides gauge");
    lines.push(
      "# HELP smart_credit_autonomy_manual_override_rate Доля ручных переопределений среди подходящих кейсов",
    );
    lines.push("# TYPE smart_credit_autonomy_manual_override_rate gauge");
    lines.push(
      "# HELP smart_credit_autonomy_closed_cases Закрытые кейсы наблюдения по продукту",
    );
    lines.push("# TYPE smart_credit_autonomy_closed_cases gauge");
    lines.push(
      "# HELP smart_credit_autonomy_calibration_error Ошибка калибровки модели по продукту",
    );
    lines.push("# TYPE smart_credit_autonomy_calibration_error gauge");
    lines.push(
      "# HELP smart_credit_autonomy_drift_detected Признак дрейфа модели (1 — обнаружен)",
    );
    lines.push("# TYPE smart_credit_autonomy_drift_detected gauge");
    lines.push(
      "# HELP smart_credit_autonomy_manual_hold Ручная блокировка автоматизации (1 — включена)",
    );
    lines.push("# TYPE smart_credit_autonomy_manual_hold gauge");

    for (const row of policyRows) {
      const product = String(row.product_id);
      const payload =
        (row.payload as Record<string, unknown> | undefined) ?? {};
      const config =
        (payload.config as Record<string, unknown> | undefined) ?? {};
      const metrics =
        (payload.metrics as Record<string, unknown> | undefined) ?? {};
      lines.push(
        metricLine("smart_credit_autonomy_policy_info", 1, {
          product,
          level: String(config.level ?? "unknown"),
          revision: String(number(row.revision)),
        }),
      );
      lines.push(
        metricLine(
          "smart_credit_autonomy_eligible_cases",
          number(metrics.eligibleCases),
          {
            product,
          },
        ),
      );
      lines.push(
        metricLine(
          "smart_credit_autonomy_manual_overrides",
          number(metrics.manualOverrides),
          {
            product,
          },
        ),
      );
      lines.push(
        metricLine(
          "smart_credit_autonomy_manual_override_rate",
          number(metrics.manualOverrideRate),
          { product },
        ),
      );
      lines.push(
        metricLine(
          "smart_credit_autonomy_closed_cases",
          number(metrics.closedCases),
          {
            product,
          },
        ),
      );
      lines.push(
        metricLine(
          "smart_credit_autonomy_calibration_error",
          number(metrics.calibrationError),
          { product },
        ),
      );
      lines.push(
        metricLine(
          "smart_credit_autonomy_drift_detected",
          metrics.driftDetected ? 1 : 0,
          { product },
        ),
      );
      lines.push(
        metricLine(
          "smart_credit_autonomy_manual_hold",
          metrics.manualHold ? 1 : 0,
          { product },
        ),
      );
    }
  }
}
