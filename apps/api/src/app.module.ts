import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { CqrsModule } from "@nestjs/cqrs";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";

import { ConfigModule } from "./common/config/config.module.ts";
import { DatabaseModule } from "./common/database/database.module.ts";
import { CompaniesModule } from "./modules/companies/companies.module.ts";
import { ApplicationsModule } from "./modules/applications/applications.module.ts";
import { ExampleModule } from "./modules/example/example.module.ts";
import { HealthModule } from "./modules/health/health.module.ts";
import { StorageModule } from "./common/storage/storage.module.ts";
import { DemoDataModule } from "./common/demo-data/demo-data.module.ts";
import { AuthModule } from "./modules/auth/auth.module.ts";
import { CatalogModule } from "./modules/catalog/catalog.module.ts";
import { ReportsModule } from "./modules/reports/reports.module.ts";
import { ClientReportsModule } from "./modules/client-reports/client-reports.module.ts";

@Module({
  imports: [
    ConfigModule,
    CqrsModule.forRoot(),
    DatabaseModule,
    StorageModule,
    DemoDataModule,
    AuthModule,
    CatalogModule,
    HealthModule,
    CompaniesModule,
    ApplicationsModule,
    ReportsModule,
    ClientReportsModule,
    ExampleModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
