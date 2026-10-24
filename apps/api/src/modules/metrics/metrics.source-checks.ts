import type { DataSource } from "typeorm";

import { metricLine, number, rowsOf } from "./metrics.format.ts";

export async function collectSourceChecksMetrics(
  db: DataSource,
  lines: string[],
): Promise<void> {
  const rows = rowsOf(
    await db.query(
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
  lines.push(metricLine("smart_credit_source_checks_total", number(row.total)));

  lines.push(
    "# HELP smart_credit_source_checks_failed_total Проверки источников с ошибкой",
  );
  lines.push("# TYPE smart_credit_source_checks_failed_total counter");
  lines.push(
    metricLine("smart_credit_source_checks_failed_total", number(row.failed)),
  );
}
