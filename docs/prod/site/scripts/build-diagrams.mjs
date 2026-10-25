import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const sourceRoot = path.join(siteRoot, "docs", "developers", "diagrams");
const generatedRoot = path.join(sourceRoot, "generated");
const outputRoot = process.env.SCD_DIAGRAM_OUTPUT_ROOT ?? generatedRoot;
const generatedModulePath =
  process.env.SCD_DIAGRAM_MODULE_PATH ??
  path.join(siteRoot, "theme", "generated", "architecture-diagrams.ts");
const configPath = path.join(siteRoot, "scripts", "mermaid.config.json");
const mmdcCommand = path.join(
  siteRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "mmdc.cmd" : "mmdc",
);

const diagrams = [
  {
    id: "component-overview",
    title: "Component overview",
    description:
      "C4 Level 2: предприниматель и сотрудник банка работают через два web-интерфейса, API вызывает scoring и хранит данные в PostgreSQL.",
  },
  {
    id: "api-internals",
    title: "API internals",
    description:
      "C4 Level 3: API boundary, guards, workflow, QueueWorkerService, scoring_jobs, decision engine, audit и reports.",
  },
  {
    id: "repository",
    title: "Repository and package view",
    description:
      "Mermaid flowchart: workspace applications, shared packages, tooling, generated OpenAPI flow и отдельный docs-site.",
  },
  {
    id: "deployment",
    title: "Deployment view",
    description:
      "C4 Deployment: browser actors, Docker host, Compose network, runtime containers, volumes и monitoring profile.",
  },
];

function hashSource(source) {
  return createHash("sha256").update(source).digest("hex");
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function addSvgMetadata(svg, diagram, sourceHash) {
  const titleId = `architecture-${diagram.id}-title`;
  const descriptionId = `architecture-${diagram.id}-description`;
  const metadata = `<!-- source-hash: ${sourceHash} -->\n<title id="${titleId}">${escapeXml(diagram.title)}</title><desc id="${descriptionId}">${escapeXml(diagram.description)}</desc>`;

  return svg.replace(/<svg\b([^>]*)>/, (_match, attributes) => {
    const cleanedAttributes = attributes
      .replace(/\srole="[^"]*"/g, "")
      .replace(/\saria-labelledby="[^"]*"/g, "");
    return `<svg${cleanedAttributes} role="img" aria-labelledby="${titleId} ${descriptionId}">${metadata}`;
  });
}

function stabilizeSvgGeometry(svg) {
  const snapSize = 2;
  return svg.replace(/\sd="([^"]*)"/g, (_match, pathData) => {
    const stablePathData = pathData.replace(/-?\d+\.\d+/g, (value) => {
      const snapped = Math.round(Number(value) / snapSize) * snapSize;
      return String(snapped);
    });
    return ` d="${stablePathData}"`;
  });
}

function stabilizeDocumentShape(svg) {
  const stableDocumentPath = "M-76 -36 H76 V22 L64 36 H-76 Z";
  const stableDocumentOutline = "M-75 -44 H75 V34 H-75 Z";
  return svg
    .replace(
      /(<g class="node [^"]*" id="[^"]*flowchart-svg-\d+"[^>]*>[\s\S]*?<path d=")[^"]*(")/,
      `$1${stableDocumentPath}$2`,
    )
    .replace(
      /(<g class="node [^"]*" id="[^"]*flowchart-svg-\d+"[^>]*>[\s\S]*?<path d="[^"]*"[^>]*\/><path d=")[^"]*(")/,
      `$1${stableDocumentOutline}$2`,
    );
}

