"use client";

/**
 * ArithmeticPuzzleV2 — fill blank slots in equations from a number bank.
 *
 * Adopted from q-math-templates.jsx · ArithmeticPuzzleExerciseV2.
 * Methodist supplies a list of equations (each rendered cell-by-cell,
 * with `"_"` marking the blank) and a shared number bank. Tap a row
 * to make it active, then tap a bank number to fill the blank.
 * Auto-advances to the next empty row.
 *
 * Per-task HP + streak; retry preserves filled values so student fixes
 * only the wrong rows.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface ArithmeticEquation {
  /** Token list; the literal "_" marks the blank slot. */
  cells: string[];
  answer: number;
}

export interface ArithmeticPuzzleV2Props {
  equations: ArithmeticEquation[];
  bank: number[];
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

export function ArithmeticPuzzleV2({
  equations,
  bank,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: ArithmeticPuzzleV2Props) {
  const { t } = useTranslation();
  const [filled, setFilled] = useState<(number | null)[]>(() =>
    equations.map(() => null)
  );
  const [active, setActive] = useState(0);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const pick = (n: number) => {
    if (feedback) return;
    const nf = filled.slice();
    nf[active] = n;
    setFilled(nf);
    const nextEmpty = nf.findIndex((v) => v === null);
    if (nextEmpty >= 0) setActive(nextEmpty);
  };

  const handleCheck = () => {
    const allOk = equations.every((e, i) => filled[i] === e.answer);
    if (allOk) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? t("exercise.arithmeticPuzzle.allCorrect").replace("{n}", String(equations.length))
            : t("exercise.gotIt"),
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
        msg: t("exercise.arithmeticPuzzle.someAreOff"),
        correct: equations.map((e) => e.answer).join(" · "),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.arithmeticPuzzle.someAreOffAttempt") : t("exercise.arithmeticPuzzle.someAreOffAttempts")).replace("{n}", String(remaining)),
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
        title={title ?? t("exercise.arithmeticPuzzle.title")}
        feedback={feedback}
        canCheck={filled.every((v) => v !== null)}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {equations.map((e, i) => (
              <div
                key={i}
                onClick={() => !feedback && setActive(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "12px 16px",
                  background: "var(--paper-2)",
                  border: `2px solid ${active === i && !feedback ? "var(--green-500)" : "var(--ink-100)"}`,
                  borderRadius: 14,
                  cursor: feedback ? "default" : "pointer",
                  fontFamily: "var(--font-mono)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink-900)",
                  justifyContent: "center",
                }}
              >
                {e.cells.map((c, j) => {
                  if (c !== "_")
                    return (
                      <span key={j} style={{ padding: "0 6px" }}>
                        {c}
                      </span>
                    );
                  const v = filled[i];
                  const isCorrect = !!feedback && v === e.answer;
                  const isWrong = !!feedback && v !== e.answer;
                  return (
                    <span
                      key={j}
                      style={{
                        display: "inline-grid",
                        placeItems: "center",
                        width: 48,
                        height: 38,
                        borderRadius: 8,
                        background: isCorrect
                          ? "var(--green-50)"
                          : isWrong
                            ? "var(--coral-50)"
                            : v == null
                              ? "var(--ink-50)"
                              : "var(--green-50)",
                        border: `2px solid ${
                          isCorrect
                            ? "var(--green-500)"
                            : isWrong
                              ? "var(--coral-500)"
                              : v == null
                                ? "var(--ink-200)"
                                : "var(--green-500)"
                        }`,
                        color: isWrong
                          ? "var(--coral-700)"
                          : v == null
                            ? "var(--ink-300)"
                            : "var(--green-800)",
                      }}
                    >
                      {v ?? "?"}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
          <div
            className="gp-eyebrow"
            style={{ marginTop: 18, marginBottom: 8, textAlign: "center" }}
          >
            {t("exercise.numberBankTapToPlace")}
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
            }}
          >
            {bank.map((n) => {
              const used = filled.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => pick(n)}
                  disabled={used || !!feedback}
                  className={"gp-tile " + (used ? "locked" : "")}
                  style={{
                    width: 56,
                    height: 56,
                    fontFamily: "var(--font-mono)",
                    fontSize: 22,
                    fontWeight: 800,
                    opacity: used ? 0.3 : 1,
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
