import { expect, test } from "@playwright/test";

/**
 * Smoke tests — the minimum bar for "the site is alive".
 *
 * These run against PLAYWRIGHT_BASE_URL (defaults to http://localhost:3000
 * for local, set to the staging/prod URL in CI). Every test here must:
 * - Pass against a fresh install without any seed data beyond the built-in
 *   demo course.
 * - Finish in under 10 seconds.
 * - Not mutate server state.
 *
 * Deeper auth + course-flow tests go in separate spec files.
 */

// The pricing page was retired from the product surface: next.config.ts
// redirects /pricing -> / and the landing nav no longer links to it. The
// "four tiers" test that used to sit here went with it — it only kept
// passing against a stale build that still served the old page.
test("landing page renders with core navigation", async ({ page }) => {
  await page.goto("/");
  // By href, not by label. These used to match on text, so renaming "Try Demo"
  // to "Try the demo" turned a copy edit into a red build — and the assertion
  // would break again the moment anyone opened the page in another locale.
  // Each destination appears twice (header and hero), so take the first match
  // rather than tripping strict mode.
  await expect(page.locator('a[href="/demo?role=student"]').first()).toBeVisible();
  await expect(page.locator('a[href="/login"]').first()).toBeVisible();
  await expect(page.locator('a[href="/register"]').first()).toBeVisible();
});

test("login page renders form fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in|welcome/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});
