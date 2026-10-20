import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import "reflect-metadata";

import { AppModule } from "./app.module.ts";
import type { Env } from "./common/config/env.schema.ts";
import { buildOpenApiDocument } from "./common/openapi/openapi.ts";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  SwaggerModule.setup("docs", app, buildOpenApiDocument(app));
  const config = app.get(ConfigService<Env, true>);
  await app.listen(config.getOrThrow("PORT", { infer: true }));
}

void bootstrap();
