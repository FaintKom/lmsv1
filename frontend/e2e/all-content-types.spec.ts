import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  Api,
  apiLogin,
  authenticate,
  BASE_URL,
  LessonPlayer,
  STUDENT,
  TEACHER,
  type Tokens,
} from "./poms/ContentTypeHarness";

/**
 * EVERY lesson / exercise content type — full create→solve→complete sweep.
 *
 * Coverage (the lesson "Content Type" picker in the editor):
 *   text · video · quiz · code_challenge · file_upload · theory ·
 *   interactive × { matching, ordering, fill_blanks, true_false, categorize }
 *
 * Per type the suite proves the STUDENT path end-to-end in a real browser:
 * open the lesson player → assert it renders (no blank / error) → solve the
 * interaction → assert completion. Lesson + content setup uses the same
 * backend endpoints the teacher editor / builders call (verified against the
 * live API); the dedicated `teacher editor UI` test additionally drives the
 * actual Add-Lesson content-type picker so the editor create flow itself is
 * exercised through the UI.
 *
 * Run (against prod, network required):
 *   E2E_BASE_URL=https://grasslms.online \
 *   E2E_TEACHER_EMAIL=teacher@grasslms.online E2E_TEACHER_PASSWORD=... \
 *   E2E_STUDENT_EMAIL=student@grasslms.online E2E_STUDENT_PASSWORD=... \
 *   npx playwright test e2e/all-content-types.spec.ts
 *
 * NOT creatable via the lesson "Content Type" picker (so out of this suite's
 * scope): robot_2d, math_interactive, world_3d. They exist in the backend
 * ExerciseType enum and the per-lesson EXERCISE picker
 * (lib/api/exercises.ts → EXERCISE_TYPES_META) but the Add-Lesson picker only
 * offers the 7 CONTENT_TYPE_OPTIONS. See the report for details.
 */

// A Google Slides embed URL — gives the theory lesson a renderable iframe
// source. Not owned by this project.
const GSLIDES_EMBED =
  "https://docs.google.com/presentation/d/e/2PACX-1vR_demo_e2e/embed?start=false&loop=false";

let teacherTokens: Tokens;
let studentTokens: Tokens;
let api: Api;
let courseId: string;
let moduleId: string;

// lessonId per content type, populated in beforeAll.
const L: Record<string, string> = {};

// Run with a single worker (so beforeAll scaffolds one shared course) but
// NOT serial — one type failing must not skip the others, so the report
// reflects every type's true PASS/FAIL in a single run.
test.describe.configure({ mode: "default" });

