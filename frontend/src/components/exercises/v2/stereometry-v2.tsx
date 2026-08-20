"use client";

/**
 * StereometryV2 — a solid, and the one number the student has to work out.
 *
 * The answer is numeric, so the marking is the same shape as NumericInputV2's.
 * What earns the separate type is the solid itself: it is drawn, it turns, and
 * the measurements are listed beside it, so "which length is the slant" stops
 * being a guess at a flat picture.
 *
 * Grading is the server's whenever `onGrade` is supplied — the config a
 * student receives carries the shape and its measurements but no answer, and
 * `_submit_stereometry` recomputes it. Without a server (a static lesson step,
 * or a teacher's preview) it falls back to the same formulas in `lib/math`.
 */

import { useCallback, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";

import { LessonShell, useConfetti, type LessonFeedback } from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";
import type { V2GradeFn } from "@/lib/exercises/v2-adapter";
import {
  computeSolid,
  dimensionsFor,
  isQuantity,
  isSolid,
  placesFor,
  roundTo,
  type Solid,
} from "@/lib/math/solids";

// three.js only loads once a student actually reaches this task.
const SolidView = dynamic(
  () => import("@/components/exercises/v2/solid-view").then((m) => m.SolidView),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 260,
          borderRadius: 12,
          background: "var(--color-surface-2)",
          border: "1px solid var(--color-border)",
        }}
      />
    ),
  },
);

export interface StereometryV2Props {
  solid: string;
  dimensions: Record<string, unknown>;
  quantity: string;
  /** Decimal places the answer is asked to. Default 2. */
  decimals?: number;
  problem?: string;
  explain?: string;
  eyebrow?: string;
  title?: string;
  /** Unit shown beside the answer box: cm, m, … */
  unit?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onGrade?: V2GradeFn;
  onAnswersChange?: (answers: Record<string, unknown>) => void;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
}

/** Comma to dot, one dot, optional leading minus — the same habit-forgiving
 *  rule as NumericInputV2. A Russian keyboard types the decimal as a comma. */
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

/** Respects the OS setting rather than spinning a shape at someone who asked
 *  the whole system to stop moving. globals.css collapses CSS animation, but
 *  OrbitControls autoRotate runs in JS and never sees that. */
function useReducedMotion(): boolean {
  const subscribe = useCallback((onChange: () => void) => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    // Server-rendered: assume motion is fine and correct on hydration, which
    // is the safe way round — the alternative renders a still shape for
    // everyone.
    () => false,
  );
}

