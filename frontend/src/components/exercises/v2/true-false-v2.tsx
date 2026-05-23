"use client";

/**
 * TrueFalseV2 — Duolingo-style binary judgement.
 *
 * Adopted from q-basics.jsx · TrueFalseExerciseV2. Same per-task HP +
 * consecutive-correct streak model as QuizV2 (see lesson-shell.tsx for
 * the contract).
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface TrueFalseV2Props {
  statement: string;
  /** The canonical answer. */
  correctAnswer: boolean;
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
  title = "True or false?",
  maxAttemptsPerTask = 2,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: TrueFalseV2Props) {
  const [pick, setPick] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const handleCheck = () => {
    if (pick === null) return;
    const isCorrect = pick === correctAnswer;

    if (isCorrect) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "Right!" : "Got it!",
        explain,
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }

    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);

    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: "Out of attempts.",
        correct: correctAnswer ? "True" : "False",
        explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
      });
    }
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
        title={title}
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
            let state = "";
            if (feedback) {
              if (v === correctAnswer) state = "correct";
              else if (v === pick) state = "wrong";
              else state = "locked";
            } else if (pick === v) state = "selected";
            return (
              <button
                key={String(v)}
                className={"gp-tile " + state}
                style={{ minWidth: 140, padding: "20px 24px", fontSize: 17 }}
                onClick={() => !feedback && setPick(v)}
              >
                {v ? "True" : "False"}
              </button>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}