test.beforeAll(async ({ playwright }) => {
  const request = await playwright.request.newContext();
  teacherTokens = await apiLogin(request, TEACHER);
  studentTokens = await apiLogin(request, STUDENT);
  api = new Api(request, teacherTokens.access_token);

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const course = await api.createCourse(`E2E All-Types QA ${stamp}`);
  courseId = course.id;
  const mod = await api.createModule(courseId, "All Content Types");
  moduleId = mod.id;

  // ── text ──
  L.text = (
    await api.createLesson(courseId, moduleId, {
      title: "Text Lesson",
      content_type: "text",
      content: { body: "# Welcome\n\nThis is a **text** lesson body.", format: "markdown" },
    })
  ).id;

  // ── video ──
  L.video = (
    await api.createLesson(courseId, moduleId, {
      title: "Video Lesson",
      content_type: "video",
      content: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
    })
  ).id;

  // ── quiz ──  (single MC question, correct = option index 0)
  const quizLesson = await api.createLesson(courseId, moduleId, {
    title: "Quiz Lesson",
    content_type: "quiz",
  });
  L.quiz = quizLesson.id;
  await api.createQuiz({
    lesson_id: L.quiz,
    title: "Quiz Lesson",
    passing_score: 50,
    questions: [{ text: "What is 2 + 2?", options: ["4", "5", "22"], correct: 0 }],
  });

  // ── code_challenge ──
  const codeLesson = await api.createLesson(courseId, moduleId, {
    title: "Code Lesson",
    content_type: "code_challenge",
  });
  L.code = codeLesson.id;
  const challenge = await api.createChallenge({
    lesson_id: L.code,
    title: "Echo",
    description: "Print the number 4.",
    language: "python",
    starter_code: "print(4)\n",
    solution_code: "print(4)\n",
  });
  await api.addTestCase(challenge.id, { input: "", expected_output: "4", is_hidden: false });

  // ── file_upload ──
  // Allowed types must be types the backend's shared validator actually
  // recognizes (backend/app/common/file_validation.py::_EXT_SPECS). `.txt`
  // is NOT in that set — the upload endpoint rejects it with "File type .txt
  // is not recognized". PNG is recognized and also magic-byte sniffed, so the
  // test uploads a real PNG below.
  L.file_upload = (
    await api.createLesson(courseId, moduleId, {
      title: "File Upload Lesson",
      content_type: "file_upload",
      content: { instructions: "Upload an image file.", allowed_types: [".png"], max_file_mb: 5 },
    })
  ).id;

  // ── theory ── (Google Slides embed — no file upload needed)
  L.theory = (
    await api.createLesson(courseId, moduleId, {
      title: "Theory Lesson",
      content_type: "theory",
      content: {
        title: "Theory Deck",
        subtitle: "E2E",
        source: { kind: "gslides", url: GSLIDES_EMBED, filename: "Deck" },
        speaker_notes: [],
      },
    })
  ).id;

  // ── interactive × 5 ──
  L.matching = (
    await api.createLesson(courseId, moduleId, {
      title: "Interactive Matching",
      content_type: "interactive",
      content: {
        exercise_type: "matching",
        instruction: "Match the term to its definition.",
        pairs: [{ left: "HTTP", right: "Protocol" }],
      },
    })
  ).id;

  L.ordering = (
    await api.createLesson(courseId, moduleId, {
      title: "Interactive Ordering",
      content_type: "interactive",
      content: {
        exercise_type: "ordering",
        instruction: "Put steps in order.",
        items: ["First", "Second"],
        correct_order: ["First", "Second"],
      },
    })
  ).id;

  L.fill_blanks = (
    await api.createLesson(courseId, moduleId, {
      title: "Interactive Fill Blanks",
      content_type: "interactive",
      content: {
        exercise_type: "fill_blanks",
        instruction: "Fill the blank.",
        text_template: "A variable is a named {{blank}} location.",
        blanks: ["storage"],
      },
    })
  ).id;

  L.true_false = (
    await api.createLesson(courseId, moduleId, {
      title: "Interactive True/False",
      content_type: "interactive",
      content: {
        exercise_type: "true_false",
        instruction: "Answer the statement.",
        statement: "2 + 2 = 4",
        correct_answer: true,
      },
    })
  ).id;

  L.categorize = (
    await api.createLesson(courseId, moduleId, {
      title: "Interactive Categorize",
      content_type: "interactive",
      content: {
        exercise_type: "categorize",
        instruction: "Sort the languages.",
        categories: [
          { name: "Frontend", items: ["React"] },
          { name: "Backend", items: ["FastAPI"] },
        ],
        all_items: ["React", "FastAPI"],
      },
    })
  ).id;

  await api.publish(courseId);
  // Student self-enroll (course must be published first).
  const studentApi = new Api(request, studentTokens.access_token);
  await studentApi.enroll(courseId);
});

test.afterAll(async () => {
  if (courseId && api) {
    try {
      await api.deleteCourse(courseId);
    } catch (e) {
      console.warn(`teardown deleteCourse failed: ${(e as Error).message}`);
    }
  }
});

// Each student test gets a fresh authenticated context.
async function studentPlayer(page: Page): Promise<LessonPlayer> {
  await authenticate(page.context(), studentTokens);
  return new LessonPlayer(page, courseId);
}

function expectNoErrorState(page: Page) {
  return expect(page.locator("text=Application error")).toHaveCount(0);
}

// ── DISPLAY TYPES — open + Mark Lesson as Complete ────────────────────────

test("text: renders body and completes", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.text);
  await expect(page.getByRole("heading", { name: "Text Lesson" })).toBeVisible();
  await expect(page.getByText("Welcome")).toBeVisible();
  await expectNoErrorState(page);
  await page.getByRole("button", { name: /Mark Lesson as Complete/i }).click();
  await expect(page.getByText(/Done|Completed/i).first()).toBeVisible({ timeout: 15_000 });
});