function applyDiagramPalette(svg) {
  const colors = new Map([
    ["#438DD5", "#f7e4e5"],
    ["#3C7FC0", "#bd252d"],
    ["#073B6F", "#202124"],
    ["#08427B", "#202124"],
    ["#FFFFFF", "#202124"],
    ["#444444", "#746e68"],
  ]);

  return svg.replace(/#[0-9A-Fa-f]{6}/g, (color) => colors.get(color) ?? color);
}

function findBrowserExecutable() {
  return (
    process.env.PUPPETEER_EXECUTABLE_PATH ?? process.env.CHROME_PATH ?? null
  );
}

async function createPuppeteerConfig() {
  const executablePath = findBrowserExecutable();
  if (!executablePath) {
    return null;
  }

  const configPath = path.join(
    os.tmpdir(),
    `smart-credit-puppeteer-${process.pid}.json`,
  );
  await fs.writeFile(
    configPath,
    `${JSON.stringify({
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
      ],
    })}\n`,
    "utf8",
  );
  return configPath;
}

function runMmdc(sourcePath, outputPath, puppeteerConfigPath) {
  return new Promise((resolve, reject) => {
    const args = [
      "--input",
      sourcePath,
      "--output",
      outputPath,
      "--configFile",
      configPath,
      "--backgroundColor",
      "transparent",
      "--no-font-embed",
      "--quiet",
    ];
    if (puppeteerConfigPath) {
      args.push("--puppeteerConfigFile", puppeteerConfigPath);
    }

    const child = spawn(mmdcCommand, args, {
      cwd: siteRoot,
      env: {
        ...process.env,
        PATH: `${path.dirname(process.execPath)}${path.delimiter}${process.env.PATH ?? ""}`,
      },
      shell: process.platform === "win32",
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`mmdc завершился с кодом ${code ?? "unknown"}`));
    });
  });
}

async function renderDiagram(diagram, outputRoot, puppeteerConfigPath) {
  const sourcePath = path.join(sourceRoot, `${diagram.id}.mmd`);
  const rawSource = await fs.readFile(sourcePath, "utf8");
  const sourceHash = hashSource(rawSource);
  const temporarySvgPath = path.join(outputRoot, `${diagram.id}.raw.svg`);
  const outputPath = path.join(outputRoot, `${diagram.id}.svg`);

  await runMmdc(sourcePath, temporarySvgPath, puppeteerConfigPath);
  const rawSvg = await fs.readFile(temporarySvgPath, "utf8");
  const svg = addSvgMetadata(
    stabilizeSvgGeometry(stabilizeDocumentShape(applyDiagramPalette(rawSvg))),
    diagram,
    sourceHash,
  );
  await fs.writeFile(outputPath, svg, "utf8");
  await fs.rm(temporarySvgPath, { force: true });

  return {
    id: diagram.id,
    source: `${diagram.id}.mmd`,
    output: `${diagram.id}.svg`,
    sourceHash,
    outputHash: hashSource(svg),
    title: diagram.title,
    description: diagram.description,
  };
}

async function writeIndex(entries, targetRoot, modulePath) {
  const svgExports = [];
  const hashExports = [];

  for (const entry of entries) {
    const svg = await fs.readFile(path.join(targetRoot, entry.output), "utf8");
    const key = JSON.stringify(entry.id);
    svgExports.push(`  ${key}: ${JSON.stringify(svg)},`);
    hashExports.push(`  ${key}: ${JSON.stringify(entry.sourceHash)},`);
  }

  const source = `export type ArchitectureDiagramId = ${entries
    .map((entry) => JSON.stringify(entry.id))
    .join(
      " | ",
    )};\n\nexport const diagramSvgs: Record<ArchitectureDiagramId, string> = {\n${svgExports.join("\n")}\n};\n\nexport const diagramSourceHashes: Record<ArchitectureDiagramId, string> = {\n${hashExports.join("\n")}\n};\n`;
  await fs.mkdir(path.dirname(modulePath), { recursive: true });
  await fs.writeFile(modulePath, source, "utf8");
}

async function main() {
  await fs.mkdir(outputRoot, { recursive: true });
  const entries = [];
  const puppeteerConfigPath = await createPuppeteerConfig();

  try {
    for (const diagram of diagrams) {
      entries.push(
        await renderDiagram(diagram, outputRoot, puppeteerConfigPath),
      );
    }

    await fs.writeFile(
      path.join(outputRoot, "manifest.json"),
      `${JSON.stringify({ version: 2, generatedBy: "@mermaid-js/mermaid-cli@12.0.0", diagrams: entries }, null, 2)}\n`,
      "utf8",
    );
    await writeIndex(entries, outputRoot, generatedModulePath);
  } finally {
    if (puppeteerConfigPath) {
      await fs.rm(puppeteerConfigPath, { force: true });
    }
  }
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
