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
 * Exercise-mechanics handoff (ex-graphs.jsx · CoordinatePlaneV2):
 * - GX-01 viewBox-only SVG (`.gx-svg.interactive`) inside `.gx-layout`;
 *         pointer math corrected for the responsive scale.
 * - GX-03 Check unlocks only after the first move (`moved` gate).
 * - CP-01 points start spread along the bottom edge, not stacked at (0,0).
 * - CP-03/GX-05 points are keyboard-focusable (role="button", arrows move
 *         one unit, `.fb-pt:focus-visible` ring).
 * - CP-06 on retry, correct points lock green and stop being draggable;
 *         missed targets show dashed pulsing rings.
 * - CP-04 reveal uses the structured `correctList` two-column list.
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

  // CP-01: spread starting points along the bottom edge.
  const [pts, setPts] = useState(() =>
    targets.map((_, i) => ({
      x: Math.min(range - 1, -range + 1 + i * 2),
      y: -range + 1,
    }))
  );
  const [lockedOk, setLockedOk] = useState<number[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const [moved, setMoved] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { fire, layer } = useConfetti();

  const onPointDown = (i: number) => (e: React.PointerEvent<SVGGElement>) => {
    if (feedback || lockedOk.includes(i)) return;
    svgRef.current?.setPointerCapture(e.pointerId);
    setDrag(i);
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (drag === null || !svgRef.current || feedback) return;
    // GX-01: pointer position → viewBox units via the responsive scale.
    const r = svgRef.current.getBoundingClientRect();
    const sx = SIZE / r.width;
    const px = (e.clientX - r.left) * sx;
    const py = (e.clientY - r.top) * sx;
    const x = Math.max(
      -range,
      Math.min(range, Math.round((px - PAD) / scale - range))
    );
    const y = Math.max(
      -range,
      Math.min(range, Math.round(range - (py - PAD) / scale))
    );
    setPts((ps) => ps.map((p, i) => (i === drag ? { x, y } : p)));
    setMoved(true);
  };

  // CP-03/GX-05: arrow keys move a focused point one unit.
  const keyMovePt = (i: number, dx: number, dy: number) => {
    if (feedback || lockedOk.includes(i)) return;
    setPts((ps) =>
      ps.map((p, j) =>
        j === i
          ? {
              x: Math.max(-range, Math.min(range, p.x + dx)),
              y: Math.max(-range, Math.min(range, p.y + dy)),
            }
          : p
      )
    );
    setMoved(true);
  };

  const endDrag = () => setDrag(null);

  const handleCheck = () => {
    setDrag(null);
    const okFlags = targets.map(
      (tg, i) => pts[i].x === tg.x && pts[i].y === tg.y
    );
    if (okFlags.every(Boolean)) {
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
    const okCount = okFlags.filter(Boolean).length;
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.coordinatePlane.outOfTries"),
        correctList: targets.map((tg) => [tg.label, `(${tg.x}, ${tg.y})`]),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.coordinatePlane.somePointsOffAttempt") : t("exercise.coordinatePlane.somePointsOffAttempts")).replace("{n}", String(remaining)),
        // GX-04: count what's right; never reveal where the misses go.
        explain:
          okCount > 0
            ? t("exercise.coordinatePlane.someRightLock")
                .replace("{ok}", String(okCount))
                .replace("{n}", String(targets.length))
            : t("exercise.coordinatePlane.ringsHint"),
      });
    }
  };

  const handleRetry = () => {
    // CP-06: correct points lock green and stop being draggable.
    setLockedOk(
      targets
        .map((tg, i) => (pts[i].x === tg.x && pts[i].y === tg.y ? i : -1))
        .filter((i) => i >= 0)
    );
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
        canCheck={moved && !feedback}
        checkHint={t("exercise.coordinatePlane.checkHint")}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            className="gx-svg interactive"
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
              const here = p.x === tg.x && p.y === tg.y;
              const isOk = (!!feedback && here) || lockedOk.includes(i);
              const isNo = !!feedback && !here;
              const fill = isOk
                ? "var(--green-600)"
                : isNo
                  ? "var(--coral-500)"
                  : COLORS[i % COLORS.length];
              const locked = !!feedback || lockedOk.includes(i);
              return (
                <g
                  key={i}
                  className={
                    "fb-pt" +
                    (drag === i ? " grabbed" : "") +
                    (isOk ? " ok" : "")
                  }
                  tabIndex={locked ? -1 : 0}
                  role="button"
                  aria-label={t("exercise.coordinatePlane.pointAria")
                    .replace("{label}", tg.label)
                    .replace("{x}", String(p.x))
                    .replace("{y}", String(p.y))
                    .replace("{tx}", String(tg.x))
                    .replace("{ty}", String(tg.y))}
                  onPointerDown={onPointDown(i)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") {
                      e.preventDefault();
                      keyMovePt(i, -1, 0);
                    }
                    if (e.key === "ArrowRight") {
                      e.preventDefault();
                      keyMovePt(i, 1, 0);
                    }
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      keyMovePt(i, 0, 1);
                    }
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      keyMovePt(i, 0, -1);
                    }
                  }}
                  style={{ cursor: locked ? "default" : undefined }}
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
                const graded = !!feedback || lockedOk.includes(i);
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
                        (graded
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
                        flex: "none",
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
