"use client";

/**
 * ScatterPlotV2 — drag the green line endpoints to best-fit the scatter.
 *
 * Adopted from q-math-templates.jsx · ScatterPlotExerciseV2. Quadrant-1
 * scatter (0..xMax, 0..yMax) with N coral data points. Student drags
 * two green handles to position a candidate best-fit line; matched
 * against target {m, b} with loose tolerance.
 *
 * Per-task HP + streak; retry resets line endpoints.
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface ScatterPoint {
  x: number;
  y: number;
}

export interface ScatterPlotV2Props {
  points: ScatterPoint[];
  target: { m: number; b: number };
  /** Right edge of x range. Default 10. */
  xMax?: number;
  /** Top edge of y range. Default 12. */
  yMax?: number;
  /** Absolute tolerance for slope match. Default 0.3. */
  mTolerance?: number;
  /** Absolute tolerance for intercept match. Default 1.0. */
  bTolerance?: number;
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

const SIZE_W = 380;
const SIZE_H = 280;
const PAD = { l: 36, r: 16, t: 16, b: 36 };
const PLOTW = SIZE_W - PAD.l - PAD.r;
const PLOTH = SIZE_H - PAD.t - PAD.b;

export function ScatterPlotV2({
  points,
  target,
  xMax = 10,
  yMax = 12,
  mTolerance = 0.3,
  bTolerance = 1.0,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: ScatterPlotV2Props) {
  const { t } = useTranslation();
  const toX = (v: number) => PAD.l + (v / xMax) * PLOTW;
  const toY = (v: number) => PAD.t + PLOTH - (v / yMax) * PLOTH;
  const fromX = (px: number) =>
    Math.max(0, Math.min(xMax, ((px - PAD.l) / PLOTW) * xMax));
  const fromY = (px: number) =>
    Math.max(0, Math.min(yMax, yMax - ((px - PAD.t) / PLOTH) * yMax));

  const [start, setStart] = useState<ScatterPoint>({ x: 0, y: 1 });
  const [end, setEnd] = useState<ScatterPoint>({ x: xMax, y: yMax - 1 });
  const [drag, setDrag] = useState<"start" | "end" | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { fire, layer } = useConfetti();

  const m = (end.y - start.y) / (end.x - start.x || 0.001);
  const b = start.y - m * start.x;

  const onMove = (e: React.MouseEvent) => {
    if (!drag || !svgRef.current || feedback) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = fromX(e.clientX - r.left);
    const y = fromY(e.clientY - r.top);
    if (drag === "start") setStart({ x, y });
    else setEnd({ x, y });
  };

  const handleCheck = () => {
    if (
      Math.abs(m - target.m) <= mTolerance &&
      Math.abs(b - target.b) <= bTolerance
    ) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.scatterPlot.greatLineOfFit") : t("exercise.gotIt"),
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
    const explain = t("exercise.scatterPlot.bestFitNear").replace("{m}", String(target.m)).replace("{b}", String(target.b));
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.scatterPlot.lineDoesntFit"),
        explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.scatterPlot.lineDoesntFitAttempt") : t("exercise.scatterPlot.lineDoesntFitAttempts")).replace("{n}", String(remaining)),
        explain,
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
    <div
      style={{ position: "relative", height: "100%" }}
      onMouseMove={onMove}
      onMouseUp={() => setDrag(null)}
    >
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.scatterPlot.title")}
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
            gridTemplateColumns: "auto 180px",
            gap: 20,
            justifyContent: "center",
            alignItems: "start",
          }}
        >
          <svg
            ref={svgRef}
            width={SIZE_W}
            height={SIZE_H}
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              userSelect: "none",
            }}
          >
            {/* gridlines */}
            {Array.from({ length: xMax + 1 }, (_, i) => (
              <line
                key={"vx" + i}
                x1={toX(i)}
                y1={PAD.t}
                x2={toX(i)}
                y2={PAD.t + PLOTH}
                stroke="var(--ink-100)"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: yMax + 1 }, (_, i) => (
              <line
                key={"vy" + i}
                x1={PAD.l}
                y1={toY(i)}
                x2={PAD.l + PLOTW}
                y2={toY(i)}
                stroke="var(--ink-100)"
                strokeWidth="1"
              />
            ))}
            {/* axes */}
            <line
              x1={PAD.l}
              y1={toY(0)}
              x2={PAD.l + PLOTW}
              y2={toY(0)}
              stroke="var(--ink-500)"
              strokeWidth="1.5"
            />
            <line
              x1={PAD.l}
              y1={PAD.t}
              x2={PAD.l}
              y2={toY(0)}
              stroke="var(--ink-500)"
              strokeWidth="1.5"
            />
            {/* labels */}
            {Array.from({ length: Math.floor(xMax / 2) + 1 }, (_, i) => i * 2).map(
              (v) => (
                <text
                  key={"xl" + v}
                  x={toX(v)}
                  y={toY(0) + 16}
                  fontSize="11"
                  textAnchor="middle"
                  fill="var(--ink-500)"
                  fontFamily="var(--font-mono)"
                >
                  {v}
                </text>
              )
            )}
            {Array.from({ length: Math.floor(yMax / 2) + 1 }, (_, i) => i * 2).map(
              (v) => (
                <text
                  key={"yl" + v}
                  x={PAD.l - 8}
                  y={toY(v) + 4}
                  fontSize="11"
                  textAnchor="end"
                  fill="var(--ink-500)"
                  fontFamily="var(--font-mono)"
                >
                  {v}
                </text>
              )
            )}
            {/* line */}
            <line
              x1={toX(start.x)}
              y1={toY(start.y)}
              x2={toX(end.x)}
              y2={toY(end.y)}
              stroke="var(--green-600)"
              strokeWidth="2.5"
            />
            {/* points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={toX(p.x)}
                cy={toY(p.y)}
                r="4.5"
                fill="var(--coral-500)"
                stroke="var(--paper-2)"
                strokeWidth="1"
              />
            ))}
            {/* drag handles */}
            {(
              [
                ["start", start],
                ["end", end],
              ] as const
            ).map(([k, pt]) => (
              <g
                key={k}
                onMouseDown={() => !feedback && setDrag(k as "start" | "end")}
                style={{ cursor: feedback ? "default" : "grab" }}
              >
                <circle
                  cx={toX(pt.x)}
                  cy={toY(pt.y)}
                  r="11"
                  fill="var(--green-600)"
                  stroke="var(--paper-2)"
                  strokeWidth="3"
                />
              </g>
            ))}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
              style={{
                padding: 12,
                background: "var(--ink-50)",
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div className="gp-eyebrow">{t("exercise.scatterPlot.yourLine")}</div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 16,
                  marginTop: 4,
                  color: "var(--ink-900)",
                }}
              >
                y = {m.toFixed(2)}x{" "}
                {b >= 0 ? `+ ${b.toFixed(1)}` : `− ${Math.abs(b).toFixed(1)}`}
              </div>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--ink-500)",
                lineHeight: 1.5,
              }}
            >
              Drag either green handle to set where the line passes. Try to put
              it through the middle of the scatter.
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
