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
  // AP-01: placements are tracked by BANK INDEX, not by value — duplicate
  // bank numbers must stay independently usable (value-keyed used-state
  // greyed them out together and made such puzzles unsolvable).
  const [filled, setFilled] = useState<(number | null)[]>(() =>
    equations.map(() => null)
  );
  // AP-03: rows graded correct on a failed Check lock green across retries.
  const [lockedOk, setLockedOk] = useState<boolean[]>(() =>
    equations.map(() => false)
  );
  const [active, setActive] = useState(0);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const pick = (bankIdx: number) => {
    if (feedback || filled.includes(bankIdx) || lockedOk[active]) return;
    const nf = filled.slice();
    nf[active] = bankIdx;
    setFilled(nf);
    const nextEmpty = nf.findIndex((v, i) => v === null && !lockedOk[i]);
    if (nextEmpty >= 0) setActive(nextEmpty);
  };

  // AP-02: tapping a filled slot clears it and returns the number to the bank.
  const clearRow = (i: number) => {
    if (feedback || lockedOk[i] || filled[i] === null) return;
    const nf = filled.slice();
    nf[i] = null;
    setFilled(nf);
    setActive(i);
  };

  const valueAt = (row: number): number | null =>
    filled[row] === null ? null : bank[filled[row]];

  const handleCheck = () => {
    const allOk = equations.every((e, i) => valueAt(i) === e.answer);
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
      const okCount = equations.filter((e, i) => valueAt(i) === e.answer).length;
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.arithmeticPuzzle.someAreOffAttempt") : t("exercise.arithmeticPuzzle.someAreOffAttempts")).replace("{n}", String(remaining)),
        explain:
          okCount > 0
            ? t("exercise.arithmeticPuzzle.lockedExplain")
                .replace("{ok}", String(okCount))
                .replace("{total}", String(equations.length))
            : undefined,
      });
    }
  };

  // AP-03: lock the correct rows green, bounce wrong values back to the bank.
  const handleRetry = () => {
    const flags = equations.map((e, i) => valueAt(i) === e.answer);
    setLockedOk(flags);
    setFilled((f) => f.map((v, i) => (flags[i] ? v : null)));
    setFeedback(null);
    const firstBad = flags.findIndex((x) => !x);
    if (firstBad >= 0) setActive(firstBad);
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
        checkHint={t("exercise.arithmeticPuzzle.checkHint")}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {equations.map((e, i) => {
              const isLocked = lockedOk[i];
              return (
                <div
                  key={i}
                  onClick={() => !feedback && !isLocked && setActive(i)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "12px 16px",
                    background: isLocked ? "var(--green-50)" : "var(--paper-2)",
                    border: `2px solid ${
                      isLocked
                        ? "var(--green-300)"
                        : active === i && !feedback
                          ? "var(--green-500)"
                          : "var(--ink-100)"
                    }`,
                    borderRadius: 14,
                    cursor: feedback || isLocked ? "default" : "pointer",
                    fontFamily: "var(--font-mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--ink-900)",
                    justifyContent: "center",
                    transition: "border-color 150ms, background 200ms",
                  }}
                >
                  {e.cells.map((c, j) => {
                    if (c !== "_")
                      return (
                        <span key={j} style={{ padding: "0 6px" }}>
                          {c}
                        </span>
                      );
                    const v = valueAt(i);
                    const isCorrect = (!!feedback && v === e.answer) || isLocked;
                    const isWrong = !!feedback && v !== e.answer;
                    return (
                      // AP-02: filled slot is a button — tap to clear it back
                      // to the bank.
                      <button
                        key={j}
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          clearRow(i);
                        }}
                        disabled={!!feedback || isLocked || v === null}
                        aria-label={
                          v === null
                            ? t("exercise.arithmeticPuzzle.emptyBlank")
                            : t("exercise.arithmeticPuzzle.filledTapToRemove").replace("{v}", String(v))
                        }
                        style={{
                          display: "inline-grid",
                          placeItems: "center",
                          width: 48,
                          height: 40,
                          borderRadius: 8,
                          fontFamily: "inherit",
                          fontSize: "inherit",
                          fontWeight: 800,
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
                          cursor:
                            v !== null && !feedback && !isLocked
                              ? "pointer"
                              : "default",
                          animation: isWrong
                            ? "fb-shake calc(0.4s * var(--mdur)) ease both"
                            : undefined,
                        }}
                      >
                        {v ?? "?"}
                      </button>
                    );
                  })}
                  {isLocked && (
                    <span
                      aria-hidden="true"
                      style={{ color: "var(--green-600)", marginLeft: 4 }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
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
            {bank.map((n, idx) => {
              const used = filled.includes(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => pick(idx)}
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
