"use client";

/**
 * ReadingV2 — passage on the left, multiple-choice question(s) on the right.
 *
 * Adopted from q-language.jsx · ReadingExerciseV2, upgraded with the
 * feedback-grammar handoff (ex-lang2.jsx · ReadingV2):
 *   - RD-01 the passage|question grid (`.rd-grid`) stacks passage-above in
 *     narrow containers; the passage keeps its own bounded scroll.
 *   - RD-03 multi-question flow: pass `questions[]` and the shell shows
 *     "N / M" step progress; hearts reset per question. The legacy single
 *     `question`/`options`/`correct` props still work unchanged.
 *   - RD-04 eliminated wrong picks stay struck out + disabled across
 *     retries; miss copy nudges "Look back at the story". The correct
 *     option is only revealed when the question is over (no answer leak).
 */

import { useMemo, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface ReadingQuestion {
  question: string;
  options: string[];
  /** 0-based index of correct option. */
  correct: number;
  /** Hint shown alongside wrong-attempt feedback. */
  hint?: string;
}

export interface ReadingV2Props {
  passage: string;
  /** Legacy single-question props — still supported. */
  question?: string;
  options?: string[];
  /** 0-based index of correct option. */
  correct?: number;
  /** Hint shown alongside wrong-attempt feedback. */
  hint?: string;
  /** RD-03: multi-question flow over the same passage (takes precedence). */
  questions?: ReadingQuestion[];
  eyebrow?: string;
  title?: string;
  passageLabel?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

export function ReadingV2({
  passage,
  question,
  options,
  correct,
  hint,
  questions,
  eyebrow,
  title,
  passageLabel,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: ReadingV2Props) {
  const { t } = useTranslation();
  const qs = useMemo<ReadingQuestion[]>(() => {
    if (questions && questions.length > 0) return questions;
    return [
      {
        question: question ?? "",
        options: options ?? [],
        correct: correct ?? 0,
        hint,
      },
    ];
  }, [questions, question, options, correct, hint]);

  const [qIdx, setQIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  /** RD-04: wrong picks eliminated for the current question (persist retries). */
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  /** Wrong attempts on the current question (drives "first try!" copy). */
  const [usedAttempts, setUsedAttempts] = useState(0);
  /** Attempts across the whole task (reported in onFinish). */
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [solved, setSolved] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const q = qs[qIdx];
  const multi = qs.length > 1;

  const handleCheck = () => {
    setTotalAttempts((n) => n + 1);
    if (pick === q.correct) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.reading.right") : t("exercise.gotIt"),
      });
      setStreak((s) => s + 1);
      setSolved((n) => n + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    if (pick !== null) {
      setEliminated((e) => (e.includes(pick) ? e : [...e, pick]));
    }
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.outOfAttempts"),
        correct: q.options[q.correct],
        explain: q.hint,
      });
      setStreak(0);
    } else {
      // RD-04: send the child back to the text, not to guessing.
      setFeedback({
        kind: "no",
        msg: (remaining === 1
          ? t("exercise.reading.lookBackAttempt")
          : t("exercise.reading.lookBackAttempts")
        ).replace("{n}", String(remaining)),
        explain: q.hint,
      });
    }
  };

  const handleRetry = () => {
    setPick(null);
    setFeedback(null);
  };

  const handleContinue = () => {
    if (qIdx + 1 < qs.length) {
      // RD-03: next question — fresh hearts, fresh eliminations.
      setQIdx((i) => i + 1);
      setPick(null);
      setEliminated([]);
      setFeedback(null);
      setAttemptsLeft(maxAttemptsPerTask);
      setUsedAttempts(0);
      return;
    }
    // `solved` already includes the current question when it ended "ok".
    onFinish?.({
      correct: solved === qs.length,
      attemptsUsed: totalAttempts,
      streak,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  /** Answer reveal only when the question is over (no leak on retry). */
  const taskOver = !!feedback && (feedback.kind === "ok" || attemptsLeft <= 0);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        step={multi ? qIdx + 1 : undefined}
        totalSteps={multi ? qs.length : undefined}
        eyebrow={eyebrow}
        title={title ?? t("exercise.reading.title")}
        feedback={feedback}
        canCheck={pick !== null}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        {/* RD-01: .rd-grid stacks passage-above inside narrow panes. */}
        <div className="rd-grid">
          <div
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              padding: "18px 20px",
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "var(--ink-700)",
              fontFamily: "var(--font-sans)",
              maxHeight: 340,
              overflowY: "auto",
            }}
          >
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>
              {passageLabel ?? t("exercise.passage")}
            </div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{passage}</p>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              {q.question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {q.options.map((opt, i) => {
                const isElim = eliminated.includes(i);
                let state = "";
                if (taskOver) {
                  if (i === q.correct) state = "correct";
                  else if (i === pick && feedback?.kind === "no") state = "wrong";
                  else if (isElim) state = "eliminated";
                  else state = "locked";
                } else if (feedback) {
                  if (i === pick) state = "wrong";
                  else if (isElim) state = "eliminated";
                  else state = "locked";
                } else if (isElim) {
                  state = "eliminated"; // RD-04
                } else if (pick === i) {
                  state = "selected";
                }
                return (
                  <button
                    key={i}
                    className={"gp-tile " + state}
                    style={{
                      padding: "12px 16px",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      fontSize: 14,
                    }}
                    disabled={!!feedback || isElim}
                    aria-pressed={pick === i}
                    onClick={() => setPick(i)}
                  >
                    {opt}
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
