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
 * Getting told: grading a submission has to notify the student.
 *
 * The notification is written as a side effect of grading
 * (app/assignments/service.py), and nothing downstream fails if that write
 * never happens — the grade still lands, so a broken notifier looks exactly
 * like a working one from the teacher's side. The student simply never hears.
 */

test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let studentApi: Api;
let courseId = "";
let assignmentId = "";
let assignmentTitle = "";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  studentApi = new Api(request, student.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  assignmentTitle = `Notify ${stamp}`;

  const course = await teacherApi.createCourse(`E2E Notify ${stamp}`);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Notify module");
  await teacherApi.createLesson(courseId, mod.id, {
    title: "Notify Lesson",
    content_type: "text",
    content: { body: "<p>Body.</p>" },
  });
  await teacherApi.publish(courseId);
  await studentApi.enroll(courseId);

  const assignment = await teacherApi.post("/assignments", {
    course_id: courseId,
    title: assignmentTitle,
    description: "Anything will do.",
    due_date: "2027-01-01T12:00:00Z",
    max_score: 10,
  });
  assignmentId = assignment.id;
});

test.afterAll(async () => {
  await teardownCourse(teacherApi, courseId);
});

test("grading a submission notifies the student", async ({ page }) => {
  // Submitting is multipart (it can carry a file), so it goes through the
  // request context rather than the JSON helper.
  await authenticate(page.context(), STUDENT);
  const submitted = await page.request.post(
    `${BASE_URL}/api/v1/assignments/${assignmentId}/submit`,
    { multipart: { content: "My answer." } },
  );
  expect(submitted.ok(), `submit returned ${submitted.status()}`).toBeTruthy();

  const before = (await studentApi.get("/notifications/unread-count")) as { count: number };

  const submissions = (await teacherApi.get(`/assignments/${assignmentId}/submissions`)) as {
    id: string;
  }[];
  expect(submissions.length, "the teacher cannot see the submission").toBeGreaterThan(0);
  await teacherApi.put(`/assignments/${assignmentId}/submissions/${submissions[0].id}/grade`, {
    score: 9,
    feedback: "Good.",
  });

  const after = (await studentApi.get("/notifications/unread-count")) as { count: number };
  expect(
    after.count,
    `unread count did not move: ${before.count} before, ${after.count} after`,
  ).toBeGreaterThan(before.count);

  const list = (await studentApi.get("/notifications/")) as { title: string }[];
  expect(list.some((n) => n.title.includes(assignmentTitle))).toBeTruthy();
});

test("the student sees it in the notification bell", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/dashboard`);

  await page.getByRole("button", { name: /notification/i }).click();
  await expect(page.getByText(assignmentTitle).first()).toBeVisible({ timeout: 15_000 });
});

test("marking everything read clears the badge", async () => {
  await studentApi.put("/notifications/read-all", {});
  const after = (await studentApi.get("/notifications/unread-count")) as { count: number };
  expect(after.count).toBe(0);
});
