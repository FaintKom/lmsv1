"use client";

/**
 * QuizV2 — Duolingo-style multiple choice exercise.
 *
 * Adopted from 2026-05-23 design package (q-basics.jsx · QuizExerciseV2).
 * Reads existing { questions: [{ question_text, options: [{text, is_correct}] }] }
 * config (same shape the legacy QuizTaker uses), but renders one question at a
 * time inside a LessonShell. Hearts are tracked locally; the existing
 * `POST /exercises/{id}/submit` contract can be wired up via the `onFinish`
 * callback when integrated into the renderer.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface QuizV2Question {
  question_text: string;
  options: { text: string; is_correct?: boolean }[];
}

export interface QuizV2Props {
  questions: QuizV2Question[];
  /** Optional eyebrow line (e.g. course / lesson position). */
  eyebrow?: string;
  /** Optional starting heart count. */
  initialHearts?: number;
  /** Optional streak count (display only). */
  streak?: number;
  /** Override default title; otherwise uses question_text. */
  title?: string;
  /** Called when the methodist exits via the top-left ×. */
  onQuit?: () => void;
  /** Called once when student has finished all questions. */
  onFinish?: (result: { correct: number; total: number; hearts: number }) => void;
}

export function QuizV2({
  questions,
  eyebrow,
  initialHearts = 5,
  streak = 0,
  title,
  onQuit,
  onFinish,
}: QuizV2Props) {
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [hearts, setHearts] = useState(initialHearts);
  const [lostHeart, setLostHeart] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const { fire, layer } = useConfetti();

  const q = questions[idx];
  if (!q) {
    return (
      <div className="p-6 text-sm text-text-subtle">No questions configured.</div>
    );
  }

  const correctIdx = q.options.findIndex((o) => o.is_correct);

  const handleCheck = () => {
    if (pick === null) return;
    if (pick === correctIdx) {
      setFeedback({ kind: "ok", msg: "Exactly right." });
      setCorrectCount((c) => c + 1);
      fire();
    } else {
      const next = Math.max(0, hearts - 1);
      setHearts(next);
      setLostHeart(true);
      setTimeout(() => setLostHeart(false), 500);
      setFeedback({
        kind: "no",
        msg: "Not quite.",
        correct: q.options[correctIdx]?.text,
      });
    }
  };

  const handleContinue = () => {
    const wasCorrect = feedback?.kind === "ok";
    setFeedback(null);
    setPick(null);
    if (idx + 1 < questions.length) {
      setIdx((i) => i + 1);
    } else {
      onFinish?.({
        correct: correctCount + (wasCorrect ? 1 : 0),
        total: questions.length,
        hearts,
      });
    }
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={hearts}
        streak={streak}
        step={idx + 1}
        totalSteps={questions.length}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title || q.question_text}
        feedback={feedback}
        canCheck={pick !== null}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onQuit={onQuit}
      >
        <div
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
            let state = "";
            if (feedback) {
              if (i === correctIdx) state = "correct";
              else if (i === pick) state = "wrong";
              else state = "locked";
            } else if (pick === i) state = "selected";
            return (
              <button
                key={i}
                className={"gp-tile " + state}
                style={{
                  justifyContent: "space-between",
                  padding: "16px 20px",
                  fontFamily: "var(--font-mono)",
                  width: "100%",
                }}
                onClick={() => !feedback && setPick(i)}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                  <kbd
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: "1.5px solid currentColor",
                      opacity: 0.5,
                    }}
                  >
                    {i + 1}
                  </kbd>
                  {opt.text}
                </span>
              </button>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}
