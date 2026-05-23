"use client";

/**
 * VisualFractionsV2 — tap pie + bar segments to shade a target fraction.
 *
 * Adopted from q-math.jsx · VisualFractionsExerciseV2. Methodist
 * supplies numerator/denominator; student taps SVG pie slices and bar
 * segments to shade exactly `numerator` out of `denominator` parts.
 * Pie and bar share a single `shaded` set, so tapping either updates
 * both views.
 *
 * Per-task HP + streak; retry preserves the shaded set.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface VisualFractionsV2Props {
  numerator: number;
  denominator: number;
  eyebrow?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
    shaded: number;
  }) => void;
}

export function VisualFractionsV2({
  numerator,
  denominator,
  eyebrow,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: VisualFractionsV2Props) {
  const [shaded, setShaded] = useState<Set<number>>(new Set());
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const toggle = (i: number) => {
    if (feedback) return;
    const ns = new Set(shaded);
    if (ns.has(i)) ns.delete(i);
    else ns.add(i);
    setShaded(ns);
  };

  const handleCheck = () => {
    if (shaded.size === numerator) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? `That's ${numerator}/${denominator}.`
            : "Got it!",
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
        msg: `You shaded ${shaded.size}/${denominator}.`,
        correct: `${numerator}/${denominator}`,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `You shaded ${shaded.size}/${denominator} — ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
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
      shaded: shaded.size,
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
        title={
          <>
            Tap to shade{" "}
            <span
              className="gp-mark"
              style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}
            >
              {numerator}/{denominator}
            </span>
          </>
        }
        feedback={feedback}
        canCheck={shaded.size > 0}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            maxWidth: 460,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
          }}
        >
          {/* pie */}
          <svg
            viewBox="-100 -100 200 200"
            style={{ width: 200, height: 200 }}
          >
            <circle
              cx="0"
              cy="0"
              r="85"
              fill="var(--paper-2)"
              stroke="var(--ink-200)"
              strokeWidth="2"
            />
            {Array.from({ length: denominator }, (_, i) => {
              const a0 = (i / denominator) * Math.PI * 2 - Math.PI / 2;
              const a1 = ((i + 1) / denominator) * Math.PI * 2 - Math.PI / 2;
              const isShaded = shaded.has(i);
              const x0 = Math.cos(a0) * 85;
              const y0 = Math.sin(a0) * 85;
              const x1 = Math.cos(a1) * 85;
              const y1 = Math.sin(a1) * 85;
              const large = a1 - a0 > Math.PI ? 1 : 0;
              return (
                <path
                  key={i}
                  d={`M 0 0 L ${x0} ${y0} A 85 85 0 ${large} 1 ${x1} ${y1} Z`}
                  fill={isShaded ? "var(--green-500)" : "transparent"}
                  stroke="var(--ink-300)"
                  strokeWidth="1.5"
                  onClick={() => toggle(i)}
                  style={{
                    cursor: feedback ? "default" : "pointer",
                    transition: "fill 150ms",
                  }}
                />
              );
            })}
          </svg>
          {/* bar */}
          <div style={{ display: "flex", gap: 4, width: "100%", maxWidth: 400 }}>
            {Array.from({ length: denominator }, (_, i) => (
              <div
                key={i}
                onClick={() => toggle(i)}
                style={{
                  flex: 1,
                  height: 48,
                  background: shaded.has(i)
                    ? "var(--green-500)"
                    : "var(--paper-2)",
                  border: `2px solid ${shaded.has(i) ? "var(--green-600)" : "var(--ink-200)"}`,
                  borderRadius: 8,
                  cursor: feedback ? "default" : "pointer",
                  transition: "all 150ms",
                }}
              />
            ))}
          </div>
          <div
            style={{
              display: "inline-flex",
              flexDirection: "column",
              alignItems: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 28,
              fontWeight: 800,
              color: "var(--ink-900)",
              lineHeight: 1,
            }}
          >
            <span
              style={{
                color:
                  shaded.size === numerator
                    ? "var(--green-700)"
                    : "var(--ink-900)",
              }}
            >
              {shaded.size}
            </span>
            <span
              style={{
                display: "block",
                width: 56,
                borderBottom: "3px solid var(--ink-900)",
                margin: "8px 0",
              }}
            />
            <span>{denominator}</span>
          </div>
          <div
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 13,
              color: "var(--ink-400)",
              marginTop: -8,
            }}
          >
            target ·{" "}
            <b style={{ color: "var(--ink-700)" }}>
              {numerator}/{denominator}
            </b>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
