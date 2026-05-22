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

  // UI form-login tests are quarantined until the frontend's api-client
  // honours NEXT_PUBLIC_API_URL at runtime. Right now baseURL is hard-coded
  // to "/api/v1" which 404s in the QA stack (no nginx in front of the
  // published frontend port). See follow-up note in the Phase 3 PR.
  test.skip("UI login as student lands on dashboard @quarantine", async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginViaUi("student");
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.skip("UI login as teacher lands on admin @quarantine", async ({ page }) => {
    const login = new LoginPage(page);
    await login.loginViaUi("teacher");
    await expect(page).toHaveURL(/\/admin/);
  });
});
