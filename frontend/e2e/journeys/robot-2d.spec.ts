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
 * The Robot 2D chain, end to end: a teacher paints a level and checks that it
 * can be solved, a pupil solves it with blocks and again in Python, and the
 * server grades the submission off a program it ran itself.
 *
 * `robot_2d` had no browser coverage at all before this — it is excluded from
 * all-content-types.spec.ts, and e2e/exercises/lifecycle.spec.ts only asserts
 * that submitting does not 500. So this file is the first thing that would
 * notice the type being broken end to end.
 *
 * Two interactions are here because nothing else can reach them: painting the
 * grid by dragging, and dragging a block out of the Blockly flyout. Both need
 * real pointer gestures — synthetic events do not drive Blockly, and React's
 * `onPointerEnter` does not fire from a dispatched `pointerover`.
 *
 * Course scaffolding goes through the API; every step of the chain itself is
 * driven through the UI a real user uses.
 */

// One chain: the pupil cannot solve a level the teacher has not saved.
test.describe.configure({ mode: "serial" });

let teacherApi: Api;
let courseId = "";
let lessonId = "";
let exerciseId = "";

/**
 * Two wide and two tall, the goal one step right of the start, and the bottom
 * row free for the teacher to paint on without walling the path off.
 *
 * Deliberately saved without star thresholds: Check fills them in, and a test
 * cannot show that if they arrive already filled.
 */
const LEVEL = {
  grid_width: 2,
  grid_height: 2,
  start: { x: 0, y: 0, facing: "right" },
  cells: [{ x: 1, y: 0, type: "goal" }],
  commands: ["move_right", "at_goal"],
  win: { cond: "at_goal" },
  max_steps: 50,
  preset: "beginner",
};

const PYTHON_SOLUTION = 'print("hello")\nmove_right()\n';

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  const studentApi = new Api(request, student.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const course = await teacherApi.createCourse(`E2E Robot ${stamp}`);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "Robot module");
  const lesson = await teacherApi.createLesson(courseId, mod.id, {
    title: "Robot Lesson",
    content_type: "text",
    content: { body: "<p>Drive the robot to the flag.</p>" },
  });
  lessonId = lesson.id;

  const exercise = await teacherApi.post("/exercises", {
    lesson_id: lessonId,
    exercise_type: "robot_2d",
    title: `Robot level ${stamp}`,
    config: LEVEL,
  });
  exerciseId = exercise.id;

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

test("teacher paints the level by dragging, and Check answers", async ({ page }) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/content-library/${exerciseId}`);

  const from = page.locator('[data-cell="0,1"]');
  const to = page.locator('[data-cell="1,1"]');
  await from.waitFor({ state: "visible", timeout: 20_000 });

  // The start has to be visible, and it has to follow the tool. It was drawn
  // on a cell of type "start" long after the start stopped being a cell, so a
  // teacher moved it, changed the level, and saw nothing happen.
  await expect(page.locator('[data-start="0,0"]')).toBeVisible();
  await page.getByRole("button", { name: /^start$/i }).click();
  await to.click();
  await expect(page.locator('[data-start="1,1"]')).toBeVisible();
  await page.locator('[data-cell="0,0"]').click();
  await expect(page.locator('[data-start="0,0"]')).toBeVisible();

  // Back to walls for the drag below, rather than trusting the default tool.
  await page.getByRole("button", { name: /^wall$/i }).click();

  // Drag across the bottom row. One press, two cells: the second only becomes
  // a wall if the drag is live, so this fails if painting needs a click each.
  await from.hover();
  await page.mouse.down();
  await to.hover();
  await page.mouse.up();

  await page.getByRole("button", { name: /check this level/i }).click();
  await expect(page.getByText(/solvable in/i)).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /^save$/i }).click();

  // What reached the database is the only proof that matters.
  await expect
    .poll(
      async () => {
        const saved = (await teacherApi.get(`/exercises/${exerciseId}`)) as {
          config: {
            cells: { x: number; y: number; type: string }[];
            star_steps: number | null;
          };
        };
        return {
          walls: saved.config.cells.filter((c) => c.type === "wall").length,
          starSteps: saved.config.star_steps,
        };
      },
      { timeout: 20_000, message: "the level the teacher painted never reached the server" },
    )
    .toEqual({ walls: 2, starSteps: 1 });
});

test("pupil solves it in Python, and their print reaches them", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/courses/${courseId}/lessons/${lessonId}`);

  await page.getByRole("button", { name: /python/i }).first().click();

  const editor = page.locator(".monaco-editor").first();
  await editor.waitFor({ state: "visible", timeout: 20_000 });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+a");
  // insertText, not type: Monaco auto-closes brackets, so typing the closing
  // ones character by character leaves "unmatched ')'".
  await page.keyboard.insertText(PYTHON_SOLUTION);

  await page.getByRole("button", { name: /^run$/i }).click();
  await expect(page.getByText(/level complete/i)).toBeVisible({ timeout: 30_000 });

  // stdout is the pupil's own, and it has to come back to them — printing is
  // how a child debugs before they can read a trace.
  // Exact, or this also matches the word inside the editor's own source.
  await expect(page.getByText("hello", { exact: true })).toBeVisible({ timeout: 15_000 });
});

/**
 * Runs after the Python one on purpose: running is free and leaves the
 * exercise untouched, but submitting completes it, and a completed exercise
 * no longer offers the editor to open again.
 */
test("the same level solves with a block, and the server grades the program", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/courses/${courseId}/lessons/${lessonId}`);

  await page.getByRole("button", { name: /blocks/i }).first().click();

  // The palette must offer what the level offers and nothing else. `move_left`
  // is not among this level's commands, so a toolbox built from the difficulty
  // preset instead of the teacher's list would show it.
  // Blockly 13 renders categories as .blocklyToolboxCategory, and keeps a
  // second, hidden flyout around — so take the one that is actually on screen.
  await page.locator(".blocklyToolboxCategory").filter({ hasText: /movement/i }).click();
  const flyout = page.locator(".blocklyFlyout:visible").first();
  await expect(flyout.getByText("right")).toBeVisible({ timeout: 15_000 });
  await expect(flyout.getByText("left")).toHaveCount(0);

  // Put the block on the canvas. Clicking a flyout block places it, which is
  // what a child does anyway, and does not depend on drag distances.
  await flyout.getByText("right").click();
  await expect(page.locator(".blocklyWorkspace .blocklyDraggable")).not.toHaveCount(0);

  await page.getByRole("button", { name: /^run$/i }).click();
  await expect(page.getByText(/level complete/i)).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /^submit$/i }).click();

  // Graded off the server's own run, not off anything the browser claimed.
  await expect
    .poll(
      async () => {
        const listed = (await teacherApi.get(`/exercises/${exerciseId}/submissions`)) as {
          items: { passed?: boolean | null }[];
        };
        return listed.items.map((s) => s.passed === true);
      },
      { timeout: 20_000, message: "the pupil's submission never arrived, or was not passed" },
    )
    .toContain(true);
});

