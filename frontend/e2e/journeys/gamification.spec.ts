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
 * Doing the work has to pay: passing an exercise awards XP, and the student
 * has to be able to see it.
 *
 * XP is awarded from inside the submission path (app/exercises/service.py),
 * which has plenty of ways to succeed while the reward quietly does not
 * happen. e2e/exercises/lifecycle.spec.ts submits every exercise type but
 * only asserts "not a 5xx", so nothing checked that a correct answer is
 * actually rewarded.
 */

test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let studentApi: Api;
let courseId = "";
let exerciseId = "";
let questionId = "";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  studentApi = new Api(request, student.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const course = await teacherApi.createCourse(`E2E XP ${stamp}`);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "XP module");
  const lesson = await teacherApi.createLesson(courseId, mod.id, {
    title: "XP Lesson",
    content_type: "text",
    content: { body: "<p>Body.</p>" },
  });
  await teacherApi.publish(courseId);
  await studentApi.enroll(courseId);

  const exercise = await teacherApi.post("/exercises", {
    lesson_id: lesson.id,
    exercise_type: "quiz",
    title: `XP Quiz ${stamp}`,
    config: { passing_score: 70 },
  });
  exerciseId = exercise.id;

  const question = await teacherApi.post(`/exercises/${exerciseId}/questions`, {
    question_text: "2+2?",
    question_type: "multiple_choice",
    options: [
      { text: "3", is_correct: false },
      { text: "4", is_correct: true },
    ],
    points: 1,
  });
  questionId = question.id;
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

test("a correct answer is rewarded with XP", async () => {
  const before = (await studentApi.get("/gamification/my-streak")) as { total_xp: number };
  const xpBefore = before.total_xp ?? 0;

  const submission = (await studentApi.post(`/exercises/${exerciseId}/submit`, {
    answers: [{ question_id: questionId, selected_option: "4" }],
  })) as { passed: boolean; score: number };
  expect(submission.passed, "a correct quiz answer did not pass").toBeTruthy();

  const after = (await studentApi.get("/gamification/my-streak")) as { total_xp: number };
  expect(
    after.total_xp,
    `XP did not move: ${xpBefore} before, ${after.total_xp} after`,
  ).toBeGreaterThan(xpBefore);
});

test("the student can see their progress on the achievements page", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/achievements`);

  // Rendered sections, not just the route: badges and the streak come from
  // separate endpoints, so an empty page here means one of them broke.
  await expect(page.getByText(/badge|streak|xp/i).first()).toBeVisible({ timeout: 15_000 });
});

test("the student appears on the leaderboard", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/leaderboard`);

  await expect(page.getByText(/QA Student/i).first()).toBeVisible({ timeout: 15_000 });
});
