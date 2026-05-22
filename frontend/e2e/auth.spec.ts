import { expect, test } from "@playwright/test";

import { LoginPage } from "./poms/LoginPage";

const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";

test.describe("auth @smoke", () => {
  test("protected admin route redirects unauthenticated user to /login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
  });

  test("API login returns tokens that authenticate /auth/me", async ({ context }) => {
    const page = await context.newPage();
    const login = new LoginPage(page);
    const tokens = await login.loginViaApi(context, "admin");
    const me = await context.request.get(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    expect(me.ok(), `me.status=${me.status()} body=${await me.text()}`).toBeTruthy();
    const body = (await me.json()) as { email: string };
    expect(body.email).toBe("qa-admin@qa.example.com");
  });

  // UI form-login tests use Next.js server-side rewrites (next.config.ts
  // `rewrites()` consumes BACKEND_URL env) to proxy /api/* -> backend, so
  // the browser's relative axios baseURL works without a code change.
  test("UI login as student lands on dashboard", async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginViaUi("student");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("UI login as teacher lands on admin", async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginViaUi("teacher");
    await expect(page).toHaveURL(/\/admin/);
  });
});
