import { Module } from "@nestjs/common";

import { CompaniesModule } from "../companies/companies.module.ts";
import { ApplicationsController, JobsController } from "./applications.controller.ts";
import { ApplicationsService } from "./applications.service.ts";
import { WorkflowStore } from "./workflow-store.ts";

@Module({
  imports: [CompaniesModule],
  controllers: [ApplicationsController, JobsController],
  providers: [ApplicationsService, WorkflowStore],
})
export class ApplicationsModule {}
