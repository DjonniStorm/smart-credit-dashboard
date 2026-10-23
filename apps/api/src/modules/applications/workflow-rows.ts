import type { ApplicationWorkflow, ScoringJob } from "@repo/contracts/workflow";

type Row = Record<string, unknown>;

const iso = (value: unknown): string => new Date(String(value)).toISOString();

export function applicationFromRow(row: Row): ApplicationWorkflow {
  return {
    id: String(row.id),
    number: String(row.number),
    inn: String(row.inn),
    productId: row.product_id as ApplicationWorkflow["productId"],
    amount: Number(row.amount),
    termMonths: Number(row.term_months),
    purpose: row.purpose as ApplicationWorkflow["purpose"],
    status: row.status as ApplicationWorkflow["status"],
    offer: (row.offer as ApplicationWorkflow["offer"]) ?? null,
    requestedInfo: (row.requested_info as string[] | null) ?? [],
    rejectReason:
      (row.reject_reason as ApplicationWorkflow["rejectReason"]) ?? null,
    hold: (row.hold as ApplicationWorkflow["hold"]) ?? null,
    urgent: Boolean(row.urgent),
    urgentReason: (row.urgent_reason as string | null) ?? null,
    urgentSource:
      (row.urgent_source as ApplicationWorkflow["urgentSource"]) ?? null,
    urgentRequest:
      (row.urgent_request as ApplicationWorkflow["urgentRequest"]) ?? null,
    assigneeId: (row.assignee_id as string | null) ?? null,
    handoff: (row.handoff as ApplicationWorkflow["handoff"]) ?? null,
    clientReply:
      (row.client_reply as ApplicationWorkflow["clientReply"]) ?? null,
    deal: (row.deal as ApplicationWorkflow["deal"]) ?? null,
    cancelledBy:
      (row.cancelled_by as ApplicationWorkflow["cancelledBy"]) ?? null,
    checkJobId: (row.check_job_id as string | null) ?? null,
    scoring: (row.scoring as ApplicationWorkflow["scoring"]) ?? null,
    decision: (row.decision as ApplicationWorkflow["decision"]) ?? null,
    autonomyCase:
      (row.autonomy_case as ApplicationWorkflow["autonomyCase"]) ?? null,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function jobFromRow(row: Row): ScoringJob {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    status: row.status as ScoringJob["status"],
    idempotencyKey: String(row.idempotency_key),
    createdAt: iso(row.created_at),
    startedAt: row.started_at ? iso(row.started_at) : null,
    finishedAt: row.finished_at ? iso(row.finished_at) : null,
    error: (row.error as string | null) ?? null,
    attempts: Number(row.attempts ?? 0),
    result: (row.result as ScoringJob["result"]) ?? null,
  };
}
