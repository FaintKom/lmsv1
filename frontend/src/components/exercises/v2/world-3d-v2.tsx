"use client";

/**
 * World3DV2 — SVG isometric walking puzzle.
 *
 * Adopted from q-programming.jsx · World3DExerciseV2. Pure SVG (no
 * Three.js) — lightweight isometric projection with a goal flag, a
 * character, and a 4-direction d-pad. Walk to the flag in any number
 * of steps; the step counter is informational only.
 *
 * No HP — task = reach goal. Streak +1 on win. Future enhancement:
 * obstacles + min-step bonus.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface World3DV2Props {
  size?: number;
  start: { r: number; c: number };
  goal: { r: number; c: number };
  eyebrow?: string;
  title?: string;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    steps: number;
    streak: number;
  }) => void;
}

interface DPadBtnProps {
  dir: "N" | "S" | "E" | "W";
  onClick: () => void;
  disabled?: boolean;
}

const ARROWS = { N: "↑", S: "↓", E: "→", W: "←" } as const;

function DPadBtn({ dir, onClick, disabled }: DPadBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Move ${dir}`}
      style={{
        background: "var(--paper-2)",
        border: "none",
        borderRadius: 14,
        boxShadow: "0 4px 0 0 var(--ink-200)",
        cursor: disabled ? "default" : "pointer",
        fontSize: 22,
        fontWeight: 800,
        color: "var(--ink-700)",
        transition: "transform 100ms, box-shadow 100ms",
      }}
      onPointerDown={(e) => {
        e.currentTarget.style.transform = "translateY(2px)";
        e.currentTarget.style.boxShadow = "0 2px 0 0 var(--ink-200)";
      }}
      onPointerUp={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "0 4px 0 0 var(--ink-200)";
      }}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.boxShadow = "0 4px 0 0 var(--ink-200)";
      }}
    >
      {ARROWS[dir]}
    </button>
  );
}

export function World3DV2({
  size = 5,
  start,
  goal,
  eyebrow,
  title,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: World3DV2Props) {
  const [pos, setPos] = useState(start);
  const [steps, setSteps] = useState(0);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const TILE = 38;
  const projX = (r: number, c: number) => (c - r) * TILE * 0.85;
  const projY = (r: number, c: number) => (c + r) * TILE * 0.5;

  const move = (dr: number, dc: number) => {
    if (feedback) return;
    const r = Math.max(0, Math.min(size - 1, pos.r + dr));
    const c = Math.max(0, Math.min(size - 1, pos.c + dc));
    if (r === pos.r && c === pos.c) return;
    setPos({ r, c });
    setSteps(steps + 1);
    if (r === goal.r && c === goal.c) {
      setTimeout(() => {
        setFeedback({
          kind: "ok",
          msg: t("exercise.world3d.reachedInSteps").replace("{n}", String(steps + 1)),
        });
        setStreak((s) => s + 1);
        fire();
      }, 200);
    }
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      steps,
      streak,
    });
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        streak={streak}
        eyebrow={eyebrow}
        title={title ?? t("exercise.world3d.title")}
        feedback={feedback}
        canCheck={false}
        showSkip={false}
        onCheck={() => {}}
        onContinue={handleContinue}
        onQuit={onQuit}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 18 }}>
          <div
            style={{
              background:
                "linear-gradient(180deg, #d4f1c4 0%, #ecf9e7 100%)",
              border: "2px solid var(--ink-100)",
              borderRadius: 18,
              position: "relative",
              height: 360,
              overflow: "hidden",
            }}
          >
            <svg
              viewBox="-200 -40 400 320"
              style={{ width: "100%", height: "100%" }}
            >
              <defs>
                <linearGradient id="tileGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8fd770" />
                  <stop offset="100%" stopColor="#6bc44d" />
                </linearGradient>
              </defs>
              {Array.from({ length: size }, (_, r) =>
                Array.from({ length: size }, (_, c) => {
                  const x = projX(r, c);
                  const y = projY(r, c);
                  const isGoal = r === goal.r && c === goal.c;
                  return (
                    <g key={`${r},${c}`} transform={`translate(${x}, ${y})`}>
                      <polygon
                        points={`0,-${TILE * 0.5} ${TILE * 0.85},0 0,${TILE * 0.5} -${TILE * 0.85},0`}
                        fill={
                          isGoal
                            ? "url(#tileGrad)"
                            : (r + c) % 2 === 0
                              ? "#b6e69e"
                              : "#8fd770"
                        }
                        stroke="#0a8754"
                        strokeWidth="0.5"
                        opacity="0.95"
                      />
                      <polygon
                        points={`-${TILE * 0.85},0 0,${TILE * 0.5} 0,${TILE * 0.5 + 6} -${TILE * 0.85},6`}
                        fill="#07683f"
                        opacity="0.5"
                      />
                      <polygon
                        points={`${TILE * 0.85},0 0,${TILE * 0.5} 0,${TILE * 0.5 + 6} ${TILE * 0.85},6`}
                        fill="#054d2f"
                        opacity="0.6"
                      />
                      {isGoal && (
                        <g transform={`translate(0, ${-26})`}>
                          <rect
                            x="-1"
                            y="-20"
                            width="2"
                            height="20"
                            fill="#1a2a1f"
                          />
                          <polygon
                            points="1,-20 18,-14 1,-8"
                            fill="#ff7a5c"
                          />
                        </g>
                      )}
                    </g>
                  );
                })
              )}
              <g
                transform={`translate(${projX(pos.r, pos.c)}, ${projY(pos.r, pos.c) - 28})`}
                style={{
                  transition: "transform 240ms cubic-bezier(0.2,0.8,0.2,1)",
                }}
              >
                <ellipse cx="0" cy="32" rx="14" ry="4" fill="rgba(0,0,0,0.3)" />
                <rect x="-10" y="0" width="20" height="30" rx="6" fill="#0a8754" />
                <circle cx="0" cy="-6" r="9" fill="#ffd84d" />
                <circle cx="-3" cy="-7" r="1.5" fill="#1a2a1f" />
                <circle cx="3" cy="-7" r="1.5" fill="#1a2a1f" />
              </g>
            </svg>
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 10,
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(10,26,16,0.7)",
                color: "#fff",
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
                fontSize: 11,
              }}
            >
              {t("exercise.world3d.steps")} · {steps}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 56px)",
              gridTemplateRows: "repeat(3, 56px)",
              gap: 6,
              alignSelf: "center",
            }}
          >
            <div />
            <DPadBtn dir="N" onClick={() => move(-1, 0)} disabled={!!feedback} />
            <div />
            <DPadBtn dir="W" onClick={() => move(0, -1)} disabled={!!feedback} />
            <div />
            <DPadBtn dir="E" onClick={() => move(0, 1)} disabled={!!feedback} />
            <div />
            <DPadBtn dir="S" onClick={() => move(1, 0)} disabled={!!feedback} />
            <div />
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
