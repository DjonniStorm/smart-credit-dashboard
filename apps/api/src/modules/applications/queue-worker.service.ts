import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../../common/config/env.schema.ts";
import { ApplicationsService } from "./applications.service.ts";
import { WorkflowStore } from "./workflow-store.ts";

/** Small Postgres-backed worker. It is safe to run one instance per API replica. */
@Injectable()
export class QueueWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueWorkerService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly store: WorkflowStore,
    private readonly applications: ApplicationsService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  onModuleInit(): void {
    const interval = this.config.get("WORKER_POLL_MS", { infer: true });
    this.timer = setInterval(() => void this.drain(), interval);
    void this.drain();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async drain(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      let job = await this.store.claimNextQueuedJob();
      while (job) {
        await this.applications.processJob(job);
        job = await this.store.claimNextQueuedJob();
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : String(error));
    } finally {
      this.running = false;
    }
  }
}
