import { expect, test } from "@playwright/test";

import {
  ADMIN,
  Api,
  apiLogin,
  authenticate,
  BASE_URL,
  TEACHER,
  teardownCourse,
} from "../poms/ContentTypeHarness";

/**
 * Peer review, end to end: hand the class out to each other, let a student
 * review the person they were given, and watch the teacher's tally move.
 *
 * The note this journey came from said distribution "needs real submissions".
 * It does not — app/peer_review/service.py pairs *enrolled students*
 * round-robin and never looks at their work. The real precondition is two
 * enrolled students, and the QA seed has one, which is why this surface
 * stayed uncovered.
 *
 * Two quiet failures worth catching:
 *  - distribute answering 200 with created=0, which reads as success from the
 *    teacher's side while leaving the class with nothing to do;
 *  - pairing someone with themselves, the classic round-robin off-by-one.
 */

test.describe.configure({ mode: "serial" });

let teacherApi: Api;
// Only for teardown: listing and deleting users is admin-only, a teacher gets
// a 403 there even though they may run the import itself.
let adminApi: Api;
let reviewerApi: Api;
let courseId = "";
let assignmentId = "";
let roundTitle = "";
let reviewId = "";
const students: { email: string; password: string; name: string }[] = [];

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  teacherApi = new Api(request, teacher.access_token);
  const admin = await apiLogin(request, ADMIN);
  adminApi = new Api(request, admin.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  roundTitle = `Peer round ${stamp}`;

  const course = await teacherApi.createCourse(`E2E Peer ${stamp}`);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Peer module");
  await teacherApi.createLesson(courseId, mod.id, {
    title: "Peer Lesson",
    content_type: "text",
    content: { body: "<p>Body.</p>" },
  });
  await teacherApi.publish(courseId);

  // Two students, because round-robin pairing refuses to run below that.
  // Lowercased: the backend normalises addresses, so capitals here would
  // never match what comes back out of /admin/users at teardown.
  for (const i of [1, 2]) {
    students.push({
      email: `e2e-peer-${stamp}-${i}@qa.example.com`.toLowerCase(),
      password: "PeerReview2026!",
      name: `Peer Student ${i}`,
    });
  }
  const summary = (await teacherApi.post("/admin/bulk-enroll", {
    course_id: courseId,
    // Child safety: the backend refuses to bulk-create student accounts
    // without the importing staff member attesting to offline parental
    // consent. Same attestation the bulk-enrol UI collects as a checkbox.
    parental_consent: true,
    rows: students.map((s) => ({
      email: s.email,
      full_name: s.name,
      password: s.password,
    })),
  })) as { enrolled: number; errors: unknown[] };
  expect(
    summary.errors,
    `bulk-enroll reported errors: ${JSON.stringify(summary.errors)}`,
  ).toHaveLength(0);

  const round = await teacherApi.post("/peer-review/assignments", {
    course_id: courseId,
    title: roundTitle,
    min_reviews: 1,
  });
  assignmentId = round.id;

  const reviewer = await apiLogin(request, students[0]);
  reviewerApi = new Api(request, reviewer.access_token);
});

test.afterAll(async () => {
  if (!teacherApi) return;
  await teardownCourse(teacherApi, courseId);
  try {
    const users = (await adminApi.get("/admin/users")) as { id: string; email: string }[];
    for (const s of students) {
      const u = users.find((x) => x.email === s.email);
      if (u) await adminApi.del(`/admin/users/${u.id}`);
    }
  } catch (e) {
    console.warn(`teardown user cleanup failed: ${(e as Error).message}`);
  }
});

test("distributing the round pairs the enrolled students", async () => {
  const result = (await teacherApi.post(
    `/peer-review/assignments/${assignmentId}/distribute`,
    {},
  )) as { created: number; total_students: number };

  expect(result.total_students, "the round did not see both enrolled students").toBe(2);
  // 200 with created=0 reads as success and leaves the class with nothing.
  expect(result.created, "distribute created no reviews").toBeGreaterThan(0);
});

test("the reviewer is given somebody else's work, not their own", async () => {
  const mine = (await reviewerApi.get("/peer-review/my-reviews")) as {
    id: string;
    assignment_title: string;
    reviewee_name: string;
    reviewer_id: string;
    reviewee_id: string;
    status: string;
  }[];

  const row = mine.find((r) => r.assignment_title === roundTitle);
  expect(row, "the reviewer was handed no review for this round").toBeTruthy();
  expect(row!.reviewee_id, "a student was paired with themselves").not.toBe(row!.reviewer_id);
  expect(row!.reviewee_name).toContain("Peer Student");
  reviewId = row!.id;
});

test("the student sees the review waiting on their page", async ({ page }) => {
  await authenticate(page.context(), students[0]);
  await page.goto(`${BASE_URL}/peer-review`);

  await expect(page.getByText(roundTitle).first()).toBeVisible({ timeout: 15_000 });
});

test("submitting the review completes it", async () => {
  await reviewerApi.post(`/peer-review/${reviewId}/submit`, {
    rating: 4,
    comment: "Clear structure, and the worked example was convincing.",
  });

  const mine = (await reviewerApi.get("/peer-review/my-reviews")) as {
    id: string;
    status: string;
    rating: number | null;
  }[];
  const row = mine.find((r) => r.id === reviewId);
  expect(row?.status).toBe("completed");
  expect(row?.rating).toBe(4);
});

test("the teacher's tally moves", async () => {
  const rounds = (await teacherApi.get(
    `/peer-review/assignments?course_id=${courseId}`,
  )) as {
    id: string;
    total_reviews: number;
    completed_reviews: number;
    pending_reviews: number;
  }[];

  const round = rounds.find((r) => r.id === assignmentId);
  expect(round, "the round vanished from the teacher's list").toBeTruthy();
  expect(round!.total_reviews).toBeGreaterThan(0);
  expect(round!.completed_reviews, "the submitted review was not counted").toBeGreaterThan(0);
  expect(round!.total_reviews).toBe(round!.completed_reviews + round!.pending_reviews);
});
