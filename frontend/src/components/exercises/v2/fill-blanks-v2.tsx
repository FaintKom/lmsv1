"use client";

/**
 * FillBlanksV2 — tap a word-bank pill into a blank slot in the sentence.
 *
 * Adopted from q-basics.jsx · FillBlanksExerciseV2. Reads two equivalent
 * config shapes:
 *
 *   1. Template string with `{{blank}}` markers + parallel `blanks` array:
 *      { text: "The {{blank}} of an array is the {{blank}}.",
 *        blanks: ["length", "elements"], word_bank: [...] }
 *
 *   2. Explicit parts array (test/preview convenience):
 *      { parts: ["The ", null, " of an array is the ", null, " of its elements."],
 *        blanks: ["length", "count"], wordBank: [...] }
 *
 * Per-task HP + streak from lesson-shell.
 */

import { useMemo, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";
import type { V2GradeFn, V2GradeResult } from "@/lib/exercises/v2-adapter";

export interface FillBlanksV2Props {
  /** Sentence template with `{{blank}}` markers — mutually exclusive with `parts`. */
  text?: string;
  /** Pre-parsed parts (strings + nulls for blank slots). */
  parts?: (string | null)[];
  /** Correct answer for each blank, in order. Required for local (preview)
   * grading; omitted live — the server strips it and grades via `onGrade`.
   * Slot count is derived from the template, not this array. */
  blanks?: string[];
  /** All available words to choose from (must include the correct ones). */
  wordBank: string[];
  /** Optional eyebrow line. */
  eyebrow?: string;
  /** Title override. */
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  /** When provided, grading is deferred to the server (integrity model B);
   * local `blanks` is ignored. */
  onGrade?: V2GradeFn;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
}

/** Parse `"Hello {{blank}} world {{blank}}"` → `["Hello ", null, " world ", null, ""]`. */
function parseTemplate(text: string): (string | null)[] {
  const out: (string | null)[] = [];
  const re = /\{\{blank\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(text.slice(last, m.index));
    out.push(null);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export function FillBlanksV2({
  text,
  parts: explicitParts,
  blanks,
  wordBank,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onGrade,
  onQuit,
  onFinish,
}: FillBlanksV2Props) {
  const parts = useMemo(
    () => explicitParts ?? (text ? parseTemplate(text) : []),
    [explicitParts, text]
  );

  // Live config strips `blanks`, so slot count must come from the template
  // (null markers in `parts`), not the stripped answer array.
  const blankCount = useMemo(
    () => parts.filter((p) => p === null).length,
    [parts]
  );

  const [slots, setSlots] = useState<(number | null)[]>(() =>
    Array.from({ length: blankCount }, () => null)
  );
  const [used, setUsed] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [checking, setChecking] = useState(false);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const place = (wi: number) => {
    const empty = slots.findIndex((s) => s === null);
    if (empty < 0 || feedback) return;
    const next = slots.slice();
    next[empty] = wi;
    setSlots(next);
    setUsed((u) => [...u, wi]);
  };
  const unplace = (si: number) => {
    if (slots[si] === null || feedback) return;
    const wi = slots[si]!;
    const next = slots.slice();
    next[si] = null;
    setSlots(next);
    setUsed((u) => u.filter((x) => x !== wi));
  };

  const applyResult = (res: V2GradeResult) => {
    if (res.correct) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.fillBlanks.sweet") : t("exercise.gotIt"),
        explain: res.explain,
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }

    const remaining = res.attemptsRemaining ?? attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);

    if (res.maxReached || remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.outOfAttempts"),
        correct: res.correctAnswer ?? blanks?.join(" · "),
        explain: res.explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining)),
      });
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    const got = slots.map((s) => (s == null ? "" : wordBank[s]));

    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ blanks: got });
        applyResult(res);
      } catch {
        setFeedback({ kind: "no", msg: t("exercise.submitFailed") });
      } finally {
        setChecking(false);
      }
      return;
    }

    // Preview / local grading.
    applyResult({
      correct: got.every((w, i) => w === blanks?.[i]),
      correctAnswer: blanks?.join(" · "),
      attemptsRemaining: attemptsLeft - 1,
    });
  };

  const handleRetry = () => {
    setFeedback(null);
    setSlots(Array.from({ length: blankCount }, () => null));
    setUsed([]);
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const allFilled = slots.every((s) => s !== null);
  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.fillBlanks.title")}
        feedback={feedback}
        canCheck={allFilled}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            fontSize: 19,
            lineHeight: 2.2,
            color: "var(--ink-900)",
            maxWidth: 520,
            margin: "8px auto 28px",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {parts.map((p, i) => {
            if (p !== null) return <MaybeMath key={i} text={p} />;
            const si = parts.slice(0, i).filter((x) => x === null).length;
            const wi = slots[si];
            return (
              <button
                key={i}
                onClick={() => unplace(si)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 96,
                  padding: "6px 12px",
                  margin: "0 4px",
                  borderRadius: 10,
                  border: "none",
                  background: wi == null ? "transparent" : "var(--green-50)",
                  borderBottom:
                    wi == null ? "3px solid var(--ink-300)" : "3px solid var(--green-500)",
                  fontWeight: 700,
                  fontSize: 19,
                  color: wi == null ? "transparent" : "var(--green-800)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {wi == null ? "_" : wordBank[wi]}
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          {wordBank.map((w, i) => (
            <button
              key={i}
              className={"gp-tile " + (used.includes(i) ? "locked" : "")}
              style={{
                padding: "10px 18px",
                fontSize: 16,
                opacity: used.includes(i) ? 0.3 : 1,
              }}
              onClick={() => place(i)}
            >
              {w}
            </button>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}
