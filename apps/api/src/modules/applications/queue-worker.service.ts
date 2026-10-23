import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { Env } from "../../common/config/env.schema.ts";
import { ApplicationsService } from "./applications.service.ts";
import { WorkflowStore } from "./workflow-store.ts";

/** Small Postgres-backed worker. It is safe to run one instance per API replica. */
@Injectable()
export class QueueWorkerService
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(QueueWorkerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly store: WorkflowStore,
    private readonly applications: ApplicationsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** После bootstrap: миграции из DatabaseService.onModuleInit уже применены. */
  onApplicationBootstrap(): void {
    const interval = this.config.getOrThrow("WORKER_POLL_MS", { infer: true });
    this.timer = setInterval(() => void this.drain(), interval);
    void this.drain();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Один проход: вернуть зависшие задачи и обработать всё готовое. Не бросает исключений. */
  async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const recovered = await this.store.recoverStaleJobs(
        this.config.getOrThrow("JOB_LEASE_MS", { infer: true }),
      );
      if (recovered > 0) {
        this.logger.warn(`Возвращено зависших задач: ${recovered}`);
      }
      let job = await this.store.claimNextQueuedJob();
      while (job) {
        try {
          await this.applications.processJob(job);
        } catch (error) {
          this.logger.error(
            `Задача ${job.id} не обработана: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        job = await this.store.claimNextQueuedJob();
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      this.running = false;
    }
  }
}
