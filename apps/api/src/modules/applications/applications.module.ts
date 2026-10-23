import { Module } from "@nestjs/common";

import { CompaniesModule } from "../companies/companies.module.ts";
import { ApplicationsController, JobsController } from "./applications.controller.ts";
import { ApplicationsService } from "./applications.service.ts";
import { WorkflowStore } from "./workflow-store.ts";
import { QueueWorkerService } from "./queue-worker.service.ts";
import { AutonomyStore } from "./autonomy.store.ts";

@Module({
  imports: [CompaniesModule],
  controllers: [ApplicationsController, JobsController],
  providers: [ApplicationsService, WorkflowStore, QueueWorkerService, AutonomyStore],
})
export class ApplicationsModule {}
