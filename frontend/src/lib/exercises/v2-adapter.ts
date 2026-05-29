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
 * Tier-A scope (zero backend change): types whose answer is already
 * stripped AND whose UX is a single Check button → one submit = one task.
 *   - true_false  (config.statement; answer config.correct_answer stripped)
 *   - fill_blanks (config.text + word_bank; config.blanks stripped)
 *   - ordering    (word_bank; config.correct_order stripped)
 *
 * matching/categorize/bubble_sheet/quiz are NOT here — they either leak
 * answers (pairs/categories/correct not stripped) or grade per-interaction
 * and need a non-persisting /check endpoint. See tasks/todo.md.
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
}

/** Injected into a V2 component to defer grading to the server. The
 * `answers` object is the type-specific inner payload (e.g. `{ answer }`,
 * `{ blanks }`, `{ order }`). */
export type V2GradeFn = (answers: Record<string, unknown>) => Promise<V2GradeResult>;

export const V2_LIVE_TYPES = ["true_false", "fill_blanks", "ordering"] as const;
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
