import type { DataSource } from "typeorm";

import { metricLine, number, rowsOf } from "./metrics.format.ts";

export async function collectScoringJobsMetrics(
  db: DataSource,
  lines: string[],
): Promise<void> {
  const rows = rowsOf(
    await db.query(
      `select
         count(*)::int as total,
         count(*) filter (where status='succeeded')::int as succeeded,
         count(*) filter (where status='failed')::int as failed,
         count(*) filter (where status='queued')::int as queued,
         count(*) filter (where status='running')::int as running,
         coalesce(avg(extract(epoch from (finished_at - started_at)) * 1000), 0) as avg_duration_ms,
         coalesce(max(extract(epoch from (finished_at - started_at)) * 1000), 0) as max_duration_ms,
         coalesce((select extract(epoch from (now() - min(created_at)))
                   from scoring_jobs
                   where status='queued' and (next_attempt_at is null or next_attempt_at <= now())), 0) as oldest_ready_age_seconds,
         (select count(*)::int from scoring_jobs
          where status='failed' and finished_at >= now() - interval '5 minutes') as failed_5m
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
    "# HELP smart_credit_scoring_job_duration_ms_avg Историческое среднее время выполнения завершённых задач скоринга в миллисекундах",
  );
  lines.push("# TYPE smart_credit_scoring_job_duration_ms_avg gauge");
  lines.push(
    metricLine(
      "smart_credit_scoring_job_duration_ms_avg",
      number(row.avg_duration_ms),
    ),
  );

  lines.push(
    "# HELP smart_credit_scoring_job_duration_ms_max Исторический максимум времени выполнения завершённых задач скоринга в миллисекундах",
  );
  lines.push("# TYPE smart_credit_scoring_job_duration_ms_max gauge");
  lines.push(
    metricLine(
      "smart_credit_scoring_job_duration_ms_max",
      number(row.max_duration_ms),
    ),
  );

  lines.push(
    "# HELP smart_credit_scoring_oldest_ready_job_age_seconds Возраст старейшей готовой к выполнению задачи скоринга в очереди",
  );
  lines.push("# TYPE smart_credit_scoring_oldest_ready_job_age_seconds gauge");
  lines.push(
    metricLine(
      "smart_credit_scoring_oldest_ready_job_age_seconds",
      number(row.oldest_ready_age_seconds),
    ),
  );

  lines.push(
    "# HELP smart_credit_scoring_jobs_failed_5m Задачи скоринга, завершившиеся ошибкой за последние 5 минут",
  );
  lines.push("# TYPE smart_credit_scoring_jobs_failed_5m gauge");
  lines.push(
    metricLine("smart_credit_scoring_jobs_failed_5m", number(row.failed_5m)),
  );
}
