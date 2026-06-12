"use client";

/**
 * EquationSolverV2 — guided step-by-step algebra solve.
 *
 * Adopted from q-math-templates.jsx · EquationSolverExerciseV2.
 * Methodist supplies the starting equation + an ordered sequence of
 * steps, each with multiple operation options (only one correct).
 * Wrong picks shake red, cost a heart and get struck out (ES-01);
 * correct picks append the new left/right state to the chain.
 * Reaching the last step = task solved; running out of hearts reveals
 * the correct move sequence as a structured list.
 *
 * ES-03: lesson position ("2 / 3") rides the LessonShell top bar via
 * step/totalSteps. ES-02: shake uses the shared `.gp-tile.wrong`
 * fb-shake class instead of private keyframes.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";

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
  /** ES-01: wrong picks cost a heart; at 0 the move sequence is revealed. */
  maxAttemptsPerTask?: number;
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
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: EquationSolverV2Props) {
  const { t } = useTranslation();
  const [chain, setChain] = useState<ChainRow[]>([
    { ...initial, op: null },
  ]);
  const [shake, setShake] = useState<string | null>(null);
  /** ES-01: option ids struck out at the CURRENT step (reset on advance). */
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [step, setStep] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [lostHeart, setLostHeart] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  /** Out-of-hearts reveal: the correct move at every step (FIX-10 list). */
  const revealChain = (): [string, string][] =>
    steps.map((s, i) => {
      const okOpt = s.options.find((o) => o.ok);
      return [
        t("exercise.equationSolver.stepLabel").replace("{n}", String(i + 1)),
        okOpt ? okOpt.label : "?",
      ];
    });

  const pick = (opt: SolverOption) => {
    if (feedback) return;
    if (!opt.ok || !opt.after) {
      // ES-01: wrong pick costs a heart and eliminates the option.
      setShake(opt.id);
      setWrongAttempts((w) => w + 1);
      setEliminated((els) => [...els, opt.id]);
      setLostHeart(true);
      setTimeout(() => {
        setShake(null);
        setLostHeart(false);
      }, 500);
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) {
        setTimeout(() => {
          setFeedback({
            kind: "no",
            msg: t("exercise.outOfAttempts"),
            correctList: revealChain(),
          });
          setStreak(0);
        }, 450);
      }
      return;
    }
    setEliminated([]);
    setChain([...chain, { left: opt.after.left, right: opt.after.right, op: opt.label }]);
    if (step === steps.length - 1) {
      setTimeout(() => {
        setFeedback({ kind: "ok", msg: t("exercise.equationSolver.solved") });
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
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        lostHeart={lostHeart}
        streak={streak}
        step={Math.min(step + 1, steps.length)}
        totalSteps={steps.length}
        eyebrow={eyebrow}
        title={title ?? t("exercise.equationSolver.title")}
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
                      i === chain.length - 1 && feedback?.kind === "ok"
                        ? "var(--green-50)"
                        : "var(--paper-2)",
                    border: `2px solid ${i === chain.length - 1 && feedback?.kind === "ok" ? "var(--green-500)" : "var(--ink-100)"}`,
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
                  <MaybeMath text={`${row.left} = ${row.right}`} />
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
                <MaybeMath text={steps[step].label} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {steps[step].options.map((opt) => {
                  const isElim = eliminated.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => !isElim && pick(opt)}
                      disabled={isElim}
                      // ES-02: shared fb-shake via .gp-tile.wrong; ES-01:
                      // struck-out options stay disabled via .eliminated.
                      className={
                        "gp-tile" +
                        (shake === opt.id
                          ? " wrong"
                          : isElim
                            ? " eliminated"
                            : "")
                      }
                      style={{
                        padding: "14px 18px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 16,
                      }}
                    >
                      <MaybeMath text={opt.label} />
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </LessonShell>
    </div>
  );
}
