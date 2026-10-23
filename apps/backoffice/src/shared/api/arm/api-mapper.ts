import type {
  ApiApplication,
  ApiApplicationContext,
  ApiApplicationManagement,
  ApiAuditEvent,
  ApiCheckSnapshot,
  ApiProductCatalog,
  ApiQueueItem,
} from "@repo/contracts/api";
import type { Application, Employee } from "@repo/contracts/application";
import { productRate } from "@repo/contracts/product-catalog";

import type { ArmProduct } from "./types";

function statusOf(
  status: ApiApplicationManagement["businessStatus"],
): Application["status"] {
  switch (status) {
    case "draft":
      return "draft";
    case "needs_client":
      return "needs_client";
    case "counter_offer":
      return "counter_offer";
    case "approved":
    case "accepted":
    case "signing":
      return "approved";
    case "funded":
      return "disbursed";
    case "rejected":
    case "cancelled":
      return "rejected";
    default:
      return "in_review";
  }
}

export function toArmApplication(item: ApiQueueItem): Application {
  return mapApplication(item.application, item.management);
}

export function toArmApplicationContext(
  context: ApiApplicationContext,
): Application {
  return mapApplication(context.application, context.management, context);
}

function mapApplication(
  application: ApiApplication,
  management: ApiApplicationManagement,
  context?: ApiApplicationContext,
): Application {
  const scoring = application.scoring;
  const profile = context?.companyProfile.profile;
  return {
    id: application.id,
    number: application.number,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
    status: statusOf(management.businessStatus),
    stage: management.stage,
    waitingOn: management.waitingOn,
    hold: management.hold,
    urgent: management.urgent,
    urgentReason: management.urgentReason,
    urgentSource: management.urgentSource,
    urgentRequest: management.urgentRequest,
    autonomy: context?.autonomy,
    autonomyCase: application.autonomyCase,
    comments: management.comments,
    handoff: management.handoff,
    blocker: management.blocker,
    assigneeId: management.assigneeId,
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
      ? context.checks
          .map(toCheck)
          .filter((check): check is Application["checks"][number] => {
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
    rejectReason: application.rejectReason,
    events: context?.audit.map(toArmEvent) ?? [],
  };
}

const eventKinds = new Set([
  "status_changed",
  "action",
  "comment_added",
  "handoff",
  "hold",
  "autonomy_candidate",
  "autonomy_auto_offer",
  "autonomy_intercepted",
  "autonomy_expired",
  "autonomy_override",
  "autonomy_policy_changed",
]);

const armStatusByWorkflow: Record<string, Application["status"]> = {
  draft: "draft",
  in_review: "in_review",
  needs_client: "needs_client",
  approved: "approved",
  counter_offer: "counter_offer",
  rejected: "rejected",
  cancelled: "rejected",
};

/**
 * Событие сотрудника несёт автора, заголовок и переход статуса в metadata;
 * остальные события конвейера показываются как системные.
 */
function toArmEvent(event: ApiAuditEvent): Application["events"][number] {
  const metadata = Object.fromEntries(
    Object.entries(event.metadata).map(([key, value]) => [key, String(value)]),
  );
  const byEmployee = metadata.actorKind === "employee";
  const eventTitle =
    metadata.title ??
    {
      autonomy_candidate: "Кейс допущен к автономности",
      autonomy_auto_offer: "Автоодобрение отправлено на контроль",
      autonomy_intercepted: "Автоодобрение перехвачено",
      autonomy_expired: "Контрольное окно автоодобрения закрыто",
      autonomy_override: "Автономная рекомендация переопределена",
      autonomy_policy_changed: "Политика автономности изменена",
    }[event.kind] ??
    event.kind;
  return {
    id: event.id,
    applicationId: event.applicationId,
    at: event.at,
    actor: byEmployee
      ? { kind: "employee", name: metadata.actorName ?? "Сотрудник" }
      : { kind: "system", name: "Система" },
    title: eventTitle,
    comment:
      metadata.comment && metadata.comment !== "null" ? metadata.comment : null,
    fromStatus: armStatusByWorkflow[metadata.fromStatus ?? ""] ?? null,
    toStatus: armStatusByWorkflow[metadata.toStatus ?? ""] ?? null,
    kind: eventKinds.has(event.kind)
      ? (event.kind as NonNullable<Application["events"][number]["kind"]>)
      : "action",
    metadata,
  };
}

function factorSource(
  source?: string,
): "egrul" | "fns" | "bki" | "application" {
  if (source === "egrul" || source === "fns" || source === "bki") {
    return source;
  }
  return "application";
}

function toCheck(
  snapshot: ApiCheckSnapshot,
): Application["checks"][number] | null {
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
