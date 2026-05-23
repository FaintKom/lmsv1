"use client";

/**
 * FunctionGraphV2 — match a target y=mx+b line with sliders.
 *
 * Adopted from q-math-templates.jsx · FunctionGraphExerciseV2.
 * Methodist supplies target {m, b}; student adjusts slope + intercept
 * sliders until the green solid line overlaps the coral dashed target.
 *
 * Per-task HP + streak; retry resets sliders to 0.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { GridAxes } from "@/components/exercises/v2/_grid-axes";

export interface FunctionGraphV2Props {
  target: { m: number; b: number };
  range?: number;
  /** Slider step for m. Default 0.5. */
  mStep?: number;
  /** Slider step for b. Default 1. */
  bStep?: number;
  /** Absolute match tolerance for both. Default 0.1. */
  tolerance?: number;
  eyebrow?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

interface SliderProps {
  label: string;
  v: number;
  setV: (n: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}

function SliderCtrl({ label, v, setV, min, max, step, disabled }: SliderProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="gp-eyebrow">{label}</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            color: "var(--green-700)",
            fontSize: 13,
          }}
        >
          {v}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        disabled={disabled}
        onChange={(e) => setV(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--green-600)" }}
      />
    </div>
  );
}

const SIZE = 380;
const PAD = 36;

export function FunctionGraphV2({
  target,
  range = 6,
  mStep = 0.5,
  bStep = 1,
  tolerance = 0.1,
  eyebrow,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: FunctionGraphV2Props) {
  const scale = (SIZE - PAD * 2) / (range * 2);
  const toX = (v: number) => PAD + (v + range) * scale;
  const toY = (v: number) => PAD + (range - v) * scale;

  const [m, setM] = useState(0);
  const [b, setB] = useState(0);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const linePath = (mm: number, bb: number) =>
    `M ${toX(-range)} ${toY(mm * -range + bb)} L ${toX(range)} ${toY(mm * range + bb)}`;

  const handleCheck = () => {
    if (
      Math.abs(m - target.m) <= tolerance &&
      Math.abs(b - target.b) <= tolerance
    ) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "Lines match!" : "Got it!",
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
        msg: "Lines don't match yet.",
        correct: `y = ${target.m}x ${target.b >= 0 ? `+ ${target.b}` : `− ${Math.abs(target.b)}`}`,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `Lines don't match yet — ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
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
        title={
          <>
            Match the line ·{" "}
            <span
              className="gp-mark"
              style={{ fontFamily: "var(--font-mono)", fontSize: 18 }}
            >
              y = {target.m}x {target.b >= 0 ? `+ ${target.b}` : `− ${Math.abs(target.b)}`}
            </span>
          </>
        }
        feedback={feedback}
        canCheck={true}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 200px",
            gap: 20,
            justifyContent: "center",
          }}
        >
          <svg
            width={SIZE}
            height={SIZE}
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
            }}
          >
            <GridAxes range={range} size={SIZE} pad={PAD} />
            <path
              d={linePath(target.m, target.b)}
              stroke="var(--coral-500)"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
              opacity="0.6"
            />
            <path
              d={linePath(m, b)}
              stroke="var(--green-600)"
              strokeWidth="3"
              fill="none"
            />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SliderCtrl
              label="slope · m"
              v={m}
              setV={setM}
              min={-5}
              max={5}
              step={mStep}
              disabled={!!feedback}
            />
            <SliderCtrl
              label="intercept · b"
              v={b}
              setV={setB}
              min={-5}
              max={5}
              step={bStep}
              disabled={!!feedback}
            />
            <div
              style={{
                padding: 12,
                background: "var(--ink-50)",
                borderRadius: 10,
                fontFamily: "var(--font-mono)",
                textAlign: "center",
                fontSize: 16,
                fontWeight: 700,
                color: "var(--ink-900)",
              }}
            >
              y = {m}x {b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`}
            </div>
            <div
              style={{
                padding: 10,
                background: "var(--coral-50)",
                borderRadius: 10,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--coral-700)",
              }}
            >
              <span
                style={{
                  width: 14,
                  height: 0,
                  borderTop: "2.5px dashed var(--coral-500)",
                  display: "inline-block",
                }}
              />
              target line
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
