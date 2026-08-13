"use client";

/**
 * MathSystemV2 — a system of linear equations.
 *
 * What separates this from "type a number" is that the answer has three
 * shapes, not one: the lines cross, they are parallel, or they are the same
 * line written twice. A student who only ever computes x and y has not
 * learned the topic, so the shape is chosen first and the boxes for the
 * values appear only under "one solution".
 *
 * Grading is the server's when `onGrade` is supplied (integrity model B — the
 * config a student receives carries no answer, and `_submit_math_system`
 * re-solves from the teacher's equations). Without it — a static lesson step,
 * or the teacher's own preview — it falls back to solving locally.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";
import type { V2GradeFn } from "@/lib/exercises/v2-adapter";
import { readSystem, solveSystem, type SolutionKind } from "@/lib/math/linear-system";
import { GridAxes } from "@/components/exercises/v2/_grid-axes";

export interface MathSystemV2Props {
  /** Each equation as the teacher typed it: "2x + 3y = 12". */
  equations: string[];
  /** Defaults to x and y. Order fixes the order of the answer boxes. */
  variables?: string[];
  problem?: string;
  explain?: string;
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  /** Server grading. Absent means grade locally. */
  onGrade?: V2GradeFn;
  onAnswersChange?: (answers: Record<string, unknown>) => void;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
}

const KINDS: SolutionKind[] = ["unique", "none", "infinite"];
const PLOT_SIZE = 260;
const PLOT_PAD = 18;
const PLOT_RANGE = 10;
const LINE_COLORS = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)"];

/** Comma → dot, one dot, optional leading minus. Same habit-forgiving rule
 *  as NumericInputV2 — a Russian keyboard types the decimal as a comma. */
const sanitizeNum = (s: string): string => {
  let out = "";
  let hasDot = false;
  for (const raw of s) {
    const ch = raw === "," ? "." : raw;
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !hasDot) {
      out += ".";
      hasDot = true;
    } else if ((ch === "-" || ch === "−") && out === "") out += "-";
  }
  return out;
};

