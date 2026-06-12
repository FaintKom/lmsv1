"use client";

/**
 * McMathV2 — multiple-choice with a math expression front and center.
 *
 * Adopted from q-math.jsx · MultipleChoiceMathExerciseV2. Visually
 * different from QuizV2: a larger serif (--font-math) expression card on
 * top, options rendered in a 2-column math grid below.
 *
 * Per-task HP + streak; retry clears pick.
 */

import { useEffect, useState } from "react";
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
  // MM-05: wrong picks stay struck out + disabled across retries.
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  // MM-04: number keys 1–9 select an option. Ignored while a feedback sheet
  // is open or when typing in an input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (feedback) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= Math.min(options.length, 9) && !eliminated.includes(n - 1)) {
        setPick(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, eliminated, options.length]);

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
    if (pick !== null) setEliminated((els) => [...els, pick]); // MM-05
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
                fontFamily: "var(--font-math)", // MM-02
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
            role="radiogroup"
            aria-label={t("exercise.quiz.answerOptionsAria")}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {options.map((opt, i) => {
              // MM-01: reveal the correct tile only when the task is over —
              // never on a "tries left" sheet the child can retry from.
              const taskOver = feedback?.kind === "ok" || (!!feedback && attemptsLeft <= 0);
              let state = "";
              if (feedback) {
                if (taskOver && i === correct) state = "correct";
                else if (i === pick && feedback.kind === "no") state = "wrong";
                else if (eliminated.includes(i)) state = "eliminated"; // MM-05
                else state = "locked";
              } else if (eliminated.includes(i)) state = "eliminated"; // MM-05
              else if (pick === i) state = "selected";
              const isElim = state === "eliminated";
              return (
                <button
                  key={i}
                  type="button"
                  className={"gp-tile " + state}
                  role="radio"
                  aria-checked={pick === i}
                  style={{
                    padding: "16px 18px",
                    fontFamily: "var(--font-math)", // MM-02
                    fontSize: 19,
                    position: "relative",
                  }}
                  disabled={!!feedback || isElim}
                  onClick={() => !feedback && !isElim && setPick(i)}
                >
                  <MaybeMath text={opt} />
                  {/* MM-04: index hint for the 1–9 keyboard path. */}
                  <span
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      bottom: 4,
                      right: 8,
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      color: "var(--ink-200)",
                    }}
                  >
                    {i + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
