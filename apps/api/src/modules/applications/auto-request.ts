import type { CompanyDiscrepancy } from "@repo/contracts/company-profile";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import type { DecisionResult } from "./decision-engine.ts";

/** Запрос клиенту: список подтверждений и человекочитаемые причины. */
export interface AutoRequest {
  items: string[];
  reasons: string[];
}

/**
 * Системный запрос по расхождениям источников (ИНН, название, адрес, вид
 * деятельности): те же сценарии, что формируют companySourceSnapshot. Возвращает
 * null, если запрашивать нечего или нельзя (заявка не на рассмотрении, запрос
 * уже открыт, пауза/блокировка, стоп-фактор скоринга).
 */
export function buildAutoRequest(
  application: ApplicationWorkflow,
  decision: DecisionResult,
  discrepancies: CompanyDiscrepancy[],
): AutoRequest | null {
  if (
    discrepancies.length === 0 ||
    decision.recommendation === "reject" ||
    application.status !== "in_review" ||
    application.requestedInfo.length > 0 ||
    application.hold
  ) {
    return null;
  }
  return {
    items: [...new Set(discrepancies.map((item) => item.nextStep))],
    reasons: discrepancies.map(
      (item) => `${item.label}: ${item.firstValue} / ${item.secondValue}`,
    ),
  };
}
