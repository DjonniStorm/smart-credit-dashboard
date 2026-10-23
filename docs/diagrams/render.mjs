// Перерисовывает все SVG из Mermaid-блоков в .md этой папки.
// Запуск из корня репозитория: node docs/diagrams/render.mjs
// Если Chromium для puppeteer не скачан: CHROME_PATH="путь/к/chrome" node docs/diagrams/render.mjs
import { execFileSync } from "node:child_process";
import { mkdtempSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));

// Порядок имён совпадает с порядком mermaid-блоков в файле.
const sources = {
  "01-architecture.md": ["01-architecture"],
  "02-application-statuses.md": ["02-statuses-mapping", "02-statuses-public"],
  "03-submission-sequence.md": ["03-sequence-api", "03-sequence-backoffice"],
  "04-data-model.md": ["04-data-model"],
  "05-entity-model.md": ["05-entity-model"],
};

const work = mkdtempSync(join(tmpdir(), "diagrams-"));
// Без htmlLabels в SVG нет foreignObject, подписи видны вне браузера.
const mermaidConfig = join(work, "mermaid.json");
writeFileSync(
  mermaidConfig,
  JSON.stringify({
    htmlLabels: false,
    flowchart: { htmlLabels: false },
    state: { htmlLabels: false },
  }),
);

const args = ["-y", "@mermaid-js/mermaid-cli", "-c", mermaidConfig];
if (process.env.CHROME_PATH) {
  const puppeteerConfig = join(work, "puppeteer.json");
  writeFileSync(
    puppeteerConfig,
    JSON.stringify({ executablePath: process.env.CHROME_PATH }),
  );
  args.push("-p", puppeteerConfig);
}

try {
  for (const [file, names] of Object.entries(sources)) {
    const out = join(work, "out.svg");
    execFileSync("npx", [...args, "-i", join(dir, file), "-o", out], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    // mmdc для markdown добавляет к имени -1, -2, по числу блоков.
    names.forEach((name, i) => {
      renameSync(join(work, `out-${i + 1}.svg`), join(dir, `${name}.svg`));
    });
  }
} finally {
  rmSync(work, { recursive: true, force: true });
}
