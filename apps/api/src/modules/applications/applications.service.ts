import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ApplicationCheckRequest,
  ApplicationWorkflow,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ScoringJob,
} from "@repo/contracts/workflow";

import { CompaniesService } from "../companies/companies.service.ts";
import { WorkflowStore } from "./workflow-store.ts";

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
    this.runJob(job, application);
    return { application, checkJob: { id: job.id, status: job.status } };
  }

  async getApplication(id: string): Promise<ApplicationWorkflow> {
    const application = await this.store.getApplication(id);
    if (!application) throw new NotFoundException("Заявка не найдена");
    return application;
  }

  async startCheck(id: string, input: ApplicationCheckRequest): Promise<ScoringJob> {
    const application = await this.getApplication(id);
    const existing = await this.store.findIdempotent(`check:${id}`, input.idempotencyKey);
    if (existing) return this.getJob(existing);
    const job = this.createJob(id, `job-${this.sequence++}`, input.idempotencyKey);
    await this.store.saveJob(job);
    await this.store.remember(`check:${id}`, input.idempotencyKey, job.id);
    this.runJob(job, application);
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
      result: null,
    };
    return job;
  }

  private runJob(job: ScoringJob, application: ApplicationWorkflow): void {
    void this.executeJob(job, application);
  }

  private async executeJob(job: ScoringJob, application: ApplicationWorkflow): Promise<void> {
    job.status = "running";
    job.startedAt = new Date().toISOString();
    await this.store.saveJob(job);
    try {
      const result = await this.companies.check(application.inn);
      job.result = { score: result.scoring.score, model: result.scoring.model };
      job.status = "succeeded";
      application.scoring = job.result;
      application.updatedAt = new Date().toISOString();
      await this.store.saveApplication(application);
      await this.store.saveJob(job);
      await this.store.event(application.id, "scoring_succeeded", { jobId: job.id, score: job.result.score });
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
      await this.store.saveJob(job);
      await this.store.event(application.id, "scoring_failed", { jobId: job.id, error: job.error });
    } finally {
      job.finishedAt = new Date().toISOString();
      await this.store.saveJob(job);
    }
  }
}
