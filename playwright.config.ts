import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "pnpm --filter @wg/server dev",
      url: "http://127.0.0.1:8877/health",
      env: {
        ...process.env,
        PORT: "8877",
        HOST: "127.0.0.1",
        DB_PATH: ":memory:",
        WEB_PREVIEW_BASE_URL: "http://127.0.0.1:4173",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter @wg/web dev --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      env: {
        ...process.env,
        VITE_API_BASE_URL: "http://127.0.0.1:8877",
      },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
