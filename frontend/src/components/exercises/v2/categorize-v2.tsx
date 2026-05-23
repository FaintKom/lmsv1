"use client";

/**
 * CategorizeV2 — drag items into labeled buckets.
 *
 * Adopted from q-basics.jsx · CategorizeExerciseV2. Reads existing
 * `categorize` config `{ categories: [{ name, items: [...] }] }` — the
 * `items` array under each category is the canonical membership, items
 * are flattened into the unplaced bank for display.
 */

import { useMemo, useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface CategorizeCategory {
  name: string;
  items: string[];
  /** Optional bucket bg + dashed border colours. Defaults rotate by index. */
  color?: string;
  border?: string;
}

export interface CategorizeV2Props {
  categories: CategorizeCategory[];
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
}

const DEFAULT_PALETTE: { color: string; border: string }[] = [
  { color: "var(--green-50)", border: "var(--green-300)" },
  { color: "var(--sun-50)", border: "var(--sun-400)" },
  { color: "var(--coral-50)", border: "var(--coral-300)" },
  { color: "var(--ink-50)", border: "var(--ink-300)" },
];

export function CategorizeV2({
  categories,
  eyebrow,
  title = "Drag each item into its bucket",
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: CategorizeV2Props) {
  const palette = categories.map(
    (c, i) => ({
      color: c.color || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length].color,
      border: c.border || DEFAULT_PALETTE[i % DEFAULT_PALETTE.length].border,
    })
  );

  const all = useMemo(() => categories.flatMap((c) => c.items), [categories]);

  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [hover, setHover] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const dragItem = useRef<string | null>(null);
  const { fire, layer } = useConfetti();

  const handleDrop = (catName: string) => () => {
    if (!dragItem.current || feedback) return;
    setPlaced((p) => ({ ...p, [dragItem.current!]: catName }));
    dragItem.current = null;
    setHover(null);
  };

  const handleCheck = () => {
    const isCorrect = all.every((item) => {
      const correctCat = categories.find((c) => c.items.includes(item))!.name;
      return placed[item] === correctCat;
    });
    if (isCorrect) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "Spot on." : "Got it!",
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
        correct: categories.map((c) => `${c.items.join(", ")} → ${c.name}`).join(" · "),
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
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const unplaced = all.filter((it) => !placed[it]);
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
        canCheck={Object.keys(placed).length === all.length}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 16,
            justifyContent: "center",
            maxWidth: 520,
            margin: "0 auto 16px",
          }}
        >
          {categories.map((c, i) => {
            const items = all.filter((it) => placed[it] === c.name);
            return (
              <div
                key={c.name}
                onDragOver={(e) => {
                  e.preventDefault();
                  setHover(c.name);
                }}
                onDragLeave={() => setHover(null)}
                onDrop={handleDrop(c.name)}
                style={{
                  flex: 1,
                  minHeight: 140,
                  background: palette[i].color,
                  border: `2px dashed ${
                    hover === c.name ? palette[i].border : "var(--ink-200)"
                  }`,
                  borderRadius: 18,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  transition: "border-color 150ms",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ink-500)",
                    fontWeight: 600,
                  }}
                >
                  {c.name}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {items.map((it) => (
                    <span
                      key={it}
                      draggable={!feedback}
                      onDragStart={(e) => {
                        dragItem.current = it;
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      style={{
                        background: "var(--paper-2)",
                        padding: "8px 12px",
                        borderRadius: 999,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 500,
                        fontSize: 14,
                        cursor: feedback ? "default" : "grab",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >
                      {it}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
            padding: 12,
            background: "var(--paper-2)",
            borderRadius: 14,
            border: "2px solid var(--ink-100)",
            minHeight: 60,
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          {unplaced.length === 0 ? (
            <span style={{ color: "var(--ink-400)", fontSize: 13 }}>
              All placed — hit Check.
            </span>
          ) : (
            unplaced.map((it) => (
              <span
                key={it}
                draggable={!feedback}
                onDragStart={(e) => {
                  dragItem.current = it;
                  e.dataTransfer.effectAllowed = "move";
                }}
                style={{
                  background: "var(--ink-50)",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: feedback ? "default" : "grab",
                  boxShadow: "0 2px 0 0 var(--ink-200)",
                }}
              >
                {it}
              </span>
            ))
          )}
        </div>
      </LessonShell>
    </div>
  );
}
