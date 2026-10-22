import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  ApplicationCheckRequest,
  ApplicationWorkflow,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ScoringJob,
} from "@repo/contracts/workflow";

import { CompaniesService } from "../companies/companies.service.ts";

@Injectable()
export class ApplicationsService {
  private readonly applications = new Map<string, ApplicationWorkflow>();
  private readonly jobs = new Map<string, ScoringJob>();
  private readonly idempotency = new Map<string, string>();
  private sequence = 1000;

  constructor(private readonly companies: CompaniesService) {}

  create(input: CreateApplicationRequest): CreateApplicationResponse {
    const existingJobId = this.idempotency.get(`create:${input.idempotencyKey}`);
    if (existingJobId) {
      const job = this.jobs.get(existingJobId);
      const application = job && this.applications.get(job.applicationId);
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
    this.applications.set(applicationId, application);
    const job = this.createJob(applicationId, jobId, input.idempotencyKey);
    this.idempotency.set(`create:${input.idempotencyKey}`, jobId);
    this.runJob(job, application);
    return { application, checkJob: { id: job.id, status: job.status } };
  }

  getApplication(id: string): ApplicationWorkflow {
    const application = this.applications.get(id);
    if (!application) throw new NotFoundException("Заявка не найдена");
    return application;
  }

  startCheck(id: string, input: ApplicationCheckRequest): ScoringJob {
    const application = this.getApplication(id);
    const existing = this.idempotency.get(`check:${id}:${input.idempotencyKey}`);
    if (existing) return this.getJob(existing);
    const job = this.createJob(id, `job-${this.sequence++}`, input.idempotencyKey);
    this.idempotency.set(`check:${id}:${input.idempotencyKey}`, job.id);
    this.runJob(job, application);
    return job;
  }

  getJob(id: string): ScoringJob {
    const job = this.jobs.get(id);
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
    this.jobs.set(id, job);
    return job;
  }

  private runJob(job: ScoringJob, application: ApplicationWorkflow): void {
    void this.executeJob(job, application);
  }

  private async executeJob(job: ScoringJob, application: ApplicationWorkflow): Promise<void> {
    job.status = "running";
    job.startedAt = new Date().toISOString();
    try {
      const result = await this.companies.check(application.inn);
      job.result = { score: result.scoring.score, model: result.scoring.model };
      job.status = "succeeded";
      application.scoring = job.result;
      application.updatedAt = new Date().toISOString();
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : String(error);
    } finally {
      job.finishedAt = new Date().toISOString();
    }
  }
}
