import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

// Quarantined: depends on UI form login. See Phase 3 PR notes.
test.skip("methodist journey @quarantine", async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginViaUi("methodist");
  // Methodist is role=teacher under the hood, so login lands on /admin.
  await expect(page).toHaveURL(/\/admin/);

  // Knowledge module is the methodist's primary surface.
  await page.goto("/knowledge");
  await expect(page).toHaveURL(/\/knowledge/);
});
