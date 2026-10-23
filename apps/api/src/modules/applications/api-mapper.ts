import type {
  ApiApplication,
  ApiDecision,
  ApiJob,
  ApiScoring,
  PublicApplicationStatus,
} from "@repo/contracts/api";
import type { ApplicationWorkflow, ScoringJob } from "@repo/contracts/workflow";

const statusMap: Record<ApplicationWorkflow["status"], PublicApplicationStatus> = {
  draft: "DRAFT",
  in_review: "UNDER_REVIEW",
  needs_client: "NEEDS_INFO",
  approved: "OFFERED",
  rejected: "REJECTED",
};

export function toApiApplication(application: ApplicationWorkflow): ApiApplication {
  return {
    id: application.id,
    number: application.number,
    inn: application.inn,
    productId: application.productId as ApiApplication["productId"],
    amount: application.amount,
    termMonths: application.termMonths,
    purpose: application.purpose,
    status: statusMap[application.status],
    offerKind: application.offerKind,
    offer: application.offer,
    requestedInfo: application.requestedInfo,
    rejectReason: application.rejectReason,
    assigneeId: application.assigneeId,
    urgent: application.urgent,
    urgentReason: application.urgentReason,
    comments: application.comments,
    checkJobId: application.checkJobId,
    scoring: application.scoring?.details ?? null,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
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
    result: job.result?.details ?? null,
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
    factors: response.factors ?? [],
    reasons: response.reasons ?? [],
    nextActions: response.next_actions ?? [],
  };
}
