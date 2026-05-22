import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

// Unquarantined: rewrites via BACKEND_URL handle the proxy.
test("admin journey @smoke", async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginViaUi("admin");
  await expect(page).toHaveURL(/\/admin/);

  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin\/users/);
});
