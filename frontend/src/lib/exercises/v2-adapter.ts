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
  // listening (specs/068): the same stepper, a recording instead of a passage
  "listening",
  "dialogue",
  "quiz",
  "crossword",
  // stripped in PR-1; its widget only grew multi-pin support later
  "map_pin_drop",
  // math_system needs no stripping — the config holds the teacher's equations
  // and no answer at all, and the server re-solves them at marking time.
  "math_system",
  // stereometry needs no stripping either: the config holds the solid and
  // its measurements, and the server works the number out at marking time.
  "stereometry",
] as const;
export type V2LiveType = (typeof V2_LIVE_TYPES)[number];

export function isV2LiveType(t: string | undefined | null): t is V2LiveType {
  return !!t && (V2_LIVE_TYPES as readonly string[]).includes(t);
}

/**
 * Turn the underscores a teacher types into the markers a widget reads.
 *
 * The Fill Blanks editor offers `__` and `___` and counts the answer rows
 * from them. Every widget splits on `{{blank}}` and nothing translated
 * between the two, so a sentence authored in the editor reached the student
 * with its underscores intact and no input slots at all.
 *
 * Two underscores is the floor deliberately: a single one belongs to
 * `user_name`, and a lesson about code should not sprout holes.
 */
export function toBlankMarkers(text: string): string {
  return text.replace(/___?/g, "{{blank}}");
}

/** One bubble-sheet row as the widget wants it. */
export interface BubbleQuestionView {
  n: number;
  q: string;
  opts: string[];
  /** 0-based index of the right option; absent when there is no key yet. */
  correct?: number;
}

/**
 * Read a bubble sheet's rows out of its config.
 *
 * The config holds `question_text`, `options`, and `correct` as a letter —
 * the widget wants `q`, `opts`, and an index. The names were read as
 * `question` here for a while, so the text a teacher typed sat in the config
 * and never reached the sheet; both spellings are accepted now because
 * content exists either way.
 */
export function toBubbleQuestions(config: Record<string, unknown>): BubbleQuestionView[] {
  const raw =
    (config.questions as {
      number?: number;
      question_text?: string;
      question?: string;
      options?: string[];
      correct?: string;
    }[]) ?? [];
  const numOptions = (config.num_options as number) ?? 4;
  return raw.map((q, i) => {
    const letter = (q.correct ?? "").trim().toUpperCase();
    return {
      n: q.number ?? i + 1,
      q: q.question_text ?? q.question ?? "",
      opts:
        q.options && q.options.length > 0
          ? q.options
          : Array.from({ length: numOptions }, (_, j) => String.fromCharCode(65 + j)),
      correct: letter ? letter.charCodeAt(0) - 65 : undefined,
    };
  });
}

/** Count the blanks in a fill-blanks template — the live config strips
 * `blanks`, so slot count must come from the text, not the answers. */
export function countBlanks(text: string | undefined): number {
  if (!text) return 0;
  const m = toBlankMarkers(text).match(/\{\{blank\}\}/g);
  return m ? m.length : 0;
}
