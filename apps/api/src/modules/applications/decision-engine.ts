import type { ScoreResponse } from "@repo/contracts";
import { checkAutonomyEligibility } from "@repo/contracts";
import type { ApiAutonomySnapshot } from "@repo/contracts/api";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

export type DecisionRecommendation =
  "approve" | "counter_offer" | "request_info" | "manual_review" | "reject";

export interface DecisionResult {
  recommendation: DecisionRecommendation;
  reasons: string[];
  rules: Array<{
    id: string;
    outcome: "pass" | "attention" | "fail";
    detail: string;
  }>;
  autonomyMode: "shadow" | "assist" | "controlled";
}

/** Product rules are deliberately deterministic and auditable. ML recommends; rules decide. */
export function decide(
  application: ApplicationWorkflow,
  scoring: ScoreResponse,
  autonomy?: ApiAutonomySnapshot,
): DecisionResult {
  const rules: DecisionResult["rules"] = [];
  const readinessIndex = scoring.readiness_index ?? 0;
  const reasons = scoring.reasons ?? [];
  if (readinessIndex < 100) {
    rules.push({
      id: "data-completeness",
      outcome: "attention",
      detail: "Не все данные и документы подтверждены",
    });
  } else {
    rules.push({
      id: "data-completeness",
      outcome: "pass",
      detail: "Все обязательные данные подтверждены",
    });
  }
  if (scoring.risk_band === "high") {
    rules.push({
      id: "risk-band",
      outcome: "fail",
      detail: "Высокий риск по результату scoring",
    });
    return { recommendation: "reject", reasons, rules, autonomyMode: "shadow" };
  }
  if (scoring.recommendation === "reject") {
    rules.push({
      id: "scoring-stop",
      outcome: "fail",
      detail: "Scoring вернул стоп-фактор",
    });
    return { recommendation: "reject", reasons, rules, autonomyMode: "shadow" };
  }
  if (scoring.recommendation === "request_info" || readinessIndex < 100) {
    return {
      recommendation: "request_info",
      reasons,
      rules,
      autonomyMode: "shadow",
    };
  }
  if (scoring.recommendation === "counter_offer") {
    rules.push({
      id: "debt-load",
      outcome: "attention",
      detail: "Сумма требует изменения условий",
    });
    return {
      recommendation: "counter_offer",
      reasons,
      rules,
      autonomyMode: "shadow",
    };
  }
  const missingSources = scoring.missing_sources ?? [];
  if (missingSources.length > 0) {
    rules.push({
      id: "source-gap",
      outcome: "attention",
      detail: `Нет данных источников: ${missingSources.join(", ")}`,
    });
    return {
      recommendation: "manual_review",
      reasons,
      rules,
      autonomyMode: "shadow",
    };
  }
  if (scoring.recommendation === "approve") {
    const mode = autonomy
      ? resolveAutonomyMode(application, scoring, autonomy)
      : "assist";
    rules.push({
      id: "approval-limit",
      outcome: "pass",
      detail: autonomy
        ? "Условия допуска автономности взяты из policy"
        : "Рекомендация готова к ручному подтверждению",
    });
    return {
      recommendation: "approve",
      reasons,
      rules,
      autonomyMode: mode,
    };
  }
  rules.push({
    id: "manual-review",
    outcome: "attention",
    detail: "Профиль передан сотруднику банка",
  });
  return {
    recommendation: "manual_review",
    reasons,
    rules,
    autonomyMode: "shadow",
  };
}

function resolveAutonomyMode(
  application: ApplicationWorkflow,
  scoring: ScoreResponse,
  autonomy: ApiAutonomySnapshot,
): DecisionResult["autonomyMode"] {
  if (autonomy.config.level === "paused") {
    return "shadow";
  }
  if (autonomy.config.level === "new") {
    return "shadow";
  }
  if (autonomy.config.level === "verified") {
    return "assist";
  }
  const eligibility = checkAutonomyEligibility(
    autonomy.config,
    autonomy.metrics,
  );
  if (
    autonomy.metrics.calibrationStatus !== "available" ||
    autonomy.metrics.driftStatus !== "clear"
  ) {
    return "assist";
  }
  const gradeRank: Record<string, number> = { A: 4, B: 3, C: 2, D: 1 };
  const grade = scoring.grade ?? "D";
  const minimumGrade = autonomy.config.minGrade;
  const confidence = scoring.confidence ?? 0;
  const missingSources = scoring.missing_sources ?? [];
  const amountInBand =
    application.amount >= autonomy.config.amountBand.min &&
    application.amount <= autonomy.config.amountBand.max;
  if (
    eligibility.eligible &&
    amountInBand &&
    confidence >= autonomy.config.minConfidence &&
    (gradeRank[grade] ?? 0) >= (gradeRank[minimumGrade] ?? 0) &&
    scoring.readiness_index === 100 &&
    missingSources.length === 0
  ) {
    return "controlled";
  }
  return "assist";
}
