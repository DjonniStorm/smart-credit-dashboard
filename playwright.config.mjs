/* eslint-disable no-undef, turbo/no-undeclared-env-vars */
import { defineConfig, devices } from "@playwright/test";

/**
 * Сквозные тесты запускаются против поднятого compose-стека и API-контрактов.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.smoke.mjs",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.CLIENT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "pnpm --filter api dev",
      url: `${process.env.API_BASE_URL ?? "http://localhost:4000"}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { NODE_ENV: "test" },
    },
    {
      command: "pnpm --filter client dev",
      url: process.env.CLIENT_BASE_URL ?? "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_URL: process.env.API_URL ?? "http://localhost:4000",
      },
    },
    {
      command: "pnpm --filter backoffice dev",
      url: process.env.BACKOFFICE_BASE_URL ?? "http://localhost:3001",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        API_URL: process.env.API_URL ?? "http://localhost:4000",
      },
    },
  ],
});
