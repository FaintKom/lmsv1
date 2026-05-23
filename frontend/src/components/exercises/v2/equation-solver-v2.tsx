"use client";

/**
 * EquationSolverV2 — guided step-by-step algebra solve.
 *
 * Adopted from q-math-templates.jsx · EquationSolverExerciseV2.
 * Methodist supplies the starting equation + an ordered sequence of
 * steps, each with multiple operation options (only one correct).
 * Wrong picks shake red and snap back; correct picks append the new
 * left/right state to the chain. Reaching the last step = task solved.
 *
 * No traditional HP — the shake-on-wrong already gives in-context
 * feedback; finishing the chain = +1 streak. (Methodist can wrap a
 * timer or retry budget at a higher layer if desired.)
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface SolverState {
  left: string;
  right: string;
}

export interface SolverOption {
  id: string;
  label: string;
  /** True for the correct option at this step. */
  ok?: boolean;
  /** State to apply when this option is picked (only meaningful when ok=true). */
  after?: SolverState;
}

export interface SolverStep {
  label: string;
  options: SolverOption[];
}

export interface EquationSolverV2Props {
  initial: SolverState;
  steps: SolverStep[];
  eyebrow?: string;
  title?: string;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    wrongAttempts: number;
    streak: number;
  }) => void;
}

interface ChainRow extends SolverState {
  op: string | null;
}

export function EquationSolverV2({
  initial,
  steps,
  eyebrow,
  title = "Pick the next move",
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: EquationSolverV2Props) {
  const [chain, setChain] = useState<ChainRow[]>([
    { ...initial, op: null },
  ]);
  const [shake, setShake] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const pick = (opt: SolverOption) => {
    if (feedback) return;
    if (!opt.ok || !opt.after) {
      setShake(opt.id);
      setWrongAttempts((w) => w + 1);
      setTimeout(() => setShake(null), 400);
      return;
    }
    setChain([...chain, { left: opt.after.left, right: opt.after.right, op: opt.label }]);
    if (step === steps.length - 1) {
      setTimeout(() => {
        setFeedback({ kind: "ok", msg: "Solved!" });
        setStreak((s) => s + 1);
        fire();
      }, 250);
    } else {
      setStep(step + 1);
    }
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      wrongAttempts,
      streak,
    });
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        streak={streak}
        eyebrow={eyebrow}
        title={title}
        feedback={feedback}
        canCheck={false}
        onCheck={() => {}}
        showSkip={false}
        onContinue={handleContinue}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginBottom: 18,
            }}
          >
            {chain.map((row, i) => (
              <div key={i}>
                {row.op && (
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-400)",
                      textAlign: "center",
                      padding: "2px 0",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    ↓ {row.op}
                  </div>
                )}
                <div
                  style={{
                    background:
                      i === chain.length - 1 && feedback
                        ? "var(--green-50)"
                        : "var(--paper-2)",
                    border: `2px solid ${i === chain.length - 1 && feedback ? "var(--green-500)" : "var(--ink-100)"}`,
                    borderRadius: 14,
                    padding: "12px 18px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--ink-900)",
                    textAlign: "center",
                    letterSpacing: "0.04em",
                  }}
                >
                  {row.left} = {row.right}
                </div>
              </div>
            ))}
          </div>
          {!feedback && step < steps.length && (
            <>
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 10,
                  fontSize: 14,
                  color: "var(--ink-700)",
                  fontWeight: 600,
                }}
              >
                {steps[step].label}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {steps[step].options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => pick(opt)}
                    className="gp-tile"
                    style={{
                      padding: "14px 18px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 16,
                      animation: shake === opt.id ? "gp-shake 400ms" : "none",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </LessonShell>
      <style>{`@keyframes gp-shake { 0% { transform: translateX(0); } 25% { transform: translateX(-6px); background: var(--coral-50); } 75% { transform: translateX(6px); background: var(--coral-50); } 100% { transform: translateX(0); } }`}</style>
    </div>
  );
}
