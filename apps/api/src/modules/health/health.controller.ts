import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { ZodSerializerDto } from "nestjs-zod";

import { CheckState, HealthStatus, ServiceName } from "@repo/contracts";

import { DatabaseService } from "../../common/database/database.service.ts";
import { HealthDto } from "./dto/health.dto.ts";

@Controller("health")
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  @ApiOkResponse({ type: HealthDto })
  @ZodSerializerDto(HealthDto)
  async check(): Promise<HealthDto> {
    const dbUp = await this.db.ping();
    return {
      status: dbUp ? HealthStatus.Ok : HealthStatus.Degraded,
      service: ServiceName.Api,
      checks: { postgres: dbUp ? CheckState.Up : CheckState.Down },
    };
  }
}
