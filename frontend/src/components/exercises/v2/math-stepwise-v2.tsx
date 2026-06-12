"use client";

/**
 * MathStepwiseV2 — show-your-work line-by-line solver.
 *
 * Adopted from q-math.jsx · MathStepwiseExerciseV2. Methodist supplies
 * the problem statement + an ordered list of expected intermediate
 * steps. Student types each line; Check validates per-line (whitespace
 * + case insensitive). Per-step green/coral border on submit.
 *
 * Per-task HP + streak; retry keeps typed steps so student fixes only
 * the wrong lines.
 */

import { useRef, useState } from "react";
import { Check, X } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";

export interface MathStepwiseStep {
  /** Short label rendered to the left (e.g. "Step 1"). */
  label: string;
  /** Expected canonical form. Whitespace + case ignored on match. */
  expected: string;
  /** Placeholder + final-reveal hint. */
  hint?: string;
}

export interface MathStepwiseV2Props {
  problem: string;
  steps: MathStepwiseStep[];
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

const norm = (s: string) =>
  s.replace(/\s+/g, "").replace(/,/g, ".").toLowerCase();

/**
 * MS-02: tolerant step comparison. Literal matching failed honest answers:
 * "x=5.0" ≠ "x=5", ".5" ≠ "0.5", and flipped sides ("5=x") all cost hearts.
 * Accept numeric equivalence and side-flipped equations.
 */
const stepsMatch = (got: string, expected: string): boolean => {
  const a = norm(got);
  const b = norm(expected);
  if (a === b) return true;
  const numEq = (x: string, y: string) => {
    const nx = parseFloat(x);
    const ny = parseFloat(y);
    return Number.isFinite(nx) && Number.isFinite(ny) && Math.abs(nx - ny) < 1e-9;
  };
  if (numEq(a, b)) return true;
  const pa = a.split("=");
  const pb = b.split("=");
  if (pa.length === 2 && pb.length === 2) {
    const sideEq = (s1: string, s2: string) => s1 === s2 || numEq(s1, s2);
    return (
      (sideEq(pa[0], pb[0]) && sideEq(pa[1], pb[1])) ||
      (sideEq(pa[0], pb[1]) && sideEq(pa[1], pb[0]))
    );
  }
  return false;
};

export function MathStepwiseV2({
  problem,
  steps,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: MathStepwiseV2Props) {
  const { t } = useTranslation();
  const [values, setValues] = useState<string[]>(() => steps.map(() => ""));
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const allFilled = values.every((v) => v.trim().length > 0);
  const correctSummary = steps
    .map((s) => `${s.label}: ${s.expected}`)
    .join(" · ");

  const handleCheck = () => {
    const okFlags = steps.map((s, i) => stepsMatch(values[i], s.expected));
    const allOk = okFlags.every(Boolean);
    if (allOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.mathStepwise.allCorrect") : t("exercise.gotIt"),
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
        msg: t("exercise.outOfAttempts"),
        correct: correctSummary,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.mathStepwise.checkHighlightedOne") : t("exercise.mathStepwise.checkHighlighted")).replace("{n}", String(remaining)),
      });
    }
  };

  const handleRetry = () => {
    setFeedback(null);
    // Correct rows are preserved; jump the caret to the first wrong line.
    const firstBad = steps.findIndex(
      (s, i) => !stepsMatch(values[i], s.expected)
    );
    setTimeout(() => {
      if (firstBad >= 0) inputRefs.current[firstBad]?.focus();
    }, 60);
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const finalReveal = feedback?.kind === "no" && !canRetry;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.mathStepwise.title")}
        feedback={feedback}
        canCheck={allFilled}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          {problem && (
            <div className="fb-formula" style={{ marginBottom: 16 }}>
              <MaybeMath text={problem} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {steps.map((s, i) => {
              const isOk = !!feedback && stepsMatch(values[i], s.expected);
              const state = !feedback ? "" : isOk ? " ok" : " no";
              return (
                <div key={i} className="fb-step-row">
                  <span className="fb-step-label">{s.label}</span>
                  <input
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    className={"fb-step-input" + state}
                    value={values[i]}
                    onChange={(e) => {
                      const next = values.slice();
                      next[i] = e.target.value;
                      setValues(next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      if (i < steps.length - 1) {
                        inputRefs.current[i + 1]?.focus();
                      } else if (allFilled && !feedback) {
                        handleCheck();
                      }
                    }}
                    disabled={!!feedback}
                    placeholder={s.hint}
                  />
                  {finalReveal && (
                    <span
                      style={{
                        width: 22,
                        color: isOk ? "var(--green-600)" : "var(--coral-500)",
                      }}
                    >
                      {isOk ? <Check size={20} /> : <X size={20} />}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div
            style={{
              marginTop: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ink-300)",
              textAlign: "center",
            }}
          >
            {t("exercise.mathStepwise.enterHint")}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
