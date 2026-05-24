"use client";

/**
 * ConjugationV2 — fill the verb table for a given infinitive + tense.
 *
 * Adopted from q-language.jsx · ConjugationExerciseV2. Methodist
 * supplies infinitive ("hablar"), tense label ("Presente"), and
 * pronoun → correct-form rows. Per-row green/coral border highlights
 * which conjugations are off after Check.
 *
 * Per-task HP + streak. Retry keeps the typed forms so the student
 * fixes only the wrong rows.
 */

import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface ConjugationRow {
  pronoun: string;
  correct: string;
}

export interface ConjugationV2Props {
  infinitive: string;
  tense: string;
  rows: ConjugationRow[];
  eyebrow?: string;
  placeholder?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

const norm = (s: string) => s.trim().toLowerCase();

export function ConjugationV2({
  infinitive,
  tense,
  rows,
  eyebrow,
  placeholder = "…",
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: ConjugationV2Props) {
  const { t } = useTranslation();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const allFilled = rows.every((r) => (vals[r.pronoun] || "").trim().length > 0);

  const handleCheck = () => {
    const isOk = rows.every((r) => norm(vals[r.pronoun] || "") === norm(r.correct));
    if (isOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.conjugation.perfect") : t("exercise.gotIt"),
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const wrong = rows.filter((r) => norm(vals[r.pronoun] || "") !== norm(r.correct));
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: (wrong.length === 1 ? t("exercise.conjugation.formOff") : t("exercise.conjugation.formsOff")).replace("{n}", String(wrong.length)),
        explain: rows.map((r) => `${r.pronoun} → ${r.correct}`).join("  ·  "),
      });
      setStreak(0);
    } else {
      const tmpl = wrong.length === 1 ? t("exercise.conjugation.formOffAttemptLeft") : t("exercise.conjugation.formsOffAttemptsLeft");
      setFeedback({
        kind: "no",
        msg: tmpl.replace("{n}", String(wrong.length)).replace("{r}", String(remaining)),
      });
    }
  };

  const handleRetry = () => {
    setFeedback(null);
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const shouldShowMarks = feedback?.kind === "no" && !canRetry; // only final reveal shows ✓/✗

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow ?? `${tense.toUpperCase()}`}
        title={
          <>
            {t("exercise.conjugation.title")}{" "}
            <span
              className="gp-mark"
              style={{
                fontStyle: "italic",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
              }}
            >
              {infinitive}
            </span>
          </>
        }
        feedback={feedback}
        canCheck={allFilled}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            maxWidth: 460,
            margin: "0 auto",
            background: "var(--paper-2)",
            borderRadius: 16,
            border: "2px solid var(--ink-100)",
            overflow: "hidden",
          }}
        >
          {rows.map((r, i) => {
            const v = vals[r.pronoun] || "";
            const isOk = !!feedback && norm(v) === norm(r.correct);
            const isWrong = !!feedback && norm(v) !== norm(r.correct);
            return (
              <div
                key={r.pronoun}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "6px 16px",
                  borderTop: i > 0 ? "1px solid var(--ink-100)" : "none",
                }}
              >
                <span
                  style={{
                    width: 90,
                    flexShrink: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    color: "var(--ink-500)",
                    fontWeight: 500,
                  }}
                >
                  {r.pronoun}
                </span>
                <input
                  type="text"
                  value={v}
                  disabled={!!feedback}
                  onChange={(e) =>
                    setVals({ ...vals, [r.pronoun]: e.target.value })
                  }
                  placeholder={placeholder}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border:
                      "2px solid " +
                      (isOk
                        ? "var(--green-500)"
                        : isWrong
                          ? "var(--coral-500)"
                          : "var(--ink-100)"),
                    borderRadius: 10,
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    fontWeight: 600,
                    background: isOk
                      ? "var(--green-50)"
                      : isWrong
                        ? "var(--coral-50)"
                        : "var(--paper)",
                  }}
                />
                {shouldShowMarks && (
                  <span
                    style={{
                      width: 20,
                      color: isOk ? "var(--green-600)" : "var(--coral-500)",
                    }}
                  >
                    {isOk ? <Check size={18} /> : <X size={18} />}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}
