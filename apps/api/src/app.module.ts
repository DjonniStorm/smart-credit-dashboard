import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR, APP_PIPE } from "@nestjs/core";
import { CqrsModule } from "@nestjs/cqrs";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import { CompaniesController } from "./companies/companies.controller.ts";
import { CompaniesService } from "./companies/companies.service.ts";
import { config } from "./config.ts";
import { DatabaseService } from "./database.service.ts";
import { HealthController } from "./health/health.controller.ts";

@Module({
  imports: [
    CqrsModule.forRoot(),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: config.databaseUrl,
      autoLoadEntities: true,
      synchronize: false,
    }),
  ],
  controllers: [HealthController, CompaniesController],
  providers: [
    DatabaseService,
    CompaniesService,
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}