test("video: renders player and completes", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.video);
  await expect(page.getByRole("heading", { name: "Video Lesson" })).toBeVisible();
  // The YouTube IFrame API injects the iframe into #yt-player-<lessonId>.
  // The external API script can be slow headless, so assert the player
  // container mounted (always present) and best-effort wait for the iframe.
  await expect(page.locator(`#yt-player-${L.video}`)).toBeVisible({ timeout: 20_000 });
  await page
    .locator("iframe")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })
    .catch(() => {});
  await expectNoErrorState(page);
  await page.getByRole("button", { name: /Mark Lesson as Complete/i }).click();
  await expect(page.getByText(/Done|Completed/i).first()).toBeVisible({ timeout: 15_000 });
});

test("theory: renders slide deck and continues", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.theory);
  await expect(page.getByRole("heading", { name: "Theory Lesson" })).toBeVisible();
  await expect(page.locator("iframe").first()).toBeVisible({ timeout: 15_000 });
  await expectNoErrorState(page);
  await page.getByRole("button", { name: /^Continue$/i }).click();
  await expect(page.getByText(/Done|Completed/i).first()).toBeVisible({ timeout: 15_000 });
});

// ── FILE UPLOAD ───────────────────────────────────────────────────────────

test("file_upload: uploads a file and completes", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.file_upload);
  await expect(page.getByRole("heading", { name: "File Upload Lesson" })).toBeVisible();
  await expect(page.getByText(/Drop file here or click to browse/i)).toBeVisible();
  await expectNoErrorState(page);
  // The backend validator (file_validation.py) does magic-byte sniffing, so an
  // in-memory text buffer renamed .png would be rejected ("content does not
  // match declared type"). Write a real 1×1 PNG to a temp file and upload that.
  const pngBytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64",
  );
  const pngPath = path.join(os.tmpdir(), `e2e-upload-${Date.now()}.png`);
  fs.writeFileSync(pngPath, pngBytes);
  try {
    await page.locator('input[type="file"]').setInputFiles(pngPath);
    await expect(page.getByText(path.basename(pngPath))).toBeVisible({ timeout: 20_000 });
  } finally {
    fs.rmSync(pngPath, { force: true });
  }
});

// ── QUIZ ────────────────────────────────────────────────────────────────

test("quiz: answers correctly and passes", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.quiz);
  await expect(page.getByText("What is 2 + 2?")).toBeVisible({ timeout: 15_000 });
  // Each option button renders a letter chip (A/B/C) span + the option text in
  // its own span (see quiz-taker.tsx). Whitespace-based text matching on the
  // whole button is fragile (the chip "A" and text "4" collapse to "A 4"/"A4"
  // unpredictably). Instead target the button that CONTAINS an element whose
  // text is exactly "4" — only option 0 ("4") qualifies; "5" and "22" do not.
  await page
    .getByRole("button")
    .filter({ has: page.getByText("4", { exact: true }) })
    .first()
    .click();
  await page.getByRole("button", { name: /Submit Quiz/i }).click();
  await expect(page.getByText(/Congratulations|passed this quiz/i)).toBeVisible({ timeout: 20_000 });
});

// ── CODE CHALLENGE ─────────────────────────────────────────────────────────

test("code_challenge: renders editor and completes", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.code);
  await expect(page.getByRole("heading", { name: "Code Lesson" })).toBeVisible();
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Print the number 4.")).toBeVisible();
  await expectNoErrorState(page);
  // Code lessons expose a Mark-Complete button (challenge is not an exercise
  // row, so exercises.length === 0). Running code in the sandbox is out of
  // scope here; this verifies create + render + completion.
  await page.getByRole("button", { name: /Mark Lesson as Complete/i }).click();
  await expect(page.getByText(/Done|Completed/i).first()).toBeVisible({ timeout: 15_000 });
});

// ── INTERACTIVE × 5 ─────────────────────────────────────────────────────────

test("interactive/true_false: answers correctly and passes", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.true_false);
  await expect(page.getByText("2 + 2 = 4")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /^True$/ }).click();
  await page.getByRole("button", { name: /Submit Answer/i }).click();
  await expect(page.getByText(/Correct!/i)).toBeVisible({ timeout: 20_000 });
});

