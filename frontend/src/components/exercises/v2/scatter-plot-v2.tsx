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
 *
 * Interaction (SP-01): pointer events with capture — mouse-only events
 * never fire on touch. Handles snap to the 0.5 grid, are keyboard
 * focusable (arrow keys move one half-step — SP-02/GX-05), and Check
 * unlocks only after the first interaction (GX-03). Misses teach the
 * heuristic instead of revealing the target line (SP-05); the answer
 * appears only when attempts are exhausted.
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

  const [start, setStart] = useState<ScatterPoint>({ x: 0, y: 1 });
  const [end, setEnd] = useState<ScatterPoint>({ x: xMax, y: yMax - 1 });
  const [drag, setDrag] = useState<"start" | "end" | null>(null);
  const [touched, setTouched] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { fire, layer } = useConfetti();

  const m = (end.y - start.y) / (end.x - start.x || 0.001);
  const b = start.y - m * start.x;

  /** Pointer position → data coords, corrected for the responsive scale. */
  const svgCoords = (e: React.PointerEvent) => {
    const el = svgRef.current!;
    const r = el.getBoundingClientRect();
    const scale = SIZE_W / r.width;
    const px = (e.clientX - r.left) * scale;
    const py = (e.clientY - r.top) * scale;
    return {
      x: Math.max(0, Math.min(xMax, ((px - PAD.l) / PLOTW) * xMax)),
      y: Math.max(0, Math.min(yMax, yMax - ((py - PAD.t) / PLOTH) * yMax)),
    };
  };

  const onHandleDown = (k: "start" | "end") => (e: React.PointerEvent) => {
    if (feedback) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag(k);
    setTouched(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag || feedback || !svgRef.current) return;
    const c = svgCoords(e);
    // Snap handles to the 0.5 grid so positions are reproducible.
    const snapped = { x: Math.round(c.x * 2) / 2, y: Math.round(c.y * 2) / 2 };
    if (drag === "start") setStart(snapped);
    else setEnd(snapped);
  };
  const keyMoveHandle = (k: "start" | "end", dx: number, dy: number) => {
    if (feedback) return;
    const upd = (p: ScatterPoint) => ({
      x: Math.max(0, Math.min(xMax, p.x + dx)),
      y: Math.max(0, Math.min(yMax, p.y + dy)),
    });
    if (k === "start") setStart(upd);
    else setEnd(upd);
    setTouched(true);
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
    // SP-05: teach the heuristic; never reveal the target while retries remain.
    const explain = t("exercise.scatterPlot.aimEqualDots");
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.scatterPlot.lineDoesntFit"),
        correct: t("exercise.scatterPlot.bestFitNear").replace("{m}", String(target.m)).replace("{b}", String(target.b)),
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
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.scatterPlot.title")}
        feedback={feedback}
        canCheck={touched && !feedback}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE_W} ${SIZE_H}`}
            className="gx-svg interactive"
            onPointerMove={onMove}
            onPointerUp={() => setDrag(null)}
            onPointerCancel={() => setDrag(null)}
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
                className={"fb-pt" + (drag === k ? " grabbed" : "")}
                tabIndex={feedback ? -1 : 0}
                role="button"
                aria-label={`(${pt.x}, ${pt.y})`}
                onPointerDown={onHandleDown(k)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") {
                    e.preventDefault();
                    keyMoveHandle(k, -0.5, 0);
                  }
                  if (e.key === "ArrowRight") {
                    e.preventDefault();
                    keyMoveHandle(k, 0.5, 0);
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    keyMoveHandle(k, 0, 0.5);
                  }
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    keyMoveHandle(k, 0, -0.5);
                  }
                }}
                style={{ cursor: feedback ? "default" : undefined }}
              >
                <circle
                  className="body"
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
              {t("exercise.scatterPlot.dragHandleHint")}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
