import { Injectable, NotFoundException } from "@nestjs/common";

import type { ScoreResponse } from "@repo/contracts";
import type {
  ApiApplication,
  ApiApplicationResponse,
  ApiJob,
} from "@repo/contracts/api";
import type {
  ApplicationCheckRequest,
  ApplicationWorkflow,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ScoringJob,
} from "@repo/contracts/workflow";

import { CompaniesService } from "../companies/companies.service.ts";
import { toApiApplication, toApiJob, toApiScoring } from "./api-mapper.ts";
import { decide } from "./decision-engine.ts";
import { MAX_JOB_ATTEMPTS, WorkflowStore } from "./workflow-store.ts";

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly companies: CompaniesService,
    private readonly store: WorkflowStore,
  ) {}

  async create(
    input: CreateApplicationRequest,
  ): Promise<CreateApplicationResponse> {
    const { application, job } = await this.store.createApplication(input);
    return { application, checkJob: { id: job.id, status: job.status } };
  }

  async listApiApplications(): Promise<ApiApplication[]> {
    const applications = await this.store.listApplications();
    return applications.map(toApiApplication);
  }

  async getApiApplication(id: string): Promise<ApiApplication> {
    return toApiApplication(await this.getApplication(id));
  }

  async createApiApplication(
    input: CreateApplicationRequest,
  ): Promise<ApiApplicationResponse> {
    const response = await this.create(input);
    return {
      application: toApiApplication(response.application),
      checkJob: { id: response.checkJob.id, status: response.checkJob.status },
    };
  }

  async getApplication(id: string): Promise<ApplicationWorkflow> {
    const application = await this.store.getApplication(id);
    if (!application) throw new NotFoundException("Заявка не найдена");
    return application;
  }

  async startCheck(
    id: string,
    input: ApplicationCheckRequest,
  ): Promise<ScoringJob> {
    await this.getApplication(id);
    return this.store.createCheckJob(id, input.idempotencyKey);
  }

  async getJob(id: string): Promise<ScoringJob> {
    const job = await this.store.getJob(id);
    if (!job) throw new NotFoundException("Задача не найдена");
    return job;
  }

  async startApiCheck(
    id: string,
    input: ApplicationCheckRequest,
  ): Promise<ApiJob> {
    return toApiJob(await this.startCheck(id, input));
  }

  async getApiJob(id: string): Promise<ApiJob> {
    return toApiJob(await this.getJob(id));
  }

  /**
   * Вызывается воркером после атомарного захвата задачи (статус `running`, `attempts` уже увеличен).
   * Ошибка скоринга уходит в retry; ошибка записи самого результата тоже, а если не записался и retry,
   * задачу подберёт recovery по истечении аренды.
   */
  async processJob(job: ScoringJob): Promise<void> {
    try {
      const application = await this.store.getApplication(job.applicationId);
      if (!application) {
        throw new Error(`Заявка ${job.applicationId} не найдена`);
      }
      const result = await this.companies.check(application.inn, application);
      const decision = decide(application, result.scoring as ScoreResponse);
      await this.store.completeJob(
        job,
        {
          score: result.scoring.score,
          model: result.scoring.model,
          recommendation: decision.recommendation,
          details: toApiScoring(result.scoring),
        },
        {
          jobId: job.id,
          score: result.scoring.score,
          model: result.scoring.model,
          recommendation: decision.recommendation,
          rules: decision.rules,
          reasons: decision.reasons,
          autonomyMode: decision.autonomyMode,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryAt =
        job.attempts >= MAX_JOB_ATTEMPTS
          ? null
          : new Date(Date.now() + Math.min(60_000, 2 ** job.attempts * 1_000));
      await this.store.failJob(job, message, retryAt);
    }
  }
}
