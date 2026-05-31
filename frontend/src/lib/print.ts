/**
 * Print-view helpers for the single-lesson "Save as PDF" pages.
 *
 * The print page takes a `?variant=student|teacher` query param. The
 * `teacher` variant is an answer key (correct answers / solutions shown);
 * the `student` variant is a blank worksheet (answers hidden so a learner
 * fills it in by hand). The default — when the param is missing or junk —
 * is `teacher`, matching the existing course-wide print page.
 */

export type PrintVariant = "student" | "teacher";

/** Normalize an arbitrary query value to a known print variant. */
export function parseVariant(raw: string | null | undefined): PrintVariant {
  return raw === "student" ? "student" : "teacher";
}

/**
 * Whether the given variant should reveal correct answers / solutions.
 * Only the teacher (answer-key) variant does.
 */
export function variantShowsAnswers(variant: PrintVariant): boolean {
  return variant === "teacher";
}

/**
 * Lesson content types whose interactive runtime cannot be meaningfully
 * rendered on paper. The print page shows an "available online only"
 * placeholder for these instead of trying (and failing) to render them.
 */
const ONLINE_ONLY_CONTENT_TYPES: ReadonlySet<string> = new Set([
  "code_challenge",
  "interactive",
  "world_3d",
  "robot_2d",
  "math_interactive",
]);

/** True when a lesson content type is interactive-only and won't print. */
export function isOnlineOnlyContentType(contentType: string): boolean {
  return ONLINE_ONLY_CONTENT_TYPES.has(contentType);
}
