import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";

import type { ApiAuditEvent } from "@repo/contracts/api";
import type {
  ApplicationActionRequest,
  EmployeeAction,
} from "@repo/contracts/application";
import type {
  ApplicationWorkflow,
  CreateApplicationRequest,
  ScoringJob,
} from "@repo/contracts/workflow";

type Row = Record<string, unknown>;
type JobResult = NonNullable<ScoringJob["result"]>;

export const MAX_JOB_ATTEMPTS = 3;
/** База экспоненциальной задержки retry (1 с, 2 с, 4 с, ...) и её потолок. */
export const RETRY_BASE_DELAY_MS = 1_000;
export const RETRY_MAX_DELAY_MS = 60_000;
const STALE_JOB_ERROR = "Воркер не завершил задачу в отведённое время";

export type SourceCheck = {
  source: string;
  status: "ok" | "failed";
  error?: string;
};

/** TypeORM отдаёт `[rows, count]` для UPDATE/DELETE ... RETURNING и просто rows для остальных запросов. */
function rowsOf(result: unknown): Row[] {
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as Row[];
  }
  return result as Row[];
}

function firstRow(rows: Row[]): Row {
  const row = rows[0];
  if (!row) {
    throw new Error("Запрос не вернул строку");
  }
  return row;
}

/** Хранилище заявок и очереди скоринга в Postgres. Схему создают миграции, не само хранилище. */
@Injectable()
export class WorkflowStore {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  /**
   * Создаёт заявку, задачу скоринга и ключ идемпотентности в одной транзакции.
   * Ключ вставляется первым: параллельный запрос с тем же ключом ждёт коммита и получает уже созданную заявку.
   */
  async createApplication(
    input: CreateApplicationRequest,
  ): Promise<{ application: ApplicationWorkflow; job: ScoringJob }> {
    const applicationId = `app-${randomUUID()}`;
    const jobId = `job-${randomUUID()}`;
    return this.db.transaction(async (manager) => {
      const existingJobId = await this.claimKey(
        manager,
        "create",
        input.idempotencyKey,
        jobId,
      );
      if (existingJobId) {
        const job = await this.jobIn(manager, existingJobId);
        const application =
          job && (await this.applicationIn(manager, job.applicationId));
        if (!job || !application) {
          throw new Error(
            `Ключ ${input.idempotencyKey} указывает на несуществующую заявку`,
          );
        }
        return { application, job };
      }
      const applicationRows = rowsOf(
        await manager.query(
          `insert into applications(id,number,inn,product_id,amount,term_months,purpose,status,check_job_id,scoring,created_at,updated_at)
           values($1,'SC-' || nextval('application_number_seq'),$2,$3,$4,$5,$6,'in_review',$7,null,now(),now())
           returning *`,
          [
            applicationId,
            input.inn,
            input.productId,
            input.amount,
            input.termMonths,
            input.purpose,
            jobId,
          ],
        ),
      );
      const jobRows = rowsOf(
        await manager.query(
          `insert into scoring_jobs(id,application_id,status,idempotency_key,created_at)
           values($1,$2,'queued',$3,now()) returning *`,
          [jobId, applicationId, input.idempotencyKey],
        ),
      );
      await this.eventIn(manager, applicationId, "application_created", {
        jobId,
      });
      return {
        application: this.application(firstRow(applicationRows)),
        job: this.job(firstRow(jobRows)),
      };
    });
  }

  /** Создаёт повторную проверку заявки; тот же ключ возвращает ту же задачу. */
  async createCheckJob(
    applicationId: string,
    idempotencyKey: string,
  ): Promise<ScoringJob> {
    const jobId = `job-${randomUUID()}`;
    return this.db.transaction(async (manager) => {
      const existingJobId = await this.claimKey(
        manager,
        `check:${applicationId}`,
        idempotencyKey,
        jobId,
      );
      if (existingJobId) {
        const existing = await this.jobIn(manager, existingJobId);
        if (!existing) {
          throw new Error(
            `Ключ ${idempotencyKey} указывает на несуществующую задачу`,
          );
        }
        return existing;
      }
      const rows = rowsOf(
        await manager.query(
          `insert into scoring_jobs(id,application_id,status,idempotency_key,created_at)
           values($1,$2,'queued',$3,now()) returning *`,
          [jobId, applicationId, idempotencyKey],
        ),
      );
      await this.eventIn(manager, applicationId, "check_requested", { jobId });
      return this.job(firstRow(rows));
    });
  }

