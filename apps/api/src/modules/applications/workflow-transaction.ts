import { randomUUID } from "node:crypto";

import type { EntityManager } from "typeorm";

import { autonomyMetricsSchema } from "@repo/contracts";
import type { ApplicationComment } from "@repo/contracts/application";
import type { ApplicationWorkflow } from "@repo/contracts/workflow";

import { applicationFromRow } from "./workflow-rows.ts";

export function commentFromRow(
  row: Record<string, unknown>,
): ApplicationComment {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    at: new Date(String(row.created_at)).toISOString(),
    author: row.author as ApplicationComment["author"],
    visibility: row.visibility as ApplicationComment["visibility"],
    body: String(row.body),
  };
}

/** Запись команды сотрудника или клиента: всё, что она меняет, фиксируется одной транзакцией. */
export class WorkflowTransaction {
  constructor(private readonly manager: EntityManager) {}

  async lockApplication(id: string): Promise<ApplicationWorkflow | null> {
    const rows = await this.manager.query(
      "select * from applications where id=$1 for update",
      [id],
    );
    return rows[0] ? applicationFromRow(rows[0]) : null;
  }

  /** Принятые предложения без паузы; занятые другим воркером строки пропускаются. */
  async lockAcceptedApplications(): Promise<ApplicationWorkflow[]> {
    const rows = await this.manager.query(
      `select * from applications where status='accepted' and hold is null
       order by updated_at limit 20 for update skip locked`,
    );
    return rows.map(applicationFromRow);
  }

  async findIdempotent(scope: string, key: string): Promise<string | null> {
    const rows = await this.manager.query(
      "select resource_id from idempotency_keys where scope=$1 and key=$2",
      [scope, key],
    );
    return rows[0]?.resource_id ?? null;
  }

  async remember(
    scope: string,
    key: string,
    resourceId: string,
  ): Promise<void> {
    await this.manager.query(
      "insert into idempotency_keys(scope,key,resource_id) values($1,$2,$3) on conflict do nothing",
      [scope, key, resourceId],
    );
  }

  async saveManagement(application: ApplicationWorkflow): Promise<void> {
    await this.manager.query(
      `update applications set status=$2, offer=$3, requested_info=$4, reject_reason=$5,
       hold=$6, urgent=$7, urgent_reason=$8, assignee_id=$9, handoff=$10,
       check_job_id=$11, scoring=$12, decision=$13, updated_at=$14,
       client_reply=$15, deal=$16, cancelled_by=$17, autonomy_case=$18,
       urgent_source=$19, urgent_request=$20, cancelled_from=$21 where id=$1`,
      [
        application.id,
        application.status,
        application.offer,
        JSON.stringify(application.requestedInfo),
        application.rejectReason,
        application.hold,
        application.urgent,
        application.urgentReason,
        application.assigneeId,
        application.handoff,
        application.checkJobId,
        application.scoring,
        application.decision,
        application.updatedAt,
        application.clientReply,
        application.deal,
        application.cancelledBy,
        application.autonomyCase,
        application.urgentSource,
        application.urgentRequest,
        application.cancelledFrom,
      ],
    );
  }

