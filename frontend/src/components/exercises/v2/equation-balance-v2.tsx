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
  const [stack, setStack] = useState<ScaleState[]>([]); // EB-03 undo stack
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

  const apply = (next: ScaleState, label: string) => {
    if (feedback) return;
    setStack((st) => [...st, state]);
    setState(next);
    setMoves((m) => [...m, label]);
    triggerWobble();
  };

  /** EB-03: step back one move. */
  const undo = () => {
    if (feedback || stack.length === 0) return;
    setState(stack[stack.length - 1]);
    setStack((st) => st.slice(0, -1));
    setMoves((m) => m.slice(0, -1));
  };

  /**
   * EB-01: derive the op buttons from the live scale state instead of a
   * hardcoded set — the old fixed "−4" was dead on most configs. Offered:
   * −1, −minW (when >1), −x (when both sides hold x), ÷n (when divisible).
   */
  const minW = Math.min(state.leftW, state.rightW);
  const divisible =
    state.leftX >= 2 &&
    state.leftW % state.leftX === 0 &&
    state.rightW % state.leftX === 0 &&
    state.rightX === 0;
  const ops: { label: string; disabled?: boolean; why?: string; run: () => void }[] = [];
  if (minW >= 1)
    ops.push({
      label: t("exercise.equationBalance.opSubtract").replace("{n}", "1"),
      run: () =>
        apply({ ...state, leftW: state.leftW - 1, rightW: state.rightW - 1 }, "−1"),
    });
  if (minW > 1)
    ops.push({
      label: t("exercise.equationBalance.opSubtract").replace("{n}", String(minW)),
      run: () =>
        apply(
          { ...state, leftW: state.leftW - minW, rightW: state.rightW - minW },
          `−${minW}`
        ),
    });
  if (state.leftX >= 1 && state.rightX >= 1)
    ops.push({
      label: t("exercise.equationBalance.opSubtractX"),
      run: () =>
        apply({ ...state, leftX: state.leftX - 1, rightX: state.rightX - 1 }, "−x"),
    });
  if (state.leftX >= 2)
    ops.push({
      label: `÷ ${state.leftX}`,
      disabled: !divisible,
      // EB-04: a disabled ÷ explains itself instead of dead-clicking.
      why: !divisible ? t("exercise.equationBalance.divideWhy") : undefined,
      run: () =>
        apply(
          {
            leftX: 1,
            leftW: state.leftW / state.leftX,
            rightX: 0,
            rightW: state.rightW / state.leftX,
          },
          `÷${state.leftX}`
        ),
    });

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
    setStack([]);
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
        canCheck={moves.length > 0 && !feedback}
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
            {ops.map((op) => (
              <button
                key={op.label}
                type="button"
                onClick={op.run}
                disabled={!!feedback || op.disabled}
                title={op.why}
                className="gp-tile fb-op"
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  fontFamily: "var(--font-mono)",
                  opacity: op.disabled ? 0.5 : 1,
                }}
              >
                {op.label}
              </button>
            ))}
            <button
              type="button"
              onClick={undo}
              disabled={!!feedback || stack.length === 0}
              className="gp-tile fb-op"
              style={{
                padding: "8px 14px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                opacity: stack.length === 0 ? 0.5 : 1,
              }}
            >
              ↩ {t("exercise.equationBalance.undo")}
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
