"use client";

/**
 * QuizV2 — Duolingo-style multiple choice exercise.
 *
 * Adopted from 2026-05-23 design package (q-basics.jsx · QuizExerciseV2).
 * Reads existing { questions: [{ question_text, options: [{text, is_correct}] }] }
 * config (same shape the legacy QuizTaker uses), but renders one question at a
 * time inside a LessonShell.
 *
 * Hearts model (per user · 2026-05-23):
 *   - Each task has its OWN heart pool, sized by `maxAttemptsPerTask`
 *     (default 3). On a wrong attempt the count drops by 1, the pill
 *     pulses, and the student can pick again.
 *   - At 0 attempts the task ends: feedback sheet reveals the canonical
 *     answer with a Continue button, and the streak resets.
 *   - Switching to the next task RESETS the heart pool.
 *
 * Streak model:
 *   - `streak` is the running count of tasks the student has correctly
 *     solved in this session. Starts at 0.
 *   - +1 each time a task ends "ok" (correct, however many attempts it
 *     took). Resets to 0 only when a task ends "no" (all attempts
 *     exhausted without a correct pick).
 */

import { useEffect, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";

export interface QuizV2Question {
  question_text: string;
  options: { text: string; is_correct?: boolean }[];
}

export interface QuizV2Props {
  questions: QuizV2Question[];
  /** Optional eyebrow line (e.g. course / lesson position). */
  eyebrow?: string;
  /** Maximum attempts the student has on each individual question. Default 3. */
  maxAttemptsPerTask?: number;
  /** Override default title; otherwise uses question_text. */
  title?: string;
  /** Called when the methodist exits via the top-left ×. */
  onQuit?: () => void;
  /** Called once when student has finished all questions. */
  onFinish?: (result: {
    correctOnFirstTry: number;
    correctEventually: number;
    total: number;
    finalStreak: number;
  }) => void;
}

export function QuizV2({
  questions,
  eyebrow,
  maxAttemptsPerTask = 3,
  title,
  onQuit,
  onFinish,
}: QuizV2Props) {
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  // QZ-01: indices of wrong picks already tried on this question — they stay
  // struck out + disabled across retries until the task advances.
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(0);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [correctFirstTry, setCorrectFirstTry] = useState(0);
  const [correctEventually, setCorrectEventually] = useState(0);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const q = questions[idx];

  // QZ-02: number keys 1–9 select an option. Window-level so the child does
  // not need to focus a tile first; ignored while a feedback sheet is open
  // or when the event originates from a text input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || feedback) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= Math.min(q.options.length, 9) && !eliminated.includes(n - 1)) {
        setPick(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, feedback, eliminated]);

  if (!q) {
    // QZ-04: friendly empty state for a zero-question config.
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 32,
          height: "100%",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 44 }} aria-hidden="true">
          🪴
        </div>
        <div style={{ fontWeight: 800, fontSize: 19, color: "var(--ink-900)" }}>
          {t("exercise.quiz.emptyTitle")}
        </div>
        <div style={{ color: "var(--ink-500)", fontSize: 14, maxWidth: 300 }}>
          {t("exercise.quiz.emptyBody")}
        </div>
      </div>
    );
  }

  const correctIdx = q.options.findIndex((o) => o.is_correct);

  const handleCheck = () => {
    if (pick === null) return;
    const isCorrect = pick === correctIdx;

    if (isCorrect) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.quiz.exactlyRight") : t("exercise.gotIt"),
      });
      setStreak((s) => s + 1);
      setCorrectEventually((c) => c + 1);
      if (usedAttempts === 0) setCorrectFirstTry((c) => c + 1);
      fire();
      return;
    }

    // Wrong attempt.
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setEliminated((els) => [...els, pick]); // QZ-01
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);

    if (remaining <= 0) {
      // Task fully failed — reveal answer + advance.
      setFeedback({
        kind: "no",
        msg: t("exercise.outOfAttempts"),
        correct: q.options[correctIdx]?.text,
      });
      setStreak(0);
    } else {
      // Still has retries — show wrong sheet with "Try again" CTA.
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining)),
      });
    }
  };

  const handleRetry = () => {
    setFeedback(null);
    setPick(null);
  };

  const handleContinue = () => {
    setFeedback(null);
    setPick(null);
    setEliminated([]); // QZ-01: eliminations are per-question
    setAttemptsLeft(maxAttemptsPerTask);
    setUsedAttempts(0);
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
    } else {
      onFinish?.({
        correctOnFirstTry: correctFirstTry,
        correctEventually,
        total: questions.length,
        finalStreak: streak,
      });
    }
  };

  // Show a retry CTA only when the task is wrong AND there are still attempts.
  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        step={idx + 1}
        totalSteps={questions.length}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ? title : <MaybeMath text={q.question_text} />}
        feedback={feedback}
        canCheck={pick !== null}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          role="radiogroup"
          aria-label={t("exercise.quiz.answerOptionsAria")}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxWidth: 460,
            margin: "0 auto",
            width: "100%",
          }}
        >
          {q.options.map((opt, i) => {
            // Feedback grammar (handoff 2026-06): reveal the correct tile only
            // on a correct pick OR once the task is fully failed — never leak
            // the answer while retries remain.
            const failedOut = feedback?.kind === "no" && attemptsLeft <= 0;
            let state = "";
            if (feedback) {
              if (i === correctIdx && (feedback.kind === "ok" || failedOut)) state = "correct";
              else if (i === pick && feedback.kind === "no") state = "wrong";
              else if (eliminated.includes(i)) state = "eliminated"; // QZ-01
              else state = "locked";
            } else if (eliminated.includes(i)) state = "eliminated"; // QZ-01
            else if (pick === i) state = "selected";
            const isElim = state === "eliminated";
            // QZ-05: prose reads in sans; mono is reserved for math/code-looking
            // options (operators or pure numbers).
            const mathy = /[=+\-×÷^√]|^[\d.,\s]+$/.test(opt.text);
            return (
              <button
                key={i}
                className={"gp-tile " + state}
                disabled={!!feedback || isElim}
                role="radio"
                aria-checked={pick === i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  textAlign: "left",
                  gap: 14,
                  padding: "16px 20px",
                  fontFamily: mathy ? "var(--font-mono)" : "var(--font-sans)",
                  width: "100%",
                }}
                onClick={() => !feedback && !isElim && setPick(i)}
              >
                {/* QZ-03: selection = filled dot; ✓ appears only after grading. */}
                <span className="tile-dot">
                  {state === "wrong" || isElim ? "✕" : state === "correct" ? "✓" : ""}
                </span>
                <span style={{ flex: 1 }}>
                  <MaybeMath text={opt.text} />
                </span>
                {/* QZ-02: index hint for the 1–9 keyboard path. */}
                <span
                  aria-hidden="true"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ink-200)",
                    flex: "none",
                  }}
                >
                  {i + 1}
                </span>
                {state === "correct" && (
                  <span className="tile-chip ok">{t("exercise.quiz.chipCorrect")}</span>
                )}
                {state === "wrong" && (
                  <span className="tile-chip no">{t("exercise.quiz.chipMiss")}</span>
                )}
              </button>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}
