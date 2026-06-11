"use client";

/**
 * CoordinatePlaneV2 — drag labeled points onto target coordinates.
 *
 * Adopted from q-math-templates.jsx · CoordinatePlaneExerciseV2, upgraded
 * with the feedback-grammar handoff (ex-math.jsx · ExCoords): `fb-pt`
 * grab physics (radius grows via CSS on the `.body` circle), a dashed
 * crosshair from the axes to the dragged point with a dark coordinate
 * bubble, and dashed `fb-target-ring` circles at missed targets after a
 * wrong check.
 *
 * Methodist supplies a list of target points (each with x, y, label).
 * Student drags matching-colored points on the SVG plane; correct
 * placement turns green, wrong turns coral. Per-task HP + streak.
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { GridAxes } from "@/components/exercises/v2/_grid-axes";
import { useTranslation } from "@/lib/i18n/context";

export interface CoordinatePlaneTarget {
  x: number;
  y: number;
  label: string;
}

export interface CoordinatePlaneV2Props {
  targets: CoordinatePlaneTarget[];
  /** Plane spans [-range, +range] on both axes. Default 6. */
  range?: number;
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

const COLORS = ["var(--green-600)", "var(--coral-500)", "#3b82f6", "#a855f7"];
const SIZE = 380;
const PAD = 36;

export function CoordinatePlaneV2({
  targets,
  range = 6,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: CoordinatePlaneV2Props) {
  const { t } = useTranslation();
  const scale = (SIZE - PAD * 2) / (range * 2);
  const toX = (v: number) => PAD + (v + range) * scale;
  const toY = (v: number) => PAD + (range - v) * scale;
  const fromX = (px: number) => Math.round((px - PAD) / scale - range);
  const fromY = (px: number) => Math.round(range - (px - PAD) / scale);

  const [pts, setPts] = useState(() =>
    targets.map(() => ({ x: 0, y: 0 }))
  );
  const [drag, setDrag] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { fire, layer } = useConfetti();

  const onPointDown = (i: number) => (e: React.PointerEvent<SVGGElement>) => {
    if (feedback) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag(i);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag === null || !svgRef.current || feedback) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = fromX(e.clientX - r.left);
    const y = fromY(e.clientY - r.top);
    const cx = Math.max(-range, Math.min(range, x));
    const cy = Math.max(-range, Math.min(range, y));
    setPts((ps) => ps.map((p, i) => (i === drag ? { x: cx, y: cy } : p)));
  };

  const endDrag = () => setDrag(null);

  const handleCheck = () => {
    setDrag(null);
    const allOk = targets.every(
      (t, i) => pts[i].x === t.x && pts[i].y === t.y
    );
    if (allOk) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? t("exercise.coordinatePlane.allSpotOn").replace("{n}", String(targets.length))
            : t("exercise.gotIt"),
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
        msg: t("exercise.coordinatePlane.somePointsOff"),
        correct: targets.map((tg) => `${tg.label}(${tg.x},${tg.y})`).join(" · "),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.coordinatePlane.somePointsOffAttempt") : t("exercise.coordinatePlane.somePointsOffAttempts")).replace("{n}", String(remaining)),
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
        title={title ?? t("exercise.coordinatePlane.title")}
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
            gap: 18,
            justifyContent: "center",
            alignItems: "start",
          }}
        >
          <svg
            ref={svgRef}
            width={SIZE}
            height={SIZE}
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              userSelect: "none",
              touchAction: "none",
            }}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <GridAxes range={range} size={SIZE} pad={PAD} />

            {/* crosshair guides + coordinate bubble while dragging */}
            {drag !== null && (
              <g className="fb-crosshair">
                <line
                  x1={toX(pts[drag].x)}
                  y1={toY(0)}
                  x2={toX(pts[drag].x)}
                  y2={toY(pts[drag].y)}
                  stroke={COLORS[drag % COLORS.length]}
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                  opacity="0.6"
                />
                <line
                  x1={toX(0)}
                  y1={toY(pts[drag].y)}
                  x2={toX(pts[drag].x)}
                  y2={toY(pts[drag].y)}
                  stroke={COLORS[drag % COLORS.length]}
                  strokeWidth="1.5"
                  strokeDasharray="3 4"
                  opacity="0.6"
                />
                <rect
                  x={toX(pts[drag].x) - 26}
                  y={toY(pts[drag].y) - 44}
                  width="52"
                  height="22"
                  rx="6"
                  fill="var(--ink-900)"
                />
                <text
                  x={toX(pts[drag].x)}
                  y={toY(pts[drag].y) - 29}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize="11"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  {pts[drag].x},{pts[drag].y}
                </text>
              </g>
            )}

            {/* dashed rings at missed targets after a wrong check */}
            {feedback?.kind === "no" &&
              targets.map((tg, i) =>
                pts[i].x !== tg.x || pts[i].y !== tg.y ? (
                  <circle
                    key={"t" + i}
                    className="fb-target-ring"
                    cx={toX(tg.x)}
                    cy={toY(tg.y)}
                    r="12"
                    fill="none"
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth="2"
                    strokeDasharray="3 3"
                    opacity="0.55"
                  />
                ) : null
              )}

            {pts.map((p, i) => {
              const tg = targets[i];
              const isOk = !!feedback && p.x === tg.x && p.y === tg.y;
              const isNo = !!feedback && (p.x !== tg.x || p.y !== tg.y);
              const fill = isOk
                ? "var(--green-600)"
                : isNo
                  ? "var(--coral-500)"
                  : COLORS[i % COLORS.length];
              return (
                <g
                  key={i}
                  className={
                    "fb-pt" +
                    (drag === i ? " grabbed" : "") +
                    (isOk ? " ok" : "")
                  }
                  onPointerDown={onPointDown(i)}
                  style={{ cursor: feedback ? "default" : undefined }}
                >
                  <circle
                    className="body"
                    cx={toX(p.x)}
                    cy={toY(p.y)}
                    r="14"
                    fill={fill}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  <text
                    x={toX(p.x)}
                    y={toY(p.y) + 5}
                    fontSize="13"
                    fontFamily="var(--font-mono)"
                    textAnchor="middle"
                    fill="#fff"
                    fontWeight="800"
                    style={{ pointerEvents: "none" }}
                  >
                    {tg.label}
                  </text>
                </g>
              );
            })}
          </svg>
          <div>
            <div className="gp-eyebrow" style={{ marginBottom: 10 }}>
              {t("exercise.coordinatePlane.placeThesePoints")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {targets.map((tg, i) => {
                const p = pts[i];
                const here = p.x === tg.x && p.y === tg.y;
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "var(--paper-2)",
                      border:
                        "2px solid " +
                        (feedback
                          ? here
                            ? "var(--green-300)"
                            : "var(--err-border)"
                          : "var(--ink-100)"),
                      transition: "border-color 200ms",
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: "50%",
                        background: COLORS[i % COLORS.length],
                        color: "#fff",
                        display: "grid",
                        placeItems: "center",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        fontSize: 12,
                      }}
                    >
                      {tg.label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--ink-900)",
                      }}
                    >
                      ({tg.x}, {tg.y})
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        color: here ? "var(--green-700)" : "var(--ink-400)",
                      }}
                    >
                      {t("exercise.coordinatePlane.now")} ({p.x},{p.y})
                    </span>
                  </div>
                );
              })}
            </div>
            <div
              style={{
                marginTop: 12,
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--ink-300)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                lineHeight: 1.7,
              }}
            >
              {t("exercise.coordinatePlane.dragHint")}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
