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
 * The homework chain, end to end: a teacher assigns work, a student hands it
 * in, the teacher grades it, the student sees the grade, and it reaches the
 * gradebook.
 *
 * This is the chain that has to work for the product to be sellable, and
 * nothing covered it — e2e/roles/*.spec.ts only assert URLs, so a completely
 * broken assignments module would still have passed them.
 *
 * Course scaffolding goes through the API (fast, and not what is under test);
 * every step of the chain itself is driven through the UI a real user uses.
 */

// One chain: grading cannot run before the submission exists.
test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let courseId = "";
let courseTitle = "";
let assignmentTitle = "";
let assignmentId = "";

const ANSWER = "The mitochondria is the powerhouse of the cell.";
const FEEDBACK = "Correct, but say why.";
const MAX_SCORE = 10;
const AWARDED = 9;

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  const studentApi = new Api(request, student.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  courseTitle = `E2E Homework ${stamp}`;
  assignmentTitle = `Essay ${stamp}`;

  const course = await teacherApi.createCourse(courseTitle);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Homework module");
  await teacherApi.createLesson(courseId, mod.id, {
    title: "Homework Lesson",
    content_type: "text",
    content: { body: "<p>Read this before doing the homework.</p>" },
  });
  // A student can only enrol in a published course, and only sees the
  // assignment once enrolled.
  await teacherApi.publish(courseId);
  await studentApi.enroll(courseId);
});

test.afterAll(async () => {
  if (courseId && teacherApi) {
    try {
      await teacherApi.deleteCourse(courseId);
    } catch (e) {
      console.warn(`teardown deleteCourse failed: ${(e as Error).message}`);
    }
  }
});

test("teacher creates an assignment", async ({ page }) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/assignments`);

  await page.getByRole("button", { name: /new assignment/i }).click();
  await page.getByPlaceholder(/assignment title/i).fill(assignmentTitle);
  await page.getByPlaceholder(/description/i).fill("Write two sentences.");
  // First select is the course, second is the optional group.
  await page.locator("form select").first().selectOption({ label: courseTitle });
  await page.locator('input[type="datetime-local"]').fill("2027-01-01T12:00");
  await page.locator('input[type="number"]').fill(String(MAX_SCORE));
  await page.getByRole("button", { name: /create assignment/i }).click();

  await expect(page.getByText(assignmentTitle)).toBeVisible({ timeout: 15_000 });

  // Grab the id so later steps address this assignment directly instead of
  // clicking whichever card happens to be first.
  const list = (await teacherApi.get("/assignments")) as { id: string; title: string }[];
  const created = list.find((a) => a.title === assignmentTitle);
  expect(created, "the assignment the UI just created is missing from the API").toBeTruthy();
  assignmentId = created!.id;
});

test("student submits it", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/assignments`);

  // It must be reachable from the student's own list, not only by URL.
  await expect(page.getByText(assignmentTitle)).toBeVisible({ timeout: 15_000 });
  await page.goto(`${BASE_URL}/assignments/${assignmentId}`);

  await page.getByPlaceholder(/type your answer/i).fill(ANSWER);
  await page.getByRole("button", { name: /^submit$/i }).click();

  await expect(page.getByText(/submitted/i).first()).toBeVisible({ timeout: 15_000 });
});

test("teacher grades the submission", async ({ page }) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/assignments/${assignmentId}/review`);

  // Submissions are collapsed; the teacher expands one by clicking its row.
  await page.getByRole("button", { name: /QA Student/i }).first().click();

  // The student's answer has to reach the teacher verbatim.
  await expect(page.getByText(ANSWER)).toBeVisible({ timeout: 15_000 });

  // Only the expanded submission shows its grading form, so target what is
  // actually on screen rather than the first match in the DOM.
  await page.locator('input[type="number"]:visible').first().fill(String(AWARDED));
  await page.getByPlaceholder(/optional feedback/i).fill(FEEDBACK);
  await page.getByRole("button", { name: /^grade$/i }).click();

  await expect(page.getByText(/graded/i).first()).toBeVisible({ timeout: 15_000 });
});

test("student sees the score and the feedback", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/assignments/${assignmentId}`);

  await expect(page.getByText(String(AWARDED)).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(FEEDBACK)).toBeVisible();
});

test("the graded student shows up in the gradebook", async ({ page }) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/gradebook`);

  await page.locator("select").first().selectOption({ label: courseTitle });
  await expect(page.getByText(/QA Student/i).first()).toBeVisible({ timeout: 15_000 });
});
