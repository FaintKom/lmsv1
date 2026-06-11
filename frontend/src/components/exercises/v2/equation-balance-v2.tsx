"use client";

/**
 * EquationBalanceV2 — scale-metaphor algebra solver.
 *
 * Adopted from q-math.jsx · EquationBalanceExerciseV2. Methodist
 * supplies initial scale state {leftX, leftW, rightX, rightW} and a
 * target state (typically isolating x). Student applies inverse-ops
 * buttons to reach the target.
 *
 * Per-task HP + streak. Retry resets scale to the initial state.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface ScaleState {
  leftX: number;
  leftW: number;
  rightX: number;
  rightW: number;
}

export interface EquationBalanceV2Props {
  initial: ScaleState;
  /** State to reach (typically `{leftX: 1, leftW: 0, rightX: 0, rightW: solution}`). */
  target: ScaleState;
  /** Reveal sentence on solve, e.g. "3x + 4 = 10  →  3x = 6  →  x = 2". */
  explain?: string;
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
    moves: string[];
  }) => void;
}

/** "3x + 4", "x + 10", "3", "0" — one side of the equation display. */
function sideText(x: number, w: number) {
  if (x === 0 && w === 0) return "0";
  const parts: string[] = [];
  if (x > 0) parts.push(`${x > 1 ? x : ""}x`);
  if (w > 0) parts.push(String(w));
  return parts.join(" + ");
}

function eqState(a: ScaleState, b: ScaleState) {
  return (
    a.leftX === b.leftX &&
    a.leftW === b.leftW &&
    a.rightX === b.rightX &&
    a.rightW === b.rightW
  );
}

function renderItems(
  kind: "x" | "w",
  count: number,
  color: string,
  shadow: string
) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        justifyContent: "center",
        padding: 4,
      }}
    >
      {Array.from({ length: count }, (_, i) =>
        kind === "x" ? (
          <div
            key={i}
            className="fb-witem"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: color,
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              fontSize: 14,
              boxShadow: `inset 0 -3px 0 ${shadow}`,
            }}
          >
            x
          </div>
        ) : (
          <div
            key={i}
            className="fb-witem"
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: color,
              boxShadow: `inset 0 -2px 0 ${shadow}`,
            }}
          />
        )
      )}
    </div>
  );
}

