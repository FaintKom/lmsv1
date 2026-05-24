"use client";

/**
 * MathStepwiseV2 — show-your-work line-by-line solver.
 *
 * Adopted from q-math.jsx · MathStepwiseExerciseV2. Methodist supplies
 * the problem statement + an ordered list of expected intermediate
 * steps. Student types each line; Check validates per-line (whitespace
 * + case insensitive). Per-step green/coral border on submit.
 *
 * Per-task HP + streak; retry keeps typed steps so student fixes only
 * the wrong lines.
 */

import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface MathStepwiseStep {
  /** Short label rendered to the left (e.g. "Step 1"). */
  label: string;
  /** Expected canonical form. Whitespace + case ignored on match. */
  expected: string;
  /** Placeholder + final-reveal hint. */
  hint?: string;
}

export interface MathStepwiseV2Props {
  problem: string;
  steps: MathStepwiseStep[];
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

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

export function MathStepwiseV2({
  problem,
  steps,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: MathStepwiseV2Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<string[]>(() => steps.map(() => ""));
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const allFilled = values.every((v) => v.trim().length > 0);
  const correctSummary = steps
    .map((s) => `${s.label}: ${s.expected}`)
    .join(" · ");

  const handleCheck = () => {
    const okFlags = steps.map((s, i) => norm(values[i]) === norm(s.expected));
    const allOk = okFlags.every(Boolean);
    if (allOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.mathStepwise.allCorrect") : t("exercise.gotIt"),
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
        correct: correctSummary,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.mathStepwise.checkHighlightedOne") : t("exercise.mathStepwise.checkHighlighted")).replace("{n}", String(remaining)),
      });
    }
  };

  const handleRetry = () => {
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
  const finalReveal = feedback?.kind === "no" && !canRetry;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.mathStepwise.title")}
        feedback={feedback}
        canCheck={allFilled}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 28,
              fontWeight: 700,
              padding: "18px 24px",
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              marginBottom: 16,
              color: "var(--ink-900)",
            }}
          >
            {problem}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {steps.map((s, i) => {
              const isOk = !!feedback && norm(values[i]) === norm(s.expected);
              const isNo = !!feedback && norm(values[i]) !== norm(s.expected);
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--ink-500)",
                      fontWeight: 700,
                      width: 60,
                    }}
                  >
                    {s.label}
                  </span>
                  <input
                    type="text"
                    value={values[i]}
                    onChange={(e) => {
                      const next = values.slice();
                      next[i] = e.target.value;
                      setValues(next);
                    }}
                    disabled={!!feedback}
                    placeholder={s.hint}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border:
                        "2px solid " +
                        (isOk
                          ? "var(--green-500)"
                          : isNo
                            ? "var(--coral-500)"
                            : "var(--ink-100)"),
                      fontFamily: "var(--font-mono)",
                      fontSize: 16,
                      fontWeight: 600,
                      background: isOk
                        ? "var(--green-50)"
                        : isNo
                          ? "var(--coral-50)"
                          : "var(--paper-2)",
                    }}
                  />
                  {finalReveal && (
                    <span
                      style={{
                        width: 22,
                        color: isOk ? "var(--green-600)" : "var(--coral-500)",
                      }}
                    >
                      {isOk ? <Check size={20} /> : <X size={20} />}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
