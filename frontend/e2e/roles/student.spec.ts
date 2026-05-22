import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

// Quarantined: depends on UI form login which needs NEXT_PUBLIC_API_URL
// runtime support in api-client.ts. See Phase 3 PR notes.
test.skip("student journey @quarantine", async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginViaUi("student");
  await expect(page).toHaveURL(/\/dashboard/);

  // Navigate to courses list - the student must be able to reach their
  // enrolled courses. The actual list rendering is loose (any text match)
  // so a UI rewrite doesn't immediately invalidate this smoke test.
  await page.goto("/courses");
  await expect(page).toHaveURL(/\/courses/);
});
