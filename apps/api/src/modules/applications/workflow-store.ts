import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import type { ApiAuditEvent } from "@repo/contracts/api";
import type { ApplicationWorkflow, ScoringJob } from "@repo/contracts/workflow";

/** Durable repository for the workflow. Schema creation is idempotent for the demo. */
@Injectable()
export class WorkflowStore implements OnModuleInit {
  constructor(@InjectDataSource() private readonly db: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.db.query(`
      create table if not exists applications (
        id text primary key, number text not null unique, inn text not null,
        product_id text not null, amount numeric not null, term_months integer not null,
        purpose text not null, status text not null, check_job_id text,
        scoring jsonb, decision jsonb, created_at timestamptz not null, updated_at timestamptz not null
      );
      create table if not exists scoring_jobs (
        id text primary key, application_id text not null references applications(id),
        status text not null, idempotency_key text not null, created_at timestamptz not null,
        started_at timestamptz, finished_at timestamptz, error text, result jsonb,
        attempts integer not null default 0, next_attempt_at timestamptz,
        unique(application_id, idempotency_key)
      );
      create table if not exists source_checks (
        id bigserial primary key, job_id text not null references scoring_jobs(id),
        source text not null, status text not null, response jsonb, error text,
        created_at timestamptz not null default now()
      );
      create table if not exists application_events (
        id bigserial primary key, application_id text not null references applications(id),
        kind text not null, payload jsonb not null, created_at timestamptz not null default now()
      );
      create table if not exists idempotency_keys (
        scope text not null, key text not null, resource_id text not null,
        created_at timestamptz not null default now(), primary key(scope, key)
      );
      alter table applications add column if not exists decision jsonb;
    `);
  }

  async saveApplication(application: ApplicationWorkflow): Promise<void> {
    await this.db.query(
      `insert into applications(id,number,inn,product_id,amount,term_months,purpose,status,check_job_id,scoring,decision,created_at,updated_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict(id) do update set status=excluded.status, check_job_id=excluded.check_job_id,
       scoring=excluded.scoring, decision=excluded.decision, updated_at=excluded.updated_at`,
      [application.id, application.number, application.inn, application.productId, application.amount, application.termMonths, application.purpose, application.status, application.checkJobId, application.scoring, application.decision, application.createdAt, application.updatedAt],
    );
  }

  async getApplication(id: string): Promise<ApplicationWorkflow | null> {
    const rows = await this.db.query("select * from applications where id=$1", [id]);
    return rows[0] ? this.application(rows[0]) : null;
  }

  async listApplications(): Promise<ApplicationWorkflow[]> {
    const rows = await this.db.query(
      "select * from applications order by created_at desc",
    );
    return rows.map((row: Record<string, unknown>) => this.application(row));
  }

  async saveJob(job: ScoringJob, attempts = job.attempts): Promise<void> {
    await this.db.query(
      `insert into scoring_jobs(id,application_id,status,idempotency_key,created_at,started_at,finished_at,error,result,attempts,next_attempt_at)
       values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       on conflict(id) do update set status=excluded.status,started_at=excluded.started_at,finished_at=excluded.finished_at,error=excluded.error,result=excluded.result,attempts=excluded.attempts,next_attempt_at=excluded.next_attempt_at`,
      [job.id, job.applicationId, job.status, job.idempotencyKey, job.createdAt, job.startedAt, job.finishedAt, job.error, job.result, attempts, null],
    );
  }

  async getJob(id: string): Promise<ScoringJob | null> {
    const rows = await this.db.query("select * from scoring_jobs where id=$1", [id]);
    return rows[0] ? this.job(rows[0]) : null;
  }

  /** Atomically claims one queued job so multiple API replicas cannot process it twice. */
  async claimNextQueuedJob(): Promise<ScoringJob | null> {
    const rows = await this.db.query(
      `update scoring_jobs set status='running', started_at=now(), attempts=attempts+1
       where id = (select id from scoring_jobs where status='queued' and (next_attempt_at is null or next_attempt_at <= now()) order by created_at for update skip locked limit 1)
       returning *`,
    );
    return rows[0] ? this.job(rows[0]) : null;
  }

  async setJobRetry(id: string, error: string, nextAttemptAt: Date): Promise<void> {
    await this.db.query(`update scoring_jobs set status='queued', error=$2, next_attempt_at=$3, finished_at=null where id=$1`, [id, error, nextAttemptAt]);
  }

  async findIdempotent(scope: string, key: string): Promise<string | null> {
    const rows = await this.db.query("select resource_id from idempotency_keys where scope=$1 and key=$2", [scope, key]);
    return rows[0]?.resource_id ?? null;
  }

  async remember(scope: string, key: string, resourceId: string): Promise<void> {
    await this.db.query("insert into idempotency_keys(scope,key,resource_id) values($1,$2,$3) on conflict do nothing", [scope, key, resourceId]);
  }

  async event(applicationId: string, kind: string, payload: unknown): Promise<void> {
    await this.db.query("insert into application_events(application_id,kind,payload) values($1,$2,$3)", [applicationId, kind, payload]);
  }

  async listEvents(applicationId: string): Promise<ApiAuditEvent[]> {
    const rows = await this.db.query(
      "select id, application_id, kind, payload, created_at from application_events where application_id=$1 order by created_at",
      [applicationId],
    );
    return rows.map((row: Record<string, unknown>) => {
      return {
        id: String(row.id),
        applicationId: String(row.application_id),
        kind: String(row.kind),
        at: new Date(String(row.created_at)).toISOString(),
        metadata: (row.payload as Record<string, unknown>) ?? {},
      };
    });
  }

  private application(row: Record<string, unknown>): ApplicationWorkflow {
    return { id: String(row.id), number: String(row.number), inn: String(row.inn), productId: row.product_id as ApplicationWorkflow["productId"], amount: Number(row.amount), termMonths: Number(row.term_months), purpose: String(row.purpose), status: row.status as ApplicationWorkflow["status"], checkJobId: (row.check_job_id as string | null) ?? null, scoring: (row.scoring as ApplicationWorkflow["scoring"]) ?? null, decision: (row.decision as ApplicationWorkflow["decision"]) ?? null, createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString() };
  }

  private job(row: Record<string, unknown>): ScoringJob {
    return { id: String(row.id), applicationId: String(row.application_id), status: row.status as ScoringJob["status"], idempotencyKey: String(row.idempotency_key), createdAt: new Date(String(row.created_at)).toISOString(), startedAt: row.started_at ? new Date(String(row.started_at)).toISOString() : null, finishedAt: row.finished_at ? new Date(String(row.finished_at)).toISOString() : null, error: (row.error as string | null) ?? null, attempts: Number(row.attempts ?? 0), result: (row.result as ScoringJob["result"]) ?? null };
  }
}
