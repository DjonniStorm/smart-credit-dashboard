import { Module } from "@nestjs/common";

import { MetricsController } from "./metrics.controller.ts";
import { MetricsService } from "./metrics.service.ts";

@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
})
export class MetricsModule {}
