"use client";

/**
 * McMathV2 — multiple-choice with a math expression front and center.
 *
 * Adopted from q-math.jsx · MultipleChoiceMathExerciseV2. Visually
 * different from QuizV2: a larger Times-New-Roman expression card on
 * top, options rendered in a 2-column math grid below.
 *
 * Per-task HP + streak; retry clears pick.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";

export interface McMathV2Props {
  /** Lead-in copy shown above the expression. */
  prompt?: string;
  /** The math expression itself, rendered large in serif font. */
  expr: string;
  options: string[];
  /** 0-based index of correct option. */
  correct: number;
  explain?: string;
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

export function McMathV2({
  prompt,
  expr,
  options,
  correct,
  explain,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: McMathV2Props) {
  const [pick, setPick] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const handleCheck = () => {
    if (pick === correct) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.mcMath.right") : t("exercise.gotIt"),
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
        msg: t("exercise.outOfAttempts"),
        correct: options[correct],
        explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.notQuiteAttemptLeft") : t("exercise.notQuiteAttemptsLeft")).replace("{n}", String(remaining)),
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
        title={title ?? t("exercise.mcMath.title")}
        feedback={feedback}
        canCheck={pick !== null}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              padding: "20px 22px",
              marginBottom: 18,
              textAlign: "center",
            }}
          >
            {prompt && (
              <span style={{ fontSize: 16, color: "var(--ink-500)" }}>
                <MaybeMath text={prompt} />
              </span>
            )}
            <div
              style={{
                fontFamily: "'Times New Roman', serif",
                fontSize: 36,
                fontWeight: 600,
                color: "var(--ink-900)",
                marginTop: prompt ? 6 : 0,
              }}
            >
              <MaybeMath text={expr} />
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
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
                  type="button"
                  className={"gp-tile " + state}
                  style={{
                    padding: "16px 18px",
                    fontFamily: "'Times New Roman', serif",
                    fontSize: 19,
                  }}
                  disabled={!!feedback}
                  onClick={() => setPick(i)}
                >
                  <MaybeMath text={opt} />
                </button>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
