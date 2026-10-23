import type {
  ApiApplication,
  ApiProductCatalog,
} from "@repo/contracts/api";
import type {
  Application,
  Employee,
} from "@repo/contracts/application";
import { productRate } from "@repo/contracts/product-catalog";

import type { ArmProduct } from "./types";

function statusOf(status: ApiApplication["status"]): Application["status"] {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "NEEDS_INFO":
      return "needs_client";
    case "OFFERED":
      return "approved";
    case "REJECTED":
    case "CANCELLED":
      return "rejected";
    case "FUNDED":
      return "disbursed";
    default:
      return "in_review";
  }
}

export function toArmApplication(application: ApiApplication): Application {
  const scoring = application.scoring;
  return {
    id: application.id,
    number: application.number,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    status: statusOf(application.status),
    stage: scoring ? "decision" : "scoring",
    waitingOn: scoring ? "employee" : "system",
    hold: null,
    urgent: false,
    urgentReason: null,
    comments: [],
    handoff: null,
    blocker: scoring?.reasons[0] ?? "Проверка заявки выполняется",
    assigneeId: null,
    applicant: {
      inn: application.inn,
      ogrn: "Не загружен",
      name: "Компания из профиля",
      legalForm: "ooo",
      okved: "Не загружен",
      region: "Не указан",
      registeredAt: "Не загружена",
      director: "Не указан",
      annualRevenue: 0,
    },
    request: {
      productId: application.productId,
      amount: application.amount,
      termMonths: application.termMonths,
      purpose: application.purpose,
    },
    checks: [],
    scoring: scoring
      ? {
          model: scoring.model,
          base: scoring.score,
          score: scoring.score,
          band: scoring.riskBand,
          factors: scoring.factors.map((factor) => ({
            id: factor.id,
            label: factor.label,
            input: factor.value,
            points: factor.impact,
            source: "application" as const,
          })),
          computedAt: application.updatedAt,
        }
      : null,
    decision: null,
    offer: null,
    requestedInfo: [],
    rejectReason: null,
    events: [],
  };
}

export function toArmProducts(catalog: ApiProductCatalog): ArmProduct[] {
  return catalog.products.map((product) => ({
    ...product,
    ratePct: productRate(product, catalog.keyRate),
  }));
}

export function toEmployees(employees: Employee[]): Employee[] {
  return employees;
}
