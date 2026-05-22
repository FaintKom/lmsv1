import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

// Unquarantined: rewrites via BACKEND_URL handle the proxy.
test("methodist journey @smoke", async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginViaUi("methodist");
  // Methodist is role=teacher under the hood, so login lands on /admin.
  await expect(page).toHaveURL(/\/admin/);

  // Knowledge module is the methodist's primary surface.
  await page.goto("/knowledge");
  await expect(page).toHaveURL(/\/knowledge/);
});
