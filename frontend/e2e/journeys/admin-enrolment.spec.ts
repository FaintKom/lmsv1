import { expect, test } from "@playwright/test";

import { ADMIN, Api, apiLogin, authenticate, BASE_URL } from "../poms/ContentTypeHarness";

/**
 * What an administrator actually does on day one: put a class into a course,
 * then look at how it is going.
 *
 * Bulk import is the highest-leverage admin path — it creates accounts, sets
 * passwords and enrols, all in one shot — and a partial failure there is
 * quiet by design: the endpoint collects per-row errors and still returns
 * 200. So this asserts the rows really landed rather than trusting the
 * summary line.
 */

// One chain: analytics can only show what the import created.
test.describe.configure({ mode: "serial" });

let adminApi: Api;
let courseId = "";
let courseTitle = "";
const createdEmails: string[] = [];

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const admin = await apiLogin(request, ADMIN);
  adminApi = new Api(request, admin.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  courseTitle = `E2E Bulk ${stamp}`;
  const course = await adminApi.createCourse(courseTitle);
  courseId = course.id;
  const mod = await adminApi.createModule(courseId, "Bulk module");
  await adminApi.createLesson(courseId, mod.id, {
    title: "Bulk Lesson",
    content_type: "text",
    content: { body: "<p>Body.</p>" },
  });
  await adminApi.publish(courseId);

  // Lowercased on purpose: the backend normalises addresses, so anything
  // with capitals here would never match what comes back.
  createdEmails.push(`e2e-bulk-${stamp}-1@qa.example.com`.toLowerCase());
  createdEmails.push(`e2e-bulk-${stamp}-2@qa.example.com`.toLowerCase());
});

test.afterAll(async () => {
  if (!adminApi) return;
  try {
    const users = (await adminApi.get("/admin/users")) as { id: string; email: string }[];
    for (const email of createdEmails) {
      const u = users.find((x) => x.email === email);
      if (u) await adminApi.del(`/admin/users/${u.id}`);
    }
  } catch (e) {
    console.warn(`teardown user cleanup failed: ${(e as Error).message}`);
  }
  if (courseId) {
    try {
      await adminApi.deleteCourse(courseId);
    } catch (e) {
      console.warn(`teardown deleteCourse failed: ${(e as Error).message}`);
    }
  }
});

test("admin sees the user list", async ({ page }) => {
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/users`);

  // Real rows, not just the route resolving — the seeded QA teacher is there.
  await expect(page.getByText(/qa-teacher@qa\.example\.com/i).first()).toBeVisible({
    timeout: 15_000,
  });
});

test("admin bulk-imports a class into a course", async ({ page }) => {
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/bulk-enroll`);

  await page.locator("select").first().selectOption({ label: courseTitle });

  const csv = [
    "email,name,password",
    `${createdEmails[0]},Bulk One,Welcome2026!`,
    `${createdEmails[1]},Bulk Two,Welcome2026!`,
  ].join("\n");
  // The paste box lives in a collapsed <details>; open it the way a user does.
  await page.getByText(/paste csv text manually/i).click();
  await page.locator("textarea").first().fill(csv);

  // Creating student accounts in bulk is gated on confirming parental
  // consent — both the UI and the endpoint refuse without it.
  await page.getByRole("checkbox").last().check();

  await page.getByRole("button", { name: /import (&|and) enrol/i }).click();
  await expect(page.getByText(/imported/i).first()).toBeVisible({ timeout: 30_000 });
});

test("the imported students exist and are enrolled", async ({ page }) => {
  await authenticate(page.context(), ADMIN);

  const users = (await adminApi.get("/admin/users")) as { id: string; email: string }[];
  for (const email of createdEmails) {
    expect(users.some((u) => u.email === email), `${email} was not created`).toBeTruthy();
  }

  // Enrolment is the half that silently no-ops if a row fails, so check it
  // from the course's side rather than from the import summary.
  await page.goto(`${BASE_URL}/admin/gradebook`);
  await page.locator("select").first().selectOption({ label: courseTitle });
  await expect(page.getByText(/Bulk One/i).first()).toBeVisible({ timeout: 15_000 });
});

test("analytics renders and exports a CSV", async ({ page }) => {
  await authenticate(page.context(), ADMIN);
  await page.goto(`${BASE_URL}/admin/analytics`);
  // Assert on a KPI tile rather than a heading: the dashboard is only useful
  // if it actually computed something.
  await expect(page.getByText(/active students/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/submissions/i).first()).toBeVisible();

  const csv = await page.request.get(`${BASE_URL}/api/v1/admin/analytics/export-csv`);
  expect(csv.ok(), `analytics CSV export returned ${csv.status()}`).toBeTruthy();
  const body = await csv.text();
  // A header plus at least one enrolment row — an empty file is still a 200
  // and would tell us nothing.
  expect(body.split("\n").filter((l) => l.trim()).length).toBeGreaterThan(1);
});
