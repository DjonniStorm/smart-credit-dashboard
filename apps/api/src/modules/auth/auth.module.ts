import { Module } from "@nestjs/common";

import { DemoDataModule } from "../../common/demo-data/demo-data.module.ts";
import { AuthController } from "./auth.controller.ts";
import { AuthService } from "./auth.service.ts";

@Module({
  imports: [DemoDataModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
