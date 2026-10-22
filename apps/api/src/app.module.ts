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

@Module({
  imports: [
    ConfigModule,
    CqrsModule.forRoot(),
    DatabaseModule,
    HealthModule,
    CompaniesModule,
    ApplicationsModule,
    ExampleModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
