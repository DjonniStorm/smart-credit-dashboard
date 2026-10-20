import { Controller, Get } from "@nestjs/common";
import { DatabaseService } from "../database.service.js";
import { HealthDto } from "./health.dto.js";

@Controller("health")
export class HealthController {
  constructor(private readonly db: DatabaseService) {}

  @Get()
  async check(): Promise<HealthDto> {
    const dbUp = await this.db.ping();
    return {
      status: dbUp ? "ok" : "degraded",
      service: "api",
      checks: { postgres: dbUp ? "up" : "down" },
    };
  }
}
