"use client";

/**
 * NumberLineV2 — drag a marker on a number line to the correct value.
 *
 * Adopted from q-math.jsx · NumberLineExerciseV2. Methodist supplies
 * range [min, max], target value, and optional step (default 1 for
 * snapping to integers). Marker turns coral if wrong.
 *
 * Per-task HP + streak; retry preserves marker position so student
 * can nudge it.
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface NumberLineV2Props {
  min: number;
  max: number;
  correct: number;
  /** Snap step (default 1). For fractional answers, pass 0.5 / 0.25 etc. */
  step?: number;
  /** Absolute tolerance. Defaults to step/2. */
  tolerance?: number;
  prompt?: string;
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
    placed: number;
  }) => void;
}

export function NumberLineV2({
  min,
  max,
  correct,
  step = 1,
  tolerance,
  prompt,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: NumberLineV2Props) {
  const initialPos = Math.round((min + max) / 2 / step) * step;
  const [pos, setPos] = useState(initialPos);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const { fire, layer } = useConfetti();

  const tol = tolerance ?? step / 2;

  const setFromX = (clientX: number) => {
    if (feedback || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + t * (max - min);
    const snapped = Math.round(raw / step) * step;
    // Avoid floating point drift display (e.g. 1.0000001).
    const decimals = step < 1 ? 4 : 0;
    setPos(parseFloat(snapped.toFixed(decimals)));
  };

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1 && e.type !== "click") return;
    setFromX(e.clientX);
  };

  const handleCheck = () => {
    if (Math.abs(pos - correct) <= tol) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "Marker placed exactly." : "Got it!",
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
        msg: `You placed it at ${pos}.`,
        correct: String(correct),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `You placed it at ${pos} — ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
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
      placed: pos,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const posFrac = (pos - min) / (max - min);
  const tickCount = Math.floor((max - min) / step) + 1;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? prompt ?? "Place the marker"}
        feedback={feedback}
        canCheck={true}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            maxWidth: 540,
            margin: "60px auto 0",
            padding: "0 28px",
          }}
        >
          <div
            ref={trackRef}
            onMouseDown={onMove}
            onMouseMove={onMove}
            onClick={onMove}
            style={{
              position: "relative",
              height: 96,
              cursor: feedback ? "default" : "pointer",
              userSelect: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 56,
                left: 0,
                right: 0,
                height: 4,
                background: "var(--ink-200)",
                borderRadius: 999,
              }}
            />
            {Array.from({ length: tickCount }, (_, i) => {
              const n = min + i * step;
              const t = (n - min) / (max - min);
              const isZero = n === 0;
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    top: 50,
                    left: `${t * 100}%`,
                    width: 2,
                    height: 16,
                    marginLeft: -1,
                    background: isZero ? "var(--ink-700)" : "var(--ink-300)",
                    borderRadius: 1,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 22,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: isZero ? "var(--ink-900)" : "var(--ink-500)",
                    }}
                  >
                    {parseFloat(n.toFixed(4))}
                  </span>
                </div>
              );
            })}
            <div
              style={{
                position: "absolute",
                top: 18,
                left: `${posFrac * 100}%`,
                marginLeft: -22,
                transition: feedback ? "none" : "left 120ms",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 999,
                  background: feedback
                    ? feedback.kind === "ok"
                      ? "var(--green-600)"
                      : "var(--coral-500)"
                    : "var(--green-600)",
                  boxShadow: `0 4px 0 0 ${
                    feedback
                      ? feedback.kind === "ok"
                        ? "var(--green-700)"
                        : "var(--coral-700)"
                      : "var(--green-700)"
                  }`,
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                }}
              >
                {pos}
              </div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
