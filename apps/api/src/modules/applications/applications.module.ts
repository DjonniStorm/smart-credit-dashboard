import { Module } from "@nestjs/common";

import { DemoDataModule } from "../../common/demo-data/demo-data.module.ts";
import { AuthModule } from "../auth/auth.module.ts";
import { CatalogModule } from "../catalog/catalog.module.ts";
import { CompaniesModule } from "../companies/companies.module.ts";
import { ApplicationActionsService } from "./application-actions.service.ts";
import {
  ApplicationsController,
  JobsController,
} from "./applications.controller.ts";
import { ApplicationsService } from "./applications.service.ts";
import { AutonomyStore } from "./autonomy.store.ts";
import { ApplyApplicationActionHandler } from "./commands/apply-application-action.handler.ts";
import { QueueWorkerService } from "./queue-worker.service.ts";
import { WorkflowStore } from "./workflow-store.ts";

@Module({
  imports: [CompaniesModule, AuthModule, CatalogModule, DemoDataModule],
  controllers: [ApplicationsController, JobsController],
  providers: [
    ApplicationsService,
    ApplicationActionsService,
    WorkflowStore,
    QueueWorkerService,
    AutonomyStore,
    ApplyApplicationActionHandler,
  ],
})
export class ApplicationsModule {}