  async applyAutonomyAction(
    current: ApplicationWorkflow,
    next: ApplicationWorkflow,
    actionType: string,
    actor: { id: string; role: string },
    idempotencyKey: string,
  ): Promise<void> {
    const currentCase = current.autonomyCase;
    if (!currentCase) {
      return;
    }
    const rows = await this.manager.query(
      "select payload from autonomy_policies where product_id=$1 for update",
      [current.productId],
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      return;
    }
    const payload = row.payload as Record<string, unknown>;
    const metrics = autonomyMetricsSchema.parse(payload.metrics);
    const isManualOverride = [
      "intercept_autonomy",
      "counter_offer",
      "reject",
      "request_info",
    ].includes(actionType);
    const shouldCountOverride =
      currentCase.eligible && isManualOverride && !currentCase.overrideCounted;
    const shouldClose =
      ["accept_offer", "reject", "cancel", "decline_offer", "sign"].includes(
        actionType,
      ) && !currentCase.closed;
    if (!shouldCountOverride && !shouldClose) {
      return;
    }
    const manualOverrides =
      metrics.manualOverrides + (shouldCountOverride ? 1 : 0);
    const closedCases = metrics.closedCases + (shouldClose ? 1 : 0);
    const eligibleCases = Math.max(metrics.eligibleCases, 0);
    const nextMetrics = {
      ...metrics,
      manualOverrides,
      closedCases,
      manualOverrideRate:
        eligibleCases === 0 ? 0 : manualOverrides / eligibleCases,
      computedAt: new Date().toISOString(),
    };
    if (shouldCountOverride || shouldClose) {
      await this.manager.query(
        `update autonomy_policies set payload=$2, updated_at=now()
          where product_id=$1`,
        [current.productId, { ...payload, metrics: nextMetrics }],
      );
      await this.manager.query(
        `insert into autonomy_policy_audits
          (product_id, policy_id, application_id, actor_id, actor_role, action,
           from_level, to_level, reason, idempotency_key, metrics_before, metrics_after)
         values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          current.productId,
          currentCase.policyId,
          current.id,
          actor.id,
          actor.role,
          actionType,
          currentCase.mode === "controlled" ? "stable" : "verified",
          currentCase.mode === "controlled" ? "stable" : "verified",
          next.autonomyCase?.disposition === "intercepted"
            ? "Перехват автоодобрения"
            : "Завершение автономного кейса",
          idempotencyKey,
          metrics,
          nextMetrics,
        ],
      );
    }
    if (shouldCountOverride) {
      await this.manager.query(
        `insert into application_events(event_key, application_id, kind, payload)
         values($1, $2, 'autonomy_override', $3)`,
        [
          `autonomy-override-${randomUUID()}`,
          current.id,
          {
            actionType,
            actorKind: actor.role === "client" ? "client" : "employee",
            actorId: actor.id,
            policyId: currentCase.policyId,
            reason:
              next.autonomyCase?.disposition === "intercepted"
                ? "Перехват автоодобрения"
                : "Ручное решение поверх допуска",
          },
        ],
      );
    }
    next.autonomyCase = {
      ...currentCase,
      overrideCounted: currentCase.overrideCounted || shouldCountOverride,
      closed: currentCase.closed || shouldClose,
      disposition:
        next.autonomyCase?.disposition === "intercepted"
          ? "intercepted"
          : actionType === "decline_offer"
            ? "declined"
            : shouldClose
              ? "confirmed"
              : currentCase.disposition,
    };
  }

  async appendEvent(
    applicationId: string,
    kind: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const rows = await this.manager.query(
      "insert into application_events(event_key,application_id,kind,payload) values($1,$2,$3,$4) returning id",
      [`event-${randomUUID()}`, applicationId, kind, payload],
    );
    return String(rows[0].id);
  }

  async addComment(
    comment: Omit<ApplicationComment, "id">,
  ): Promise<ApplicationComment> {
    const id = `cmt-${randomUUID()}`;
    await this.manager.query(
      `insert into application_comments(id,application_id,visibility,author,body,created_at)
       values($1,$2,$3,$4,$5,$6)`,
      [
        id,
        comment.applicationId,
        comment.visibility,
        comment.author,
        comment.body,
        comment.at,
      ],
    );
    return { id, ...comment };
  }

  async queueRecheck(
    applicationId: string,
    idempotencyKey: string,
  ): Promise<string> {
    const id = `job-${randomUUID()}`;
    await this.manager.query(
      `insert into scoring_jobs(id,application_id,status,idempotency_key,created_at,attempts)
       values($1,$2,'queued',$3,now(),0)`,
      [id, applicationId, `recheck:${idempotencyKey}`],
    );
    return id;
  }
}
