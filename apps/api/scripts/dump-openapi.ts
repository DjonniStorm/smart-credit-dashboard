import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { NestFactory } from "@nestjs/core";
import "reflect-metadata";

import { OpenApiDumpModule } from "../src/common/openapi/openapi-dump.module.ts";
import { buildOpenApiDocument } from "../src/common/openapi/openapi.ts";

const outDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/sdk",
);
const outFile = join(outDir, "openapi.json");

const app = await NestFactory.create(OpenApiDumpModule, {
  logger: false,
  preview: true,
  abortOnError: true,
});
const document = buildOpenApiDocument(app);
await mkdir(outDir, { recursive: true });
await writeFile(outFile, `${JSON.stringify(document, null, 2)}\n`);
await app.close();
console.log(`wrote ${outFile}`);
process.exit(0);
