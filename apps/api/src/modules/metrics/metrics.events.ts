import type { DataSource } from "typeorm";

import { metricLine, number, rowsOf } from "./metrics.format.ts";

export async function collectEventsMetrics(
  db: DataSource,
  lines: string[],
): Promise<void> {
  const rows = rowsOf(
    await db.query("select count(*)::int as n from application_events"),
  );
  lines.push(
    "# HELP smart_credit_application_events_total Всего событий по заявкам (переходы, аудит)",
  );
  lines.push("# TYPE smart_credit_application_events_total gauge");
  lines.push(
    metricLine("smart_credit_application_events_total", number(rows[0]?.n)),
  );
}
