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
 * The remaining surfaces a class touches: meetings, team projects, peer
 * review, and the student's own profile.
 *
 * The thread through all of them is cross-role visibility again — something a
 * teacher sets up has to be reachable by the student it was set up for.
 *
 * Scope note: peer review is covered only as far as creating a round and the
 * student's page loading. Distribution needs real submissions to hand around,
 * which is its own journey; this at least proves the round is created and the
 * page does not error.
 */

test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let studentApi: Api;
let courseId = "";
let meetingTitle = "";
let projectTitle = "";
let reviewTitle = "";
let originalName = "";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  studentApi = new Api(request, student.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  meetingTitle = `Standup ${stamp}`;
  projectTitle = `Group project ${stamp}`;
  reviewTitle = `Peer round ${stamp}`;

  const course = await teacherApi.createCourse(`E2E Collab ${stamp}`);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Collab module");
  await teacherApi.createLesson(courseId, mod.id, {
    title: "Collab Lesson",
    content_type: "text",
    content: { body: "<p>Body.</p>" },
  });
  await teacherApi.publish(courseId);
  await studentApi.enroll(courseId);

  const me = (await studentApi.get("/auth/me")) as { full_name: string };
  originalName = me.full_name;
});

test.afterAll(async () => {
  // Put the student's name back, or every other spec stops finding "QA
  // Student".
  if (studentApi && originalName) {
    try {
      await studentApi.put("/auth/me", { full_name: originalName });
    } catch (e) {
      console.warn(`teardown name restore failed: ${(e as Error).message}`);
    }
  }
  if (courseId && teacherApi) {
    try {
      await teacherApi.deleteCourse(courseId);
    } catch (e) {
      console.warn(`teardown deleteCourse failed: ${(e as Error).message}`);
    }
  }
});

test("a meeting the teacher schedules reaches the student", async ({ page }) => {
  await teacherApi.post("/meetings", {
    title: meetingTitle,
    description: "Daily sync.",
    course_id: courseId,
    scheduled_at: "2027-01-01T12:00:00Z",
    duration_minutes: 30,
  });

  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/meetings`);
  await expect(page.getByText(meetingTitle).first()).toBeVisible({ timeout: 15_000 });
});

test("a team project the teacher creates is listed", async ({ page }) => {
  await teacherApi.post("/team-projects", {
    title: projectTitle,
    description: "Build something together.",
    course_id: courseId,
    max_team_size: 4,
  });

  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/team-projects`);
  await expect(page.getByText(projectTitle).first()).toBeVisible({ timeout: 15_000 });
});

test("a peer-review round is created and the student's page loads", async ({ page }) => {
  const round = await teacherApi.post("/peer-review/assignments", {
    course_id: courseId,
    title: reviewTitle,
    min_reviews: 1,
  });
  expect(round.id, "the peer-review round was not created").toBeTruthy();

  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/peer-review`);
  // Nothing is distributed yet, so assert the page works rather than
  // pretending there is a review waiting.
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 15_000 });
});

test("the student can change their own name", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/profile`);

  // The fields only exist once the edit form is open.
  await page.getByRole("button", { name: /edit profile/i }).click();

  const newName = `${originalName} Renamed`;
  const nameField = page.locator('input[type="text"]').first();
  await nameField.fill(newName);
  await page.getByRole("button", { name: /save changes/i }).click();

  // Reload rather than trust the toast: this has to have reached the server.
  // The form closes on reload, so assert the displayed name, not the field.
  await page.reload();
  await expect(page.getByText(newName).first()).toBeVisible({ timeout: 15_000 });
});
