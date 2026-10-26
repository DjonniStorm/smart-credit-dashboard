import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(siteRoot, "docs", "developers", "diagrams");
const generatedRoot = path.join(sourceRoot, "generated");
const manifestPath = path.join(generatedRoot, "manifest.json");
const generatedModulePath = path.join(
  siteRoot,
  "theme",
  "generated",
  "architecture-diagrams.ts",
);

function hashContent(content) {
  return createHash("sha256").update(content).digest("hex");
}

function hashSource(source) {
  return hashContent(source.replace(/\r\n?/g, "\n"));
}

function readGeneratedMap(source, exportName) {
  const escapedName = exportName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const section = source.match(
    new RegExp(`export const ${escapedName}[^=]*= \\{\\n([\\s\\S]*?)\\n\\};`),
  );
  if (!section) {
    throw new Error(`Не найден экспорт ${exportName} в generated-модуле`);
  }

  const entries = new Map();
  for (const line of section[1].split("\n")) {
    const match = line.match(/^  ("(?:\\.|[^"\\])+"): (.+),$/);
    if (!match) {
      throw new Error(`Не удалось прочитать строку экспорта ${exportName}`);
    }
    entries.set(JSON.parse(match[1]), JSON.parse(match[2]));
  }
  return entries;
}

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.version !== 2) {
    throw new Error(
      "Неподдерживаемая версия manifest.json; пересоберите диаграммы",
    );
  }
  if (manifest.generatedBy !== "@mermaid-js/mermaid-cli@12.0.0") {
    throw new Error(
      "Диаграммы сгенерированы не pinned @mermaid-js/mermaid-cli@12.0.0",
    );
  }

  const generatedModule = await fs.readFile(generatedModulePath, "utf8");
  const svgMap = readGeneratedMap(generatedModule, "diagramSvgs");
  const sourceHashMap = readGeneratedMap(
    generatedModule,
    "diagramSourceHashes",
  );
  const expectedIds = new Set(manifest.diagrams.map((entry) => entry.id));

  if (
    svgMap.size !== expectedIds.size ||
    sourceHashMap.size !== expectedIds.size
  ) {
    throw new Error(
      "Generated-модуль содержит неполный или лишний список диаграмм",
    );
  }

  for (const entry of manifest.diagrams) {
    const sourcePath = path.join(sourceRoot, entry.source);
    const svgPath = path.join(generatedRoot, entry.output);
    const [source, svg] = await Promise.all([
      fs.readFile(sourcePath, "utf8"),
      fs.readFile(svgPath, "utf8"),
    ]);
    const sourceHash = hashSource(source);
    const outputHash = hashContent(svg);

    if (sourceHash !== entry.sourceHash) {
      throw new Error(
        `${entry.source}: исходник изменился, запустите npm run diagrams:build`,
      );
    }
    if (outputHash !== entry.outputHash) {
      throw new Error(
        `${entry.output}: SVG отличается от сохранённого manifest; запустите npm run diagrams:build`,
      );
    }
    if (!svg.includes(`<!-- source-hash: ${sourceHash} -->`)) {
      throw new Error(`${entry.output}: в SVG нет актуальной метки исходника`);
    }
    if (svgMap.get(entry.id) !== svg) {
      throw new Error(
        `${entry.id}: generated-модуль не совпадает с сохранённым SVG`,
      );
    }
    if (sourceHashMap.get(entry.id) !== sourceHash) {
      throw new Error(
        `${entry.id}: generated-модуль содержит устаревший хэш исходника`,
      );
    }
  }

  console.log(
    `Проверены готовые SVG без запуска Chromium: ${manifest.diagrams.length}`,
  );
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
