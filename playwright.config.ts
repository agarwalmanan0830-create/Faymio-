import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

// Chromium is available in the execution environment; no browser download required.
export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/e2e-setup.ts",
  testMatch: "e2e.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 12_000 },
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    baseURL: "http://127.0.0.1:3001",
    viewport: { width: 1440, height: 1000 },
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_CHROMIUM_PATH ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
      args: ["--no-sandbox", "--disable-dev-shm-usage"],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // Global setup rebuilds a separate disposable SQLite DB before tests run.
  webServer: {
    command: "npm run start -- -p 3001",
    url: "http://127.0.0.1:3001/dashboard",
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      DATABASE_URL: "file:/tmp/faymio-e2e.db",
      DEMO_MODE: "true",
      ALLOW_DEMO_IN_PRODUCTION: "true",
    },
  },
});