  async applyAction(
    applicationId: string,
    input: ApplicationActionRequest,
  ): Promise<ApplicationWorkflow> {
    const actionResourceId = `action-${randomUUID()}`;
    return this.db.transaction(async (manager) => {
      const existing = await this.claimKey(
        manager,
        `action:${applicationId}`,
        input.idempotencyKey,
        actionResourceId,
      );
      if (existing) {
        const current = await this.applicationIn(manager, applicationId);
        if (!current) {
          throw new Error(`Заявка ${applicationId} не найдена`);
        }
        return current;
      }

      const current = await this.applicationIn(manager, applicationId);
      if (!current) {
        throw new Error(`Заявка ${applicationId} не найдена`);
      }
      const next = this.actionResult(current, input.action);
      const state = {
        offer: next.offer,
        offerKind: next.offerKind,
        requestedInfo: next.requestedInfo,
        rejectReason: next.rejectReason,
        assigneeId: next.assigneeId,
        comments: next.comments,
      };
      if (input.action.type === "rerun_check" && next.checkJobId) {
        await manager.query(
          `insert into scoring_jobs(id,application_id,status,idempotency_key,created_at)
           values($1,$2,'queued',$3,now())`,
          [next.checkJobId, current.id, `${input.idempotencyKey}:check`],
        );
      }
      await manager.query(
        `update applications set status=$2, action_state=$3, check_job_id=$4, updated_at=now()
         where id=$1`,
        [current.id, next.status, state, next.checkJobId],
      );
      await this.eventIn(manager, current.id, "application_action", {
        action: input.action.type,
        employeeId: input.employeeId,
        fromStatus: current.status,
        toStatus: next.status,
        idempotencyKey: input.idempotencyKey,
        payload: input.action,
      });
      const updated = await this.applicationIn(manager, current.id);
      if (!updated) {
        throw new Error(`Не удалось обновить заявку ${applicationId}`);
      }
      return updated;
    });
  }

  private actionResult(
    application: ApplicationWorkflow,
    action: EmployeeAction,
  ): ApplicationWorkflow {
    const state = {
      ...application,
      comments: application.comments ?? [],
      requestedInfo: application.requestedInfo ?? [],
      offer: application.offer ?? null,
      offerKind: application.offerKind ?? null,
      rejectReason: application.rejectReason ?? null,
      assigneeId: application.assigneeId ?? null,
    };
    if (action.type === "assign") {
      return { ...state, assigneeId: action.assigneeId };
    }
    if (action.type === "comment") {
      return {
        ...state,
        comments: [
          ...state.comments,
          {
            id: `comment-${randomUUID()}`,
            applicationId: application.id,
            at: new Date().toISOString(),
            author: { kind: "employee" as const, name: "Сотрудник" },
            visibility: action.visibility,
            body: action.body,
          },
        ],
      };
    }
    if (action.type === "rerun_check") {
      if (application.status === "rejected" || application.status === "approved") {
        throw new Error("Повторная проверка недоступна для завершённой заявки");
      }
      return { ...state, status: "in_review", checkJobId: `job-${randomUUID()}` };
    }
    if (action.type === "request_info") {
      this.requireReview(application);
      return {
        ...state,
        status: "needs_client",
        requestedInfo: action.items,
      };
    }
    if (action.type === "approve") {
      this.requireDecision(application);
      this.requireOverrideComment(action.comment, application.decision?.recommendation, "approve");
      return { ...state, status: "approved", offerKind: "initial" };
    }
    if (action.type === "counter_offer") {
      this.requireDecision(application);
      this.requireOverrideComment(
        action.comment,
        application.decision?.recommendation,
        "counter_offer",
      );
      return {
        ...state,
        status: "approved",
        offerKind: "counter",
        offer: action.terms,
      };
    }
    if (action.type === "reject") {
      this.requireDecision(application);
      this.requireOverrideComment(action.comment, application.decision?.recommendation, "reject");
      return { ...state, status: "rejected", rejectReason: action.reason };
    }
    throw new Error(`Действие ${action.type} пока не подключено`);
  }

  private requireReview(application: ApplicationWorkflow): void {
    if (application.status !== "in_review") {
      throw new Error("Действие доступно только на рассмотрении");
    }
  }

  private requireDecision(application: ApplicationWorkflow): void {
    this.requireReview(application);
    if (!application.scoring || !application.decision) {
      throw new Error("Сначала завершите проверку заявки");
    }
  }

  private requireOverrideComment(
    comment: string,
    recommendation: string | undefined,
    expected: string,
  ): void {
    if (recommendation !== expected && !comment.trim()) {
      throw new Error("Для решения, отличающегося от рекомендации, нужен комментарий");
    }
  }

  async getApplication(id: string): Promise<ApplicationWorkflow | null> {
    return this.applicationIn(this.db.manager, id);
  }

