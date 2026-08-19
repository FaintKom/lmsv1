"use client";

/**
 * V2ExerciseLive — bridges a live, server-graded exercise to the Tier-A V2
 * components (true_false, fill_blanks, ordering).
 *
 * Integrity model B: the backend strips correct answers from the student
 * payload (`_strip_answers` in exercises/router.py) and is the sole grader.
 * This wrapper therefore injects an async `onGrade` that POSTs the raw answer
 * to `/exercises/:id/submit` and maps the response to a `V2GradeResult` the
 * component renders feedback from. Display props are built from the stripped
 * config (statement / text+word_bank / word_bank).
 *
 * Scope: single-submit types whose answers the server strips — see
 * v2-adapter.ts (`V2_LIVE_TYPES`). Deferred/per-interaction types
 * (matching, categorize, quiz…) are the Tier-B/C follow-ups in tasks/todo.md.
 */

import { useEffect, useRef, useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import apiClient from "@/lib/api-client";
import { startExerciseTimer, type ExerciseTimer } from "@/lib/api/exercises";
import { useTranslation } from "@/lib/i18n/context";
import type { V2GradeFn, V2GradeResult, V2LiveType } from "@/lib/exercises/v2-adapter";
import { TrueFalseV2 } from "@/components/exercises/v2/true-false-v2";
import { FillBlanksV2 } from "@/components/exercises/v2/fill-blanks-v2";
import { OrderingV2 } from "@/components/exercises/v2/ordering-v2";
import { TranslationV2 } from "@/components/exercises/v2/translation-v2";
import { SentenceBuilderV2 } from "@/components/exercises/v2/sentence-builder-v2";
import {
  ConjugationV2,
  type ConjugationRow,
} from "@/components/exercises/v2/conjugation-v2";
import {
  BubbleSheetV2,
  type BubbleSheetQuestion,
} from "@/components/exercises/v2/bubble-sheet-v2";
import { MatchingV2 } from "@/components/exercises/v2/matching-v2";
import { CategorizeV2 } from "@/components/exercises/v2/categorize-v2";
import { ReadingV2 } from "@/components/exercises/v2/reading-v2";
import { DialogueV2 } from "@/components/exercises/v2/dialogue-v2";
import { QuizV2 } from "@/components/exercises/v2/quiz-v2";
import { CrosswordV2 } from "@/components/exercises/v2/crossword-v2";
import { MapPinDropV2 } from "@/components/exercises/v2/map-pin-v2";
import { MathSystemV2 } from "@/components/exercises/v2/math-system-v2";
import { StereometryV2 } from "@/components/exercises/v2/stereometry-v2";

interface LiveExercise {
  id: string;
  exercise_type: string;
  title?: string;
  config: Record<string, unknown>;
  /** quiz only — answers live in this relation, not in config. The server
   *  already strips `is_correct` / `correct_answer` for students. */
  questions?: {
    id: string;
    question_text: string;
    question_type?: string;
    options?: { text?: string; label?: string; is_correct?: boolean }[] | null;
  }[];
}

export interface V2ExerciseLiveProps {
  exercise: LiveExercise;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
  /** Live-lesson draft capture — forwarded to the underlying V2 component. */
  onAnswersChange?: (answers: Record<string, unknown>) => void;
  onQuit?: () => void;
}

interface AttemptStatus {
  attempt_count: number;
  max_attempts: number;
  max_reached: boolean;
  /** The verdict already on record, so a solved board stops playing dumb. */
  last?: { score: number | null; passed: boolean | null } | null;
}

export function V2ExerciseLive({
  exercise,
  onFinish,
  onAnswersChange,
  onQuit,
}: V2ExerciseLiveProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AttemptStatus | null>(null);
  const [retrying, setRetrying] = useState(false);
  // Time-on-task clock — armed once when this live exercise mounts.
  const timerRef = useRef<ExerciseTimer>(startExerciseTimer());

  useEffect(() => {
    let alive = true;
    apiClient
      .get(`/exercises/${exercise.id}/attempts`)
      .then(({ data }) => {
        if (!alive) return;
        setStatus({
          attempt_count: data.attempt_count ?? 0,
          max_attempts: data.max_attempts ?? 100,
          max_reached: !!data.max_reached,
          last: data.last_submission
            ? {
                score: data.last_submission.score ?? null,
                passed: data.last_submission.passed ?? null,
              }
            : null,
        });
      })
      .catch(() => {
        if (alive) setStatus({ attempt_count: 0, max_attempts: 100, max_reached: false });
      });
    return () => {
      alive = false;
    };
  }, [exercise.id]);

  const formatCorrect = (correctAnswer: unknown): string | undefined => {
    if (!correctAnswer || typeof correctAnswer !== "object") return undefined;
    const ans = (correctAnswer as { answer?: unknown }).answer;
    if (ans == null) return undefined;
    if (exercise.exercise_type === "true_false") {
      return ans ? t("exercise.trueFalse.true") : t("exercise.trueFalse.false");
    }
    if (Array.isArray(ans)) {
      return exercise.exercise_type === "ordering"
        ? ans.join(" → ")
        : ans.join(" · ");
    }
    return String(ans);
  };

  const onGrade: V2GradeFn = async (answers) => {
    const res = await apiClient.post(`/exercises/${exercise.id}/submit`, {
      interactive_answers: answers,
      elapsed_seconds: timerRef.current.elapsedSeconds(),
    });
    const d = res.data ?? {};
    const result: V2GradeResult = {
      correct: !!d.passed,
      attemptsRemaining: d.attempts_remaining ?? undefined,
      maxReached: !!d.max_attempts_reached,
      perItem: d.per_item ?? undefined,
    };
    if (d.max_attempts_reached) {
      result.correctAnswer = formatCorrect(d.correct_answer);
    }
    return result;
  };

  /** Non-persisting per-item check — no submission row, no attempt spent.
   *  Used by the deferred types (matching, categorize) between rounds. */
  const onCheck: V2GradeFn = async (answers) => {
    const res = await apiClient.post(`/exercises/${exercise.id}/check`, {
      interactive_answers: answers,
    });
    const d = res.data ?? {};
    return { correct: !!d.passed, perItem: d.per_item ?? undefined };
  };

  if (!status) return null;

  // A verdict already on record renders as itself, not as an untouched board.
  // The renderer path got this in #319 (finding 5); every V2 type on the
  // lesson page comes through here instead, and made the same broken promise.
  if (status.last && status.last.passed != null && !retrying) {
    const passed = !!status.last.passed;
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-6 text-center">
        {passed ? (
          <CheckCircle className="h-10 w-10 text-primary" aria-hidden />
        ) : (
          <XCircle className="h-10 w-10 text-warning-fg" aria-hidden />
        )}
        <p className="text-lg font-bold text-text">
          {t(passed ? "exercise.restored.passed" : "exercise.restored.notPassed")}
        </p>
        {status.last.score != null && (
          <p className="text-sm text-text-muted">
            {t("exercise.restored.score")}: {Math.round(status.last.score)}%
          </p>
        )}
        {status.max_reached ? (
          <p className="text-xs text-text-muted">{t("exercise.restored.exhausted")}</p>
        ) : (
          <button
            type="button"
            onClick={() => setRetrying(true)}
            className="btn-pop mt-1 rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-fg pointer-coarse:min-h-11"
          >
            {t("exercise.restored.retry")}
          </button>
        )}
      </div>
    );
  }

  // Remaining attempts seed the local heart pool; the component re-syncs to
  // the server's `attempts_remaining` after every submit.
  const remaining = Math.max(1, status.max_attempts - status.attempt_count);
  const cfg = exercise.config ?? {};
  const shared = {
    maxAttemptsPerTask: remaining,
    onGrade,
    onAnswersChange,
    onFinish,
    onQuit,
  } as const;

  switch (exercise.exercise_type as V2LiveType) {
    case "true_false":
      return (
        <TrueFalseV2
          statement={(cfg.statement as string) ?? ""}
          explain={cfg.explain as string | undefined}
          {...shared}
        />
      );
    case "fill_blanks":
      // students get a server-shuffled word_bank; the teacher preview sees
      // the full config where only `blanks` exists — fall back to it
      return (
        <FillBlanksV2
          text={cfg.text as string | undefined}
          wordBank={((cfg.word_bank ?? cfg.blanks) as string[]) ?? []}
          {...shared}
        />
      );
    case "ordering":
      // same asymmetry: word_bank is generated at strip time for students;
      // the unstripped teacher config carries items / correct_order
      return (
        <OrderingV2
          items={((cfg.word_bank ?? cfg.items ?? cfg.correct_order) as string[]) ?? []}
          hint={cfg.hint as string | undefined}
          {...shared}
        />
      );
    case "translation": {
      const accepted = (cfg.accepted_answers as string[]) ?? [];
      return (
        <TranslationV2
          source={(cfg.source_text as string) ?? ""}
          sourceLang={(cfg.source_language as string) ?? ""}
          targetLang={(cfg.target_language as string) ?? ""}
          accepted={accepted}
          correct={accepted[0]}
          hint={(cfg.hints as string[] | undefined)?.[0]}
          {...shared}
        />
      );
    }
    case "sentence_builder":
      return (
        <SentenceBuilderV2
          source={(cfg.instructions as string) ?? ""}
          wordBank={cfg.word_bank as string[] | undefined}
          correctWords={(cfg.correct_order ?? cfg.words) as string[] | undefined}
          distractors={cfg.distractors as string[] | undefined}
          {...shared}
        />
      );
    case "conjugation":
      return (
        <ConjugationV2
          infinitive={(cfg.verb as string) ?? ""}
          tense={(cfg.tense as string) ?? ""}
          rows={((cfg.table as ConjugationRow[]) ?? []).filter((r) => r?.pronoun)}
          {...shared}
        />
      );
    case "bubble_sheet": {
      // backend shape: questions[{number?, question?, options?, correct?: letter}]
      const raw = (cfg.questions as {
        number?: number;
        question?: string;
        options?: string[];
        correct?: string;
      }[]) ?? [];
      const numOptions = (cfg.num_options as number) ?? 4;
      const questions: BubbleSheetQuestion[] = raw.map((q, i) => {
        const opts =
          q.options && q.options.length > 0
            ? q.options
            : Array.from({ length: numOptions }, (_, j) => String.fromCharCode(65 + j));
        const letter = (q.correct ?? "").trim().toUpperCase();
        return {
          n: q.number ?? i + 1,
          q: q.question ?? "",
          opts,
          correct: letter ? letter.charCodeAt(0) - 65 : undefined,
        };
      });
      return <BubbleSheetV2 questions={questions} {...shared} />;
    }
    case "matching":
      return (
        <MatchingV2
          leftItems={(cfg.left_items as string[]) ?? undefined}
          rightItems={(cfg.right_items as string[]) ?? undefined}
          // teacher preview still sees the unstripped mapping
          pairs={cfg.pairs as { left: string; right: string }[] | undefined}
          onCheck={onCheck}
          maxAttemptsPerTask={remaining}
          onGrade={onGrade}
          onAnswersChange={onAnswersChange}
          onQuit={onQuit}
          // matching reports wrongAttempts; the shared contract wants attemptsUsed
          onFinish={(r) =>
            onFinish?.({ correct: r.correct, attemptsUsed: r.wrongAttempts, streak: r.streak })
          }
        />
      );
    case "quiz": {
      const qs = (exercise.questions ?? []).map((q) => ({
        id: q.id,
        question_text: q.question_text,
        answerMode:
          q.question_type === "text_answer" ? ("text" as const) : ("selected_option" as const),
        options: (q.options ?? []).map((o) => ({
          text: o.text ?? o.label ?? "",
          is_correct: o.is_correct,
        })),
      }));
      return <QuizV2 questions={qs} onCheck={onCheck} onGrade={onGrade} onQuit={onQuit} />;
    }
    case "reading": {
      // config questions carry either dict options ({id,label,is_correct})
      // or plain strings; the grader wants the id in the first case
      const raw = (cfg.questions as {
        question?: string;
        type?: string;
        options?: (string | { id?: string; text?: string; label?: string })[];
        hint?: string;
      }[]) ?? [];
      const questions = raw.map((q) => {
        const opts = q.options ?? [];
        return {
          question: q.question ?? "",
          options: opts.map((o) =>
            typeof o === "string" ? o : (o.label ?? o.text ?? ""),
          ),
          optionIds: opts.map((o) =>
            typeof o === "string" ? o : (o.id ?? o.label ?? o.text ?? ""),
          ),
          hint: q.hint,
        };
      });
      return (
        <ReadingV2
          passage={(cfg.passage as string) ?? ""}
          questions={questions}
          onCheck={onCheck}
          {...shared}
        />
      );
    }
    case "map_pin_drop": {
      // stripped config: pins[{label}] — coordinates and tolerance are gone,
      // so the student places one marker per label and the server judges.
      const pins = (cfg.pins as { label?: string }[]) ?? [];
      return (
        <MapPinDropV2
          pinLabels={pins.map((p, i) => p.label ?? `#${i + 1}`)}
          mapContent={
            cfg.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cfg.image_url as string}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : null
          }
          onCheck={onCheck}
          maxAttemptsPerTask={remaining}
          onGrade={onGrade}
          onAnswersChange={onAnswersChange}
          onQuit={onQuit}
        />
      );
    }
    case "crossword": {
      // stripped config: words[{clue,row,col,direction,length}] — no letters.
      // Walk each word's cells to build the grid; the first cell of a word
      // carries its clue number (across before down at a shared start).
      const raw = (cfg.words as {
        clue?: string;
        row?: number;
        col?: number;
        direction?: "across" | "down";
        length?: number;
        word?: string;
      }[]) ?? [];
      const size = (cfg.grid_size as number) ?? 10;
      const cells: Record<string, { ch?: string; num?: number }> = {};
      const across: { n: number; text: string }[] = [];
      const down: { n: number; text: string }[] = [];
      const wordIndexByNum: Record<number, number> = {};
      let num = 0;
      raw.forEach((w, wi) => {
        const len = w.length ?? w.word?.length ?? 0;
        const r0 = w.row ?? 0;
        const c0 = w.col ?? 0;
        if (len <= 0) return;
        num += 1;
        wordIndexByNum[num] = wi;
        (w.direction === "down" ? down : across).push({ n: num, text: w.clue ?? "" });
        for (let i = 0; i < len; i++) {
          const r = w.direction === "down" ? r0 + i : r0;
          const c = w.direction === "down" ? c0 : c0 + i;
          const key = `${r},${c}`;
          const ch = w.word ? w.word[i]?.toUpperCase() : undefined;
          cells[key] = {
            ...(cells[key] ?? {}),
            ...(ch ? { ch } : {}),
            ...(i === 0 && cells[key]?.num == null ? { num } : {}),
          };
        }
      });
      return (
        <CrosswordV2
          width={size}
          height={size}
          cells={cells}
          clues={{ across, down }}
          wordIndexByNum={wordIndexByNum}
          onCheck={onCheck}
          maxAttemptsPerTask={remaining}
          onGrade={onGrade}
          onAnswersChange={onAnswersChange}
          onQuit={onQuit}
          onFinish={onFinish}
        />
      );
    }
    case "dialogue": {
      const msgs = (cfg.messages as {
        speaker?: string;
        text?: string;
        options?: { id?: string; text?: string; label?: string }[];
      }[]) ?? [];
      const steps = msgs
        .map((m, i) => ({ m, i }))
        .filter(({ m }) => (m.options?.length ?? 0) > 0)
        .map(({ m, i }) => ({
          messageIndex: i,
          options: (m.options ?? []).map((o, oi) => ({
            id: o.id ?? String(oi),
            text: o.label ?? o.text ?? "",
            // no answer key live — verdicts come from /check
            correct: false,
          })),
        }));
      return (
        <DialogueV2
          messages={msgs.map((m) => ({ speaker: m.speaker ?? "", text: m.text ?? "" }))}
          steps={steps}
          onCheck={onCheck}
          {...shared}
        />
      );
    }
    case "categorize":
      return (
        <CategorizeV2
          categoryNames={(cfg.category_names as string[]) ?? undefined}
          items={(cfg.items as string[]) ?? undefined}
          categories={cfg.categories as { name: string; items: string[] }[] | undefined}
          onCheck={onCheck}
          {...shared}
        />
      );
    case "math_system":
      return (
        <MathSystemV2
          equations={(cfg.equations as string[]) ?? []}
          variables={(cfg.variables as string[]) ?? undefined}
          problem={cfg.problem as string | undefined}
          title={exercise.title}
          {...shared}
        />
      );
    case "stereometry":
      return (
        <StereometryV2
          solid={(cfg.solid as string) ?? ""}
          dimensions={(cfg.dimensions as Record<string, unknown>) ?? {}}
          quantity={(cfg.quantity as string) ?? ""}
          decimals={cfg.decimals as number | undefined}
          unit={cfg.unit as string | undefined}
          problem={cfg.problem as string | undefined}
          title={exercise.title}
          {...shared}
        />
      );
    default:
      return null;
  }
}