export function MathSystemV2({
  equations,
  variables = ["x", "y"],
  problem,
  explain,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onGrade,
  onAnswersChange,
  onQuit,
  onFinish,
}: MathSystemV2Props) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<SolutionKind | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [checking, setChecking] = useState(false);
  const { fire, layer } = useConfetti();

  const rows = readSystem(equations, variables);
  // Two variables draw as two lines. Three do not draw at all — a projection
  // of three planes onto a square is a worse explanation than no picture.
  const drawable = rows && variables.length === 2 ? rows : null;

  const answer = () => ({
    kind,
    values:
      kind === "unique"
        ? Object.fromEntries(variables.map((v) => [v, parseFloat(values[v] ?? "")]))
        : {},
  });

  const setValue = (variable: string, raw: string) => {
    const next = { ...values, [variable]: sanitizeNum(raw) };
    setValues(next);
    onAnswersChange?.({ kind, values: next });
  };

  const chooseKind = (next: SolutionKind) => {
    setKind(next);
    onAnswersChange?.({ kind: next, values });
  };

  const ready =
    kind !== null &&
    (kind !== "unique" || variables.every((v) => Number.isFinite(parseFloat(values[v] ?? ""))));

  /** Local marking, for a lesson step with no server behind it. */
  const gradeLocally = (): boolean => {
    if (!rows) return false;
    const expected = solveSystem(rows, variables);
    if (expected.kind !== kind) return false;
    if (expected.kind !== "unique") return true;
    return variables.every(
      (v) => Math.abs((expected.values?.[v] ?? NaN) - parseFloat(values[v] ?? "")) < 1e-6,
    );
  };

  const describeLocalAnswer = (): string | undefined => {
    if (!rows) return undefined;
    const solution = solveSystem(rows, variables);
    if (solution.kind === "none") return t("exercise.mathSystem.kindNone");
    if (solution.kind === "infinite") return t("exercise.mathSystem.kindInfinite");
    return variables.map((v) => `${v} = ${solution.values?.[v]}`).join(", ");
  };

  const loseHeart = () => {
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
  };

  const sayOutOfAttempts = (correctAnswer?: string, serverExplain?: string) => {
    setFeedback({
      kind: "no",
      msg: t("exercise.outOfAttempts"),
      correct: correctAnswer,
      explain: serverExplain ?? explain,
    });
    setStreak(0);
  };

  const sayTryAgain = (remaining: number) => {
    setFeedback({
      kind: "no",
      msg: (remaining === 1
        ? t("exercise.notQuiteAttemptLeft")
        : t("exercise.notQuiteAttemptsLeft")
      ).replace("{n}", String(remaining)),
    });
  };

  const sayCorrect = () => {
    setFeedback({
      kind: "ok",
      msg: usedAttempts === 0 ? t("exercise.mathSystem.right") : t("exercise.gotIt"),
    });
    setStreak((s) => s + 1);
    fire();
  };

  const handleCheck = async () => {
    if (!ready || checking || feedback) return;
    setChecking(true);
    try {
      if (onGrade) {
        const result = await onGrade(answer());
        if (result.correct) {
          if (typeof result.attemptsRemaining === "number") {
            setAttemptsLeft(result.attemptsRemaining);
          }
          sayCorrect();
          return;
        }
        loseHeart();
        const remaining = result.attemptsRemaining ?? attemptsLeft - 1;
        setAttemptsLeft(Math.max(0, remaining));
        // Only the server's answer is shown. Solving locally to fill this in
        // would print the answer into the page of a live exercise.
        if (result.maxReached || remaining <= 0) {
          sayOutOfAttempts(result.correctAnswer, result.explain);
        } else {
          sayTryAgain(remaining);
        }
        return;
      }

      if (gradeLocally()) {
        sayCorrect();
        return;
      }
      loseHeart();
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) sayOutOfAttempts(describeLocalAnswer());
      else sayTryAgain(remaining);
    } finally {
      setChecking(false);
    }
  };

  const handleRetry = () => setFeedback(null);

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const scale = (PLOT_SIZE - PLOT_PAD * 2) / (PLOT_RANGE * 2);
  const toX = (v: number) => PLOT_PAD + (v + PLOT_RANGE) * scale;
  const toY = (v: number) => PLOT_PAD + (PLOT_RANGE - v) * scale;

  /** Endpoints of one line inside the plotting window, or null if the
   *  equation degenerates to 0 = c and has no line to draw. */
  const segment = (coefficients: number[], constant: number) => {
    const [a, b] = coefficients;
    const R = PLOT_RANGE;
    if (Math.abs(b) > 1e-9) {
      return {
        x1: toX(-R),
        y1: toY((constant - a * -R) / b),
        x2: toX(R),
        y2: toY((constant - a * R) / b),
      };
    }
    if (Math.abs(a) > 1e-9) {
      const x = constant / a;
      return { x1: toX(x), y1: toY(-R), x2: toX(x), y2: toY(R) };
    }
    return null;
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.mathSystem.title")}
        feedback={feedback}
        canCheck={ready && !checking}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={feedback?.kind === "no" && attemptsLeft > 0 ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          {problem && (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: 15,
                color: "var(--color-text-muted)",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              <MaybeMath text={problem} />
            </p>
          )}

          {/* The system, braced. Three borders rather than a "{" glyph: the
              glyph does not stretch to an arbitrary number of rows. */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 10,
              alignItems: "stretch",
              marginBottom: 16,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                width: 12,
                borderLeft: "2px solid var(--color-border-strong)",
                borderTop: "2px solid var(--color-border-strong)",
                borderBottom: "2px solid var(--color-border-strong)",
                borderRadius: "8px 0 0 8px",
              }}
            />
            <div style={{ display: "grid", gap: 6, padding: "6px 0" }}>
              {equations.map((equation, i) => (
                <div
                  key={`${equation}-${i}`}
                  className="fb-formula"
                  style={{ fontSize: 18, textAlign: "left" }}
                >
                  <MaybeMath text={equation} />
                </div>
              ))}
            </div>
          </div>

          {drawable && (
            <svg
              viewBox={`0 0 ${PLOT_SIZE} ${PLOT_SIZE}`}
              width={PLOT_SIZE}
              height={PLOT_SIZE}
              role="img"
              aria-label={t("exercise.mathSystem.plotAlt")}
              style={{ display: "block", margin: "0 auto 16px", maxWidth: "100%" }}
            >
              <GridAxes range={PLOT_RANGE} size={PLOT_SIZE} pad={PLOT_PAD} ticks={false} />
              {drawable.map((row, i) => {
                const line = segment(row.coefficients, row.constant);
                if (!line) return null;
                return (
                  <line
                    key={i}
                    {...line}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    // Two identical lines would hide one another completely;
                    // dashing every line after the first keeps the overlap
                    // visible, which is exactly the "infinitely many" case.
                    strokeDasharray={i === 0 ? undefined : "7 5"}
                  />
                );
              })}
            </svg>
          )}

          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 13,
              color: "var(--color-text-muted)",
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {t("exercise.mathSystem.prompt")}
          </p>

          <div
            role="radiogroup"
            aria-label={t("exercise.mathSystem.prompt")}
            style={{ display: "grid", gap: 8 }}
          >
            {KINDS.map((option) => {
              const selected = kind === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={!!feedback}
                  onClick={() => chooseKind(option)}
                  style={{
                    minHeight: 48,
                    padding: "10px 14px",
                    borderRadius: 12,
                    textAlign: "left",
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: feedback ? "default" : "pointer",
                    background: selected ? "var(--color-primary-soft)" : "var(--color-surface)",
                    color: "var(--color-text)",
                    border: `2px solid ${selected ? "var(--color-primary)" : "var(--color-border-strong)"}`,
                    opacity: feedback ? 0.7 : 1,
                    transition: "background 150ms, border-color 150ms",
                  }}
                >
                  {t(`exercise.mathSystem.kind${option[0].toUpperCase()}${option.slice(1)}`)}
                </button>
              );
            })}
          </div>

          {kind === "unique" && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 12,
                marginTop: 14,
              }}
            >
              {variables.map((variable) => (
                <label
                  key={variable}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 17,
                    color: "var(--color-text)",
                  }}
                >
                  {variable} =
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label={t("exercise.mathSystem.ariaValue").replace("{v}", variable)}
                    value={values[variable] ?? ""}
                    onChange={(e) => setValue(variable, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && ready && !feedback) handleCheck();
                    }}
                    disabled={!!feedback}
                    placeholder="?"
                    className="fb-input"
                    style={{ width: 96 }}
                  />
                </label>
              ))}
            </div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}