  async listApplications(): Promise<ApplicationWorkflow[]> {
    const rows = rowsOf(
      await this.db.query(
        "select * from applications order by created_at desc",
      ),
    );
    return rows.map((row) => this.application(row));
  }

  async getJob(id: string): Promise<ScoringJob | null> {
    return this.jobIn(this.db.manager, id);
  }

  /** Атомарно берёт одну готовую задачу, поэтому несколько реплик не обработают её дважды. */
  async claimNextQueuedJob(): Promise<ScoringJob | null> {
    const rows = rowsOf(
      await this.db.query(
        `update scoring_jobs set status='running', started_at=now(), finished_at=null, attempts=attempts+1
         where id = (
           select id from scoring_jobs
           where status='queued' and (next_attempt_at is null or next_attempt_at <= now())
           order by created_at for update skip locked limit 1
         )
         returning *`,
      ),
    );
    return rows[0] ? this.job(rows[0]) : null;
  }

  /**
   * Результат скоринга, решение, статусы источников и событие фиксируются одной транзакцией.
   * Запись применяется, только если задачу всё ещё держит эта попытка; иначе возвращает `false`.
   */
  async completeJob(
    job: ScoringJob,
    outcome: {
      result: JobResult;
      decision: ApplicationWorkflow["decision"];
      checks: SourceCheck[];
      eventPayload: unknown;
    },
  ): Promise<boolean> {
    return this.db.transaction(async (manager) => {
      const owned = rowsOf(
        await manager.query(
          `update scoring_jobs set status='succeeded', result=$2, error=null, finished_at=now(), next_attempt_at=null
           where id=$1 and status='running' and attempts=$3 returning id`,
          [job.id, outcome.result, job.attempts],
        ),
      );
      if (owned.length === 0) {
        return false;
      }
      await manager.query(
        `update applications set scoring=$2, decision=$3, updated_at=now() where id=$1`,
        [job.applicationId, outcome.result, outcome.decision],
      );
      await this.sourceChecksIn(manager, job.id, outcome.checks);
      await this.eventIn(
        manager,
        job.applicationId,
        "scoring_succeeded",
        outcome.eventPayload,
      );
      return true;
    });
  }

  /**
   * Возвращает задачу в очередь с задержкой или переводит в `failed`, если попытки закончились.
   * Как и `completeJob`, ничего не делает, если задачу уже забрала другая попытка (`null`).
   */
  async failJob(
    job: ScoringJob,
    error: string,
    retryAt: Date | null,
    checks: SourceCheck[] = [],
  ): Promise<"queued" | "failed" | null> {
    const status = retryAt ? "queued" : "failed";
    return this.db.transaction(async (manager) => {
      const owned = rowsOf(
        await manager.query(
          `update scoring_jobs set status=$2, error=$3, next_attempt_at=$4, finished_at=$5
           where id=$1 and status='running' and attempts=$6 returning id`,
          [
            job.id,
            status,
            error,
            retryAt,
            retryAt ? null : new Date(),
            job.attempts,
          ],
        ),
      );
      if (owned.length === 0) {
        return null;
      }
      await this.sourceChecksIn(manager, job.id, checks);
      await this.eventIn(manager, job.applicationId, "scoring_failed", {
        jobId: job.id,
        error,
        attempt: job.attempts,
        willRetry: retryAt !== null,
      });
      return status;
    });
  }

  /** Подбирает задачи, застрявшие в `running` после падения воркера: в очередь или в `failed` (с событием). */
  async recoverStaleJobs(leaseMs: number): Promise<number> {
    return this.db.transaction(async (manager) => {
      const rows = rowsOf(
        await manager.query(
          `update scoring_jobs set
             status = case when attempts >= $2 then 'failed' else 'queued' end,
             error = $3,
             finished_at = case when attempts >= $2 then now() else null end,
             next_attempt_at = null
           where status='running' and started_at < now() - make_interval(secs => $1::double precision / 1000)
           returning id, application_id, status, attempts`,
          [leaseMs, MAX_JOB_ATTEMPTS, STALE_JOB_ERROR],
        ),
      );
      for (const row of rows) {
        await this.eventIn(
          manager,
          String(row.application_id),
          "scoring_failed",
          {
            jobId: String(row.id),
            error: STALE_JOB_ERROR,
            attempt: Number(row.attempts),
            willRetry: row.status === "queued",
          },
        );
      }
      return rows.length;
    });
  }

