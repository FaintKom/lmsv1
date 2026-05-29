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
 * Scope is deliberately the three single-submit types whose answer is already
 * stripped — see v2-adapter.ts (`V2_LIVE_TYPES`) and tasks/todo.md for the
 * Tier-B/C backend follow-ups.
 */

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";
import type { V2GradeFn, V2GradeResult, V2LiveType } from "@/lib/exercises/v2-adapter";
import { TrueFalseV2 } from "@/components/exercises/v2/true-false-v2";
import { FillBlanksV2 } from "@/components/exercises/v2/fill-blanks-v2";
import { OrderingV2 } from "@/components/exercises/v2/ordering-v2";

interface LiveExercise {
  id: string;
  exercise_type: string;
  title?: string;
  config: Record<string, unknown>;
}

export interface V2ExerciseLiveProps {
  exercise: LiveExercise;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
  onQuit?: () => void;
}

interface AttemptStatus {
  attempt_count: number;
  max_attempts: number;
  max_reached: boolean;
}

export function V2ExerciseLive({ exercise, onFinish, onQuit }: V2ExerciseLiveProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AttemptStatus | null>(null);

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
    });
    const d = res.data ?? {};
    const result: V2GradeResult = {
      correct: !!d.passed,
      attemptsRemaining: d.attempts_remaining ?? undefined,
      maxReached: !!d.max_attempts_reached,
    };
    if (d.max_attempts_reached) {
      result.correctAnswer = formatCorrect(d.correct_answer);
    }
    return result;
  };

  if (!status) return null;

  // Remaining attempts seed the local heart pool; the component re-syncs to
  // the server's `attempts_remaining` after every submit.
  const remaining = Math.max(1, status.max_attempts - status.attempt_count);
  const cfg = exercise.config ?? {};
  const shared = {
    maxAttemptsPerTask: remaining,
    onGrade,
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
      return (
        <FillBlanksV2
          text={cfg.text as string | undefined}
          wordBank={(cfg.word_bank as string[]) ?? []}
          {...shared}
        />
      );
    case "ordering":
      return (
        <OrderingV2
          items={(cfg.word_bank as string[]) ?? []}
          hint={cfg.hint as string | undefined}
          {...shared}
        />
      );
    default:
      return null;
  }
}
