import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

// Quarantined: depends on UI form login. See Phase 3 PR notes.
test.skip("teacher journey @quarantine", async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginViaUi("teacher");
  await expect(page).toHaveURL(/\/admin/);

  // Admin users page is part of the teacher's surface (teacher role can
  // see /admin/* in this app per backend/app/courses/router.py).
  await page.goto("/admin/users");
  await expect(page).toHaveURL(/\/admin/);
});
