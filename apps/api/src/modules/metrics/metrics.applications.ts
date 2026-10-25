import type { DataSource } from "typeorm";

import { metricLine, number, rowsOf } from "./metrics.format.ts";

export async function collectApplicationsMetrics(
  db: DataSource,
  lines: string[],
): Promise<void> {
  const totalRows = rowsOf(
    await db.query("select count(*)::int as n from applications"),
  );
  lines.push("# HELP smart_credit_applications Всего заявок в системе");
  lines.push("# TYPE smart_credit_applications gauge");
  lines.push(metricLine("smart_credit_applications", number(totalRows[0]?.n)));

  const statusRows = rowsOf(
    await db.query(
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
    await db.query(
      "select count(*)::int as n from applications where decision is not null",
    ),
  );
  lines.push("# HELP smart_credit_decisions Заявки с зафиксированным решением");
  lines.push("# TYPE smart_credit_decisions gauge");
  lines.push(metricLine("smart_credit_decisions", number(decisionRows[0]?.n)));
}
