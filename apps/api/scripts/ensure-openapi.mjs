import { access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const outFile = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../packages/sdk/openapi.json",
);
await access(outFile);
console.log(outFile);
