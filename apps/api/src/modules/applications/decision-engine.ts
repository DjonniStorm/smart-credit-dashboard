import type { ApplicationWorkflow } from "@repo/contracts/workflow";
import type { ScoreResponse } from "@repo/contracts";

export type DecisionRecommendation = "approve" | "counter_offer" | "request_info" | "manual_review" | "reject";

export interface DecisionResult {
  recommendation: DecisionRecommendation;
  reasons: string[];
  rules: Array<{ id: string; outcome: "pass" | "attention" | "fail"; detail: string }>;
  autonomyMode: "shadow" | "assist" | "controlled";
}

/** Product rules are deliberately deterministic and auditable. ML recommends; rules decide. */
export function decide(application: ApplicationWorkflow, scoring: ScoreResponse): DecisionResult {
  const rules: DecisionResult["rules"] = [];
  if (scoring.readiness_index < 100) {
    rules.push({ id: "data-completeness", outcome: "attention", detail: "Не все данные и документы подтверждены" });
  } else {
    rules.push({ id: "data-completeness", outcome: "pass", detail: "Все обязательные данные подтверждены" });
  }
  if (scoring.risk_band === "high") {
    rules.push({ id: "risk-band", outcome: "fail", detail: "Высокий риск по результату scoring" });
    return { recommendation: "reject", reasons: scoring.reasons, rules, autonomyMode: "shadow" };
  }
  if (scoring.recommendation === "request_info" || scoring.readiness_index < 100) {
    return { recommendation: "request_info", reasons: scoring.reasons, rules, autonomyMode: "shadow" };
  }
  if (scoring.recommendation === "counter_offer") {
    rules.push({ id: "debt-load", outcome: "attention", detail: "Сумма требует изменения условий" });
    return { recommendation: "counter_offer", reasons: scoring.reasons, rules, autonomyMode: "shadow" };
  }
  if (scoring.recommendation === "approve" && scoring.confidence >= 0.8 && application.amount <= 5_000_000) {
    rules.push({ id: "approval-limit", outcome: "pass", detail: "Сумма и confidence в пределах автономного лимита" });
    return { recommendation: "approve", reasons: scoring.reasons, rules, autonomyMode: "assist" };
  }
  rules.push({ id: "manual-review", outcome: "attention", detail: "Профиль передан сотруднику банка" });
  return { recommendation: "manual_review", reasons: scoring.reasons, rules, autonomyMode: "shadow" };
}
