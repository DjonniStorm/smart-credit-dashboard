import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { cleanupOpenApiDoc } from "nestjs-zod";

export function buildOpenApiDocument(app: INestApplication) {
  const raw = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("alfa-future api")
      .setDescription("Заявки, статусы, кредитное решение")
      .setVersion("0.1.0")
      .addServer(process.env.NODE_ENV === "production" ? "/api" : "/")
      .build(),
  );
  return cleanupOpenApiDoc(raw);
}
