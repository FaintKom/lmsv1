/**
 * v2-adapter — bridges the live exercise model (server-graded) to the V2
 * exercise components, which were originally built as self-contained,
 * client-graded preview widgets.
 *
 * Integrity model B: the backend strips correct answers from the student
 * payload (`_strip_answers` in exercises/router.py) and is the sole grader.
 * The V2 components therefore CANNOT grade locally when live — they defer
 * to an injected `onGrade` callback that POSTs the raw answer to
 * `/exercises/:id/submit` and renders feedback from the server response.
 *
 * Scope: single-submit types whose answers `_strip_answers` removes from
 * the student payload:
 *   - true_false / fill_blanks / ordering (Tier A)
 *   - translation / sentence_builder / conjugation / bubble_sheet (PR-1);
 *     multi-slot types get per-item verdicts via `per_item` in the submit
 *     response (and the non-persisting POST /exercises/{id}/check).
 *
 * matching/categorize/quiz/reading/dialogue/crossword are NOT here — they
 * grade per-interaction and are the deferred-check follow-ups. map_pin_drop
 * is stripped server-side but its V2 component is single-target while the
 * config is multi-pin — wiring lands with the deferred batch. See
 * tasks/todo.md.
 */

/** Result the V2 component needs to render feedback, derived from the
 * server submit response. */
export interface V2GradeResult {
  correct: boolean;
  /** Human-readable canonical answer, shown when attempts are exhausted. */
  correctAnswer?: string;
  explain?: string;
  /** Server's remaining-attempts count, used to sync the heart pool. */
  attemptsRemaining?: number;
  /** Server signalled the task is over (no more attempts). */
  maxReached?: boolean;
  /** Per-item verdicts (booleans only) for multi-slot types — keyed per
   * slot ({pronoun: bool}, {"0": bool}) or positional. */
  perItem?: Record<string, boolean> | boolean[];
}

/** Injected into a V2 component to defer grading to the server. The
 * `answers` object is the type-specific inner payload (e.g. `{ answer }`,
 * `{ blanks }`, `{ order }`). */
export type V2GradeFn = (answers: Record<string, unknown>) => Promise<V2GradeResult>;

export const V2_LIVE_TYPES = [
  "true_false",
  "fill_blanks",
  "ordering",
  "translation",
  "sentence_builder",
  "conjugation",
  "bubble_sheet",
  // deferred-check types (PR-2): graded per item through /check, with one
  // submission recorded via onGrade when the task is solved
  "matching",
  "categorize",
  // stepper types (PR-3): per-question verdicts through /check
  "reading",
  "dialogue",
] as const;
export type V2LiveType = (typeof V2_LIVE_TYPES)[number];

export function isV2LiveType(t: string | undefined | null): t is V2LiveType {
  return !!t && (V2_LIVE_TYPES as readonly string[]).includes(t);
}

/** Count `{{blank}}` markers in a fill-blanks template — the live config
 * strips `blanks`, so slot count must come from the text, not the answers. */
export function countBlanks(text: string | undefined): number {
  if (!text) return 0;
  const m = text.match(/\{\{blank\}\}/g);
  return m ? m.length : 0;
}
