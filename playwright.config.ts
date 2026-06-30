import { defineConfig, devices } from "@playwright/test";

// Allow CI to force headless even when developer uses --headed
const HEADLESS = process.env.CI === "true" ? true : false;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./tests/results",
  timeout: 30_000,
  retries: 1,
  workers: 1, // serial — single dev server instance

  // Runs before the first test worker: creates real Supabase sessions and
  // writes them to tests/storageState/{role}.json for authenticated test blocks.
  globalSetup: "./tests/e2e/auth-setup/global-setup.ts",

  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/playwright-report", open: "never" }],
    ["json", { outputFile: "tests/playwright-report/results.json" }],
  ],

  use: {
    baseURL: "http://localhost:3000",
    headless: HEADLESS,
    // Capture evidence on every failure
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    trace: "retain-on-failure",
    // Include all response headers so security-header tests see them
    extraHTTPHeaders: {},
    // Slow down interactions so they're visible in headed mode
    launchOptions: {
      slowMo: HEADLESS ? 0 : 80,
      args: ["--start-maximized"],
    },
    viewport: { width: 1280, height: 900 },
  },

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: "ignore",
    stderr: "ignore",
  },
});
