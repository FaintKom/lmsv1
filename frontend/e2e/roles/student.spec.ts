import { expect, test } from "@playwright/test";

import { LoginPage } from "../poms/LoginPage";

// Unquarantined: Next.js server-side rewrites via BACKEND_URL env handle
// browser /api/* -> backend proxy without changing api-client baseURL.
test("student journey @smoke", async ({ page }) => {
  const login = new LoginPage(page);
  await login.loginViaUi("student");
  await expect(page).toHaveURL(/\/dashboard/);

  // Navigate to courses list - the student must be able to reach their
  // enrolled courses. The actual list rendering is loose (any text match)
  // so a UI rewrite doesn't immediately invalidate this smoke test.
  await page.goto("/courses");
  await expect(page).toHaveURL(/\/courses/);

  // specs/071: every course card carries its subject, which picks the
  // cover's field colour. An unknown category must still land on a subject.
  const cards = page.locator("a[data-subject]");
  await expect(cards.first()).toBeVisible();
  for (const subject of await cards.evaluateAll((els) => els.map((e) => e.getAttribute("data-subject")))) {
    expect(["lang", "math", "code", "other"]).toContain(subject);
  }
});
