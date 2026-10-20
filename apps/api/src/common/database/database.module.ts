import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import type { Env } from "../config/env.schema.ts";
import { DatabaseService } from "./database.service.ts";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        type: "postgres" as const,
        url: config.getOrThrow("DATABASE_URL", { infer: true }),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
