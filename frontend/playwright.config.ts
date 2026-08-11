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
/**
 * Suites the PR gate leaves out — expressed as what to skip, not what to run,
 * so a new spec joins the gate by existing rather than by being remembered.
 *
 * - all-content-types drives real youtube.com / docs.google.com embeds. A
 *   transient outage there would turn main red for reasons that are not ours.
 * - dark-theme is currently reporting genuine design debt (student 2 routes,
 *   teacher 13, admin 16). CI still runs it, as a report rather than a gate;
 *   drop the flag once that debt is paid.
 *
 * Neither flag is set by default, so a local run still covers everything.
 */
const testIgnore: string[] = [];
if (process.env.E2E_SKIP_EXTERNAL) testIgnore.push("**/all-content-types.spec.ts");
if (process.env.E2E_SKIP_DARK_THEME) testIgnore.push("**/dark-theme.spec.ts");

export default defineConfig({
  testDir: ".",
  testMatch: ["e2e/**/*.spec.ts", "widget-tests/**/*.spec.ts"],
  testIgnore,
  // Fails fast when the app under test is wired to the wrong backend, or the
  // seed never ran — see e2e/global-setup.ts for why that is worth a gate.
  globalSetup: "./e2e/global-setup.ts",
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
