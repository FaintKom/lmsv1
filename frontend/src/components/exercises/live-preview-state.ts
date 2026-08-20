/**
 * What the live preview shows while a teacher is still filling the form in.
 *
 * The preview draws the real student widget, and a widget handed a half-built
 * config has never been asked to render before: in the lesson's preview mode
 * the config was always something already saved and whole. So the decision of
 * *whether* to draw it is taken here, deliberately, instead of letting each
 * widget improvise an empty state twenty-six different ways.
 *
 * There is a second reason it lives apart from the drawing. The drawing can
 * only be judged in a browser; this can be judged by a test.
 */

import { ANSWER_KEY_BY_TYPE, missingAnswerKey } from "@/lib/exercises/answer-key";

/** Types whose widget pulls in a scene or a code editor — mounted on request. */
const HEAVY_TYPES = new Set(["robot_2d", "world_3d", "math_interactive", "code_challenge"]);

/** Counts that live in their own tables rather than in the config. */
export interface RelatedCounts {
  questions?: number;
  testCases?: number;
}

export type LivePreview =
  | { kind: "empty" }
  | { kind: "missing"; field: string }
  | { kind: "widget"; heavy: boolean };

export function livePreviewState(
  exerciseType: string,
  config: Record<string, unknown> | undefined,
  related: RelatedCounts = {},
): LivePreview {
  if (!config || Object.keys(config).length === 0) return { kind: "empty" };

  // A quiz keeps its questions, and a code challenge its test cases, in a
  // relation. Both are saved the moment they are added, so reading the count
  // back is as live as reading the config.
  if (exerciseType === "quiz" && related.questions === 0) {
    return { kind: "missing", field: "questions" };
  }
  if (exerciseType === "code_challenge" && related.testCases === 0) {
    return { kind: "missing", field: "test_cases" };
  }

  // The same map the grader marks from and the editor's empty-key warning
  // reads, so the preview cannot disagree with either about what a type needs.
  if (ANSWER_KEY_BY_TYPE[exerciseType]) {
    const missing = missingAnswerKey(exerciseType, config);
    if (missing) return { kind: "missing", field: missing };
  }

  if (exerciseType === "scorm_package" && !String(config.launch_url ?? "").trim()) {
    return { kind: "missing", field: "launch_url" };
  }

  return { kind: "widget", heavy: HEAVY_TYPES.has(exerciseType) };
}
