import { randomUUID } from "node:crypto";

import type { EntityManager } from "typeorm";

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
       client_reply=$15, deal=$16, cancelled_by=$17 where id=$1`,
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
      ],
    );
  }

  async appendEvent(
    applicationId: string,
    kind: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const rows = await this.manager.query(
      "insert into application_events(application_id,kind,payload) values($1,$2,$3) returning id",
      [applicationId, kind, payload],
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
