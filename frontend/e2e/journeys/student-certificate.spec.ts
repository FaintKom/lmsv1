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
 * The student's path to a result: enrol, work through every lesson, watch the
 * course hit 100%, and get a certificate that can be verified.
 *
 * Certificates are issued as a side effect of the last lesson completing
 * (app/progress/service.py — progress_percent >= 100 calls issue_certificate),
 * and that side effect was untested. It also swallows exceptions by design,
 * so a failure there is invisible until a customer asks where their
 * certificate is. An end-to-end check is the only way to know it fired.
 */

// One chain: the certificate cannot exist before the lessons are done.
test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let studentApi: Api;
let courseId = "";
let courseTitle = "";
const lessonIds: string[] = [];
let certificateId = "";
let certificateNumber = "";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  studentApi = new Api(request, student.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  courseTitle = `E2E Certificate ${stamp}`;

  const course = await teacherApi.createCourse(courseTitle);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Certificate module");

  // Two lessons, so "100%" means more than "the only lesson".
  for (const n of [1, 2]) {
    const lesson = await teacherApi.createLesson(courseId, mod.id, {
      title: `Certificate Lesson ${n}`,
      content_type: "text",
      content: { body: `<p>Lesson ${n} body.</p>` },
    });
    lessonIds.push(lesson.id);
  }

  await teacherApi.publish(courseId);
  await studentApi.enroll(courseId);
});

test.afterAll(async () => {
  await teardownCourse(teacherApi, courseId);
});

test("the enrolled course is on the student's list", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/courses`);
  await expect(page.getByText(courseTitle)).toBeVisible({ timeout: 15_000 });
});

test("student completes every lesson", async ({ page }) => {
  await authenticate(page.context(), STUDENT);

  for (const lessonId of lessonIds) {
    await page.goto(`${BASE_URL}/courses/${courseId}/lessons/${lessonId}`);
    await page.getByRole("button", { name: /mark lesson as complete/i }).click();
    await expect(page.getByText(/done|completed/i).first()).toBeVisible({ timeout: 15_000 });
  }
});

test("the course reads 100% on the progress page", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/progress`);

  await expect(page.getByText(courseTitle).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("100%").first()).toBeVisible({ timeout: 15_000 });
});

test("finishing the course issues a certificate", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/certificates`);

  await expect(page.getByText(courseTitle)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/certificate #/i).first()).toBeVisible();

  const certs = (await studentApi.get("/certificates/my-certificates")) as {
    id: string;
    course_title: string;
    certificate_number: string;
  }[];
  const mine = certs.find((c) => c.course_title === courseTitle);
  expect(mine, "no certificate was issued for the completed course").toBeTruthy();
  certificateId = mine!.id;
  certificateNumber = mine!.certificate_number;
  expect(certificateNumber).toBeTruthy();
});

test("the certificate verifies publicly and downloads", async ({ page }) => {
  await authenticate(page.context(), STUDENT);

  // Verification is the public-facing half — an employer checks it without an
  // account, so it has to answer for a plain unauthenticated request.
  const anon = await page.request.get(
    `${BASE_URL}/api/v1/certificates/verify/${certificateNumber}`,
  );
  expect(anon.ok(), `verify returned ${anon.status()}`).toBeTruthy();
  expect(await anon.text()).toContain(certificateNumber);

  const download = await page.request.get(
    `${BASE_URL}/api/v1/certificates/${certificateId}/download`,
  );
  expect(download.ok(), `download returned ${download.status()}`).toBeTruthy();
  expect(await download.text()).toContain(certificateNumber);
});
