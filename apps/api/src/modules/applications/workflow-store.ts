import { randomUUID } from "node:crypto";

import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource, EntityManager } from "typeorm";

import type {
  ApplicationWorkflow,
  CreateApplicationRequest,
  ScoringJob,
} from "@repo/contracts/workflow";

type Row = Record<string, unknown>;
type JobResult = NonNullable<ScoringJob["result"]>;

export const MAX_JOB_ATTEMPTS = 3;

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

  /** Результат скоринга, обновление заявки и событие фиксируются одной транзакцией. */
  async completeJob(
    job: ScoringJob,
    result: JobResult,
    eventPayload: unknown,
  ): Promise<void> {
    await this.db.transaction(async (manager) => {
      await manager.query(
        `update scoring_jobs set status='succeeded', result=$2, error=null, finished_at=now(), next_attempt_at=null where id=$1`,
        [job.id, result],
      );
      await manager.query(
        `update applications set scoring=$2, updated_at=now() where id=$1`,
        [job.applicationId, result],
      );
      await this.eventIn(
        manager,
        job.applicationId,
        "scoring_succeeded",
        eventPayload,
      );
    });
  }

  /** Возвращает задачу в очередь с задержкой или переводит в `failed`, если попытки закончились. */
  async failJob(
    job: ScoringJob,
    error: string,
    retryAt: Date | null,
  ): Promise<"queued" | "failed"> {
    const status = retryAt ? "queued" : "failed";
    await this.db.transaction(async (manager) => {
      await manager.query(
        `update scoring_jobs set status=$2, error=$3, next_attempt_at=$4, finished_at=$5 where id=$1`,
        [job.id, status, error, retryAt, retryAt ? null : new Date()],
      );
      await this.eventIn(manager, job.applicationId, "scoring_failed", {
        jobId: job.id,
        error,
        attempt: job.attempts,
        willRetry: retryAt !== null,
      });
    });
    return status;
  }

  /** Подбирает задачи, застрявшие в `running` после падения воркера: в очередь или в `failed`. */
  async recoverStaleJobs(leaseMs: number): Promise<number> {
    const rows = rowsOf(
      await this.db.query(
        `update scoring_jobs set
           status = case when attempts >= $2 then 'failed' else 'queued' end,
           error = 'Воркер не завершил задачу в отведённое время',
           finished_at = case when attempts >= $2 then now() else null end,
           next_attempt_at = null
         where status='running' and started_at < now() - make_interval(secs => $1::double precision / 1000)
         returning id`,
        [leaseMs, MAX_JOB_ATTEMPTS],
      ),
    );
    return rows.length;
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
