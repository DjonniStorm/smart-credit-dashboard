import { Module } from "@nestjs/common";

import { DemoDataModule } from "../../common/demo-data/demo-data.module.ts";
import { CompaniesModule } from "../companies/companies.module.ts";
import { ApplicationsController, JobsController } from "./applications.controller.ts";
import { ApplicationsService } from "./applications.service.ts";
import { WorkflowStore } from "./workflow-store.ts";
import { QueueWorkerService } from "./queue-worker.service.ts";
import { AutonomyStore } from "./autonomy.store.ts";
import { ApplyApplicationActionHandler } from "./commands/apply-application-action.handler.ts";

@Module({
  imports: [CompaniesModule, DemoDataModule],
  controllers: [ApplicationsController, JobsController],
  providers: [
    ApplicationsService,
    WorkflowStore,
    QueueWorkerService,
    AutonomyStore,
    ApplyApplicationActionHandler,
  ],
})
export class ApplicationsModule {}
