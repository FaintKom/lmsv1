import { expect, test } from "@playwright/test";

import {
  Api,
  apiLogin,
  authenticate,
  BASE_URL,
  STUDENT,
  TEACHER,
} from "../poms/ContentTypeHarness";

/**
 * The class register from a teacher's seat.
 *
 * The journal's backend is the best-tested corner of this codebase — eleven
 * endpoints, RBAC, cross-org isolation and export contents all covered. Its UI
 * is the largest page we ship, ~2900 lines, and the only e2e that touched it
 * was the dark-theme audit, which loads the URL and looks at colours.
 *
 * So this covers the part those tests could not see. Marking attendance is an
 * optimistic update: the cell repaints immediately and rolls back if the save
 * fails. A test that clicks and looks would pass against a register that
 * stores nothing, so the assertion comes after a reload — the only way to tell
 * an optimistic paint from a stored mark. The export is read back too, because
 * that file is what a school actually files away.
 *
 * Scaffolding goes through the API; every step under test is driven through
 * the UI.
 */

test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let courseId = "";
let courseTitle = "";

// Fixed dates, not "today": the register lists the days that exist as journal
// rows, so a run near midnight must not straddle two of them.
const DAY_ONE = "2026-03-02";
const DAY_TWO = "2026-03-03";
const TOPIC = "Recursion, part one";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  teacherApi = new Api(request, teacher.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  courseTitle = `E2E Journal ${stamp}`;
  const course = await teacherApi.createCourse(courseTitle);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Journal module");
  await teacherApi.createLesson(courseId, mod.id, {
    title: "Journal Lesson",
    content_type: "text",
    content: { body: "<p>Body.</p>" },
  });
  await teacherApi.publish(courseId);

  const student = await apiLogin(request, STUDENT);
  const studentApi = new Api(request, student.access_token);
  await studentApi.enroll(courseId);

  for (const sessionDate of [DAY_ONE, DAY_TWO]) {
    await teacherApi.post("/journal/sessions", {
      course_id: courseId,
      session_date: sessionDate,
      held: true,
      topic: sessionDate === DAY_ONE ? TOPIC : "Recursion, part two",
    });
  }
});

test.afterAll(async () => {
  if (!teacherApi || !courseId) return;
  try {
    await teacherApi.deleteCourse(courseId);
  } catch (e) {
    console.warn(`teardown deleteCourse failed: ${(e as Error).message}`);
  }
});

test("the register shows the days that were held and who is in the class", async ({
  page,
}) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/journal?tab=register`);

  await page.locator("select").first().selectOption({ label: courseTitle });

  await expect(page.getByText(/QA Student/i).first()).toBeVisible({ timeout: 15_000 });
  // Both journal days reached the matrix, not only the one the roster hangs off.
  //
  // The generous timeout is the point, not decoration: the roster is fetched
  // for today's date while the session list is still in flight, so the pupil's
  // name can be on screen a moment before the day columns are. Asserting on
  // the default five seconds failed on a slow runner and passed on a rerun,
  // which is the worst kind of green.
  for (const day of [DAY_ONE, DAY_TWO]) {
    await expect(page.getByText(day.slice(5)).first()).toBeVisible({ timeout: 15_000 });
  }
});

test("a mark survives a reload", async ({ page }) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/journal?tab=register`);
  await page.locator("select").first().selectOption({ label: courseTitle });

  const row = page.locator("tr", { hasText: /QA Student/i }).first();
  await expect(row).toBeVisible({ timeout: 15_000 });

  // Unmarked cells render "·". Clicking one cycles it to Present ("P").
  const cell = row.getByRole("button").first();
  await expect(cell).toHaveText("·");
  await cell.click();
  await expect(cell).toHaveText("P");

  // The point of this test: the repaint above happens before the request
  // lands, and is rolled back on failure. Only a reload proves it was stored.
  await page.reload();
  await page.locator("select").first().selectOption({ label: courseTitle });
  const reloaded = page
    .locator("tr", { hasText: /QA Student/i })
    .first()
    .getByRole("button")
    .first();
  await expect(reloaded).toHaveText("P", { timeout: 15_000 });
});

test("the exported register carries the topic and the class", async ({ page }) => {
  await authenticate(page.context(), TEACHER);

  const resp = await page
    .context()
    .request.get(
      `${BASE_URL}/api/v1/journal/export?course_id=${courseId}` +
        `&from_date=${DAY_ONE}&to_date=${DAY_TWO}`,
    );
  expect(resp.status()).toBe(200);

  const csv = await resp.text();
  expect(csv).toContain(TOPIC);
  expect(csv).toContain(DAY_ONE);
  expect(csv).toMatch(/QA Student/i);
  // The mark made in the register two tests ago. Rows are
  // date,weekday,held,topic,student,status,note — so this ties the grid a
  // teacher clicks to the file the school keeps.
  expect(csv).toContain("present");
});