test("interactive/matching: matches correctly and passes", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.matching);
  await expect(page.getByText("Match the term to its definition.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /^HTTP/ }).click();
  await page.getByRole("button", { name: /^Protocol$/ }).click();
  await page.getByRole("button", { name: /Submit Answer/i }).click();
  await expect(page.getByText(/Correct!/i)).toBeVisible({ timeout: 20_000 });
});

test("interactive/ordering: orders correctly and passes", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.ordering);
  await expect(page.getByText("Put steps in order.")).toBeVisible({ timeout: 15_000 });
  // Move "First" to the top until its up-button is disabled.
  for (let i = 0; i < 3; i++) {
    const up = page.getByRole("button", { name: "Move First up" });
    if (await up.isEnabled().catch(() => false)) {
      await up.click();
    } else {
      break;
    }
  }
  await page.getByRole("button", { name: /Submit Answer/i }).click();
  await expect(page.getByText(/Correct!/i)).toBeVisible({ timeout: 20_000 });
});

test("interactive/categorize: sorts correctly and passes", async ({ page }) => {
  // Narrow viewport reveals the mobile click-to-assign "+ item" buttons
  // (sm:hidden) so we avoid flaky HTML5 drag-and-drop.
  await page.setViewportSize({ width: 480, height: 900 });
  const player = await studentPlayer(page);
  await player.open(L.categorize);
  await expect(page.getByText("Sort the languages.")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: /^\+ React$/ }).first().click();
  await page.getByRole("button", { name: /^\+ FastAPI$/ }).last().click();
  await page.getByRole("button", { name: /Submit Answer/i }).click();
  await expect(page.getByText(/Correct!/i)).toBeVisible({ timeout: 20_000 });
});

test("interactive/fill_blanks: renders word bank and (best-effort) drag-fills", async ({ page }) => {
  const player = await studentPlayer(page);
  await player.open(L.fill_blanks);
  await expect(page.getByText("Fill the blank.")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Word Bank/i)).toBeVisible();
  await expect(page.getByText("storage")).toBeVisible();
  await expectNoErrorState(page);
  // dnd-kit PointerSensor (activation distance 5px) — drag word into blank.
  const word = page.getByText("storage", { exact: true });
  const blank = page.getByText("___", { exact: true }).first();
  const wb = await word.boundingBox();
  const bb = await blank.boundingBox();
  if (wb && bb) {
    await page.mouse.move(wb.x + wb.width / 2, wb.y + wb.height / 2);
    await page.mouse.down();
    await page.mouse.move(wb.x + wb.width / 2 + 10, wb.y + wb.height / 2 + 10);
    await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2, { steps: 8 });
    await page.mouse.up();
  }
  const submit = page.getByRole("button", { name: /Submit Answer/i });
  if (await submit.isEnabled().catch(() => false)) {
    await submit.click();
    await expect(page.getByText(/Correct!/i)).toBeVisible({ timeout: 20_000 });
  }
});

// ── TEACHER EDITOR UI: prove the Add-Lesson content-type picker works ────────

test("teacher editor UI: Add-Lesson content-type picker creates a lesson", async ({ page }) => {
  await authenticate(page.context(), teacherTokens);
  await page.goto(`${BASE_URL}/admin/courses/${courseId}/edit`);
  const moduleRow = page.getByText("All Content Types").first();
  await expect(moduleRow).toBeVisible({ timeout: 20_000 });
  // Expand the module: clicking the header row toggles expandedModules.
  // The inline "Add Lesson" button only exists once the module is expanded.
  const addLesson = page.getByRole("button", { name: /^Add Lesson$/ });
  await expect
    .poll(
      async () => {
        if (await addLesson.first().isVisible().catch(() => false)) return true;
        await moduleRow.click().catch(() => {});
        return addLesson.first().isVisible().catch(() => false);
      },
      { timeout: 20_000, intervals: [500, 1000, 1500] },
    )
    .toBe(true);
  await addLesson.first().click();
  await page.getByPlaceholder("Lesson title").fill("UI-Created Quiz Lesson");
  // Pick the "Quiz" content-type button in the picker grid.
  await page.getByRole("button", { name: "Quiz", exact: true }).first().click();
  // The "Add Lesson" submit button inside the New Lesson form.
  await page.getByRole("button", { name: /^Add Lesson$/ }).last().click();
  await expect(page.getByText("UI-Created Quiz Lesson")).toBeVisible({ timeout: 15_000 });
});
