"use client";

/**
 * GraphTransformV2 — match target parabola y = a(x − h)² + v with sliders.
 *
 * Adopted from q-math-templates.jsx · GraphTransformExerciseV2.
 * Three sliders: horizontal shift h, vertical shift v, vertical
 * stretch a. Live green curve overlays coral dashed target.
 *
 * Exercise-mechanics handoff (ex-graphs.jsx · GraphTransformV2):
 * - GX-01 viewBox-only SVG (`.gx-svg`) inside `.gx-layout`.
 * - GX-03 Check unlocks only after the first slider touch.
 * - GX-04 wrong-attempt hint names the off dials (slide/lift/stretch),
 *         never the direction or value.
 * - IG-03 family: signed formatting in the reveal (no "+ -3").
 *
 * Per-task HP + streak; retry resets to identity transform.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { GridAxes } from "@/components/exercises/v2/_grid-axes";
import { useTranslation } from "@/lib/i18n/context";

export interface GraphTransformV2Props {
  /** Target {h: horiz shift, v: vert shift, a: vert stretch}. */
  target: { h: number; v: number; a: number };
  range?: number;
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

export function GraphTransformV2({
  target,
  range = 6,
  tolerance = 0.1,
  eyebrow,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: GraphTransformV2Props) {
  const scale = (SIZE - PAD * 2) / (range * 2);
  const toX = (vv: number) => PAD + (vv + range) * scale;
  const toY = (vv: number) => PAD + (range - vv) * scale;

  const [h, setH] = useState(0);
  const [v, setV] = useState(0);
  const [a, setA] = useState(1);
  const [touched, setTouched] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const pathStr = (hh: number, vv: number, aa: number) => {
    const pts: [number, number][] = [];
    for (let x = -range; x <= range; x += 0.1) {
      const y = aa * (x - hh) * (x - hh) + vv;
      if (y >= -range && y <= range) pts.push([x, y]);
    }
    if (pts.length === 0) return "";
    return pts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${toX(x)} ${toY(y)}`)
      .join(" ");
  };

  const handleCheck = () => {
    const oks = [
      Math.abs(h - target.h) <= tolerance,
      Math.abs(v - target.v) <= tolerance,
      Math.abs(a - target.a) <= tolerance,
    ];
    if (oks.every(Boolean)) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.graphTransform.curvesOverlap") : t("exercise.gotIt"),
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
        msg: t("exercise.graphTransform.notAligned"),
        correct: `y = ${target.a}(x ${target.h >= 0 ? `− ${target.h}` : `+ ${-target.h}`})² ${signed(target.v)}`,
      });
      setStreak(0);
    } else {
      // GX-04: name the off dials, never the direction or value.
      const names = [
        t("exercise.graphTransform.dialSlide"),
        t("exercise.graphTransform.dialLift"),
        t("exercise.graphTransform.dialStretch"),
      ];
      const offNames = names.filter((_, i) => !oks[i]);
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.graphTransform.notAlignedAttempt") : t("exercise.graphTransform.notAlignedAttempts")).replace("{n}", String(remaining)),
        explain: t("exercise.graphTransform.checkDials").replace(
          "{dials}",
          offNames.join(", ")
        ),
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
            {t("exercise.graphTransform.transformToMatch")}{" "}
            <span className="gp-mark">{t("exercise.graphTransform.dashed")}</span> {t("exercise.graphTransform.curve")}
          </>
        }
        feedback={feedback}
        canCheck={touched && !feedback}
        checkHint={t("exercise.graphTransform.checkHint")}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="gx-svg">
            <GridAxes range={range} size={SIZE} pad={PAD} />
            <path
              d={pathStr(target.h, target.v, target.a)}
              stroke="var(--coral-500)"
              strokeWidth="2"
              strokeDasharray="4 4"
              fill="none"
              opacity="0.6"
            />
            <path
              d={pathStr(h, v, a)}
              stroke="var(--green-600)"
              strokeWidth="3"
              fill="none"
            />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SliderCtrl
              label="horiz · h"
              v={h}
              setV={setH}
              min={-5}
              max={5}
              step={1}
              disabled={!!feedback}
              onFirstTouch={() => setTouched(true)}
            />
            <SliderCtrl
              label="vert · v"
              v={v}
              setV={setV}
              min={-5}
              max={5}
              step={1}
              disabled={!!feedback}
              onFirstTouch={() => setTouched(true)}
            />
            <SliderCtrl
              label="stretch · a"
              v={a}
              setV={setA}
              min={0.5}
              max={3}
              step={0.5}
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
                fontSize: 14,
                fontWeight: 700,
                color: "var(--ink-900)",
              }}
            >
              y = {a}(x {h >= 0 ? `− ${h}` : `+ ${-h}`})² {signed(v)}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
