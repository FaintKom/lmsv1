import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for end-to-end browser tests.
 *
 * Tests live in `e2e/` and run against a dev or staging URL configured by
 * PLAYWRIGHT_BASE_URL. In CI we point this at a freshly-built backend +
 * frontend pair; locally the default is http://localhost:3000.
 *
 * Unit / component tests live elsewhere and run via Vitest — see
 * vitest.config.ts.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
