"use client";

/**
 * ReadingV2 — passage on the left, multiple-choice question on the right.
 *
 * Adopted from q-language.jsx · ReadingExerciseV2. Two-column layout:
 * passage panel + single MC question. Per-task HP + streak. Retry
 * clears the pick so the student can re-read and re-choose.
 *
 * Note: multi-question reading sets should be modeled as a sequence of
 * ReadingV2 tasks sharing the same passage prop, rather than bundling
 * multiple questions into one task.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface ReadingV2Props {
  passage: string;
  question: string;
  options: string[];
  /** 0-based index of correct option. */
  correct: number;
  /** Hint shown alongside wrong-attempt feedback. */
  hint?: string;
  eyebrow?: string;
  title?: string;
  passageLabel?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

export function ReadingV2({
  passage,
  question,
  options,
  correct,
  hint,
  eyebrow,
  title,
  passageLabel,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: ReadingV2Props) {
  const { t } = useTranslation();
  const [pick, setPick] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const handleCheck = () => {
    if (pick === correct) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.reading.right") : t("exercise.gotIt"),
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
        msg: t("exercise.outOfAttempts"),
        correct: options[correct],
        explain: hint,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.notQuiteAttemptLeft") : t("exercise.notQuiteAttemptsLeft")).replace("{n}", String(remaining)),
        explain: hint,
      });
    }
  };

  const handleRetry = () => {
    setPick(null);
    setFeedback(null);
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
        title={title ?? t("exercise.reading.title")}
        feedback={feedback}
        canCheck={pick !== null}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              padding: "18px 20px",
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "var(--ink-700)",
              fontFamily: "var(--font-sans)",
            }}
          >
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>
              {passageLabel ?? t("exercise.passage")}
            </div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{passage}</p>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              {question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {options.map((opt, i) => {
                let state = "";
                if (feedback) {
                  if (i === correct) state = "correct";
                  else if (i === pick) state = "wrong";
                  else state = "locked";
                } else if (pick === i) state = "selected";
                return (
                  <button
                    key={i}
                    className={"gp-tile " + state}
                    style={{
                      padding: "12px 16px",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      fontSize: 14,
                    }}
                    disabled={!!feedback}
                    onClick={() => setPick(i)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
