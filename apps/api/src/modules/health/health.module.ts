import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../common/database/database.module.ts";
import { HealthController } from "./health.controller.ts";

@Module({
  imports: [DatabaseModule],
  controllers: [HealthController],
})
export class HealthModule {}
