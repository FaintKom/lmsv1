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

test("landing page renders with core navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Pricing" })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /get started/i })).toBeVisible();
});

test("pricing page shows all four tiers", async ({ page }) => {
  await page.goto("/pricing");
  await expect(
    page.getByRole("heading", { name: "Simple, transparent pricing" })
  ).toBeVisible();
  // The four tier headings (Free / Starter / Professional / Enterprise)
  for (const tier of ["Free", "Starter", "Professional", "Enterprise"]) {
    await expect(page.getByRole("heading", { name: tier, exact: true })).toBeVisible();
  }
  // Professional should have the "MOST POPULAR" badge
  await expect(page.getByText("MOST POPULAR")).toBeVisible();
});

test("login page renders form fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: /sign in|welcome/i })).toBeVisible();
  await expect(page.getByLabel(/email/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});
