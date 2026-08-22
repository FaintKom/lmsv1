import { expect, test } from "@playwright/test";

import {
  Api,
  apiLogin,
  authenticate,
  BASE_URL,
  STUDENT,
  TEACHER,
  teardownCourse,
} from "../poms/ContentTypeHarness";

/**
 * How a student gets into a course without anyone enrolling them: browse the
 * catalogue and enrol themselves, or take a whole learning path in one click.
 *
 * Both are self-service, so nobody is watching when they break, and the
 * failure mode is quiet — a button that does nothing, or a path that enrols
 * you in zero courses.
 */

test.describe.configure({ mode: "serial" });

let teacherApi: Api;
const courseIds: string[] = [];
let pathTitle = "";
let soloCourseTitle = "";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  teacherApi = new Api(request, teacher.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  pathTitle = `E2E Path ${stamp}`;
  soloCourseTitle = `E2E Self-enrol ${stamp}`;

  // Two courses for the path, one more for the self-enrolment step.
  for (const title of [`${pathTitle} A`, `${pathTitle} B`, soloCourseTitle]) {
    const course = await teacherApi.createCourse(title);
    courseIds.push(course.id);
    const mod = await teacherApi.createModule(course.id, "Module");
    await teacherApi.createLesson(course.id, mod.id, {
      title: "Lesson",
      content_type: "text",
      content: { body: "<p>Body.</p>" },
    });
    await teacherApi.publish(course.id);
  }

  const path = await teacherApi.post("/learning-paths", {
    title: pathTitle,
    description: "Two courses, in order.",
    steps: [
      { course_id: courseIds[0], is_required: true },
      { course_id: courseIds[1], is_required: true },
    ],
  });
  // Paths are created unpublished, and students are only shown published
  // ones — an unpublished path would make this whole journey a false negative.
  await teacherApi.put(`/learning-paths/${path.id}`, { is_published: true });
});

test.afterAll(async () => {
  if (!teacherApi) return;
  for (const id of courseIds) {
    await teardownCourse(teacherApi, id);
  }
});

test("student enrols themselves in a published course", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/courses/${courseIds[2]}`);

  await page.getByRole("button", { name: /enroll in course/i }).click();

  // It has to land on their own list, not just flash a toast.
  await page.goto(`${BASE_URL}/courses`);
  await expect(page.getByText(soloCourseTitle).first()).toBeVisible({ timeout: 15_000 });
});

test("the learning path is offered to the student", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/paths`);

  await expect(page.getByText(pathTitle).first()).toBeVisible({ timeout: 15_000 });
});

test("enrolling in the path enrols them in its courses", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/paths`);

  await page.getByRole("button", { name: /^enroll$/i }).first().click();

  // The point of a path is the courses behind it. Being "enrolled" in a path
  // while your course list stays empty is exactly the quiet failure worth
  // catching.
  await page.goto(`${BASE_URL}/courses`);
  await expect(page.getByText(`${pathTitle} A`).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`${pathTitle} B`).first()).toBeVisible();
});