export function EquationBalanceV2({
  initial,
  target,
  explain,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: EquationBalanceV2Props) {
  const [state, setState] = useState<ScaleState>(initial);
  const [moves, setMoves] = useState<string[]>([]);
  const [wobble, setWobble] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const atTarget = eqState(state, target);

  /** Wobble the beam on every applied operation (~650ms, fb-beam.wobble). */
  const triggerWobble = () => {
    setWobble(true);
    setTimeout(() => setWobble(false), 650);
  };

  const subtractWeight = (n = 1) => {
    if (feedback || state.leftW < n || state.rightW < n) return;
    setState({ ...state, leftW: state.leftW - n, rightW: state.rightW - n });
    setMoves([...moves, `−${n} from both`]);
    triggerWobble();
  };
  const subtractX = () => {
    if (feedback || state.leftX < 1 || state.rightX < 1) return;
    setState({ ...state, leftX: state.leftX - 1, rightX: state.rightX - 1 });
    setMoves([...moves, "−x from both"]);
    triggerWobble();
  };
  const divide = () => {
    if (feedback || state.leftX < 2) return;
    if (state.leftW % state.leftX !== 0) return;
    if (state.rightW % state.leftX !== 0) return;
    const f = state.leftX;
    setState({
      leftX: 1,
      leftW: state.leftW / f,
      rightX: 0,
      rightW: state.rightW / f,
    });
    setMoves([...moves, `÷${f}`]);
    triggerWobble();
  };

  const handleCheck = () => {
    if (eqState(state, target)) {
      setFeedback({
        kind: "ok",
        msg: t("exercise.gotIt"),
        explain,
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
        msg: t("exercise.equationBalance.notIsolated"),
        explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.notQuiteAttemptLeft") : t("exercise.notQuiteAttemptsLeft")).replace("{n}", String(remaining)),
      });
    }
  };

  const handleRetry = () => {
    setState(initial);
    setMoves([]);
    setFeedback(null);
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
      moves,
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
        title={title ?? t("exercise.equationBalance.title")}
        feedback={feedback}
        canCheck={true}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          {/* equation display — recolors green once the target is reached */}
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 18,
              fontWeight: 700,
              color: atTarget ? "var(--green-700)" : "var(--ink-700)",
              transition: "color 200ms",
              marginBottom: 14,
            }}
          >
            {sideText(state.leftX, state.leftW)}
            {"  =  "}
            {sideText(state.rightX, state.rightW)}
          </div>
          {/* balance visual — wobbles on every applied op, pans glow at target */}
          <div className={"fb-beam-wrap fb-beam" + (wobble ? " wobble" : "")}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <div
                className={"fb-pan" + (atTarget ? " glow" : "")}
                style={{
                  background: "var(--green-50)",
                  border: "2px solid var(--green-200)",
                  minHeight: 110,
                }}
              >
                <div className="gp-eyebrow">{t("exercise.equationBalance.left")}</div>
                {renderItems("x", state.leftX, "var(--green-600)", "var(--green-700)")}
                {renderItems("w", state.leftW, "var(--sun-400)", "var(--sun-500)")}
              </div>
              <div
                className={"fb-pan" + (atTarget ? " glow" : "")}
                style={{
                  background: "var(--sun-50)",
                  border: "2px solid var(--sun-300)",
                  minHeight: 110,
                }}
              >
                <div className="gp-eyebrow">{t("exercise.equationBalance.right")}</div>
                {renderItems("x", state.rightX, "var(--green-600)", "var(--green-700)")}
                {renderItems("w", state.rightW, "var(--sun-400)", "var(--sun-500)")}
              </div>
            </div>
            {/* fulcrum */}
            <div
              style={{
                height: 10,
                background: "var(--ink-700)",
                borderRadius: 999,
                margin: "10px 40px 0",
              }}
            />
            <div
              style={{
                width: 14,
                height: 22,
                background: "var(--ink-700)",
                borderRadius: "0 0 6px 6px",
                margin: "0 auto",
              }}
            />
          </div>
          {/* ops */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={() => subtractWeight(1)}
              disabled={!!feedback || state.leftW < 1 || state.rightW < 1}
              className="gp-tile fb-op"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
              }}
            >
              {t("exercise.equationBalance.opSubtract").replace("{n}", "1")}
            </button>
            <button
              type="button"
              onClick={() => subtractWeight(4)}
              disabled={!!feedback || state.leftW < 4 || state.rightW < 4}
              className="gp-tile fb-op"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
              }}
            >
              {t("exercise.equationBalance.opSubtract").replace("{n}", "4")}
            </button>
            <button
              type="button"
              onClick={subtractX}
              disabled={!!feedback || state.leftX < 1 || state.rightX < 1}
              className="gp-tile fb-op"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
              }}
            >
              {t("exercise.equationBalance.opSubtractX")}
            </button>
            <button
              type="button"
              onClick={divide}
              disabled={!!feedback || state.leftX < 2}
              className="gp-tile fb-op"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
              }}
            >
              ÷ {state.leftX > 1 ? state.leftX : "…"}
            </button>
          </div>
          {/* applied-move chips */}
          <div
            style={{
              display: "flex",
              gap: 6,
              justifyContent: "center",
              flexWrap: "wrap",
              marginTop: 14,
              minHeight: 22,
            }}
          >
            {moves.map((m, i) => (
              <span key={i} className="fb-move-chip">
                {/* moves keep their full onFinish form; chips show the bare op symbol */}
                {m.split(" ")[0]}
              </span>
            ))}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
