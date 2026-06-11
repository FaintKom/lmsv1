"use client";

/**
 * OrderingV2 — drag items into the correct sequence.
 *
 * Upgraded to the feedback-grammar handoff (ex-drag.jsx · ExOrdering):
 * Pointer-Events drag with setPointerCapture — the held row lifts with a
 * slight rotation (`.fb-dragrow.dragging`, amplitude via --mamp),
 * neighbours shift live by ±one slot (`shiftFor`), number badges renumber
 * toward the hovered position, and the dropped row lands with a `.settled`
 * pop. After grading each row is marked `ok`/`no` (`no` shakes) when the
 * correct order is known client-side.
 *
 * Per-task HP + streak; retry keeps the current order so the student can
 * iterate. With `onGrade` (integrity model B) grading is deferred to the
 * server and a failed attempt shows no per-row marks — except on success,
 * where every row is by definition correct and locks `ok`.
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

/** Slot height: `.fb-dragrow` fixed height (56px) + list gap. */
const ROW_GAP = 10;
const SLOT = 56 + ROW_GAP;

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
  const n = items.length;
  const indices = items.map((_, i) => i);
  const [order, setOrder] = useState<number[]>(() => shuffle(indices));
  const [drag, setDrag] = useState<{ pos: number; dy: number } | null>(null);
  const [settledIdx, setSettledIdx] = useState<number | null>(null);
  const [graded, setGraded] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [checking, setChecking] = useState(false);
  const startY = useRef(0);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const locked = !!feedback || graded || checking;

  /** Slot the dragged row would land in right now. */
  const targetPos =
    drag === null ? null : Math.max(0, Math.min(n - 1, drag.pos + Math.round(drag.dy / SLOT)));

  const down = (pos: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setDrag({ pos, dy: 0 });
    setSettledIdx(null);
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag({ ...drag, dy: e.clientY - startY.current });
  };
  const up = () => {
    if (!drag || targetPos === null) return;
    const from = drag.pos;
    const to = targetPos;
    if (from !== to) {
      const next = order.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setOrder(next);
      setSettledIdx(to);
      setTimeout(() => setSettledIdx(null), 350);
    }
    setDrag(null);
  };

  /** Live shift (px) for a non-dragged row while a neighbour is in flight. */
  const shiftFor = (pos: number): number => {
    if (!drag || targetPos === null || pos === drag.pos) return 0;
    if (drag.pos < targetPos && pos > drag.pos && pos <= targetPos) return -SLOT;
    if (drag.pos > targetPos && pos < drag.pos && pos >= targetPos) return SLOT;
    return 0;
  };

  /** Per-row mark after grading. Only when the correct order is known
   * client-side (preview: `items` IS the correct order) — or on a graded
   * success, where every row is correct by definition. */
  const rowState = (itemIdx: number, pos: number): "" | "ok" | "no" => {
    if (!graded || !feedback) return "";
    if (feedback.kind === "ok") return "ok";
    if (onGrade) return ""; // server-graded fail: per-row truth unknown
    return itemIdx === pos ? "ok" : "no";
  };

  const applyResult = (res: V2GradeResult) => {
    setGraded(true);
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
        explain: res.explain ?? hint ?? t("exercise.ordering.orderKept"),
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

  /** Retry keeps the current order so the student fixes, not restarts. */
  const handleRetry = () => {
    setGraded(false);
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
        canCheck={!feedback && !checking}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: ROW_GAP,
            maxWidth: 540,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {order.map((itemIdx, pos) => {
            const isDrag = drag !== null && drag.pos === pos;
            const shift = shiftFor(pos);
            const state = rowState(itemIdx, pos);
            const displayNum =
              isDrag && targetPos !== null
                ? targetPos + 1
                : pos + 1 + (shift < 0 ? -1 : shift > 0 ? 1 : 0);
            return (
              <div
                key={itemIdx}
                className={
                  "fb-dragrow" +
                  (isDrag ? " dragging" : "") +
                  (settledIdx === pos ? " settled" : "") +
                  (state ? " " + state : "")
                }
                style={{
                  transform: isDrag
                    ? `translateY(${drag.dy}px) rotate(calc(1.4deg * var(--mamp))) scale(1.02)`
                    : `translateY(${shift}px)`,
                  cursor: locked ? "default" : undefined,
                }}
                onPointerDown={down(pos)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
              >
                <span className="num">{displayNum}</span>
                <span style={{ flex: 1 }}>{items[itemIdx]}</span>
                <span className="grip">⋮⋮</span>
              </div>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}
