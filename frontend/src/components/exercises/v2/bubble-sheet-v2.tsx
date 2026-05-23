"use client";

/**
 * BubbleSheetV2 — SAT-style fill-in-the-bubble.
 *
 * Adopted from q-basics.jsx · BubbleSheetExerciseV2. Whole sheet = one
 * task: student answers every question, then Check. Per-task HP +
 * streak — wrong Check costs a heart; on retry the picks are kept so
 * the student can fix only the wrong ones.
 *
 * Reveal pattern matches source: after Check, correct option turns
 * green; if student picked wrong, their pick turns coral.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface BubbleSheetQuestion {
  /** 1-based question number shown in the badge. */
  n: number;
  q: string;
  opts: string[];
  /** 0-based index of the correct option. */
  correct: number;
}

export interface BubbleSheetV2Props {
  questions: BubbleSheetQuestion[];
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    score: number;
    total: number;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

export function BubbleSheetV2({
  questions,
  eyebrow,
  title = "Fill in the bubble for each answer",
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: BubbleSheetV2Props) {
  const [ans, setAns] = useState<Record<number, number>>({});
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const { fire, layer } = useConfetti();

  const allAnswered = questions.every((q) => ans[q.n] != null);
  const score = questions.filter((q) => ans[q.n] === q.correct).length;

  const handleCheck = () => {
    const isAllCorrect = score === questions.length;
    if (isAllCorrect) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? `${score}/${questions.length} — perfect score.`
            : `${score}/${questions.length} — got there!`,
      });
      setStreak((s) => s + 1);
      setRevealCorrect(true);
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
        msg: `${score}/${questions.length} correct.`,
        explain: "Out of attempts — correct answers shown below.",
      });
      setStreak(0);
      setRevealCorrect(true);
    } else {
      setFeedback({
        kind: "no",
        msg: `${score}/${questions.length} correct.`,
        explain: `${remaining} ${remaining === 1 ? "attempt" : "attempts"} left — fix the wrong ones.`,
      });
    }
  };

  const handleRetry = () => {
    // Drop only the wrong picks so the student can re-answer them.
    const kept: Record<number, number> = {};
    for (const q of questions) {
      if (ans[q.n] === q.correct) kept[q.n] = ans[q.n];
    }
    setAns(kept);
    setFeedback(null);
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      score,
      total: questions.length,
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const locked = !!feedback;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title}
        feedback={feedback}
        canCheck={allAnswered}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            maxWidth: 600,
            margin: "0 auto",
          }}
        >
          {questions.map((q) => (
            <div
              key={q.n}
              style={{
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 14,
                padding: "14px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    background: "var(--ink-50)",
                    color: "var(--ink-500)",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {q.n}
                </span>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--ink-900)",
                    flex: 1,
                  }}
                >
                  {q.q}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 6,
                  marginLeft: 36,
                }}
              >
                {q.opts.map((opt, i) => {
                  const picked = ans[q.n] === i;
                  const isCorrect = revealCorrect && i === q.correct;
                  const isWrongPick =
                    revealCorrect && picked && i !== q.correct;
                  let bg = "var(--paper-2)";
                  let color = "var(--ink-700)";
                  let border = "var(--ink-200)";
                  let bubbleBg = "var(--paper-2)";
                  let bubbleColor = "var(--ink-500)";
                  if (isCorrect) {
                    bg = "var(--green-50)";
                    color = "var(--green-800)";
                    border = "var(--green-500)";
                    bubbleBg = "var(--green-600)";
                    bubbleColor = "#fff";
                  } else if (isWrongPick) {
                    bg = "var(--coral-50)";
                    color = "var(--coral-700)";
                    border = "var(--coral-500)";
                    bubbleBg = "var(--coral-500)";
                    bubbleColor = "#fff";
                  } else if (picked) {
                    bg = "var(--ink-50)";
                    color = "var(--ink-900)";
                    border = "var(--ink-900)";
                    bubbleBg = "var(--ink-900)";
                    bubbleColor = "#fff";
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => !locked && setAns({ ...ans, [q.n]: i })}
                      disabled={locked}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        background: bg,
                        border: `2px solid ${border}`,
                        borderRadius: 10,
                        cursor: locked ? "default" : "pointer",
                        transition: "all 120ms",
                        fontFamily: "var(--font-sans)",
                        textAlign: "left",
                      }}
                    >
                      <span
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: bubbleBg,
                          color: bubbleColor,
                          border: `2px solid ${border}`,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 800,
                          fontSize: 11,
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span
                        style={{
                          color,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        {opt}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}
