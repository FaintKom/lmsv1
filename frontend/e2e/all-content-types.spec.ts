import { expect, test, type Page } from "@playwright/test";

import {
  Api,
  apiLogin,
  authenticate,
  LessonPlayer,
  STUDENT,
  TEACHER,
  teardownCourse,
  type Tokens,
} from "./poms/ContentTypeHarness";

/**
 * EVERY kind of thing a lesson page can hold, in front of a pupil.
 *
 * This suite used to create one lesson per lesson "type" — a quiz lesson, an
 * interactive lesson, a theory lesson — because that is how lessons were
 * built. specs/027 removed that idea: a lesson is pages of blocks, and each
 * of those old types is a block you add inside one. So the sweep now builds
 * one lesson per kind, each holding a single page with the block under test,
 * and opens it as a student.
 *
 * What it proves: every kind reaches the pupil and draws its own content —
 * the pairs of a matching task, the statement of a true/false, the editor of
 * a code challenge. Not a blank screen, not an error boundary, and not some
 * other kind's widget.
 *
 * What it does NOT prove, and did before: that solving each one is graded
 * correctly. Those assertions were written against the widgets the old
 * player used — quiz-taker's lettered option buttons, file-uploader's
 * dropzone, the theory viewer's Continue — and every one of them is gone.
 * Rebuilding them against the widgets ExerciseView draws is real work with a
 * live browser per type, and doing it badly would be worse than not doing
 * it: an assertion that passes for the wrong reason is how a suite goes
 * quiet. Tracked separately.
 *
 * Run (needs a running stack):
 *   E2E_BASE_URL=http://localhost:3010 npx playwright test e2e/all-content-types.spec.ts
 */

let teacherTokens: Tokens;
let studentTokens: Tokens;
let api: Api;
let courseId: string;
let moduleId: string;

// lessonId per kind, populated in beforeAll.
const L: Record<string, string> = {};

// A Google Slides embed URL — gives the presentation block a renderable
// iframe source. Not owned by this project.
const GSLIDES_EMBED =
  "https://docs.google.com/presentation/d/e/2PACX-1vR_demo_e2e/embed?start=false&loop=false";

/** Lesson content holding one page of the given blocks. */
function onePage(blocks: Record<string, unknown>[]) {
  return {
    version: 3,
    pages: [
      {
        id: "page_1",
        blocks: blocks.map((b, i) => ({ id: `b${i}`, sort_order: i, page: 1, ...b })),
      },
    ],
  };
}

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

  /** A lesson whose single page holds one block. */
  async function lessonWithBlock(title: string, block: Record<string, unknown>) {
    const lesson = await api.createLesson(courseId, moduleId, {
      title,
      content_type: "text",
      content: onePage([block]),
    });
    return lesson.id as string;
  }

  /**
   * A lesson holding one exercise. The exercise is created first — a block
   * carries only a reference to it, never a copy.
   */
  async function lessonWithExercise(
    title: string,
    exerciseType: string,
    config: Record<string, unknown>,
    andThen?: (exerciseId: string) => Promise<void>,
  ) {
    const lesson = await api.createLesson(courseId, moduleId, {
      title,
      content_type: "text",
      content: onePage([]),
    });
    const exercise = await api.createExercise({
      lesson_id: lesson.id,
      exercise_type: exerciseType,
      title,
      config,
    });
    // Types whose answers live outside config — a quiz's questions, a code
    // challenge's test cases — fill them in here, before the block goes up.
    if (andThen) await andThen(exercise.id);
    await api.updateLessonContent(
      courseId,
      moduleId,
      lesson.id,
      onePage([{ type: "exercise", exercise_id: exercise.id }]),
    );
    return lesson.id as string;
  }

  // ── display blocks ──
  L.text = await lessonWithBlock("Text Lesson", {
    type: "text",
    format: "html",
    body: "<h2>Welcome</h2><p>This is a text block.</p>",
  });

  L.video = await lessonWithBlock("Video Lesson", {
    type: "video",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  });

  L.presentation = await lessonWithBlock("Presentation Lesson", {
    type: "presentation",
    url: GSLIDES_EMBED,
  });

  // ── exercise blocks ──
  L.matching = await lessonWithExercise("Matching Lesson", "matching", {
    instruction: "Match the term to its definition.",
    pairs: [
      { left: "HTTP", right: "Protocol" },
      { left: "HTML", right: "Markup" },
    ],
  });

  L.ordering = await lessonWithExercise("Ordering Lesson", "ordering", {
    instruction: "Put the steps in order.",
    items: ["Preheat", "Bake"],
    correct_order: ["Preheat", "Bake"],
  });

  // The sentence lives in `text`, with {{blank}} where the gap goes — the
  // shape production stores. An earlier draft of this file guessed
  // `text_template` and the widget rendered nothing at all.
  L.fill_blanks = await lessonWithExercise("Fill Blanks Lesson", "fill_blanks", {
    text: "A variable is a named {{blank}} location.",
    blanks: ["storage"],
    word_bank: ["storage", "colour"],
  });

  L.true_false = await lessonWithExercise("True False Lesson", "true_false", {
    instruction: "Answer the statement.",
    statement: "Two plus two is four.",
    correct_answer: true,
  });

  L.categorize = await lessonWithExercise("Categorize Lesson", "categorize", {
    categories: [
      { name: "Frontend", items: ["React"] },
      { name: "Backend", items: ["FastAPI"] },
    ],
  });

  // A quiz keeps its questions in their own table, not in config — config
  // holds only the passing score. Putting them in config produced an
  // exercise that rendered no question at all.
  L.quiz = await lessonWithExercise(
    "Quiz Lesson",
    "quiz",
    { passing_score: 50 },
    async (exerciseId) => {
      await api.post(`/exercises/${exerciseId}/questions`, {
        question_text: "What is two plus two?",
        question_type: "multiple_choice",
        options: [
          { text: "Four", is_correct: true },
          { text: "Five", is_correct: false },
        ],
        points: 1,
      });
    },
  );

  L.code_challenge = await lessonWithExercise("Code Lesson", "code_challenge", {
    description: "Print the number four.",
    language: "python",
    starter_code: "print(4)\n",
    solution_code: "print(4)\n",
  });

  L.file_upload = await lessonWithExercise("File Upload Lesson", "file_upload", {
    instructions: "Upload an image file.",
    allowed_types: [".png"],
    max_file_mb: 5,
  });

  await api.publish(courseId);
  // Student self-enroll (course must be published first).
  const studentApi = new Api(request, studentTokens.access_token);
  await studentApi.enroll(courseId);
});

