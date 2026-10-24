import type {
  ApiApplication,
  ApiApplicationManagement,
  ApiDecision,
  ApiJob,
  ApiScoring,
  PublicApplicationStatus,
} from "@repo/contracts/api";
import type { ApplicationComment } from "@repo/contracts/application";
import type { ApplicationWorkflow, ScoringJob } from "@repo/contracts/workflow";

import { deriveFlow } from "./application-flow.ts";

const statusMap: Record<
  ApplicationWorkflow["status"],
  PublicApplicationStatus
> = {
  draft: "DRAFT",
  in_review: "UNDER_REVIEW",
  needs_client: "NEEDS_INFO",
  approved: "OFFERED",
  counter_offer: "OFFERED",
  accepted: "ACCEPTED",
  signing: "SIGNING",
  funded: "FUNDED",
  rejected: "REJECTED",
  cancelled: "CANCELLED",
};

/** Сделка видна клиенту, только пока она жива: отмена после принятия её закрывает. */
const dealStatuses = new Set<ApplicationWorkflow["status"]>([
  "accepted",
  "signing",
  "funded",
]);

function publicStatus(
  application: ApplicationWorkflow,
): PublicApplicationStatus {
  return application.hold?.state === "blocked"
    ? "BLOCKED"
    : statusMap[application.status];
}

function offerKind(
  application: ApplicationWorkflow,
): ApiApplication["offerKind"] {
  if (application.status === "approved") {
    return "initial";
  }
  if (application.status === "counter_offer") {
    return "counter";
  }
  return application.deal?.offerKind ?? null;
}

/** Строки, записанные до исправления, хранят source: null у факторов. */
function readScoring(details: ApiScoring | undefined): ApiScoring | null {
  if (!details) {
    return null;
  }
  return {
    ...details,
    factors: details.factors.map((factor) => ({
      ...factor,
      source: factor.source ?? undefined,
    })),
  };
}

/** Клиенту показываем запрос без автора решения: это внутренняя запись АРМ. */
function clientUrgentRequest(
  request: ApplicationWorkflow["urgentRequest"],
): ApiApplication["urgentRequest"] {
  if (!request) {
    return null;
  }
  return {
    state: request.state,
    reason: request.reason,
    requestedAt: request.requestedAt,
    resolvedAt: request.resolvedAt,
    declineReason: request.declineReason,
  };
}

export function toApiApplication(
  application: ApplicationWorkflow,
  clientComments: ApplicationComment[] = [],
): ApiApplication {
  return {
    id: application.id,
    number: application.number,
    inn: application.inn,
    productId: application.productId as ApiApplication["productId"],
    amount: application.amount,
    termMonths: application.termMonths,
    purpose: application.purpose,
    status: publicStatus(application),
    offerKind: offerKind(application),
    checkJobId: application.checkJobId,
    scoring: readScoring(application.scoring?.details),
    autonomyCase: application.autonomyCase,
    offer: application.offer,
    requestedInfo: application.requestedInfo,
    rejectReason: application.rejectReason,
    clientReply: application.clientReply,
    deal: dealStatuses.has(application.status) ? application.deal : null,
    cancelledBy: application.cancelledBy,
    cancelledFrom: application.cancelledFrom,
    urgentRequest: clientUrgentRequest(application.urgentRequest),
    urgentBy: application.urgent
      ? (application.urgentSource?.by ?? null)
      : null,
    clientComments,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

export function toApiManagement(
  application: ApplicationWorkflow,
  comments: ApplicationComment[],
): ApiApplicationManagement {
  const flow = deriveFlow(application);
  return {
    ...flow,
    businessStatus: application.status,
    hold: application.hold,
    urgent: application.urgent,
    urgentReason: application.urgentReason,
    urgentSource: application.urgentSource,
    urgentRequest: application.urgentRequest,
    assigneeId: application.assigneeId,
    handoff: application.handoff,
    comments,
  };
}

export function toApiDecision(decision: {
  recommendation: ApiDecision["recommendation"];
  reasons: string[];
  rules: ApiDecision["rules"];
  autonomyMode: ApiDecision["autonomyMode"];
}): ApiDecision {
  return {
    recommendation: decision.recommendation,
    reasons: decision.reasons,
    rules: decision.rules,
    autonomyMode: decision.autonomyMode,
  };
}

export function toApiJob(job: ScoringJob): ApiJob {
  return {
    id: job.id,
    applicationId: job.applicationId,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    error: job.error,
    attempts: job.attempts,
    result: readScoring(job.result?.details),
  };
}

export function toApiScoring(response: {
  score: number;
  model: string;
  model_version?: string;
  grade?: "A" | "B" | "C" | "D";
  risk_band?: "low" | "moderate" | "high";
  pd?: number;
  health_index?: number;
  readiness_index?: number;
  confidence?: number;
  recommendation?: ApiScoring["recommendation"];
  factors?: ApiScoring["factors"];
  reasons?: string[];
  next_actions?: string[];
}): ApiScoring {
  return {
    score: response.score,
    model: response.model,
    modelVersion: response.model_version ?? response.model,
    grade: response.grade ?? "C",
    riskBand: response.risk_band ?? "moderate",
    pd: response.pd ?? 0.2,
    healthIndex: response.health_index ?? 0,
    readinessIndex: response.readiness_index ?? 0,
    confidence: response.confidence ?? 0,
    recommendation: response.recommendation ?? "manual_review",
    // Scoring возвращает source: null для факторов без источника, контракт ждёт строку или отсутствие поля.
    factors: (response.factors ?? []).map((factor) => ({
      ...factor,
      source: factor.source ?? undefined,
    })),
    reasons: response.reasons ?? [],
    nextActions: response.next_actions ?? [],
  };
}
