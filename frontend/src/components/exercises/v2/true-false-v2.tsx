"use client";

/**
 * TrueFalseV2 — Duolingo-style binary judgement.
 *
 * Adopted from q-basics.jsx · TrueFalseExerciseV2. Same per-task HP +
 * consecutive-correct streak model as QuizV2 (see lesson-shell.tsx for
 * the contract).
 */

import { useEffect, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import type { V2GradeFn, V2GradeResult } from "@/lib/exercises/v2-adapter";

export interface TrueFalseV2Props {
  statement: string;
  /** The canonical answer. Required for local (preview) grading; omitted
   * live — the server grades via `onGrade`. */
  correctAnswer?: boolean;
  /** Optional short explanation shown in the feedback sheet. */
  explain?: string;
  /** Optional eyebrow line. */
  eyebrow?: string;
  /** Optional title override (defaults to "True or false?"). */
  title?: string;
  /** Max attempts per task. Default 2 (binary choice — 1 retry). */
  maxAttemptsPerTask?: number;
  /** External streak counter. */
  streak?: number;
  /** When provided, grading is deferred to the server (integrity model B);
   * local `correctAnswer` is ignored. */
  onGrade?: V2GradeFn;
  onQuit?: () => void;
  onFinish?: (result: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

export function TrueFalseV2({
  statement,
  correctAnswer,
  explain,
  eyebrow,
  title,
  maxAttemptsPerTask = 2,
  streak: initialStreak = 0,
  onGrade,
  onQuit,
  onFinish,
}: TrueFalseV2Props) {
  const [pick, setPick] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [checking, setChecking] = useState(false);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  // TF-02key: T / ← selects True, F / → selects False. Ignored while a
  // feedback sheet is open, during async grading, or when typing in an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (feedback || checking) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "t") setPick(true);
      else if (e.key === "ArrowRight" || e.key.toLowerCase() === "f") setPick(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, checking]);

  const applyResult = (res: V2GradeResult) => {
    if (res.correct) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.trueFalse.right") : t("exercise.gotIt"),
        explain: res.explain ?? explain,
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }

    const remaining = res.attemptsRemaining ?? attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);

    if (res.maxReached || remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.outOfAttempts"),
        correct: res.correctAnswer,
        explain: res.explain ?? explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining)),
      });
    }
  };

  const handleCheck = async () => {
    if (pick === null || checking) return;

    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ answer: pick });
        applyResult(res);
      } catch {
        setFeedback({ kind: "no", msg: t("exercise.submitFailed") });
      } finally {
        setChecking(false);
      }
      return;
    }

    // Preview / local grading.
    applyResult({
      correct: pick === correctAnswer,
      correctAnswer: correctAnswer
        ? t("exercise.trueFalse.true")
        : t("exercise.trueFalse.false"),
      attemptsRemaining: attemptsLeft - 1,
    });
  };

  const handleRetry = () => {
    setFeedback(null);
    setPick(null);
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.trueFalse.title")}
        feedback={feedback}
        canCheck={pick !== null}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 18,
            padding: "26px 24px",
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 18,
            color: "var(--ink-900)",
            maxWidth: 460,
            margin: "0 auto 24px",
            lineHeight: 1.5,
          }}
        >
          “{statement}”
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          {[true, false].map((v) => {
            // TF-01: never paint the correct tile green while retries remain —
            // the child copies it on the next attempt. Reveal only at task end.
            const taskOver = feedback?.kind === "ok" || (!!feedback && attemptsLeft <= 0);
            let state = "";
            if (feedback) {
              if (taskOver && correctAnswer !== undefined && v === correctAnswer) state = "correct";
              else if (taskOver && feedback.kind === "ok" && v === pick) state = "correct";
              else if (v === pick && feedback.kind === "no") state = "wrong";
              else state = "locked";
            } else if (pick === v) state = "selected";
            return (
              <button
                key={String(v)}
                className={"gp-tile " + state}
                style={{ minWidth: 140, padding: "20px 24px", fontSize: 17 }}
                aria-pressed={pick === v}
                onClick={() => !feedback && setPick(v)}
              >
                {v ? t("exercise.trueFalse.true") : t("exercise.trueFalse.false")}
              </button>
            );
          })}
        </div>
        {/* TF-02key: discoverability hint for the keyboard path. */}
        <div
          style={{
            textAlign: "center",
            marginTop: 18,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-300)",
          }}
        >
          {t("exercise.trueFalse.keyTip")}
        </div>
      </LessonShell>
    </div>
  );
}
