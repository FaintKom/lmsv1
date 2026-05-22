import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for end-to-end browser tests.
 *
 * Two test suites live here:
 *   - `e2e/`           — full LMS smoke tests against a running server
 *                        (PLAYWRIGHT_BASE_URL points at the dev/staging URL)
 *   - `widget-tests/`  — standalone tests for the SAT lesson widgets,
 *                        loaded directly from file:// fixtures, no server
 *
 * Unit / component tests live elsewhere and run via Vitest — see
 * vitest.config.ts.
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/**/*.spec.ts", "widget-tests/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
