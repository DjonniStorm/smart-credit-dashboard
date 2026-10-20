import { Module } from "@nestjs/common";
import { CompaniesController } from "./companies/companies.controller.js";
import { CompaniesService } from "./companies/companies.service.js";
import { DatabaseService } from "./database.service.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  controllers: [HealthController, CompaniesController],
  providers: [DatabaseService, CompaniesService],
})
export class AppModule {}
