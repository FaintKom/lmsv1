"use client";

/**
 * OrderingV2 — drag items into the correct sequence.
 *
 * Adopted from q-basics.jsx · OrderingExerciseV2. HTML5 drag-and-drop —
 * @dnd-kit is heavier than we need for a single list. Per-task HP +
 * streak; retry keeps the current order so the student can iterate.
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import type { V2GradeFn, V2GradeResult } from "@/lib/exercises/v2-adapter";

export interface OrderingV2Props {
  /** The draggable items. In preview these are the CORRECT order (grading
   * compares position); live, this is the server's shuffled `word_bank` and
   * grading is deferred to `onGrade` (which compares the chosen value
   * sequence to the stripped `correct_order`). Displayed shuffled either way. */
  items: string[];
  eyebrow?: string;
  title?: string;
  hint?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  /** When provided, grading is deferred to the server (integrity model B);
   * the chosen value sequence is sent as `{ order }`. */
  onGrade?: V2GradeFn;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function OrderingV2({
  items,
  eyebrow,
  title,
  hint,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onGrade,
  onQuit,
  onFinish,
}: OrderingV2Props) {
  const indices = items.map((_, i) => i);
  const [order, setOrder] = useState<number[]>(() => shuffle(indices));
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [checking, setChecking] = useState(false);
  const dragIdx = useRef<number | null>(null);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const onDragStart = (i: number) => (e: React.DragEvent<HTMLDivElement>) => {
    dragIdx.current = i;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (i: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = order.slice();
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setOrder(next);
  };
  const onDragEnd = () => {
    dragIdx.current = null;
  };

  const applyResult = (res: V2GradeResult) => {
    if (res.correct) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.ordering.perfectOrder") : t("exercise.gotIt"),
        explain: res.explain ?? hint,
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = res.attemptsRemaining ?? attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (res.maxReached || remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.outOfAttempts"),
        correct: res.correctAnswer ?? items.join(" → "),
        explain: res.explain ?? hint,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining)),
        explain: res.explain ?? hint,
      });
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    // The chosen value sequence — what the server grades against
    // `correct_order`. In preview, `items` is itself the correct order, so
    // position equality (v === i) is the local check.
    const values = order.map((idx) => items[idx]);

    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ order: values });
        applyResult(res);
      } catch {
        setFeedback({ kind: "no", msg: t("exercise.submitFailed") });
      } finally {
        setChecking(false);
      }
      return;
    }

    // Preview / local grading.
    applyResult({
      correct: order.every((v, i) => v === i),
      correctAnswer: items.join(" → "),
      attemptsRemaining: attemptsLeft - 1,
    });
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
        title={title ?? t("exercise.ordering.title")}
        feedback={feedback}
        canCheck={!feedback}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxWidth: 480,
            margin: "0 auto",
          }}
        >
          {order.map((idx, i) => (
            <div
              key={idx}
              draggable={!feedback}
              onDragStart={onDragStart(i)}
              onDragOver={onDragOver(i)}
              onDragEnd={onDragEnd}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 14,
                fontWeight: 600,
                cursor: feedback ? "default" : "grab",
                fontSize: 15,
                boxShadow: "0 2px 0 0 var(--ink-100)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--ink-50)",
                  color: "var(--ink-500)",
                  borderRadius: 6,
                  padding: "3px 8px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1 }}>{items[idx]}</span>
              <span style={{ color: "var(--ink-300)" }}>⋮⋮</span>
            </div>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}
