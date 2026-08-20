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
const HEAVY_TYPES = new Set([
  "robot_2d",
  "world_3d",
  "math_interactive",
  "code_challenge",
  "web_editor",
]);

/**
 * The field that shows whether anything has actually been written yet.
 *
 * The answer-key map above asks only whether the container holds something.
 * An `Add question` button puts a blank row there, so a list of one empty
 * string reads as filled and the preview drew a question with nothing in it.
 * Listed per type rather than checked everywhere, because emptiness means
 * different things: a map pin with no label is legitimate — the widget numbers
 * it `#1` — while a dialogue line with no words is not a line.
 */
const CONTENT_FIELD_BY_TYPE: Record<string, string> = {
  ordering: "correct_order",
  sentence_builder: "correct_order",
  reading: "questions",
  bubble_sheet: "questions",
  dialogue: "messages",
  translation: "accepted_answers",
  math_system: "equations",
  true_false: "statement",
};

/** Is there a non-blank string anywhere inside — however deeply nested. */
function hasText(value: unknown): boolean {
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.some(hasText);
  if (value && typeof value === "object") return Object.values(value).some(hasText);
  return false;
}

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

  const contentField = CONTENT_FIELD_BY_TYPE[exerciseType];
  if (contentField && !hasText(config[contentField])) {
    return { kind: "missing", field: contentField };
  }

  if (exerciseType === "scorm_package" && !String(config.launch_url ?? "").trim()) {
    return { kind: "missing", field: "launch_url" };
  }

  // Pins are placed on a picture. Without one the widget draws an empty frame
  // and the student is asked to find something on nothing.
  if (exerciseType === "map_pin_drop" && !String(config.image_url ?? "").trim()) {
    return { kind: "missing", field: "image_url" };
  }

  // A solid needs its measurements before there is a number to work out.
  if (exerciseType === "stereometry") {
    const dimensions = config.dimensions;
    const sized =
      !!dimensions &&
      typeof dimensions === "object" &&
      Object.values(dimensions).some((v) => Number(v) > 0);
    if (!String(config.solid ?? "").trim()) return { kind: "missing", field: "solid" };
    if (!sized) return { kind: "missing", field: "dimensions" };
  }

  return { kind: "widget", heavy: HEAVY_TYPES.has(exerciseType) };
}
