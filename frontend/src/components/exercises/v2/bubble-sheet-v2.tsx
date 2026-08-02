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
 * green; if student picked wrong, their pick turns clay.
 */

import { useEffect, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import type { V2GradeFn } from "@/lib/exercises/v2-adapter";

export interface BubbleSheetQuestion {
  /** 1-based question number shown in the badge. */
  n: number;
  q: string;
  opts: string[];
  /** 0-based index of the correct option. Required for local (preview)
   * grading; omitted live — the server grades via `onGrade`. */
  correct?: number;
}

export interface BubbleSheetV2Props {
  questions: BubbleSheetQuestion[];
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  /** When provided, grading is deferred to the server (integrity model B).
   * Payload: {answers: {"<0-based index>": "<option letter>"}}. */
  onGrade?: V2GradeFn;
  /** Live-lesson draft capture. */
  onAnswersChange?: (answers: Record<string, unknown>) => void;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    score: number;
    total: number;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

/** Server payload: q order index → picked option letter (A/B/C…). */
const toServerAnswers = (
  questions: BubbleSheetQuestion[],
  ans: Record<number, number>,
): Record<string, string> =>
  Object.fromEntries(
    questions
      .map((q, idx) => [idx, ans[q.n]] as const)
      .filter(([, pick]) => pick != null)
      .map(([idx, pick]) => [String(idx), String.fromCharCode(65 + (pick as number))]),
  );

export function BubbleSheetV2({
  questions,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onGrade,
  onAnswersChange,
  onQuit,
  onFinish,
}: BubbleSheetV2Props) {
  const { t } = useTranslation();
  const [ans, setAns] = useState<Record<number, number>>({});
  // BS-02: picks confirmed correct on a failed Check — locked + ✓ on retry.
  const [keptOk, setKeptOk] = useState<Record<number, number>>({});
  /** Server mode: per-question verdicts (by q.n) from the last check. */
  const [serverOk, setServerOk] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [checking, setChecking] = useState(false);
  const { fire, layer } = useConfetti();

  const allAnswered = questions.every((q) => ans[q.n] != null);
  /** Question verdict — server flags live, local compare in preview. */
  const qOk = (q: BubbleSheetQuestion) =>
    onGrade ? !!serverOk[q.n] : ans[q.n] === q.correct;
  const score = questions.filter(qOk).length;

  // live-lesson draft capture
  useEffect(() => {
    if (Object.keys(ans).length > 0)
      onAnswersChange?.({ answers: toServerAnswers(questions, ans) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ans]);

  const applyScore = (got: number, serverRemaining?: number) => {
    if (got === questions.length) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? t("exercise.perfectScore").replace("{score}", String(got)).replace("{total}", String(questions.length))
            : t("exercise.gotThere").replace("{score}", String(got)).replace("{total}", String(questions.length)),
      });
      setStreak((s) => s + 1);
      setRevealCorrect(true);
      fire();
      return;
    }
    const remaining = serverRemaining ?? attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.scoreCorrect").replace("{score}", String(got)).replace("{total}", String(questions.length)),
        explain: onGrade ? undefined : t("exercise.outOfAttemptsCorrectShown"),
      });
      setStreak(0);
      // server mode has no correct indices to reveal
      if (!onGrade) setRevealCorrect(true);
    } else {
      setFeedback({
        kind: "no",
        msg: t("exercise.scoreCorrect").replace("{score}", String(got)).replace("{total}", String(questions.length)),
        explain: (remaining === 1 ? t("exercise.fixWrongOneLeft") : t("exercise.fixWrongOnes")).replace("{n}", String(remaining)),
      });
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ answers: toServerAnswers(questions, ans) });
        const pi = res.perItem;
        const flags: Record<number, boolean> = {};
        questions.forEach((q, idx) => {
          flags[q.n] = res.correct
            ? true
            : pi && !Array.isArray(pi)
              ? (pi[String(idx)] ?? false)
              : false;
        });
        setServerOk(flags);
        applyScore(
          Object.values(flags).filter(Boolean).length,
          res.attemptsRemaining,
        );
      } catch {
        setFeedback({ kind: "no", msg: t("exercise.submitFailed") });
      } finally {
        setChecking(false);
      }
      return;
    }
    applyScore(score);
  };

  const handleRetry = () => {
    // Drop only the wrong picks so the student can re-answer them.
    const kept: Record<number, number> = {};
    for (const q of questions) {
      if (qOk(q) && ans[q.n] != null) kept[q.n] = ans[q.n];
    }
    setAns(kept);
    setKeptOk(kept); // BS-02
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
        title={title ?? t("exercise.bubbleSheet.title")}
        feedback={feedback}
        canCheck={allAnswered && !checking}
        checkHint={t("exercise.bubbleSheet.checkHint")}
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
          {questions.map((q) => {
            // BS-02: kept-correct question — locked while the retry runs.
            const isKept = keptOk[q.n] != null && !locked;
            return (
            <div
              key={q.n}
              style={{
                background: "var(--paper-2)",
                border: `2px solid ${isKept ? "var(--green-200)" : "var(--ink-100)"}`,
                borderRadius: 14,
                padding: "14px 18px",
                transition: "border-color 200ms",
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
                    background: isKept ? "var(--green-600)" : "var(--ink-50)",
                    color: isKept ? "#fff" : "var(--ink-500)",
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 12,
                    flexShrink: 0,
                    transition: "background 200ms",
                  }}
                >
                  {isKept ? "✓" : q.n}
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
                  // BS-01: auto-fit — 4-across no longer crushes at 320px.
                  gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))",
                  gap: 6,
                  marginLeft: 36,
                }}
              >
                {q.opts.map((opt, i) => {
                  const picked = ans[q.n] === i;
                  const isCorrect = revealCorrect && i === q.correct;
                  const isWrongPick =
                    revealCorrect && picked && i !== q.correct;
                  const keptLock = isKept && picked; // BS-02
                  let bg = "var(--paper-2)";
                  let color = "var(--ink-700)";
                  let border = "var(--ink-200)";
                  let bubbleBg = "var(--paper-2)";
                  let bubbleColor = "var(--ink-500)";
                  if (isCorrect || keptLock) {
                    bg = "var(--green-50)";
                    color = "var(--green-800)";
                    border = "var(--green-500)";
                    bubbleBg = "var(--green-600)";
                    bubbleColor = "#fff";
                  } else if (isWrongPick) {
                    bg = "var(--clay-50)";
                    color = "var(--clay-700)";
                    border = "var(--clay-500)";
                    bubbleBg = "var(--clay-500)";
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
                      aria-pressed={picked}
                      aria-label={`${String.fromCharCode(65 + i)} — ${opt}`}
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
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}
