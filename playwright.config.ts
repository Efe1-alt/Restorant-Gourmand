import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Local env (Supabase URL/keys, local owner; Stripe test keys from
// .env.local when present) for test helpers. Same precedence as Next.js.
for (const file of [".env.development.local", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

export default defineConfig({
  testDir: "tests/e2e",
  // One database, shared state: run serially.
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "bg-BG",
    timezoneId: "Europe/Sofia",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
