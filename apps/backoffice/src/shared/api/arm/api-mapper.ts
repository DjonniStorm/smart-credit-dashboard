import type {
  ApiApplication,
  ApiApplicationContext,
  ApiCheckSnapshot,
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
  return mapApplication(application);
}

export function toArmApplicationContext(
  context: ApiApplicationContext,
): Application {
  return mapApplication(context.application, context);
}

function mapApplication(
  application: ApiApplication,
  context?: ApiApplicationContext,
): Application {
  const scoring = application.scoring;
  const profile = context?.companyProfile.profile;
  return {
    id: application.id,
    number: application.number,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    status: statusOf(application.status),
    stage: scoring ? "decision" : "scoring",
    waitingOn: scoring ? "employee" : "system",
    hold: null,
    urgent: application.urgent,
    urgentReason: application.urgentReason,
    autonomy: context?.autonomy,
    comments: application.comments,
    handoff: null,
    blocker: scoring?.reasons[0] ?? "Проверка заявки выполняется",
    assigneeId: application.assigneeId,
    applicant: {
      inn: application.inn,
      ogrn: profile?.ogrn ?? "Не загружен",
      name: profile?.name ?? "Компания из профиля",
      legalForm: profile?.legalForm ?? "ooo",
      okved: profile?.okved ?? "Не загружен",
      region: profile?.region ?? "Не указан",
      registeredAt: profile?.registeredAt ?? "Не загружена",
      director: profile?.director ?? "Не указан",
      annualRevenue: 0,
    },
    request: {
      productId: application.productId,
      amount: application.amount,
      termMonths: application.termMonths,
      purpose: application.purpose,
    },
    checks: context
      ? context.checks.map(toCheck).filter((check): check is Application["checks"][number] => {
          return check !== null;
        })
      : [],
    scoring: scoring
      ? {
          model: scoring.model,
          modelVersion: scoring.modelVersion,
          base: scoring.score,
          score: scoring.score,
          band: scoring.riskBand,
          grade: scoring.grade,
          pd: scoring.pd,
          healthIndex: scoring.healthIndex,
          readinessIndex: scoring.readinessIndex,
          confidence: scoring.confidence,
          recommendation: scoring.recommendation,
          reasons: scoring.reasons,
          nextActions: scoring.nextActions,
          factors: scoring.factors.map((factor) => {
            return {
              id: factor.id,
              label: factor.label,
              input: factor.value,
              points: factor.impact,
              source: factorSource(factor.source),
            };
          }),
          computedAt: application.updatedAt,
        }
      : null,
    decision: context?.decision
      ? {
          recommendation: context.decision.recommendation,
          rules: context.decision.rules.map((rule) => {
            return {
              id: rule.id,
              label: rule.id,
              outcome: rule.outcome,
              detail: rule.detail,
            };
          }),
          terms: null,
          explanation:
            context.decision.reasons[0] ?? "Рекомендация сформирована scoring",
          computedAt: application.updatedAt,
        }
      : null,
    offer: application.offer,
    requestedInfo: application.requestedInfo,
    rejectReason: application.rejectReason as Application["rejectReason"],
    events:
      context?.audit.map((event) => {
        return {
          id: event.id,
          applicationId: event.applicationId,
          at: event.at,
          actor: { kind: "system" as const, name: "Система" },
          title: event.kind,
          comment: null,
          fromStatus: null,
          toStatus: null,
          kind: "action" as const,
          metadata: Object.fromEntries(
            Object.entries(event.metadata).map(([key, value]) => {
              return [key, String(value)];
            }),
          ),
        };
      }) ?? [],
  };
}

function factorSource(source?: string): "egrul" | "fns" | "bki" | "application" {
  if (source === "egrul" || source === "fns" || source === "bki") {
    return source;
  }
  return "application";
}

function toCheck(snapshot: ApiCheckSnapshot): Application["checks"][number] | null {
  if (snapshot.source === "bank_turnover") {
    return null;
  }
  const state =
    snapshot.state === "confirmed"
      ? "passed"
      : snapshot.state === "discrepancy"
        ? "warning"
        : snapshot.state === "manual_check" || snapshot.state === "unavailable"
          ? "unavailable"
          : "pending";
  return {
    source: snapshot.source,
    state,
    summary: snapshot.summary,
    facts: snapshot.facts.map((fact) => {
      return {
        label: fact.label,
        value: fact.value,
      };
    }),
    requestedAt: snapshot.checkedAt ?? new Date().toISOString(),
    respondedAt: snapshot.checkedAt,
    responseMs: null,
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
