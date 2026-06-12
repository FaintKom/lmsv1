"use client";

/**
 * FunctionGraphV2 — match a target y=mx+b line with sliders.
 *
 * Adopted from q-math-templates.jsx · FunctionGraphExerciseV2.
 * Methodist supplies target {m, b}; student adjusts slope + intercept
 * sliders until the green solid line overlaps the coral dashed target.
 *
 * Exercise-mechanics handoff (ex-graphs.jsx · FunctionGraphV2):
 * - GX-01 viewBox-only SVG (`.gx-svg`) inside `.gx-layout` (panel stacks
 *         below the plot in narrow containers).
 * - GX-03 Check unlocks only after the first slider touch.
 * - GX-04/FG-03 wrong-attempt hint names WHICH dial is off (slope vs
 *         intercept), never the direction or value.
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
import { useTranslation } from "@/lib/i18n/context";

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
  /** GX-03: notifies the parent on the first interaction. */
  onFirstTouch?: () => void;
}

function SliderCtrl({ label, v, setV, min, max, step, disabled, onFirstTouch }: SliderProps) {
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
        aria-label={label}
        onChange={(e) => {
          setV(parseFloat(e.target.value));
          onFirstTouch?.();
        }}
        style={{ width: "100%", accentColor: "var(--green-600)" }}
      />
    </div>
  );
}

const SIZE = 380;
const PAD = 36;

/** IG-03 family: render "+ 3" / "− 3", never "+ -3". */
const signed = (n: number) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);

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
  const [touched, setTouched] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const linePath = (mm: number, bb: number) =>
    `M ${toX(-range)} ${toY(mm * -range + bb)} L ${toX(range)} ${toY(mm * range + bb)}`;

  const handleCheck = () => {
    const mOk = Math.abs(m - target.m) <= tolerance;
    const bOk = Math.abs(b - target.b) <= tolerance;
    if (mOk && bOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.functionGraph.linesMatch") : t("exercise.gotIt"),
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
        msg: t("exercise.functionGraph.linesDontMatch"),
        correct: `y = ${target.m}x ${signed(target.b)}`,
      });
      setStreak(0);
    } else {
      // GX-04/FG-03: name the dial, not the direction.
      const hint =
        !mOk && !bOk
          ? t("exercise.functionGraph.bothDialsOff")
          : !mOk
            ? t("exercise.functionGraph.slopeOff")
            : t("exercise.functionGraph.interceptOff");
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.functionGraph.linesDontMatchAttempt") : t("exercise.functionGraph.linesDontMatchAttempts")).replace("{n}", String(remaining)),
        explain: hint,
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
            {t("exercise.functionGraph.matchTheLine")} ·{" "}
            <span
              className="gp-mark"
              style={{ fontFamily: "var(--font-mono)", fontSize: 18 }}
            >
              y = {target.m}x {signed(target.b)}
            </span>
          </>
        }
        feedback={feedback}
        canCheck={touched && !feedback}
        checkHint={t("exercise.functionGraph.checkHint")}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="gx-svg">
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
              onFirstTouch={() => setTouched(true)}
            />
            <SliderCtrl
              label="intercept · b"
              v={b}
              setV={setB}
              min={-5}
              max={5}
              step={bStep}
              disabled={!!feedback}
              onFirstTouch={() => setTouched(true)}
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
              y = {m}x {signed(b)}
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
