import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";

import {
  autonomyConfigSchema,
  autonomyMetricsSchema,
  checkAutonomyEligibility,
} from "@repo/contracts";
import type { ApiAuditEvent } from "@repo/contracts/api";
import type { ApplicationComment } from "@repo/contracts/application";
import type {
  ApplicationWorkflow,
  CreateApplicationRequest,
  ScoringJob,
} from "@repo/contracts/workflow";

import { applicationFromRow } from "./workflow-rows.ts";
import { WorkflowTransaction, commentFromRow } from "./workflow-transaction.ts";

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
        productId: input.productId,
        status: "in_review",
        actorKind: "system",
        actorName: "Кредитный конвейер",
        reportContext: {
          version: 1,
          productId: input.productId,
          status: "in_review",
          stage: "intake",
          actorKind: "system",
          actorName: "Кредитный конвейер",
        },
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
      await this.eventIn(manager, applicationId, "check_requested", {
        jobId,
        status: "in_review",
        stage: "scoring",
        actorKind: "system",
        actorName: "Кредитный конвейер",
        reportContext: {
          version: 1,
          status: "in_review",
          stage: "scoring",
          actorKind: "system",
          actorName: "Кредитный конвейер",
        },
      });
      return this.job(firstRow(rows));
    });
  }

  /** Команды сотрудника меняют заявку под блокировкой строки: два параллельных действия идут по очереди. */
  inTransaction<T>(work: (tx: WorkflowTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction((manager) =>
      work(new WorkflowTransaction(manager)),
    );
  }

  async listComments(
    applicationId: string,
    visibility?: ApplicationComment["visibility"],
  ): Promise<ApplicationComment[]> {
    const rows = rowsOf(
      await this.db.query(
        `select * from application_comments where application_id=$1
         and ($2::text is null or visibility=$2) order by created_at, id`,
        [applicationId, visibility ?? null],
      ),
    );
    return rows.map(commentFromRow);
  }

  async getApplication(id: string): Promise<ApplicationWorkflow | null> {
    return this.applicationIn(this.db.manager, id);
  }

  /** Возвращает просроченную автооферту в ручное рассмотрение до чтения карточки. */
  async expireAutoOffer(id: string): Promise<void> {
    await this.db.transaction(async (manager) => {
      const tx = new WorkflowTransaction(manager);
      const application = await tx.lockApplication(id);
      const endsAt = application?.autonomyCase?.controlWindowEndsAt;
      if (
        !application ||
        application.autonomyCase?.disposition !== "auto_offer_sent" ||
        !endsAt ||
        new Date() < new Date(endsAt)
      ) {
        return;
      }
      application.status = "in_review";
      application.offer = null;
      application.autonomyCase = {
        ...application.autonomyCase,
        disposition: "expired",
      };
      application.updatedAt = new Date().toISOString();
      await tx.saveManagement(application);
      await tx.appendEvent(id, "autonomy_expired", {
        title: "Контрольное окно автоодобрения закрыто",
        comment: "Заявка возвращена в ручное рассмотрение",
        actorKind: "system",
        actorName: "Кредитный конвейер",
        reportContext: {
          version: 1,
          status: "in_review",
          stage: "decision",
          actorKind: "system",
          actorName: "Кредитный конвейер",
          recommendation: application.autonomyCase.recommendation,
          autonomyMode: application.autonomyCase.mode,
          autonomyDisposition: "expired",
        },
      });
    });
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
      status?: ApplicationWorkflow["status"];
      offer?: ApplicationWorkflow["offer"];
      autonomyCase?: ApplicationWorkflow["autonomyCase"];
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
      let autonomyCase = outcome.autonomyCase;
      let decision = outcome.decision;
      let status = outcome.status;
      let offer = outcome.offer;
      let eventPayload = outcome.eventPayload;
      if (autonomyCase?.eligible) {
        const applicationRows = rowsOf(
          await manager.query(
            "select product_id from applications where id=$1",
            [job.applicationId],
          ),
        );
        const productId = String(applicationRows[0]?.product_id ?? "");
        const policyRows = rowsOf(
          await manager.query(
            "select payload from autonomy_policies where product_id=$1 for update",
            [productId],
          ),
        );
        const policyPayload = policyRows[0]?.payload as
          Record<string, unknown> | undefined;
        const config = policyPayload
          ? autonomyConfigSchema.parse(policyPayload.config)
          : null;
        const metrics = policyPayload
          ? autonomyMetricsSchema.parse(policyPayload.metrics)
          : null;
        const currentEligibility =
          config && metrics
            ? checkAutonomyEligibility(config, metrics)
            : {
                eligible: false,
                reasons: ["Политика автономности недоступна"],
              };
        const policyChanged =
          !config ||
          config.revision !== autonomyCase.policyRevision ||
          config.level !== "stable" ||
          !currentEligibility.eligible;
        if (policyChanged) {
          autonomyCase = {
            ...autonomyCase,
            mode: "assist",
            eligible: false,
            disposition: "manual_required",
            reasons: [
              ...new Set([
                ...autonomyCase.reasons,
                ...currentEligibility.reasons,
                "Политика изменилась до автоодобрения",
              ]),
            ],
            controlWindowOpenedAt: null,
            controlWindowEndsAt: null,
            autoDecisionAt: null,
          };
          if (decision) {
            decision = { ...decision, autonomyMode: "assist" };
          }
          status = "in_review";
          offer = null;
          eventPayload = {
            ...(typeof eventPayload === "object" && eventPayload
              ? eventPayload
              : {}),
            autonomyMode: "assist",
            autonomyDisposition: "manual_required",
          };
        }
      }
      await manager.query(
        `update applications
            set scoring=$2, decision=$3,
                status=case when $4 then $5 else status end,
                offer=case when $6 then $7 else offer end,
                autonomy_case=$8, updated_at=now()
          where id=$1`,
        [
          job.applicationId,
          outcome.result,
          decision,
          status !== undefined,
          status ?? null,
          offer !== undefined,
          offer ?? null,
          autonomyCase ?? null,
        ],
      );
      if (autonomyCase?.eligible) {
        const applicationRows = rowsOf(
          await manager.query(
            "select product_id from applications where id=$1",
            [job.applicationId],
          ),
        );
        await this.recordAutonomyCandidate(
          manager,
          String(applicationRows[0]?.product_id ?? ""),
        );
      }
      await this.sourceChecksIn(manager, job.id, outcome.checks);
      await this.eventIn(
        manager,
        job.applicationId,
        "scoring_succeeded",
        eventPayload,
      );
      if (autonomyCase) {
        await this.eventIn(manager, job.applicationId, "autonomy_candidate", {
          policyId: autonomyCase.policyId,
          policyVersion: autonomyCase.policyVersion,
          policyRevision: autonomyCase.policyRevision,
          mode: autonomyCase.mode,
          recommendation: autonomyCase.recommendation,
          eligible: autonomyCase.eligible,
          actorKind: "system",
          actorName: "Кредитный конвейер",
          reportContext: {
            version: 1,
            stage: "decision",
            actorKind: "system",
            actorName: "Кредитный конвейер",
            recommendation: autonomyCase.recommendation,
            autonomyMode: autonomyCase.mode,
            autonomyDisposition: autonomyCase.disposition,
          },
        });
        if (autonomyCase.disposition === "auto_offer_sent") {
          await this.eventIn(
            manager,
            job.applicationId,
            "autonomy_auto_offer",
            {
              policyId: autonomyCase.policyId,
              controlWindowEndsAt: autonomyCase.controlWindowEndsAt ?? "",
              actorKind: "system",
              actorName: "Кредитный конвейер",
              reportContext: {
                version: 1,
                stage: "decision",
                actorKind: "system",
                actorName: "Кредитный конвейер",
                recommendation: autonomyCase.recommendation,
                autonomyMode: autonomyCase.mode,
                autonomyDisposition: autonomyCase.disposition,
              },
            },
          );
        }
      }
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
        actorKind: "system",
        actorName: "Кредитный конвейер",
        reportContext: {
          version: 1,
          stage: "scoring",
          actorKind: "system",
          actorName: "Кредитный конвейер",
        },
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
            actorKind: "system",
            actorName: "Кредитный конвейер",
            reportContext: {
              version: 1,
              stage: "scoring",
              actorKind: "system",
              actorName: "Кредитный конвейер",
            },
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

  private async recordAutonomyCandidate(
    manager: EntityManager,
    productId: string,
  ): Promise<void> {
    const rows = rowsOf(
      await manager.query(
        "select payload from autonomy_policies where product_id=$1 for update",
        [productId],
      ),
    );
    const row = rows[0];
    if (!row) {
      return;
    }
    const payload = row.payload as Record<string, unknown>;
    const metrics = autonomyMetricsSchema.parse(payload.metrics);
    const eligibleCases = metrics.eligibleCases + 1;
    const nextMetrics = {
      ...metrics,
      eligibleCases,
      manualOverrideRate:
        eligibleCases === 0 ? 0 : metrics.manualOverrides / eligibleCases,
      computedAt: new Date().toISOString(),
    };
    await manager.query(
      `update autonomy_policies set payload=$2, updated_at=now()
        where product_id=$1`,
      [productId, { ...payload, metrics: nextMetrics }],
    );
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
    return applicationFromRow(row);
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
