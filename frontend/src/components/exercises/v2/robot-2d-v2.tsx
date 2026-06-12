"use client";

/**
 * Robot2DV2 — Blockly-style grid programming puzzle.
 *
 * Adopted from q-programming.jsx · Robot2DExerciseV2. Methodist supplies
 * start position + direction, goal cell, and optional coins to collect.
 * Student composes a program from `forward N` / `turn-right` /
 * `turn-left` blocks; Check runs the program with 250ms ticks per
 * forward step.
 *
 * Win = reached goal AND all coins collected. Reached-goal-only = miss
 * coin (still loses heart). Per-task HP + streak.
 */

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export type RobotBlockType = "forward" | "turn-right" | "turn-left";

export interface RobotBlock {
  id: number;
  type: RobotBlockType;
  /** Step count for `forward` blocks (1..9). */
  n?: number;
}

export interface RobotPos {
  r: number;
  c: number;
  /** 0=N 1=E 2=S 3=W */
  dir: 0 | 1 | 2 | 3;
}

export interface RobotCoin {
  r: number;
  c: number;
}

export interface Robot2DV2Props {
  /** Grid is `size × size`. Default 6. */
  size?: number;
  start: RobotPos;
  goal: { r: number; c: number };
  coins?: RobotCoin[];
  /** Blocks shown in the palette. Defaults to all three. */
  paletteBlocks?: RobotBlockType[];
  /** Initial program shown in the editor. */
  starter?: RobotBlock[];
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    reachedGoal: boolean;
    coinsCollected: number;
    total: number;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

const DR = [-1, 0, 1, 0];
const DC = [0, 1, 0, -1];

const BLOCK_LABEL: Record<
  RobotBlockType,
  { label: string; color: string; shadow: string; light: boolean }
> = {
  forward: {
    label: "move forward",
    color: "var(--green-500)",
    shadow: "var(--green-700)",
    light: false,
  },
  "turn-right": {
    label: "turn right",
    color: "var(--sun-400)",
    shadow: "var(--sun-500)",
    light: true,
  },
  "turn-left": {
    label: "turn left",
    color: "var(--sun-400)",
    shadow: "var(--sun-500)",
    light: true,
  },
};

export function Robot2DV2({
  size = 6,
  start,
  goal,
  coins = [],
  paletteBlocks = ["forward", "turn-right", "turn-left"],
  starter = [],
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: Robot2DV2Props) {
  const { t } = useTranslation();
  const [robot, setRobot] = useState<RobotPos>(start);
  const [collected, setCollected] = useState<Record<number, boolean>>({});
  const [blocks, setBlocks] = useState<RobotBlock[]>(starter);
  const [running, setRunning] = useState(false);
  // RB-04: id of the block currently executing during a run.
  const [activeBlock, setActiveBlock] = useState<number | null>(null);
  // RB-01: visible wall-bump state (grid shake + "BONK!" chip).
  const [bonk, setBonk] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const aliveRef = useRef(true);
  const { fire, layer } = useConfetti();

  useEffect(() => () => {
    aliveRef.current = false;
  }, []);

  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const loseRound = (msg: string, explain: string) => {
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg,
        explain: `${explain} ${t("exercise.robot2d.goalAt").replace("{r}", String(goal.r)).replace("{c}", String(goal.c))}`,
      });
      setStreak(0);
    } else {
      const attemptsMsg = (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining));
      setFeedback({ kind: "no", msg: `${msg} ${attemptsMsg}`, explain });
    }
  };

  const runProgram = async () => {
    if (running) return;
    setRunning(true);
    let r = start.r;
    let c = start.c;
    let dir = start.dir;
    const got: Record<number, boolean> = {};
    setRobot({ r, c, dir });
    setCollected({});
    // RB-01: a wall hit aborts the run visibly instead of silently
    // clamping the robot against the edge.
    let crashed = false;
    for (const b of blocks) {
      if (crashed) break;
      if (!aliveRef.current) return;
      setActiveBlock(b.id); // RB-04
      if (b.type === "forward") {
        for (let i = 0; i < (b.n || 1); i++) {
          await sleep(250);
          if (!aliveRef.current) return;
          const nr = r + DR[dir];
          const nc = c + DC[dir];
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
            setBonk(true);
            setTimeout(() => {
              if (aliveRef.current) setBonk(false);
            }, 600);
            crashed = true;
            break;
          }
          r = nr;
          c = nc;
          const coinIdx = coins.findIndex((co) => co.r === r && co.c === c);
          if (coinIdx >= 0) got[coinIdx] = true;
          setRobot({ r, c, dir });
          setCollected({ ...got });
        }
      } else {
        await sleep(150);
        if (!aliveRef.current) return;
        dir = ((b.type === "turn-right" ? dir + 1 : dir + 3) % 4) as
          | 0
          | 1
          | 2
          | 3;
        setRobot({ r, c, dir });
      }
    }
    setActiveBlock(null);
    setRunning(false);
    if (crashed) {
      loseRound(
        t("exercise.robot2d.hitWall"),
        t("exercise.robot2d.hitWallExplain")
      );
      return;
    }
    const reachedGoal = r === goal.r && c === goal.c;
    const allCoins = Object.keys(got).length === coins.length;
    if (reachedGoal && allCoins) {
      setFeedback({
        kind: "ok",
        msg:
          coins.length > 0
            ? t("exercise.robot2d.reachedAllCoins")
            : t("exercise.robot2d.reachedGoal"),
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    loseRound(
      reachedGoal
        ? t("exercise.robot2d.reachedMissedCoin")
        : t("exercise.robot2d.didntReachGoal"),
      reachedGoal
        ? t("exercise.robot2d.collectEveryCoin")
        : t("exercise.robot2d.watchWhereItEnded")
    );
  };

  const handleRetry = () => {
    setRobot(start);
    setCollected({});
    setFeedback(null);
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      reachedGoal: robot.r === goal.r && robot.c === goal.c,
      coinsCollected: Object.keys(collected).length,
      total: coins.length,
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const addBlock = (t: RobotBlockType) => {
    if (running || feedback) return;
    setBlocks([
      ...blocks,
      { id: Date.now() + Math.random(), type: t, ...(t === "forward" ? { n: 1 } : {}) },
    ]);
  };
  const removeBlock = (id: number) => {
    if (running || feedback) return;
    setBlocks(blocks.filter((b) => b.id !== id));
  };
  // RB-03: step count changes via big +/− steppers inside the block.
  const setSteps = (id: number, delta: number) => {
    if (running || feedback) return;
    setBlocks((bs) =>
      bs.map((b) =>
        b.id === id
          ? { ...b, n: Math.max(1, Math.min(9, (b.n ?? 1) + delta)) }
          : b
      )
    );
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
        title={title ?? t("exercise.robot2d.title")}
        feedback={feedback}
        canCheck={blocks.length > 0 && !running}
        checking={running}
        checkHint={t("exercise.robot2d.checkHint")}
        onCheck={runProgram}
        checkLabel={running ? t("exercise.robot2d.runningLabel") : t("exercise.robot2d.runLabel")}
        showSkip={false}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: 16,
            height: "100%",
          }}
        >
          {/* grid */}
          <div
            className={bonk ? "rb-bonk" : undefined}
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              padding: 8,
              alignSelf: "start",
              position: "relative",
            }}
          >
            {/* RB-01: BONK chip pops over the grid on a wall hit */}
            {bonk && (
              <span
                role="status"
                style={{
                  position: "absolute",
                  top: -10,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 5,
                  background: "var(--coral-500)",
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  padding: "3px 10px",
                  borderRadius: 999,
                  boxShadow: "0 2px 0 0 var(--coral-700)",
                }}
              >
                {t("exercise.robot2d.bonk")}
              </span>
            )}
            {Array.from({ length: size }, (_, r) => (
              <div key={r} style={{ display: "flex" }}>
                {Array.from({ length: size }, (_, c) => {
                  const isGoal = r === goal.r && c === goal.c;
                  const coinIdx = coins.findIndex(
                    (co) => co.r === r && co.c === c
                  );
                  const hasCoin = coinIdx >= 0 && !collected[coinIdx];
                  const isRobot = robot.r === r && robot.c === c;
                  return (
                    <div
                      key={c}
                      style={{
                        width: 40,
                        height: 40,
                        margin: 2,
                        background: isGoal
                          ? "var(--green-100)"
                          : (r + c) % 2 === 0
                            ? "var(--ink-50)"
                            : "var(--paper)",
                        borderRadius: 6,
                        display: "grid",
                        placeItems: "center",
                        position: "relative",
                      }}
                    >
                      {isGoal && !isRobot && (
                        <span style={{ fontSize: 22 }}>🏁</span>
                      )}
                      {hasCoin && (
                        <span
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 999,
                            background: "var(--sun-400)",
                            boxShadow: "inset 0 -2px 0 var(--sun-500)",
                          }}
                        />
                      )}
                      {isRobot && (
                        <div
                          style={{
                            width: 30,
                            height: 30,
                            background: "var(--green-600)",
                            borderRadius: 8,
                            display: "grid",
                            placeItems: "center",
                            transform: `rotate(${robot.dir * 90}deg)`,
                            transition:
                              "transform 150ms, top 250ms, left 250ms",
                            color: "#fff",
                          }}
                        >
                          ▲
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* block editor */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>
              Your program
            </div>
            <div
              style={{
                flex: 1,
                background: "var(--ink-50)",
                borderRadius: 12,
                padding: 10,
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                overflow: "auto",
                marginBottom: 12,
              }}
            >
              {blocks.length === 0 ? (
                <span
                  style={{
                    color: "var(--ink-400)",
                    fontSize: 13,
                    textAlign: "center",
                    padding: 20,
                  }}
                >
                  Tap blocks below to add ↓
                </span>
              ) : (
                blocks.map((b, i) => {
                  const meta = BLOCK_LABEL[b.type];
                  // RB-04: the executing block lights up during the run.
                  const isActive = activeBlock === b.id;
                  return (
                    <div
                      key={b.id}
                      style={{
                        background: meta.color,
                        color: meta.light ? "var(--ink-900)" : "#fff",
                        padding: "10px 14px",
                        borderRadius: 10,
                        boxShadow: isActive
                          ? `0 0 0 3px var(--ink-900), 0 3px 0 0 ${meta.shadow}`
                          : `0 3px 0 0 ${meta.shadow}`,
                        fontFamily: "var(--font-sans)",
                        fontWeight: 700,
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        transform: isActive ? "scale(1.02)" : "none",
                        transition: "box-shadow 150ms, transform 150ms",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          opacity: 0.7,
                          width: 18,
                          textAlign: "center",
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          flexWrap: "wrap",
                        }}
                      >
                        {meta.label}
                        {b.type === "forward" && (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {/* RB-03: +/− steppers instead of a 36px number input */}
                            <button
                              type="button"
                              onClick={() => setSteps(b.id, -1)}
                              disabled={
                                running || !!feedback || (b.n ?? 1) <= 1
                              }
                              aria-label={t("exercise.robot2d.fewerSteps")}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                border: "none",
                                background: "rgba(0,0,0,0.18)",
                                color: "inherit",
                                fontWeight: 800,
                                cursor: "pointer",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              −
                            </button>
                            <span
                              style={{
                                fontFamily: "var(--font-mono)",
                                minWidth: 16,
                                textAlign: "center",
                              }}
                            >
                              {b.n ?? 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => setSteps(b.id, 1)}
                              disabled={
                                running || !!feedback || (b.n ?? 1) >= 9
                              }
                              aria-label={t("exercise.robot2d.moreSteps")}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 6,
                                border: "none",
                                background: "rgba(0,0,0,0.18)",
                                color: "inherit",
                                fontWeight: 800,
                                cursor: "pointer",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              +
                            </button>
                            <span>step{(b.n ?? 1) > 1 ? "s" : ""}</span>
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeBlock(b.id)}
                        disabled={running || !!feedback}
                        aria-label="Remove block"
                        style={{
                          background: "rgba(0,0,0,0.15)",
                          border: "none",
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          color: "inherit",
                          cursor: running || feedback ? "default" : "pointer",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>
              Block palette
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {paletteBlocks.map((t) => {
                const meta = BLOCK_LABEL[t];
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addBlock(t)}
                    disabled={running || !!feedback}
                    style={{
                      background: meta.color,
                      color: meta.light ? "var(--ink-900)" : "#fff",
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      boxShadow: `0 3px 0 0 ${meta.shadow}`,
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: running || feedback ? "default" : "pointer",
                    }}
                  >
                    + {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
