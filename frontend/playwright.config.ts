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
 * One left: all-content-types drives real youtube.com / docs.google.com
 * embeds, and a transient outage there would turn main red for reasons that
 * are not ours.
 *
 * E2E_SKIP_DARK_THEME is gone — that debt was paid on 2026-08-11 (seven
 * defects behind 31 route reports, all raw scale values that stayed light
 * while the semantic tokens flipped), so the audit is a gate again.
 *
 * The flag is unset by default, so a local run still covers everything.
 */
const testIgnore: string[] = [];
if (process.env.E2E_SKIP_EXTERNAL) testIgnore.push("**/all-content-types.spec.ts");

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
      use: {
        ...devices["Desktop Chrome"],
        // A camera and a microphone that exist without any hardware, and a
        // permission prompt that answers itself. The fake camera is a moving
        // pattern, which is better than a real face for the one check that
        // matters about a recording: the pattern is either in the file or it
        // is not, and "I don't see anybody" is not evidence (FR-027).
        launchOptions: {
          args: [
            "--use-fake-device-for-media-stream",
            // getDisplayMedia is not covered by the fake device flag; without
            // this the picker blocks and screen sharing cannot be tested at all.
            "--auto-select-desktop-capture-source=Entire screen",
            "--use-fake-ui-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
        permissions: ["camera", "microphone"],
      },
    },
  ],
});
