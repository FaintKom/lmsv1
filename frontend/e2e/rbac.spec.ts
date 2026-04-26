/**
 * Role-based access control E2E tests.
 *
 * Verifies that each role (student, teacher, admin) sees the correct
 * pages and is blocked from unauthorized ones. Runs against a live
 * server pointed at by PLAYWRIGHT_BASE_URL.
 *
 * Test accounts (from reference_test_accounts.md):
 *   student@grasslms.online / Student2026!
 *   teacher@grasslms.online / Teacher2026!
 *
 * Run:
 *   PLAYWRIGHT_BASE_URL=https://204-168-165-41.nip.io \
 *     npx playwright test e2e/rbac.spec.ts
 */
import { test, expect, Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 10000,
  });
}

// ---------------------------------------------------------------------------
// Student role
// ---------------------------------------------------------------------------
test.describe("Student role", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "student@grasslms.online", "Student2026!");
  });

  test("can access /dashboard", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 8000 });
  });

  test("can access /courses", async ({ page }) => {
    await page.goto(`${BASE}/courses`);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("can access /progress", async ({ page }) => {
    await page.goto(`${BASE}/progress`);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("can access /profile", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("gets redirected away from /admin", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    // Student should be redirected to /dashboard (not see admin page)
    await page.waitForURL((url) => url.pathname.includes("/dashboard"), {
      timeout: 8000,
    });
  });

  test("cannot access /admin/users", async ({ page }) => {
    await page.goto(`${BASE}/admin/users`);
    await page.waitForURL((url) => !url.pathname.includes("/admin/users"), {
      timeout: 8000,
    });
  });

  test("cannot access /admin/settings", async ({ page }) => {
    await page.goto(`${BASE}/admin/settings`);
    await page.waitForURL((url) => !url.pathname.includes("/admin/settings"), {
      timeout: 8000,
    });
  });
});

// ---------------------------------------------------------------------------
// Teacher role
// ---------------------------------------------------------------------------
test.describe("Teacher role", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "teacher@grasslms.online", "Teacher2026!");
  });

  test("can access /admin (dashboard)", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(/\/admin/);
  });

  test("can access /admin/courses", async ({ page }) => {
    await page.goto(`${BASE}/admin/courses`);
    await expect(page).toHaveURL(/\/admin\/courses/);
  });

  test("can access /admin/assignments", async ({ page }) => {
    await page.goto(`${BASE}/admin/assignments`);
    await expect(page).toHaveURL(/\/admin\/assignments/);
  });

  test("can access /profile", async ({ page }) => {
    await page.goto(`${BASE}/profile`);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test("API: cannot list admin users", async ({ page }) => {
    // Teacher should get 403 on /api/v1/admin/users
    const token = await page.evaluate(() => localStorage.getItem("access_token"));
    const resp = await page.request.get(`${BASE}/api/v1/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(resp.status()).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// API-level role checks
// ---------------------------------------------------------------------------
test.describe("API role enforcement", () => {
  test("unauthenticated request to /auth/me returns 401/403", async ({ request }) => {
    const resp = await request.get(`${BASE}/api/v1/auth/me/`);
    expect([401, 403]).toContain(resp.status());
  });

  test("public endpoints work without auth", async ({ request }) => {
    const health = await request.get(`${BASE}/health`);
    expect(health.status()).toBe(200);

    const plans = await request.get(`${BASE}/api/v1/billing/plans`);
    expect(plans.status()).toBe(200);

    const languages = await request.get(`${BASE}/api/v1/sandbox/languages`);
    expect(languages.status()).toBe(200);
  });

  test("metered billing report-usage requires auth", async ({ request }) => {
    const resp = await request.post(`${BASE}/api/v1/billing/report-usage`, {
      data: {
        org_id: "00000000-0000-0000-0000-000000000000",
        metric: "test",
        quantity: 1,
        period_start: "2026-01-01",
        period_end: "2026-01-31",
      },
    });
    // Should be 401/403, NOT 201
    expect([401, 403]).toContain(resp.status());
  });
});
