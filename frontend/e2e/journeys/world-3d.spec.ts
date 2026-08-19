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
 * The World 3D chain, end to end: a teacher builds a level with height and a
 * door, checks that it can be solved, and saves it; a pupil solves it in Python
 * and again with a block, and the server grades the submission off a program it
 * ran itself.
 *
 * The twin of `robot-2d.spec.ts`, and for the same reason: `world_3d` is
 * excluded from all-content-types.spec.ts, and e2e/exercises/lifecycle.spec.ts
 * only asserts that submitting does not 500.
 *
 * Two things here are 3D's alone, and both are defects this rework fixed:
 *
 * **Painting one floor used to wipe another.** The editor matched a square on
 * position and kind and ignored its height, so a platform placed at floor 1
 * deleted the one at floor 0. The assertion is on what reached the database —
 * three platforms, one of them a floor up.
 *
 * **A button named its door in free text.** A typo made a door nobody could
 * open, and a level nobody could finish, with nothing to say why. The dropdown
 * offers the doors that exist; the assertion is that the link reached the
 * server, and the blocker before it is the control — without that first Check,
 * a dropdown that saved nothing would look exactly the same.
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
 * Three by three, with one block to climb onto, and winning *is* climbing onto
 * it. The platform sits on floor 0 — the floor the editor opens on, so this is
 * the level a teacher builds by accident on their first try.
 *
 * The win is a height rather than a flag, and that is deliberate. A flag
 * beyond the step is reached whichever way a platform's floor is counted: the
 * character either walks over the block or walks around at ground level, and
 * arrives either way. The first version of this level did exactly that, and
 * passed against the old rule as happily as the new one. Asking for the height
 * cannot be satisfied by accident — under the old counting a platform on floor
 * 0 left the surface at 0, and nothing in this level could ever get off the
 * ground.
 *
 * Everything else is bare, because the teacher paints it: these tests would
 * pass against an editor that saved nothing if the level arrived finished.
 *
 * Saved without star thresholds on purpose — Check fills them in, and a test
 * cannot show that if they arrive already filled.
 */
const LEVEL = {
  grid_width: 3,
  grid_depth: 3,
  start: { x: 0, z: 2, y: 0, facing: "north" },
  cells: [{ x: 0, z: 1, y: 0, type: "platform" }],
  commands: ["move_forward", "turn_left", "turn_right", "jump", "press", "at_goal"],
  win: { cond: "height_at_least", n: 1 },
  max_steps: 50,
  preset: "climbing",
};

/** One step, onto the block. */
const PYTHON_SOLUTION = 'print("hello")\nmove_forward()\n';

