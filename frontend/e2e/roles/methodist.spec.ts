import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

// Unquarantined: rewrites via BACKEND_URL handle the proxy.
test("methodist journey @smoke", async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginViaUi("methodist");
  // Methodist is role=teacher under the hood, so login lands on /admin.
  await expect(page).toHaveURL(/\/admin/);

  // This used to visit /knowledge and assert the URL. That page was removed in
  // May and the route now 404s — but a 404 keeps the URL, so the test went on
  // passing while checking nothing. Assert rendered content instead.
  await page.goto("/admin/courses");
  await expect(page.getByText(/QA Course/i).first()).toBeVisible({ timeout: 15_000 });
});
