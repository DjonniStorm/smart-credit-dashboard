import { Module } from "@nestjs/common";
import { ApplicationsModule } from "../applications/applications.module.ts";
import { AuthModule } from "../auth/auth.module.ts";
import { ClientReportsController } from "./client-reports.controller.ts";
import { ClientReportsService } from "./client-reports.service.ts";

@Module({ imports: [ApplicationsModule, AuthModule], controllers: [ClientReportsController], providers: [ClientReportsService] })
export class ClientReportsModule {}
