import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(siteRoot, "docs", "developers", "diagrams");
const generatedRoot = path.join(sourceRoot, "generated");
const manifestPath = path.join(generatedRoot, "manifest.json");
const buildScript = path.join(siteRoot, "scripts", "build-diagrams.mjs");

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  if (manifest.generatedBy !== "@mermaid-js/mermaid-cli@12.0.0") {
    throw new Error(
      "Диаграммы сгенерированы не pinned @mermaid-js/mermaid-cli@12.0.0",
    );
  }

  const temporaryRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "smart-credit-diagrams-"),
  );
  const temporaryGeneratedRoot = path.join(
    temporaryRoot,
    "docs",
    "developers",
    "diagrams",
    "generated",
  );

  try {
    await fs.mkdir(temporaryGeneratedRoot, { recursive: true });
    const child = spawn(process.execPath, [buildScript], {
      cwd: siteRoot,
      env: {
        ...process.env,
        SCD_DIAGRAM_OUTPUT_ROOT: temporaryGeneratedRoot,
        SCD_DIAGRAM_MODULE_PATH: path.join(
          temporaryRoot,
          "architecture-diagrams.ts",
        ),
      },
      stdio: "inherit",
      windowsHide: true,
    });

    await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }
        reject(
          new Error(
            `Повторная генерация диаграмм завершилась с кодом ${code ?? "unknown"}`,
          ),
        );
      });
    });

    for (const entry of manifest.diagrams) {
      const sourcePath = path.join(sourceRoot, entry.source);
      const currentPath = path.join(generatedRoot, entry.output);
      const regeneratedPath = path.join(temporaryGeneratedRoot, entry.output);
      const [source, currentSvg, regeneratedSvg] = await Promise.all([
        fs.readFile(sourcePath, "utf8"),
        fs.readFile(currentPath, "utf8"),
        fs.readFile(regeneratedPath, "utf8"),
      ]);

      const sourceHash = createHash("sha256").update(source).digest("hex");
      if (sourceHash !== entry.sourceHash) {
        throw new Error(
          `${entry.source}: исходник изменился, запустите npm run diagrams:build`,
        );
      }
      if (currentSvg !== regeneratedSvg) {
        throw new Error(
          `${entry.output}: SVG не совпадает с воспроизводимой генерацией`,
        );
      }
    }
  } finally {
    await fs.rm(temporaryRoot, { recursive: true, force: true });
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
