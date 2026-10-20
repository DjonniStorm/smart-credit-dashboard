import { Module } from "@nestjs/common";

import { CompaniesController } from "./companies.controller.ts";
import { CompaniesService } from "./companies.service.ts";

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesService],
})
export class CompaniesModule {}
