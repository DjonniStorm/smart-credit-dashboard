import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ApplicationCheckRequest,
  ApplicationWorkflow,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ScoringJob,
} from "@repo/contracts/workflow";
import type { ScoreResponse } from "@repo/contracts";

import { CompaniesService } from "../companies/companies.service.ts";
import { WorkflowStore } from "./workflow-store.ts";
import { decide } from "./decision-engine.ts";

@Injectable()
export class ApplicationsService {
  private sequence = 1000;

  constructor(private readonly companies: CompaniesService, private readonly store: WorkflowStore) {}

  async create(input: CreateApplicationRequest): Promise<CreateApplicationResponse> {
    const existingJobId = await this.store.findIdempotent("create", input.idempotencyKey);
    if (existingJobId) {
      const job = await this.store.getJob(existingJobId);
      const application = job && await this.store.getApplication(job.applicationId);
      if (job && application) return { application, checkJob: { id: job.id, status: job.status } };
    }

    const now = new Date().toISOString();
    const applicationId = `app-${this.sequence}`;
    const jobId = `job-${this.sequence}`;
    this.sequence += 1;
    const application: ApplicationWorkflow = {
      id: applicationId,
      number: String(this.sequence),
      inn: input.inn,
      productId: input.productId,
      amount: input.amount,
      termMonths: input.termMonths,
      purpose: input.purpose,
      status: "in_review",
      checkJobId: jobId,
      scoring: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.store.saveApplication(application);
    const job = this.createJob(applicationId, jobId, input.idempotencyKey);
    await this.store.saveJob(job);
    await this.store.remember("create", input.idempotencyKey, jobId);
    await this.store.event(applicationId, "application_created", { jobId });
    return { application, checkJob: { id: job.id, status: job.status } };
  }

  async getApplication(id: string): Promise<ApplicationWorkflow> {
    const application = await this.store.getApplication(id);
    if (!application) throw new NotFoundException("Заявка не найдена");
    return application;
  }

  async startCheck(id: string, input: ApplicationCheckRequest): Promise<ScoringJob> {
    await this.getApplication(id);
    const existing = await this.store.findIdempotent(`check:${id}`, input.idempotencyKey);
    if (existing) return this.getJob(existing);
    const job = this.createJob(id, `job-${this.sequence++}`, input.idempotencyKey);
    await this.store.saveJob(job);
    await this.store.remember(`check:${id}`, input.idempotencyKey, job.id);
    return job;
  }

  async getJob(id: string): Promise<ScoringJob> {
    const job = await this.store.getJob(id);
    if (!job) throw new NotFoundException("Задача не найдена");
    return job;
  }

  private createJob(applicationId: string, id: string, idempotencyKey: string): ScoringJob {
    const job: ScoringJob = {
      id,
      applicationId,
      status: "queued",
      idempotencyKey,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      error: null,
      attempts: 0,
      result: null,
    };
    return job;
  }

  /** Called by the durable worker after atomically claiming a queued job. */
  async processJob(job: ScoringJob): Promise<void> {
    const application = await this.store.getApplication(job.applicationId);
    if (!application) return;
    await this.executeJob(job, application);
  }

  private async executeJob(job: ScoringJob, application: ApplicationWorkflow): Promise<void> {
    // The worker claims the job and persists running/attempts atomically.
    try {
      const result = await this.companies.check(application.inn);
      const decision = decide(application, result.scoring as ScoreResponse);
      job.result = {
        score: result.scoring.score,
        model: result.scoring.model,
        recommendation: decision.recommendation,
      };
      job.status = "succeeded";
      application.scoring = job.result;
      application.updatedAt = new Date().toISOString();
      await this.store.saveApplication(application);
      await this.store.saveJob(job);
      await this.store.event(application.id, "scoring_succeeded", {
        jobId: job.id,
        score: job.result.score,
        model: job.result.model,
        recommendation: decision.recommendation,
        rules: decision.rules,
        reasons: decision.reasons,
        autonomyMode: decision.autonomyMode,
      });
    } catch (error) {
      job.status = job.attempts >= 3 ? "failed" : "queued";
      job.error = error instanceof Error ? error.message : String(error);
      if (job.status === "queued") {
        const delay = Math.min(60_000, 2 ** job.attempts * 1_000);
        await this.store.setJobRetry(job.id, job.error, new Date(Date.now() + delay));
      } else await this.store.saveJob(job, job.attempts);
      await this.store.event(application.id, "scoring_failed", { jobId: job.id, error: job.error });
    } finally {
      if (job.status !== "queued") {
        job.finishedAt = new Date().toISOString();
        await this.store.saveJob(job, job.attempts);
      }
    }
  }
}