test.afterAll(async () => {
  await teardownCourse(api, courseId);
});

async function studentPlayer(page: Page): Promise<LessonPlayer> {
  await authenticate(page.context(), STUDENT);
  return new LessonPlayer(page, courseId);
}

/**
 * The lesson opened, and what is on screen belongs to this kind of block.
 *
 * The error-boundary check is why this helper exists: a React crash inside
 * one widget leaves the heading and the chrome intact, so asserting "the
 * title is there" alone would pass over a broken block.
 */
async function opens(page: Page, lessonId: string, heading: string) {
  const player = await studentPlayer(page);
  await player.open(lessonId);
  // .first(): the lesson's own h1 and the exercise widget's h3 can both carry
  // this text, and two matches is a strict-mode failure rather than a result.
  await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
  await expect(page.locator("text=Application error")).toHaveCount(0);
}

// ── display blocks ────────────────────────────────────────────────────────

test("text block: renders its prose", async ({ page }) => {
  await opens(page, L.text, "Text Lesson");
  await expect(page.getByText("This is a text block.")).toBeVisible();
});

test("video block: mounts a player", async ({ page }) => {
  await opens(page, L.video, "Video Lesson");
  // The YouTube IFrame API injects into a container keyed by lesson id. The
  // external script is slow headless, so the container is the assertion and
  // the iframe is best-effort.
  await expect(page.locator(`#yt-player-${L.video}`)).toBeVisible({ timeout: 20_000 });
  await page
    .locator("iframe")
    .first()
    .waitFor({ state: "visible", timeout: 15_000 })
    .catch(() => {});
});

test("presentation block: embeds the deck", async ({ page }) => {
  await opens(page, L.presentation, "Presentation Lesson");
  await expect(page.locator("iframe").first()).toBeVisible({ timeout: 15_000 });
});

// ── exercise blocks ───────────────────────────────────────────────────────

test("matching block: shows both sides of every pair", async ({ page }) => {
  await opens(page, L.matching, "Matching Lesson");
  for (const word of ["HTTP", "Protocol", "HTML", "Markup"]) {
    await expect(page.getByText(word, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  }
});

test("ordering block: shows the items to arrange", async ({ page }) => {
  await opens(page, L.ordering, "Ordering Lesson");
  for (const item of ["Preheat", "Bake"]) {
    await expect(page.getByText(item, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  }
});

test("fill blanks block: shows the sentence and the words to choose from", async ({ page }) => {
  await opens(page, L.fill_blanks, "Fill Blanks Lesson");
  await expect(page.getByText(/A variable is a named/i).first()).toBeVisible({ timeout: 15_000 });
  // The pupil picks from a word bank rather than typing, so there is no text
  // input to find — an earlier draft looked for one and failed.
  await expect(page.getByText("storage").first()).toBeVisible();
});

test("true/false block: shows the statement", async ({ page }) => {
  await opens(page, L.true_false, "True False Lesson");
  await expect(page.getByText("Two plus two is four.").first()).toBeVisible({ timeout: 15_000 });
});

test("categorize block: shows the groups and the cards", async ({ page }) => {
  await opens(page, L.categorize, "Categorize Lesson");
  // Not exact: a group renders its name and its running count in one node
  // ("Frontend 0"), so an exact match finds nothing.
  for (const word of ["Frontend", "Backend", "React", "FastAPI"]) {
    await expect(page.getByText(word).first()).toBeVisible({ timeout: 15_000 });
  }
});

test("quiz block: shows the question and its options", async ({ page }) => {
  await opens(page, L.quiz, "Quiz Lesson");
  await expect(page.getByText("What is two plus two?").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Four", { exact: true }).first()).toBeVisible();
});

test("code challenge block: mounts an editor", async ({ page }) => {
  await opens(page, L.code_challenge, "Code Lesson");
  await expect(page.locator(".monaco-editor").first()).toBeVisible({ timeout: 30_000 });
});

test("file upload block: offers a file input", async ({ page }) => {
  await opens(page, L.file_upload, "File Upload Lesson");
  await expect(page.locator('input[type="file"]').first()).toBeAttached({ timeout: 15_000 });
});