export function StereometryV2({
  solid: rawSolid,
  dimensions: rawDimensions,
  quantity: rawQuantity,
  decimals,
  problem,
  explain,
  eyebrow,
  title,
  unit,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onGrade,
  onAnswersChange,
  onQuit,
  onFinish,
}: StereometryV2Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  // Props are hand-edited JSON, and the lesson editor hands over the previous
  // type's props when a methodist switches the dropdown. Nothing here may
  // assume a shape — see the crash MathSystemV2 caused in production.
  const solid: Solid | null = isSolid(rawSolid) ? rawSolid : null;
  const quantity = isQuantity(rawQuantity) ? rawQuantity : null;
  const needed = solid ? dimensionsFor(solid) : [];
  const dimensions: Record<string, number> = {};
  if (solid && rawDimensions && typeof rawDimensions === "object") {
    for (const name of needed) {
      const raw = (rawDimensions as Record<string, unknown>)[name];
      const value = typeof raw === "string" ? parseFloat(raw) : raw;
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        dimensions[name] = value;
      }
    }
  }
  const ready = !!solid && !!quantity && Object.keys(dimensions).length === needed.length;

  const places = placesFor(decimals);
  const exact = ready ? computeSolid(solid, dimensions, quantity) : null;

  const [val, setVal] = useState("");
  const [inputState, setInputState] = useState<"" | "ok" | "no">("");
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [checking, setChecking] = useState(false);
  const { fire, layer } = useConfetti();

  const typed = parseFloat(val);
  const canCheck = ready && Number.isFinite(typed) && !checking && !feedback;

  const loseHeart = () => {
    setInputState("no");
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
  };

  const sayCorrect = () => {
    setInputState("ok");
    setFeedback({
      kind: "ok",
      msg: usedAttempts === 0 ? t("exercise.stereometry.right") : t("exercise.gotIt"),
    });
    setStreak((s) => s + 1);
    fire();
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
    // Feedback grammar: with attempts left the error tint clears so the
    // student can retype calmly.
    setTimeout(() => setInputState(""), 700);
  };

  const handleCheck = async () => {
    if (!canCheck) return;
    setChecking(true);
    try {
      if (onGrade) {
        const result = await onGrade({ value: typed });
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
        // Only the server's answer is shown; computing it here would print
        // the answer into the page of a live exercise.
        if (result.maxReached || remaining <= 0) {
          sayOutOfAttempts(result.correctAnswer, result.explain);
        } else {
          sayTryAgain(remaining);
        }
        return;
      }

      // No server: mark against the same formulas the server uses, with half
      // a unit in the last requested place, matching _submit_stereometry.
      const expected = exact === null ? null : roundTo(exact, places);
      const ok = expected !== null && Math.abs(typed - expected) <= 0.5 * 10 ** -places;
      if (ok) {
        sayCorrect();
        return;
      }
      loseHeart();
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) sayOutOfAttempts(expected === null ? undefined : String(expected));
      else sayTryAgain(remaining);
    } finally {
      setChecking(false);
    }
  };

  const handleRetry = () => {
    setFeedback(null);
    setInputState("");
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const quantityLabel = quantity ? t(`exercise.stereometry.q.${quantity}`) : "";
  const solidLabel = solid ? t(`exercise.stereometry.solid.${solid}`) : "";

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.stereometry.title")}
        feedback={feedback}
        canCheck={canCheck}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={feedback?.kind === "no" && attemptsLeft > 0 ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 420, margin: "0 auto", textAlign: "center" }}>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              color: "var(--color-text-muted)",
              marginBottom: 12,
            }}
          >
            {problem ? (
              <MaybeMath text={problem} />
            ) : ready ? (
              t("exercise.stereometry.ask")
                .replace("{quantity}", quantityLabel.toLowerCase())
                .replace("{solid}", solidLabel.toLowerCase())
            ) : solid ? (
              // Тело выбрано, не хватает размеров — так и сказать. Раньше
              // здесь стояло «тело не выбрано» на все случаи сразу.
              t("exercise.stereometry.unsized")
            ) : (
              t("exercise.stereometry.unset")
            )}
          </p>

          {ready && solid && (
            <SolidView solid={solid} dimensions={dimensions} autoRotate={!reducedMotion} />
          )}

          {ready && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              {needed.map((name) => (
                <span
                  key={name}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "var(--color-text)",
                    background: "var(--color-surface-2)",
                    borderRadius: 8,
                    padding: "4px 10px",
                  }}
                >
                  {name} = {dimensions[name]}
                  {unit ? ` ${unit}` : ""}
                </span>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <input
              type="text"
              inputMode="decimal"
              aria-label={t("exercise.stereometry.ariaAnswer")}
              value={val}
              onChange={(e) => {
                const next = sanitizeNum(e.target.value);
                setVal(next);
                setInputState("");
                onAnswersChange?.({ value: parseFloat(next) });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCheck) handleCheck();
              }}
              disabled={!!feedback || !ready}
              placeholder="?"
              className={"fb-input " + inputState}
              style={{ width: 160 }}
            />
            {unit && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 15,
                  color: "var(--color-text-muted)",
                }}
              >
                {quantity === "volume" ? `${unit}³` : `${unit}²`}
              </span>
            )}
          </div>

          <p
            style={{
              marginTop: 10,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "var(--color-text-subtle)",
            }}
          >
            {places === 0
              ? t("exercise.stereometry.roundWhole")
              : t("exercise.stereometry.roundTo").replace("{n}", String(places))}
          </p>
        </div>
      </LessonShell>
    </div>
  );
}
