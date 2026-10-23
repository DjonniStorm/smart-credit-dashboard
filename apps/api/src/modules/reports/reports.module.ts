import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module.ts";
import { ReportCalculator } from "./report-calculator.ts";
import { ReportSeriesCalculator } from "./report-series.ts";
import { ReportsController } from "./reports.controller.ts";
import { ReportsRepository } from "./reports.repository.ts";
import { ReportsService } from "./reports.service.ts";

@Module({
  imports: [AuthModule],
  controllers: [ReportsController],
  providers: [
    ReportsRepository,
    ReportCalculator,
    ReportSeriesCalculator,
    ReportsService,
  ],
  exports: [ReportsService],
})
export class ReportsModule {}
