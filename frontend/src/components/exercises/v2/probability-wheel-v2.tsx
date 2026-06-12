"use client";

/**
 * ProbabilityWheelV2 — spinner experiment for probability literacy.
 *
 * Methodist supplies wheel segments (label + color + optional weight)
 * and a `targetSpins` count. Student presses Spin → wheel animates →
 * tally updates per segment. After N spins, student picks the most
 * frequent segment (predicting empirical distribution).
 *
 * Per-task HP + streak. Demonstrates how empirical frequency converges
 * to theoretical probability as N grows.
 *
 * Design system: SVG wheel + tally chips with category colors,
 * LessonShell chrome.
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface WheelSegment {
  label: string;
  color: string;
  /** Sector weight. Defaults to 1. Total normalized internally. */
  weight?: number;
}

export interface ProbabilityWheelV2Props {
  segments: WheelSegment[];
  /** Number of spins required before Check enabled. */
  targetSpins?: number;
  eyebrow?: string;
  title?: React.ReactNode;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
    tally: Record<string, number>;
  }) => void;
}

const SIZE = 320;
const R = 140;
const CX = SIZE / 2;
const CY = SIZE / 2;

function describeArc(startAngle: number, endAngle: number): string {
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const x1 = CX + R * Math.cos(startRad);
  const y1 = CY + R * Math.sin(startRad);
  const x2 = CX + R * Math.cos(endRad);
  const y2 = CY + R * Math.sin(endRad);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
}

