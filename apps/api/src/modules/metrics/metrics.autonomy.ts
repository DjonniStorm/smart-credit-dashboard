import type { DataSource } from "typeorm";

import { metricLine, number, rowsOf } from "./metrics.format.ts";

export async function collectAutonomyMetrics(
  db: DataSource,
  lines: string[],
): Promise<void> {
  const totalRows = rowsOf(
    await db.query("select count(*)::int as n from autonomy_policies"),
  );
  lines.push(
    "# HELP smart_credit_autonomy_policies Всего политик автономности",
  );
  lines.push("# TYPE smart_credit_autonomy_policies gauge");
  lines.push(
    metricLine("smart_credit_autonomy_policies", number(totalRows[0]?.n)),
  );

  const policyRows = rowsOf(
    await db.query(
      "select product_id, payload from autonomy_policies order by product_id",
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
    const payload = (row.payload as Record<string, unknown> | undefined) ?? {};
    const config =
      (payload.config as Record<string, unknown> | undefined) ?? {};
    const metrics =
      (payload.metrics as Record<string, unknown> | undefined) ?? {};
    lines.push(
      metricLine("smart_credit_autonomy_policy_info", 1, {
        product,
        level: String(config.level ?? "unknown"),
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
