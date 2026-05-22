import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

// Quarantined: depends on UI form login. See Phase 3 PR notes.
test.skip("admin journey @quarantine", async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginViaUi("admin");
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/users/);
});
