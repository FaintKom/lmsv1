"use client";

/**
 * CardSortV2 — drag cards into category columns (like CategorizeV2 but
 * with multi-line equation cards and 3 columns).
 *
 * Adopted from q-math-templates.jsx · CardSortExerciseV2. Differs from
 * CategorizeV2 by accepting card-level `text` (so the same card content
 * isn't used as identity) and a stable 3-column grid.
 *
 * Per-task HP + streak; retry preserves placements so student fixes
 * only the wrong columns.
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface SortCategory {
  id: string;
  label: string;
  /** Bucket bg colour. Defaults rotate. */
  color?: string;
  /** Bucket dashed-border colour when hover. */
  border?: string;
  /** Label text colour. */
  text?: string;
}

export interface SortCard {
  id: string;
  text: string;
  /** ID of the correct category. */
  cat: string;
}

export interface CardSortV2Props {
  categories: SortCategory[];
  cards: SortCard[];
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
    wrongCount: number;
  }) => void;
}

const DEFAULTS: Required<Pick<SortCategory, "color" | "border" | "text">>[] = [
  { color: "var(--green-50)", border: "var(--green-300)", text: "var(--green-800)" },
  { color: "var(--sun-50)", border: "var(--sun-400)", text: "var(--sun-700)" },
  { color: "var(--coral-50)", border: "var(--coral-300)", text: "var(--coral-700)" },
  { color: "var(--ink-50)", border: "var(--ink-300)", text: "var(--ink-700)" },
];

export function CardSortV2({
  categories,
  cards,
  eyebrow,
  title = "Sort each card into its column",
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: CardSortV2Props) {
  const palette = categories.map((c, i) => ({
    color: c.color ?? DEFAULTS[i % DEFAULTS.length].color,
    border: c.border ?? DEFAULTS[i % DEFAULTS.length].border,
    text: c.text ?? DEFAULTS[i % DEFAULTS.length].text,
  }));
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [hover, setHover] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const dragRef = useRef<string | null>(null);
  const { fire, layer } = useConfetti();

  const drop = (catId: string) => () => {
    if (!dragRef.current || feedback) return;
    setPlaced({ ...placed, [dragRef.current]: catId });
    dragRef.current = null;
    setHover(null);
  };

  const allPlaced = cards.every((c) => placed[c.id]);

  const handleCheck = () => {
    const wrong = cards.filter((c) => placed[c.id] !== c.cat).length;
    if (wrong === 0) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "All sorted correctly!" : "Got it!",
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
        msg: `${wrong} card${wrong === 1 ? "" : "s"} in the wrong column.`,
        correct: cards
          .map(
            (c) =>
              `${c.text} → ${categories.find((cat) => cat.id === c.cat)?.label ?? c.cat}`
          )
          .join("  ·  "),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `${wrong} in the wrong column — ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
      });
    }
  };

  const handleRetry = () => {
    setFeedback(null);
  };

  const handleContinue = () => {
    const wrongCount = cards.filter((c) => placed[c.id] !== c.cat).length;
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
      wrongCount,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const unsorted = cards.filter((c) => !placed[c.id]);
  const colCount = Math.min(categories.length, 4);

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
        canCheck={allPlaced}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${colCount}, 1fr)`,
              gap: 10,
              marginBottom: 14,
            }}
          >
            {categories.map((c, idx) => {
              const cardsHere = cards.filter((cd) => placed[cd.id] === c.id);
              const pal = palette[idx];
              return (
                <div
                  key={c.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHover(c.id);
                  }}
                  onDragLeave={() => setHover(null)}
                  onDrop={drop(c.id)}
                  style={{
                    minHeight: 150,
                    background: pal.color,
                    border: `2px dashed ${hover === c.id ? pal.border : "var(--ink-200)"}`,
                    borderRadius: 14,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    transition: "border-color 150ms",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: pal.text,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {c.label}
                  </div>
                  {cardsHere.map((cd) => {
                    const wrong = !!feedback && placed[cd.id] !== cd.cat;
                    const ok = !!feedback && placed[cd.id] === cd.cat;
                    return (
                      <span
                        key={cd.id}
                        draggable={!feedback}
                        onDragStart={(e) => {
                          dragRef.current = cd.id;
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        style={{
                          background: ok
                            ? "var(--green-100)"
                            : wrong
                              ? "var(--coral-300)"
                              : "var(--paper-2)",
                          padding: "8px 12px",
                          borderRadius: 8,
                          fontFamily: "var(--font-mono)",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: feedback ? "default" : "grab",
                          boxShadow: "var(--shadow-sm)",
                          border: wrong
                            ? "1.5px solid var(--coral-500)"
                            : "1px solid transparent",
                          color: "var(--ink-900)",
                        }}
                      >
                        {cd.text}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div
            style={{
              background: "var(--paper-2)",
              borderRadius: 14,
              border: "2px solid var(--ink-100)",
              padding: 12,
              minHeight: 70,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unsorted.length === 0 ? (
              <span style={{ color: "var(--ink-400)", fontSize: 13 }}>
                All placed — hit Check.
              </span>
            ) : (
              unsorted.map((cd) => (
                <span
                  key={cd.id}
                  draggable={!feedback}
                  onDragStart={(e) => {
                    dragRef.current = cd.id;
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  style={{
                    background: "var(--ink-50)",
                    padding: "10px 14px",
                    borderRadius: 999,
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: feedback ? "default" : "grab",
                    color: "var(--ink-900)",
                    boxShadow: "0 2px 0 0 var(--ink-200)",
                  }}
                >
                  {cd.text}
                </span>
              ))
            )}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