interface SavedCell {
  x: number;
  z: number;
  y?: number;
  type: string;
  id?: string;
  opens?: string;
}

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  const teacher = await apiLogin(request, TEACHER);
  const student = await apiLogin(request, STUDENT);
  teacherApi = new Api(request, teacher.access_token);
  const studentApi = new Api(request, student.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const course = await teacherApi.createCourse(`E2E World ${stamp}`);
  courseId = course.id;
  const mod = await teacherApi.createModule(courseId, "World module");
  const lesson = await teacherApi.createLesson(courseId, mod.id, {
    title: "World Lesson",
    content_type: "text",
    content: { body: "<p>Walk to the flag.</p>" },
  });
  lessonId = lesson.id;

  const exercise = await teacherApi.post("/exercises", {
    lesson_id: lessonId,
    exercise_type: "world_3d",
    title: `World level ${stamp}`,
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

test("teacher builds the level with height and a door, and Check answers", async ({ page }) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/content-library/${exerciseId}`);

  const from = page.locator('[data-cell="2,2"]');
  const to = page.locator('[data-cell="2,1"]');
  await from.waitFor({ state: "visible", timeout: 20_000 });

  // The start is drawn from the level's own start, not from a cell of its own.
  await expect(page.locator('[data-start="0,2"]')).toBeVisible();

  await page.getByRole("button", { name: /^platform$/i }).click();

  // Drag across two squares on the ground floor. One press, two squares: the
  // second is only painted if the drag is live, so this fails against an editor
  // that needs a click each.
  await from.hover();
  await page.mouse.down();
  await to.hover();
  await page.mouse.up();

  // A floor up, on a square that already carries a platform. The one below has
  // to survive — matching on position and kind while ignoring height is what
  // used to delete it.
  await page.getByLabel("Floor").selectOption("1");
  await from.click();

  await page.getByLabel("Floor").selectOption("0");
  await page.getByRole("button", { name: /^door$/i }).click();
  await page.locator('[data-cell="2,0"]').click();
  await page.getByRole("button", { name: /^button$/i }).click();
  await page.locator('[data-cell="1,2"]').click();

  // The door is chosen, never typed. Until it is chosen, Check says so — and
  // this is the control for the dropdown assertion further down.
  await page.getByRole("button", { name: /check this level/i }).click();
  await expect(page.getByText(/a button opens no door/i)).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("Buttons, and the doors they open").selectOption({ index: 1 });

  await page.getByRole("button", { name: /check this level/i }).click();
  await expect(page.getByText(/solvable in/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/a button opens no door/i)).toHaveCount(0);

  await page.getByRole("button", { name: /^save$/i }).click();

  // What reached the database is the only proof that matters.
  await expect
    .poll(
      async () => {
        const saved = (await teacherApi.get(`/exercises/${exerciseId}`)) as {
          config: { cells: SavedCell[]; star_steps: number | null };
        };
        const cells = saved.config.cells;
        const doors = cells.filter((c) => c.type === "door");
        const button = cells.find((c) => c.type === "button");
        return {
          // Four: the step the level shipped with, plus the three painted here.
          platforms: cells.filter((c) => c.type === "platform").length,
          // The one this rework exists for: a platform on each floor of the
          // same square, rather than the upper one having eaten the lower.
          floorsOnThatSquare: cells
            .filter((c) => c.type === "platform" && c.x === 2 && c.z === 2)
            .map((c) => c.y ?? 0)
            .sort(),
          buttonOpensADoorThatExists: !!button?.opens && doors.some((d) => d.id === button.opens),
          starSteps: saved.config.star_steps,
        };
      },
      { timeout: 20_000, message: "the level the teacher built never reached the server" },
    )
    .toEqual({
      platforms: 4,
      floorsOnThatSquare: [0, 1],
      buttonOpensADoorThatExists: true,
      starSteps: 1,
    });
});

/**
 * Undo, and the reference solution. Neither is reachable from anywhere else:
 * the pupil's screen never sees them and the backend tests never press them.
 *
 * The two are together because each carries the other's control. Undo is only
 * meaningful if the wall was there first; the winning solution is only
 * meaningful if the losing one was turned away.
 */
test("undo puts the level back, and a losing reference solution is refused", async ({ page }) => {
  await authenticate(page.context(), TEACHER);
  await page.goto(`${BASE_URL}/admin/content-library/${exerciseId}`);

  const square = page.locator('[data-cell="1,0"]');
  await square.waitFor({ state: "visible", timeout: 20_000 });

  await page.getByRole("button", { name: /^wall$/i }).click();
  await square.click();
  await expect(square).toHaveClass(/bg-clay-500/);

  await page.getByRole("button", { name: /^undo$/i }).click();
  await expect(square).not.toHaveClass(/bg-clay-500/);

  const solution = page.getByLabel("Your own solution");
  const save = page.getByRole("button", { name: /save as the reference solution/i });

  const stored = async () => {
    const saved = (await teacherApi.get(`/exercises/${exerciseId}`)) as {
      config: { cells: SavedCell[]; solution_code: string | null };
    };
    return {
      wallsAtThatSquare: saved.config.cells.filter(
        (c) => c.type === "wall" && c.x === 1 && c.z === 0,
      ).length,
      solution: saved.config.solution_code ?? null,
    };
  };

  // Turns on the spot and never arrives. A level whose own answer does not
  // finish it is a level the teacher has not actually solved.
  //
  // Saved to the server before the winning one is tried, or this proves
  // nothing: the second save would overwrite the first either way, and a
  // refusal that silently stored the loser would look identical at the end.
  await solution.fill("turn_left()\n");
  await save.click();
  await expect(page.getByText(/did not finish the level/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^save$/i }).click();

  await expect
    .poll(stored, { timeout: 20_000, message: "a losing reference solution was stored" })
    .toEqual({ wallsAtThatSquare: 0, solution: null });

  await solution.fill(PYTHON_SOLUTION);
  await save.click();
  await expect(page.getByText(/finished in .* steps/i)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: /^save$/i }).click();

  await expect
    .poll(stored, { timeout: 20_000, message: "the winning reference solution never arrived" })
    .toEqual({ wallsAtThatSquare: 0, solution: PYTHON_SOLUTION });
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
 * The world says why it refused, in words.
 *
 * The character has always shuddered when a command was refused and never said
 * why — a wall, a closed door, the edge of the board and a step too high looked
 * identical. The reason has been on the frame all along; nothing translated it.
 *
 * Before the submit test, because submitting completes the exercise and takes
 * the editor away.
 */
test("the pupil is told why the world refused", async ({ page }) => {
  await authenticate(page.context(), STUDENT);
  await page.goto(`${BASE_URL}/courses/${courseId}/lessons/${lessonId}`);

  await page.getByRole("button", { name: /python/i }).first().click();
  const editor = page.locator(".monaco-editor").first();
  await editor.waitFor({ state: "visible", timeout: 20_000 });

  const run = async (source: string) => {
    await editor.click();
    await page.keyboard.press("ControlOrMeta+a");
    await page.keyboard.insertText(source);
    await page.getByRole("button", { name: /^run$/i }).click();
  };

  // Facing north at the near edge; turning left faces west, and west is off the
  // board.
  await run("turn_left()\nmove_forward()\n");
  await expect(page.getByText(/edge of the board/i)).toBeVisible({ timeout: 30_000 });

  // The control: a program that is not refused says nothing about edges. Without
  // it, a line showing the same text always would pass the assertion above.
  await run(PYTHON_SOLUTION);
  await expect(page.getByText(/level complete/i)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/edge of the board/i)).toHaveCount(0);
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

  // The palette must offer what the level offers and nothing else. `take` is
  // not among this level's commands, so a toolbox built from a difficulty
  // preset instead of the teacher's list would show it.
  // Blockly 13 renders categories as .blocklyToolboxCategory and keeps a
  // second, hidden flyout around — so take the one that is actually on screen.
  await page.locator(".blocklyToolboxCategory").filter({ hasText: /movement/i }).click();
  const flyout = page.locator(".blocklyFlyout:visible").first();
  await expect(flyout.getByText(/forward/i).first()).toBeVisible({ timeout: 15_000 });
  await expect(flyout.getByText(/take/i)).toHaveCount(0);

  // Put the block on the canvas. Clicking a flyout block places it, which is
  // what a child does anyway, and does not depend on drag distances.
  await flyout.getByText(/forward/i).first().click();
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