export function ProbabilityWheelV2({
  segments,
  targetSpins = 20,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: ProbabilityWheelV2Props) {
  const [angle, setAngle] = useState(0);
  const [spins, setSpins] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [tally, setTally] = useState<Record<string, number>>(() =>
    Object.fromEntries(segments.map((s) => [s.label, 0]))
  );
  const [pick, setPick] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const timerRef = useRef<number | null>(null);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const totalWeight = segments.reduce((sum, s) => sum + (s.weight ?? 1), 0);

  let runningDeg = 0;
  const arcs = segments.map((s) => {
    const span = ((s.weight ?? 1) / totalWeight) * 360;
    const start = runningDeg;
    runningDeg += span;
    return { ...s, start, end: runningDeg, span };
  });

  const spin = () => {
    if (spinning || feedback) return;
    setSpinning(true);
    const r = Math.random() * totalWeight;
    let pickIdx = 0;
    let acc = 0;
    for (let i = 0; i < segments.length; i++) {
      acc += segments[i].weight ?? 1;
      if (r < acc) {
        pickIdx = i;
        break;
      }
    }
    const winner = arcs[pickIdx];
    const winnerCenter = (winner.start + winner.end) / 2;
    const extraTurns = 4 + Math.floor(Math.random() * 3);
    const finalAngle = extraTurns * 360 + (360 - winnerCenter);
    setAngle((prev) => prev + finalAngle - (prev % 360));
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setTally((t) => ({ ...t, [winner.label]: (t[winner.label] || 0) + 1 }));
      setSpins((n) => n + 1);
      setSpinning(false);
    }, 1500);
  };

  /** PW-01: bulk "×5" spin — runs the experiment fast once the child gets
   * the idea, so reaching N spins doesn't take forever. No animation. */
  const quickSpin = () => {
    if (spinning || feedback || reachedTarget) return;
    const n = Math.min(5, targetSpins - spins);
    const inc: Record<string, number> = {};
    for (let k = 0; k < n; k++) {
      const r = Math.random() * totalWeight;
      let acc = 0;
      let idx = 0;
      for (let i = 0; i < segments.length; i++) {
        acc += segments[i].weight ?? 1;
        if (r < acc) {
          idx = i;
          break;
        }
      }
      const lbl = segments[idx].label;
      inc[lbl] = (inc[lbl] || 0) + 1;
    }
    setTally((prev) => {
      const nt = { ...prev };
      for (const k in inc) nt[k] = (nt[k] || 0) + inc[k];
      return nt;
    });
    setSpins((s) => s + n);
  };

  const totalWeightLabel = segments.reduce((max, s) =>
    (s.weight ?? 1) > (max.weight ?? 1) ? s : max
  );

  const handleCheck = () => {
    if (!pick) return;
    const maxCount = Math.max(...Object.values(tally));
    const winners = Object.entries(tally)
      .filter(([, c]) => c === maxCount)
      .map(([l]) => l);
    if (winners.includes(pick)) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? t("exercise.probabilityWheel.cameUpMost")
                .replace("{label}", pick)
                .replace("{count}", String(maxCount))
                .replace("{total}", String(spins))
            : t("exercise.gotIt"),
        explain:
          totalWeightLabel.label !== pick
            ? t("exercise.probabilityWheel.theoreticalFavorite")
                .replace("{label}", totalWeightLabel.label)
                .replace("{weight}", String(totalWeightLabel.weight ?? 1))
                .replace("{total}", String(totalWeight))
            : undefined,
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
        msg: t("exercise.probabilityWheel.mostFrequentWas")
          .replace("{label}", winners.join(" / "))
          .replace("{count}", String(maxCount)),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.probabilityWheel.tryAgainAttempt") : t("exercise.probabilityWheel.tryAgainAttempts")).replace("{n}", String(remaining)),
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
      tally,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const reachedTarget = spins >= targetSpins;

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
          title ?? (
            <>
              {t("exercise.probabilityWheel.spinTimesAndPick").replace("{n}", String(targetSpins))}{" "}
              <span className="gp-mark">{t("exercise.probabilityWheel.mostFrequent")}</span> {t("exercise.probabilityWheel.segment")}
            </>
          )
        }
        feedback={feedback}
        canCheck={reachedTarget && !!pick}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 220px",
            gap: 24,
            justifyContent: "center",
            alignItems: "start",
            flexWrap: "wrap",
          }}
        >
          {/* Wheel */}
          <div style={{ position: "relative", width: SIZE, height: SIZE + 40 }}>
            {/* Pointer */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: SIZE / 2 - 10,
                width: 20,
                height: 22,
                background: "var(--ink-900)",
                clipPath: "polygon(50% 100%, 0 0, 100% 0)",
                zIndex: 2,
              }}
            />
            <svg
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              width={SIZE}
              height={SIZE}
              style={{
                marginTop: 18,
                transform: `rotate(${angle}deg)`,
                transition: spinning
                  ? "transform 1500ms cubic-bezier(0.15, 0.65, 0.2, 1)"
                  : "none",
                filter: "drop-shadow(0 4px 0 var(--ink-200))",
              }}
            >
              {arcs.map((a) => (
                <g key={a.label}>
                  <path
                    d={describeArc(a.start, a.end)}
                    fill={a.color}
                    stroke="var(--paper-2)"
                    strokeWidth="2"
                  />
                  <text
                    x={
                      CX +
                      R * 0.6 *
                        Math.cos((((a.start + a.end) / 2 - 90) * Math.PI) / 180)
                    }
                    y={
                      CY +
                      R * 0.6 *
                        Math.sin((((a.start + a.end) / 2 - 90) * Math.PI) / 180)
                    }
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="var(--font-sans)"
                    fontWeight="800"
                    fontSize="14"
                    fill="#fff"
                    style={{ pointerEvents: "none" }}
                  >
                    {a.label}
                  </text>
                </g>
              ))}
              <circle cx={CX} cy={CY} r="10" fill="var(--ink-900)" />
            </svg>
            <button
              type="button"
              onClick={spin}
              disabled={spinning || reachedTarget || !!feedback}
              className="gp-btn"
              style={{
                position: "absolute",
                bottom: 0,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "10px 24px",
                fontSize: 13,
              }}
            >
              {spinning ? t("exercise.probabilityWheel.spinning") : reachedTarget ? t("exercise.probabilityWheel.done") : t("exercise.probabilityWheel.spin")}
            </button>
          </div>
          {/* Tally + picker */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 6,
                  gap: 8,
                }}
              >
                <span className="gp-eyebrow">
                  {t("exercise.probabilityWheel.spins")} · {spins} / {targetSpins}
                </span>
                {/* PW-01: bulk spin appears once the idea has landed. */}
                {spins >= 3 && !reachedTarget && !feedback && (
                  <button
                    type="button"
                    onClick={quickSpin}
                    disabled={spinning}
                    className="gp-btn ghost"
                    style={{ padding: "4px 12px", fontSize: 12 }}
                  >
                    {t("exercise.probabilityWheel.quickSpin")}
                  </button>
                )}
              </div>
              {/* PW-02: narrate the phase so the convergence is the lesson. */}
              {spins >= 3 && !reachedTarget && (
                <div
                  style={{
                    marginBottom: 8,
                    fontSize: 12,
                    color: "var(--ink-400)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {t("exercise.probabilityWheel.keepSpinning")}
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {segments.map((s) => {
                  const count = tally[s.label] || 0;
                  const pct = spins > 0 ? (count / spins) * 100 : 0;
                  const isPicked = pick === s.label;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() =>
                        !feedback && reachedTarget && setPick(s.label)
                      }
                      disabled={!reachedTarget || !!feedback}
                      style={{
                        position: "relative",
                        textAlign: "left",
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: isPicked
                          ? "var(--green-50)"
                          : "var(--paper-2)",
                        border: `2px solid ${isPicked ? "var(--green-500)" : "var(--ink-100)"}`,
                        cursor:
                          reachedTarget && !feedback ? "pointer" : "default",
                        overflow: "hidden",
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ink-900)",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${pct}%`,
                          background: s.color,
                          opacity: 0.18,
                          pointerEvents: "none",
                          transition: "width 200ms",
                        }}
                      />
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          position: "relative",
                        }}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 999,
                            background: s.color,
                          }}
                        />
                        {s.label}
                      </span>
                      <span
                        style={{
                          float: "right",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          color: "var(--ink-500)",
                          position: "relative",
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              {reachedTarget && !pick && !feedback && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "var(--sun-700)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {t("exercise.probabilityWheel.pickMostFrequent")}
                </div>
              )}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
