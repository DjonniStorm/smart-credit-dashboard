import { Injectable, NotFoundException, Optional } from "@nestjs/common";

import type { ScoreResponse } from "@repo/contracts";
import { productRate } from "@repo/contracts/product-catalog";
import type {
  ApiApplication,
  ApiApplicationContext,
  ApiApplicationResponse,
  ApiAutonomySnapshot,
  ApiJob,
  ApiQueueItem,
} from "@repo/contracts/api";
import type { CompanyProfileResponse } from "@repo/contracts/company-profile";
import type {
  ApplicationCheckRequest,
  ApplicationWorkflow,
  CreateApplicationRequest,
  CreateApplicationResponse,
  ScoringJob,
} from "@repo/contracts/workflow";

import {
  CompaniesService,
  SourceCheckError,
} from "../companies/companies.service.ts";
import { CatalogService } from "../catalog/catalog.service.ts";
import { CompanyProfileService } from "../companies/company-profile.service.ts";
import {
  toApiApplication,
  toApiDecision,
  toApiJob,
  toApiManagement,
  toApiScoring,
} from "./api-mapper.ts";
import { AutonomyStore } from "./autonomy.store.ts";
import { decide } from "./decision-engine.ts";
import {
  MAX_JOB_ATTEMPTS,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  WorkflowStore,
} from "./workflow-store.ts";

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly companies: CompaniesService,
    private readonly profiles: CompanyProfileService,
    private readonly autonomy: AutonomyStore,
    private readonly store: WorkflowStore,
    @Optional() private readonly catalog?: CatalogService,
  ) {}

  async create(
    input: CreateApplicationRequest,
  ): Promise<CreateApplicationResponse> {
    const { application, job } = await this.store.createApplication(input);
    return { application, checkJob: { id: job.id, status: job.status } };
  }

  async listApiApplications(): Promise<ApiApplication[]> {
    const applications = await this.store.listApplications();
    return applications.map((application) => toApiApplication(application));
  }

  /** Очередь АРМ: заявки с управленческим состоянием, только для сотрудников. */
  async listQueue(): Promise<ApiQueueItem[]> {
    const applications = await this.store.listApplications();
    await Promise.all(
      applications.map((application) =>
        this.store.expireAutoOffer(application.id),
      ),
    );
    const refreshedApplications = await this.store.listApplications();
    return refreshedApplications.map((application) => ({
      application: toApiApplication(application),
      management: toApiManagement(application, []),
    }));
  }

  async getApiApplication(id: string): Promise<ApiApplication> {
    await this.store.expireAutoOffer(id);
    const application = await this.getApplication(id);
    return toApiApplication(
      application,
      await this.store.listComments(id, "client"),
    );
  }

  async getApiApplicationContext(id: string): Promise<ApiApplicationContext> {
    await this.store.expireAutoOffer(id);
    const application = await this.getApplication(id);
    const companyProfile: CompanyProfileResponse =
      await this.profiles.getProfile(application.inn);
    const comments = await this.store.listComments(application.id);
    return {
      application: toApiApplication(
        application,
        comments.filter((comment) => comment.visibility === "client"),
      ),
      management: toApiManagement(application, comments),
      companyProfile,
      checks: companyProfile.sources,
      decision: application.decision,
      autonomy: await this.autonomy.getSnapshot(
        application.productId as ApiApplication["productId"],
        application.autonomyCase,
      ),
      audit: await this.store.listEvents(application.id),
    };
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
      let autonomy: ApiAutonomySnapshot | null = null;
      if (this.autonomy && typeof this.autonomy.getSnapshot === "function") {
        try {
          autonomy = await this.autonomy.getSnapshot(
            application.productId as ApiApplication["productId"],
          );
        } catch {
          autonomy = null;
        }
      }
      const decision = decide(
        application,
        result.scoring as ScoreResponse,
        autonomy ?? undefined,
      );
      const now = new Date();
      const controlWindowEndsAt =
        autonomy && decision.autonomyMode === "controlled"
          ? new Date(
              now.getTime() + autonomy.config.controlWindowMinutes * 60_000,
            ).toISOString()
          : null;
      const autonomyCase: ApplicationWorkflow["autonomyCase"] = autonomy
        ? {
            policyId: autonomy.config.id,
            policyVersion: autonomy.config.policyVersion,
            policyRevision: autonomy.config.revision,
            mode: decision.autonomyMode,
            recommendation: decision.recommendation,
            eligible: decision.autonomyMode === "controlled",
            reasons: autonomy.eligibility.reasons,
            disposition:
              decision.autonomyMode === "controlled"
                ? "auto_offer_sent"
                : "manual_required",
            controlWindowOpenedAt: controlWindowEndsAt
              ? now.toISOString()
              : null,
            controlWindowEndsAt,
            overrideCounted: false,
            closed: false,
            autoDecisionAt: controlWindowEndsAt ? now.toISOString() : null,
          }
        : null;
      const catalog = this.catalog?.getCatalog();
      const product = catalog?.products.find(
        (item) => item.id === application.productId,
      );
      const offer =
        product &&
        decision.autonomyMode === "controlled" &&
        decision.recommendation === "approve"
          ? {
              productId: product.id,
              amount: application.amount,
              termMonths: application.termMonths,
              ratePct: productRate(product, catalog?.keyRate ?? 0),
            }
          : null;
      await this.store.completeJob(job, {
        result: {
          score: result.scoring.score,
          model: result.scoring.model,
          recommendation: decision.recommendation,
          details: toApiScoring(result.scoring),
        },
        decision: toApiDecision(decision),
        status: offer ? "approved" : undefined,
        offer,
        autonomyCase,
        checks: ["egrul", "bki", "fns", "scoring"].map((source) => ({
          source,
          status: "ok" as const,
        })),
        eventPayload: {
          jobId: job.id,
          score: result.scoring.score,
          model: result.scoring.model,
          recommendation: decision.recommendation,
          rules: decision.rules,
          reasons: decision.reasons,
          autonomyMode: decision.autonomyMode,
          autonomyDisposition: autonomyCase?.disposition ?? null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryAt =
        job.attempts >= MAX_JOB_ATTEMPTS
          ? null
          : new Date(
              Date.now() +
                Math.min(
                  RETRY_MAX_DELAY_MS,
                  2 ** job.attempts * RETRY_BASE_DELAY_MS,
                ),
            );
      const checks =
        error instanceof SourceCheckError
          ? [
              {
                source: error.source,
                status: "failed" as const,
                error: message,
              },
            ]
          : [];
      await this.store.failJob(job, message, retryAt, checks);
    }
  }
}