  async listEvents(applicationId: string): Promise<ApiAuditEvent[]> {
    const rows = rowsOf(
      await this.db.query(
        "select id, application_id, kind, payload, created_at from application_events where application_id=$1 order by created_at, id",
        [applicationId],
      ),
    );
    return rows.map((row) => ({
      id: String(row.id),
      applicationId: String(row.application_id),
      kind: String(row.kind),
      at: new Date(String(row.created_at)).toISOString(),
      metadata: (row.payload as Record<string, unknown>) ?? {},
    }));
  }

  /** Только статус и безопасное сообщение по источнику, сырые ответы не сохраняются. */
  private async sourceChecksIn(
    manager: EntityManager,
    jobId: string,
    checks: SourceCheck[],
  ): Promise<void> {
    for (const check of checks) {
      await manager.query(
        "insert into source_checks(job_id,source,status,error) values($1,$2,$3,$4)",
        [jobId, check.source, check.status, check.error ?? null],
      );
    }
  }

  private async claimKey(
    manager: EntityManager,
    scope: string,
    key: string,
    resourceId: string,
  ): Promise<string | null> {
    const inserted = rowsOf(
      await manager.query(
        "insert into idempotency_keys(scope,key,resource_id) values($1,$2,$3) on conflict do nothing returning resource_id",
        [scope, key, resourceId],
      ),
    );
    if (inserted.length > 0) {
      return null;
    }
    const rows = rowsOf(
      await manager.query(
        "select resource_id from idempotency_keys where scope=$1 and key=$2",
        [scope, key],
      ),
    );
    return String(firstRow(rows).resource_id);
  }

  private async eventIn(
    manager: EntityManager,
    applicationId: string,
    kind: string,
    payload: unknown,
  ): Promise<void> {
    await manager.query(
      "insert into application_events(application_id,kind,payload) values($1,$2,$3)",
      [applicationId, kind, payload],
    );
  }

  private async applicationIn(
    manager: EntityManager,
    id: string,
  ): Promise<ApplicationWorkflow | null> {
    const rows = rowsOf(
      await manager.query("select * from applications where id=$1", [id]),
    );
    return rows[0] ? this.application(rows[0]) : null;
  }

  private async jobIn(
    manager: EntityManager,
    id: string,
  ): Promise<ScoringJob | null> {
    const rows = rowsOf(
      await manager.query("select * from scoring_jobs where id=$1", [id]),
    );
    return rows[0] ? this.job(rows[0]) : null;
  }

  private application(row: Row): ApplicationWorkflow {
    const actionState = (row.action_state as Record<string, unknown> | null) ?? {};
    return {
      id: String(row.id),
      number: String(row.number),
      inn: String(row.inn),
      productId: row.product_id as ApplicationWorkflow["productId"],
      amount: Number(row.amount),
      termMonths: Number(row.term_months),
      purpose: String(row.purpose),
      status: row.status as ApplicationWorkflow["status"],
      checkJobId: (row.check_job_id as string | null) ?? null,
      scoring: (row.scoring as ApplicationWorkflow["scoring"]) ?? null,
      decision: (row.decision as ApplicationWorkflow["decision"]) ?? null,
      offer: (actionState.offer as ApplicationWorkflow["offer"]) ?? null,
      offerKind: (actionState.offerKind as ApplicationWorkflow["offerKind"]) ?? null,
      requestedInfo: (actionState.requestedInfo as string[]) ?? [],
      rejectReason: (actionState.rejectReason as string | null) ?? null,
      assigneeId: (actionState.assigneeId as string | null) ?? null,
      urgent: Boolean(actionState.urgent),
      urgentReason: (actionState.urgentReason as string | null) ?? null,
      hold: (actionState.hold as ApplicationWorkflow["hold"]) ?? null,
      comments: (actionState.comments as ApplicationWorkflow["comments"]) ?? [],
      handoff: (actionState.handoff as ApplicationWorkflow["handoff"]) ?? null,
      createdAt: new Date(String(row.created_at)).toISOString(),
      updatedAt: new Date(String(row.updated_at)).toISOString(),
    };
  }

  private job(row: Row): ScoringJob {
    return {
      id: String(row.id),
      applicationId: String(row.application_id),
      status: row.status as ScoringJob["status"],
      idempotencyKey: String(row.idempotency_key),
      createdAt: new Date(String(row.created_at)).toISOString(),
      startedAt: row.started_at
        ? new Date(String(row.started_at)).toISOString()
        : null,
      finishedAt: row.finished_at
        ? new Date(String(row.finished_at)).toISOString()
        : null,
      error: (row.error as string | null) ?? null,
      attempts: Number(row.attempts ?? 0),
      result: (row.result as ScoringJob["result"]) ?? null,
    };
  }
}
