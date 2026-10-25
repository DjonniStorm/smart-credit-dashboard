import { Module } from "@nestjs/common";

import { DemoDataModule } from "../../common/demo-data/demo-data.module.ts";
import { AuthController } from "./auth.controller.ts";
import { AuthService } from "./auth.service.ts";
import { SessionGuard } from "./session.guard.ts";

@Module({
  imports: [DemoDataModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
