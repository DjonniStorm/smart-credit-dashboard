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
  lines.push("# TYPE smart_credit_source_checks_total gauge");
  lines.push(metricLine("smart_credit_source_checks_total", number(row.total)));

  lines.push(
    "# HELP smart_credit_source_checks_failed_total Проверки источников с ошибкой",
  );
  lines.push("# TYPE smart_credit_source_checks_failed_total gauge");
  lines.push(
    metricLine("smart_credit_source_checks_failed_total", number(row.failed)),
  );

  const groupedRows = rowsOf(
    await db.query(
      `select source, status, count(*)::int as count
       from source_checks
       where source in ('egrul', 'bki', 'fns') and status in ('ok', 'failed')
       group by source, status`,
    ),
  );
  lines.push(
    "# HELP smart_credit_source_checks_by_source_status Число проверок источников по источнику и статусу (снимок БД)",
  );
  lines.push("# TYPE smart_credit_source_checks_by_source_status gauge");
  for (const item of groupedRows) {
    lines.push(
      metricLine(
        "smart_credit_source_checks_by_source_status",
        number(item.count),
        { source: String(item.source), status: String(item.status) },
      ),
    );
  }
}
