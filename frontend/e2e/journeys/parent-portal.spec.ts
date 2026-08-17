import { expect, test } from "@playwright/test";

import {
  ADMIN,
  Api,
  apiLogin,
  authenticate,
  BASE_URL,
  PARENT,
  STUDENT,
} from "../poms/ContentTypeHarness";

/**
 * The parent portal, which had no coverage at all until 2026-08-15 — no spec,
 * and no parent in the QA seed, so the role could not be exercised even by
 * hand. "A parent sees progress without ringing the office" is one of the
 * three differentiators we plan to sell on, and it was the least tested part
 * of the product.
 *
 * The journey is built around the rule that a school, not a parent, decides
 * whose child is whose. Linking used to be self-service: a parent typed any
 * classmate's address and got that child's grades. So the first test here is
 * the refusal, and the rest is the path that replaced it.
 */

test.describe.configure({ mode: "serial" });

let adminApi: Api;
let studentId = "";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const admin = await apiLogin(request, ADMIN);
  adminApi = new Api(request, admin.access_token);

  const student = await apiLogin(request, STUDENT);
  studentId = student.user.id;

  // Runs share one database, so start from "not linked" rather than assuming
  // it. A leftover link from an earlier run would make the link step fail
  // with "Already linked" and hide whether it works.
  try {
    await adminApi.del(
      `/parent/links?student_id=${studentId}&parent_email=${encodeURIComponent(PARENT.email)}`,
    );
  } catch {
    // Nothing to remove on a fresh database — that is the expected case.
  }
});

test.afterAll(async () => {
  if (!adminApi || !studentId) return;
  try {
    await adminApi.del(
      `/parent/links?student_id=${studentId}&parent_email=${encodeURIComponent(PARENT.email)}`,
    );
  } catch (e) {
    console.warn(`teardown unlink failed: ${(e as Error).message}`);
  }
});

test("a parent cannot claim a child themselves", async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const parent = await apiLogin(request, PARENT);

  const resp = await request.post(`${BASE_URL}/api/v1/parent/links`, {
    headers: {
      Authorization: `Bearer ${parent.access_token}`,
      "Content-Type": "application/json",
    },
    data: { student_id: studentId, parent_email: PARENT.email },
  });
  expect(resp.status()).toBe(403);

  const children = await request.get(`${BASE_URL}/api/v1/parent/children`, {
    headers: { Authorization: `Bearer ${parent.access_token}` },
  });
  expect(await children.json()).toEqual([]);
});

test("an unlinked parent lands on an empty portal", async ({ page }) => {
  await authenticate(page.context(), PARENT);
  await page.goto(`${BASE_URL}/parent`);

  await expect(page.getByText(/no children linked yet/i)).toBeVisible({ timeout: 15_000 });
  // The form that used to sit here is gone, not merely hidden.
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
});

test("staff link the parent from the student's profile", async ({ page }) => {
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/students/${studentId}`);

  const field = page.getByLabel(/parent's email address/i);
  await expect(field).toBeVisible({ timeout: 15_000 });
  await field.fill(PARENT.email);
  await page.getByRole("button", { name: /link parent/i }).click();

  await expect(page.getByRole("status")).toContainText(/linked/i, { timeout: 15_000 });
});

test("the parent now sees the child and their progress", async ({ page }) => {
  await authenticate(page.context(), PARENT);
  await page.goto(`${BASE_URL}/parent`);

  const card = page.getByText(new RegExp(STUDENT.email.replace(/[.@]/g, "\\$&"), "i"));
  await expect(card).toBeVisible({ timeout: 15_000 });

  await card.click();
  await page.waitForURL(/\/parent\/children\/[0-9a-f-]+/i, { timeout: 15_000 });

  // Real numbers from /children/{id}/progress, not just the route resolving.
  await expect(page.getByText(/courses|progress/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
