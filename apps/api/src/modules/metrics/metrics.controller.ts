import { Controller, Get, Header, Inject } from "@nestjs/common";

import { MetricsService } from "./metrics.service.ts";

/**
 * Метрики системы. Открыты без гвардов, как и /health, потому что отдают только
 * агрегаты из БД без персональных данных; в проде стоит ограничить внутренней сетью.
 */
@Controller("metrics")
export class MetricsController {
  constructor(
    @Inject(MetricsService) private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async collect(): Promise<string> {
    return this.metricsService.collect();
  }
}
