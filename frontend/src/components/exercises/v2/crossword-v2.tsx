"use client";

/**
 * CrosswordV2 — single-letter cell grid with across/down clues.
 *
 * Adopted from q-language.jsx · CrosswordExerciseV2. Methodist supplies
 * grid dimensions + a cell map keyed by "row,col" → {ch, num?} where
 * `num` is the clue number rendered in the corner. Empty positions
 * (no entry in the map) render as a blocked square.
 *
 * Per-task HP + streak. Per-cell green/coral highlights mistakes on
 * Check; retry keeps typed letters so the student fixes the gaps.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface CrosswordCell {
  /** Single uppercase letter expected in this cell. */
  ch: string;
  /** Clue number rendered in the top-left corner (1, 2, …). */
  num?: number;
}

export interface CrosswordClue {
  n: number;
  text: string;
}

export interface CrosswordV2Props {
  width: number;
  height: number;
  /** Map of "row,col" (0-based) → cell. Missing keys = blocked square. */
  cells: Record<string, CrosswordCell>;
  clues: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
  /** Optional answer string shown on heart-exhaust, e.g. "1A: CODE · 2D: DATA". */
  answerSummary?: string;
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

export function CrosswordV2({
  width,
  height,
  cells,
  clues,
  answerSummary,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: CrosswordV2Props) {
  const { t } = useTranslation();
  const cellKeys = Object.keys(cells);
  const [vals, setVals] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const allFilled = cellKeys.every((k) => (vals[k] || "").length > 0);

  const handleCheck = () => {
    const isOk = cellKeys.every(
      (k) => (vals[k] || "").toUpperCase() === cells[k].ch.toUpperCase()
    );
    if (isOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.crossword.solved") : t("exercise.gotIt"),
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
        msg: t("exercise.crossword.someLettersOff"),
        correct: answerSummary,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.crossword.someLettersOffAttempt") : t("exercise.crossword.someLettersOffAttempts")).replace("{n}", String(remaining)),
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
        title={title ?? t("exercise.crossword.title")}
        feedback={feedback}
        canCheck={allFilled}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "flex",
            gap: 24,
            maxWidth: 560,
            margin: "0 auto",
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              background: "var(--paper-2)",
              borderRadius: 14,
              border: "2px solid var(--ink-100)",
              padding: 8,
            }}
          >
            {Array.from({ length: height }, (_, r) => (
              <div key={r} style={{ display: "flex" }}>
                {Array.from({ length: width }, (_, c) => {
                  const key = `${r},${c}`;
                  const cell = cells[key];
                  const v = vals[key] || "";
                  const isOk =
                    !!feedback && !!cell && v.toUpperCase() === cell.ch.toUpperCase();
                  const isNo =
                    !!feedback && !!cell && v.toUpperCase() !== cell.ch.toUpperCase();
                  if (!cell) {
                    return (
                      <div
                        key={c}
                        style={{
                          width: 44,
                          height: 44,
                          background: "var(--ink-50)",
                          margin: 2,
                          borderRadius: 6,
                        }}
                      />
                    );
                  }
                  return (
                    <div
                      key={c}
                      style={{
                        position: "relative",
                        width: 44,
                        height: 44,
                        margin: 2,
                      }}
                    >
                      {cell.num !== undefined && (
                        <span
                          style={{
                            position: "absolute",
                            top: 2,
                            left: 4,
                            fontFamily: "var(--font-mono)",
                            fontSize: 9,
                            color: "var(--ink-500)",
                            fontWeight: 700,
                            pointerEvents: "none",
                            zIndex: 1,
                          }}
                        >
                          {cell.num}
                        </span>
                      )}
                      <input
                        value={v}
                        disabled={!!feedback}
                        maxLength={1}
                        onChange={(e) => {
                          const ch = e.target.value.toUpperCase().slice(-1);
                          setVals((vv) => ({ ...vv, [key]: ch }));
                        }}
                        style={{
                          width: 44,
                          height: 44,
                          textAlign: "center",
                          textTransform: "uppercase",
                          background: isOk
                            ? "var(--green-50)"
                            : isNo
                              ? "var(--coral-50)"
                              : "var(--paper)",
                          border:
                            "2px solid " +
                            (isOk
                              ? "var(--green-500)"
                              : isNo
                                ? "var(--coral-500)"
                                : "var(--ink-200)"),
                          borderRadius: 6,
                          fontFamily: "var(--font-sans)",
                          fontWeight: 800,
                          fontSize: 18,
                          color: "var(--ink-900)",
                          padding: 0,
                          outline: "none",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}>
            <div className="gp-eyebrow" style={{ marginBottom: 10 }}>
              {t("exercise.clues")}
            </div>
            {clues.across.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  {t("exercise.across")}
                </div>
                {clues.across.map((c) => (
                  <div key={`a-${c.n}`}>
                    <b style={{ fontFamily: "var(--font-mono)" }}>{c.n}.</b>{" "}
                    {c.text}
                  </div>
                ))}
              </div>
            )}
            {clues.down.length > 0 && (
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--ink-500)",
                    fontSize: 12,
                    marginBottom: 4,
                  }}
                >
                  {t("exercise.down")}
                </div>
                {clues.down.map((c) => (
                  <div key={`d-${c.n}`}>
                    <b style={{ fontFamily: "var(--font-mono)" }}>{c.n}.</b>{" "}
                    {c.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
