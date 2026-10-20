import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse } from "@nestjs/swagger";
import { CheckState, HealthStatus, ServiceName } from "@repo/contracts";
import { ZodSerializerDto } from "nestjs-zod";
import { DatabaseService } from "../database.service.ts";
import { HealthDto } from "./health.dto.ts";

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
