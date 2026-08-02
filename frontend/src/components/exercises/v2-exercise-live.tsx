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

interface LiveExercise {
  id: string;
  exercise_type: string;
  title?: string;
  config: Record<string, unknown>;
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
}

export function V2ExerciseLive({
  exercise,
  onFinish,
  onAnswersChange,
  onQuit,
}: V2ExerciseLiveProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AttemptStatus | null>(null);
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
    default:
      return null;
  }
}
