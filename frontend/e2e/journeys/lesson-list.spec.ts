import { expect, test, type APIRequestContext } from "@playwright/test";

import {
  ADMIN,
  API_BASE,
  Api,
  apiLogin,
  authenticate,
  BASE_URL,
} from "../poms/ContentTypeHarness";

/**
 * A pupil finding a lesson that has already ended.
 *
 * Until now they could not: a live lesson was reachable from the banner while
 * it ran and from a button on the groups page, and nowhere else. The access
 * was never the problem — the server has always handed a pupil their group's
 * lessons — so what is under test is the path, and that the path shows theirs
 * and only theirs.
 *
 * Scaffolding goes through the API; the step under test is driven through the
 * UI.
 */

test.describe.configure({ mode: "serial" });

// The QA pupil, in the same spirit as ADMIN and PARENT in the harness: a
// deterministic seeded account, committed on purpose, never a prod credential.
const QA_STUDENT = {
  email: process.env.E2E_STUDENT_EMAIL ?? "qa-student@qa.example.com",
  password: process.env.E2E_STUDENT_PASSWORD ?? "qa-test-not-for-prod",
};

let ownLessonId = "";
let otherLessonId = "";
let otherGroupId = "";

/**
 * A group may hold one active lesson at a time; a second attempt is a 409
 * carrying the id of the one already running. A leftover from an earlier run
 * is therefore not an error — it is the lesson we wanted.
 *
 * Raw request rather than the Api helper, which parses the body and throws on
 * any non-OK status: the 409 here is an expected answer, not a failure.
 */
async function startLesson(
  request: APIRequestContext,
  token: string,
  groupId: string,
): Promise<string> {
  const res = await request.post(`${API_BASE}/live-lessons`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    data: { group_id: groupId },
  });
  if (res.status() === 409) {
    return (await res.json()).detail.active_lesson_id as string;
  }
  expect(res.ok(), `start lesson: ${res.status()} ${await res.text()}`).toBe(true);
  return (await res.json()).id as string;
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const admin = await apiLogin(request, ADMIN);
  const api = new Api(request, admin.access_token);

  const groups: { id: string; name: string }[] = await api.get("/admin/groups");
  const qaGroup = groups.find((g) => g.name === "QA Group");
  expect(qaGroup, "seed_qa.py should have created 'QA Group'").toBeTruthy();
  ownLessonId = await startLesson(request, admin.access_token, qaGroup!.id);

  // A group the pupil is not in. Seeded QA has exactly one group and both
  // pupils are in it, so the negative case has to be built rather than found.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const other = await api.post("/admin/groups", { name: `E2E Nav ${stamp}` });
  otherGroupId = other.id;
  otherLessonId = await startLesson(request, admin.access_token, otherGroupId);
});

test.afterAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const admin = await apiLogin(request, ADMIN);
  const api = new Api(request, admin.access_token);

  // End the lessons. A live lesson left running puts the "join" banner on every
  // page of both sections for everyone in the school — which is how this
  // spec once made the dark-theme audit fail on sixteen unrelated routes.
  for (const id of [ownLessonId, otherLessonId]) {
    if (id) await api.post(`/live-lessons/${id}/end`).catch(() => {});
  }

  // The group is created fresh every run; left behind they pile up in the QA
  // stack and slowly turn the groups page into a landfill.
  if (otherGroupId) await api.del(`/admin/groups/${otherGroupId}`);
});

test("a pupil finds their group's lesson in the menu", async ({ context, page }) => {
  await authenticate(context, QA_STUDENT);
  await page.goto(`${BASE_URL}/live`);

  // The lesson is identified by where its Open link points, not by a date on
  // screen: dates are formatted per locale, which would make this a
  // translation test by accident.
  await expect(page.locator(`a[href="/lesson/${ownLessonId}"]`)).toBeVisible();
});

test("and does not find another group's", async ({ context, page }) => {
  await authenticate(context, QA_STUDENT);
  await page.goto(`${BASE_URL}/live`);

  // Runs second on purpose. On its own this passes against an empty page, a
  // broken query, or a route that does not exist — the test above is what
  // makes it mean anything.
  await expect(page.locator(`a[href="/lesson/${ownLessonId}"]`)).toBeVisible();
  await expect(page.locator(`a[href="/lesson/${otherLessonId}"]`)).toHaveCount(0);
});

test("staff reach the same lesson from their own side of the product", async ({
  context,
  page,
}) => {
  await authenticate(context, ADMIN);
  await page.goto(`${BASE_URL}/admin/live`);

  // Staff go to the teaching screen, pupils to the learner one — same lesson,
  // different door.
  await expect(page.locator(`a[href="/admin/live/${ownLessonId}"]`)).toBeVisible();
  await expect(page.locator(`a[href="/admin/live/${otherLessonId}"]`)).toBeVisible();
});
