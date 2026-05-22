/**
 * Lifecycle test - parameterised over every fixture in EXERCISE_REGISTRY.
 *
 * What it covers per type:
 *   1. Teacher creates an Exercise of that type via POST /api/v1/exercises
 *   2. If the fixture declares `questions`, each is added via POST
 *      /api/v1/exercises/{id}/questions
 *   3. If the fixture declares `test_cases`, each is added via POST
 *      /api/v1/exercises/{id}/test-cases
 *   4. Student submits an answer via POST /api/v1/exercises/{id}/submit
 *   5. Backend MUST respond 2xx or 4xx (validation) - any 5xx is a
 *      regression in the per-type submit handler
 *
 * What it deliberately does NOT cover:
 *   - Exact score assertions per type (graders vary; covered by backend
 *     tests where applicable)
 *   - UI rendering of each exercise type (depends on per-renderer
 *     data-testid attributes, future work)
 *
 * Types with `skipReason` are skipped with that reason in the report.
 */
import { expect, test } from "@playwright/test";

import { CourseEditorPage } from "../poms/CourseEditorPage";
import { ExerciseRendererPage } from "../poms/ExerciseRendererPage";
import { LoginPage } from "../poms/LoginPage";
import {
  EXERCISE_REGISTRY,
  type ExerciseTypeSpec,
} from "../registry/exercise-types";

const QA_LESSON_ID = process.env.QA_LESSON_ID;
const API_URL = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8000";

test.beforeAll(() => {
  if (!QA_LESSON_ID) {
    throw new Error(
      "QA_LESSON_ID env var not set - the workflow must capture it from seed_qa.py",
    );
  }
});

/**
 * Build a submit body that the backend's per-type handler will at least
 * route correctly. Per-type grading isn't asserted here; the goal is to
 * prove the endpoint accepts a sane request without 5xx.
 */
function buildSubmitBody(
  spec: ExerciseTypeSpec,
  questionId: string | null,
): Record<string, unknown> {
  const interactive = (t: ExerciseTypeSpec["type"]) =>
    [
      "matching",
      "ordering",
      "fill_blanks",
      "true_false",
      "categorize",
      "sentence_builder",
      "conjugation",
      "translation",
      "dialogue",
      "srs_flashcard",
      "crossword",
      "word_search",
      "bubble_sheet",
      "map_pin_drop",
      "math_stepwise",
    ].includes(t);

  const game = (t: ExerciseTypeSpec["type"]) =>
    ["robot_2d", "world_3d", "math_interactive"].includes(t);

  if (spec.type === "quiz" && questionId) {
    return { answers: [{ question_id: questionId, selected_option: "4" }] };
  }
  if (spec.type === "reading" && questionId) {
    return { answers: [{ question_id: questionId, text: "mat" }] };
  }
  if (spec.type === "code_challenge") {
    return {
      source_code: "def add(a, b):\n    return a + b\n",
      language: "python",
    };
  }
  if (spec.type === "web_editor") {
    return { web_code: { html: "<p>hello</p>", css: "p{color:red}", js: "" } };
  }
  if (game(spec.type)) {
    return {
      game_result: {
        completed: true,
        score: 100,
        steps_used: 1,
        time_seconds: 1,
      },
    };
  }
  if (interactive(spec.type)) {
    return { interactive_answers: { placeholder: true } };
  }
  // Fallback - empty payload, backend should reject with 400/422 not 500.
  return {};
}

for (const spec of EXERCISE_REGISTRY) {
  test.describe(`exercise lifecycle: ${spec.type} @smoke`, () => {
    if (spec.skipReason) {
      test.skip(true, spec.skipReason);
    }

    test("create -> add children -> submit returns non-5xx", async ({ browser }) => {
      const teacherCtx = await browser.newContext();
      const studentCtx = await browser.newContext();
      try {
        const teacherPage = await teacherCtx.newPage();
        const teacherLogin = new LoginPage(teacherPage);
        const teacherTokens = await teacherLogin.loginViaApi(teacherCtx, "teacher");

        const stamp = Date.now();
        const exercise = await CourseEditorPage.createExerciseViaApi(
          teacherCtx.request,
          teacherTokens.access_token,
          {
            lesson_id: QA_LESSON_ID!,
            exercise_type: spec.type,
            title: `lifecycle ${spec.type} ${stamp}`,
            config: spec.config,
          },
        );

        let firstQuestionId: string | null = null;
        for (const q of spec.questions ?? []) {
          const created = await CourseEditorPage.addQuestionViaApi(
            teacherCtx.request,
            teacherTokens.access_token,
            exercise.id,
            {
              question_text: q.question_text,
              question_type: q.question_type,
              options: q.options ?? undefined,
              correct_answer: q.correct_answer ?? null,
              points: q.points ?? 1,
            },
          );
          if (!firstQuestionId) firstQuestionId = created.id;
        }
        for (const tc of spec.test_cases ?? []) {
          await CourseEditorPage.addTestCaseViaApi(
            teacherCtx.request,
            teacherTokens.access_token,
            exercise.id,
            {
              input: tc.input ?? "",
              expected_output: tc.expected_output,
              is_hidden: tc.is_hidden ?? false,
            },
          );
        }

        const studentPage = await studentCtx.newPage();
        const studentLogin = new LoginPage(studentPage);
        const studentTokens = await studentLogin.loginViaApi(
          studentCtx,
          "student",
        );

        const body = buildSubmitBody(spec, firstQuestionId);
        const res = await studentCtx.request.post(
          `${API_URL}/api/v1/exercises/${exercise.id}/submit`,
          {
            headers: { Authorization: `Bearer ${studentTokens.access_token}` },
            data: body,
          },
        );
        // 2xx = graded, 4xx = validation (acceptable here). 5xx is a
        // regression in the per-type submit handler.
        expect(
          res.status(),
          `submit ${spec.type}: status=${res.status()} body=${(await res.text()).slice(0, 200)}`,
        ).toBeLessThan(500);
      } finally {
        await teacherCtx.close();
        await studentCtx.close();
      }
    });

    if (spec.type === "quiz") {
      test("quiz with correct option text scores 100", async ({ browser }) => {
        const teacherCtx = await browser.newContext();
        const studentCtx = await browser.newContext();
        try {
          const tLogin = new LoginPage(await teacherCtx.newPage());
          const tTok = await tLogin.loginViaApi(teacherCtx, "teacher");

          const ex = await CourseEditorPage.createExerciseViaApi(
            teacherCtx.request,
            tTok.access_token,
            {
              lesson_id: QA_LESSON_ID!,
              exercise_type: "quiz",
              title: `quiz score ${Date.now()}`,
              config: spec.config,
            },
          );
          const q = await CourseEditorPage.addQuestionViaApi(
            teacherCtx.request,
            tTok.access_token,
            ex.id,
            {
              question_text: "2+2?",
              question_type: "multiple_choice",
              options: [
                { text: "3", is_correct: false },
                { text: "4", is_correct: true },
              ],
              points: 1,
            },
          );

          const sLogin = new LoginPage(await studentCtx.newPage());
          const sTok = await sLogin.loginViaApi(studentCtx, "student");
          const sub = await ExerciseRendererPage.submitViaApi(
            studentCtx.request,
            sTok.access_token,
            ex.id,
            { answers: [{ question_id: q.id, selected_option: "4" }] },
          );
          expect(sub.score).toBe(100);
          expect(sub.passed).toBe(true);
        } finally {
          await teacherCtx.close();
          await studentCtx.close();
        }
      });
    }
  });
}
