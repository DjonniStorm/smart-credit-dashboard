import { defineConfig, globalIgnores } from "eslint/config";

import { config as baseConfig } from "@repo/eslint-config/base";
import { nextJsConfig } from "@repo/eslint-config/next-js";
import { nodeConfig } from "@repo/eslint-config/node";
import { config as reactInternal } from "@repo/eslint-config/react-internal";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "**/dist/**",
    "**/.next/**",
    "**/src/generated/**",
    "apps/scoring/**",
    "pnpm-lock.yaml",
  ]),
  {
    files: ["apps/client/**/*.{js,ts,tsx}", "apps/backoffice/**/*.{js,ts,tsx}"],
    extends: nextJsConfig,
  },
  {
    files: ["apps/api/**/*.{js,ts,mjs}", "apps/mocks/**/*.{js,ts}"],
    extends: nodeConfig,
  },
  {
    files: ["packages/ui/**/*.{js,ts,tsx}", "packages/sdk/**/*.{js,ts,tsx}"],
    extends: reactInternal,
  },
  {
    files: [
      "packages/contracts/**/*.{js,ts}",
      "packages/i18n/**/*.{js,ts}",
      "packages/eslint-config/**/*.{js,mjs}",
      "*.{js,mjs}",
    ],
    extends: baseConfig,
  },
]);
