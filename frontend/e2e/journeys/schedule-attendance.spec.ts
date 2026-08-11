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
 * Scheduling, from both sides: a teacher puts something on the calendar and
 * the class has to see it; a teacher marks who showed up and that has to
 * stick.
 *
 * Cross-role visibility is the part worth testing. An event that renders only
 * for its author looks exactly like a working calendar when you check it as
 * one user, which is how that kind of bug survives.
 */

test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let courseId = "";
let courseTitle = "";
let studentId = "";
let eventTitle = "";
// Today, because the calendar opens on the current month — an event parked in
// some future year would exist and simply not be on screen, which proves
// nothing either way.
const SESSION_DATE = new Date().toISOString().slice(0, 10);

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  const studentApi = new Api(request, student.access_token);
  studentId = student.user.id;

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  courseTitle = `E2E Schedule ${stamp}`;
  eventTitle = `Field trip ${stamp}`;

  const course = await teacherApi.createCourse(courseTitle);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Schedule module");
  await teacherApi.createLesson(courseId, mod.id, {
    title: "Schedule Lesson",
    content_type: "text",
    content: { body: "<p>Body.</p>" },
  });
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

test("teacher schedules an event", async ({ page }) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/calendar`);

  await page.getByRole("button", { name: /new event/i }).click();
  await page.getByPlaceholder("Title").fill(eventTitle);
  const times = page.locator('input[type="datetime-local"]');
  await times.first().fill(`${SESSION_DATE}T10:00`);
  await times.last().fill(`${SESSION_DATE}T11:00`);
  await page.getByRole("button", { name: /create event/i }).click();

  await expect(page.getByText(eventTitle).first()).toBeVisible({ timeout: 15_000 });
});

test("the class sees the event on their own calendar", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/calendar`);

  await expect(page.getByText(eventTitle).first()).toBeVisible({ timeout: 15_000 });
});

test("teacher marks attendance and it sticks", async ({ page }) => {
  await authenticate(page.context(), TEACHER);

  const marked = await page.request.post(`${BASE_URL}/api/v1/attendance`, {
    data: {
      records: [
        {
          student_id: studentId,
          course_id: courseId,
          session_date: SESSION_DATE,
          status: "present",
        },
      ],
    },
  });
  expect(marked.ok(), `marking attendance returned ${marked.status()}`).toBeTruthy();

  // Read it back the way the marking grid hydrates itself — a write no roster
  // ever reflects is not a working feature.
  const roster = await page.request.get(
    `${BASE_URL}/api/v1/attendance/roster?session_date=${SESSION_DATE}&course_id=${courseId}`,
  );
  expect(roster.ok(), `roster returned ${roster.status()}`).toBeTruthy();
  expect(await roster.text()).toContain("present");
});

test("the student's own attendance record shows it", async ({ page }) => {
  await authenticate(page.context(), STUDENT);

  const mine = await page.request.get(`${BASE_URL}/api/v1/attendance/my`);
  expect(mine.ok(), `my attendance returned ${mine.status()}`).toBeTruthy();
  expect(await mine.text()).toContain(SESSION_DATE);
});
