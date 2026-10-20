import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module.js";
import { config } from "./config.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("alfa-future api")
      .setDescription("Заявки, статусы, кредитное решение")
      .setVersion("0.1.0")
      .build(),
  );
  SwaggerModule.setup("docs", app, document);

  await app.listen(config.port);
}

void bootstrap();
