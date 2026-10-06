import { expect, test, type Page } from "@playwright/test";

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
 * The lesson page sits inside the window (specs/074).
 *
 * From PR #358 until specs/074 the layout stopped padding a lesson while the
 * page kept cancelling that padding with negative margins. The wrapper ended
 * up 48px left of the window and 96px wider than it: the course outline lost
 * its first letters, "Back to Course" ran off the right edge, and on a phone
 * the lesson text touched the screen edge.
 *
 * Every assertion here failed before the fix; that is what makes them worth
 * keeping.
 */

test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let courseId = "";
let lessonId = "";

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  const studentApi = new Api(request, student.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const course = await teacherApi.createCourse(`E2E Lesson Layout ${stamp}`);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Layout module");
  // One short lesson: it is also the last one, so the footer offers
  // "Back to Course" and is on screen without scrolling.
  const lesson = await teacherApi.createLesson(courseId, mod.id, {
    title: "Layout lesson",
    content_type: "text",
    content: { body: "<p>A short lesson body.</p>" },
  });
  lessonId = lesson.id;

  await teacherApi.publish(courseId);
  await studentApi.enroll(courseId);
});

test.afterAll(async () => {
  await teardownCourse(teacherApi, courseId);
});

async function openLesson(page: Page) {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/courses/${courseId}/lessons/${lessonId}`);
  await expect(page.getByRole("heading", { level: 1, name: "Layout lesson" })).toBeVisible({
    timeout: 15_000,
  });
}

async function expectInsideWindow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, "the page is no wider than the window").toBeLessThanOrEqual(innerWidth);

  const title = await page.getByRole("heading", { level: 1, name: "Layout lesson" }).boundingBox();
  expect(title!.x, "the lesson title keeps a margin from the left edge").toBeGreaterThanOrEqual(16);

  // The footer's link. The outline has its own "Back to course", lower-case.
  const back = page.getByRole("link", { name: "Back to Course", exact: true });
  await expect(back).toBeVisible();
  const box = (await back.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x, "Back to Course starts inside the window").toBeGreaterThanOrEqual(0);
  expect(box.x + box.width, "Back to Course ends inside the window").toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height, "Back to Course ends above the bottom edge").toBeLessThanOrEqual(viewport.height);
  return box;
}

test("desktop: outline and footer sit inside the window", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openLesson(page);
  await expectInsideWindow(page);

  const outline = await page.getByRole("heading", { level: 3 }).first().boundingBox();
  expect(outline!.x, "the course outline is not cut off on the left").toBeGreaterThanOrEqual(0);
});

test("phone: text has a margin and the tab bar does not cover the footer", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openLesson(page);
  const back = await expectInsideWindow(page);

  const tabBar = await page.locator("nav.fixed.bottom-0").boundingBox();
  if (tabBar) {
    expect(back.y + back.height, "Back to Course clears the tab bar").toBeLessThanOrEqual(tabBar.y);
  }
});
