import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.ts";
import { config } from "./config.ts";
import { buildOpenApiDocument } from "./openapi.ts";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  SwaggerModule.setup("docs", app, buildOpenApiDocument(app));
  await app.listen(config.port);
}

void bootstrap();
