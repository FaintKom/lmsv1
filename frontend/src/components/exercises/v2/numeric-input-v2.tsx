"use client";

/**
 * NumericInputV2 — single numeric answer + on-screen number pad.
 *
 * Adopted from q-math.jsx · NumericInputExerciseV2. Methodist supplies
 * the problem statement, the correct numeric answer, and an optional
 * worked example shown in a collapsible sun-tinted panel.
 *
 * Per-task HP + streak; retry preserves typed value so student can
 * fix a typo without re-entering the digits.
 */

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";

export interface NumericInputExample {
  q: string;
  work: string;
  a: number;
}

export interface NumericInputV2Props {
  problem: string;
  correct: number;
  /** Absolute tolerance for matching. Default 0.001. */
  tolerance?: number;
  example?: NumericInputExample;
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

const PAD_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];

export function NumericInputV2({
  problem,
  correct,
  tolerance = 0.001,
  example,
  explain,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: NumericInputV2Props) {
  const [val, setVal] = useState("");
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [showExample, setShowExample] = useState(false);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const handleCheck = () => {
    const n = parseFloat(val);
    if (Number.isFinite(n) && Math.abs(n - correct) <= tolerance) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.numericInput.right") : t("exercise.gotIt"),
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
        correct: String(correct),
        explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.notQuiteAttemptLeft") : t("exercise.notQuiteAttemptsLeft")).replace("{n}", String(remaining)),
        explain,
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

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.numericInput.title")}
        feedback={feedback}
        canCheck={val.length > 0}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 380, margin: "0 auto", textAlign: "center" }}>
          {example && (
            <div
              style={{
                background: "var(--sun-50)",
                border: "2px solid var(--sun-300)",
                borderRadius: 12,
                padding: showExample ? "12px 16px" : "8px 14px",
                marginBottom: 14,
                textAlign: "left",
                transition: "all 200ms",
              }}
            >
              <button
                type="button"
                onClick={() => setShowExample(!showExample)}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  color: "var(--sun-700)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <Lightbulb size={14} /> {t("exercise.example")}
                </span>
                <span style={{ color: "var(--ink-400)" }}>
                  {showExample ? "−" : "+"}
                </span>
              </button>
              {showExample && (
                <div
                  style={{
                    marginTop: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--ink-700)",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ color: "var(--ink-500)" }}>{example.q}</div>
                  <div style={{ marginTop: 2 }}>
                    {example.work} ={" "}
                    <b style={{ color: "var(--green-700)" }}>{example.a}</b>
                  </div>
                </div>
              )}
            </div>
          )}

          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 26,
              fontWeight: 700,
              padding: "20px 16px",
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              marginBottom: 14,
              color: "var(--ink-900)",
            }}
          >
            <MaybeMath text={problem} />
          </div>
          <input
            type="text"
            inputMode="decimal"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            disabled={!!feedback}
            placeholder="?"
            className={
              "gp-input " +
              (feedback ? (feedback.kind === "ok" ? "correct" : "wrong") : "")
            }
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 24,
              fontWeight: 700,
              padding: "10px 16px",
            }}
          />
          {/* number pad */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 6,
              marginTop: 12,
              maxWidth: 220,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {PAD_KEYS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (feedback) return;
                  if (k === "⌫") setVal(val.slice(0, -1));
                  else setVal(val + k);
                }}
                disabled={!!feedback}
                style={{
                  padding: "8px 0",
                  borderRadius: 10,
                  background: "var(--paper-2)",
                  border: "none",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 17,
                  color: "var(--ink-900)",
                  cursor: feedback ? "default" : "pointer",
                  boxShadow: "0 2px 0 0 var(--ink-100)",
                }}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
