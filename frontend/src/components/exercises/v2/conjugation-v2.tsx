"use client";

/**
 * ConjugationV2 — fill the verb table for a given infinitive + tense.
 *
 * Adopted from q-language.jsx · ConjugationExerciseV2. Methodist
 * supplies infinitive ("hablar"), tense label ("Presente"), and
 * pronoun → correct-form rows. Per-row green/clay border highlights
 * which conjugations are off after Check.
 *
 * Per-task HP + streak. Retry keeps the typed forms so the student
 * fixes only the wrong rows.
 */

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import type { V2GradeFn } from "@/lib/exercises/v2-adapter";

export interface ConjugationRow {
  pronoun: string;
  /** Correct form. Required for local (preview) grading; omitted live —
   * the server grades via `onGrade` and returns per-row verdicts. */
  correct?: string;
}

export interface ConjugationV2Props {
  infinitive: string;
  tense: string;
  rows: ConjugationRow[];
  eyebrow?: string;
  placeholder?: string;
  /**
   * CJ-03: when true (default), answers that differ from the correct form
   * ONLY by accents still count — the win sheet coaches "watch the accents"
   * and the accented forms are filled in green.
   */
  accentForgiving?: boolean;
  maxAttemptsPerTask?: number;
  streak?: number;
  /** When provided, grading is deferred to the server (integrity model B). */
  onGrade?: V2GradeFn;
  /** Live-lesson draft capture. */
  onAnswersChange?: (answers: Record<string, unknown>) => void;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function ConjugationV2({
  infinitive,
  tense,
  rows,
  eyebrow,
  placeholder = "…",
  accentForgiving = true,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onGrade,
  onAnswersChange,
  onQuit,
  onFinish,
}: ConjugationV2Props) {
  const { t } = useTranslation();
  const [vals, setVals] = useState<Record<string, string>>({});
  /** CJ-02: rows graded correct lock green across retries (by row index). */
  const [lockedOk, setLockedOk] = useState<boolean[]>(() => rows.map(() => false));
  /** Server mode: per-row verdicts from the last graded attempt. */
  const [serverFlags, setServerFlags] = useState<boolean[] | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [checking, setChecking] = useState(false);
  const { fire, layer } = useConfetti();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const exactMatch = (got: string, expected: string) => norm(got) === norm(expected);
  /** CJ-03: accent-insensitive compare (é ≡ e) for young typists. */
  const matches = (got: string, expected: string) =>
    exactMatch(got, expected) ||
    (accentForgiving && stripAccents(norm(got)) === stripAccents(norm(expected)));

  /** Row verdict — server flags when grading remotely, local compare otherwise. */
  const rowFlags = (): boolean[] =>
    onGrade
      ? (serverFlags ?? rows.map(() => false))
      : rows.map((r) => matches(vals[r.pronoun] || "", r.correct ?? ""));

  const allFilled = rows.every((r) => (vals[r.pronoun] || "").trim().length > 0);

  // live-lesson draft capture
  useEffect(() => {
    if (Object.keys(vals).length > 0) onAnswersChange?.({ conjugations: vals });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vals]);

  const applyFlags = (flags: boolean[], serverRemaining?: number) => {
    if (flags.every(Boolean)) {
      // CJ-03 (preview only): if some rows only missed accents, coach + show
      // the accented forms filled in green.
      const accentSlips = onGrade
        ? 0
        : rows.filter((r) => !exactMatch(vals[r.pronoun] || "", r.correct ?? "")).length;
      if (accentSlips > 0) {
        setVals(Object.fromEntries(rows.map((r) => [r.pronoun, r.correct ?? ""])));
      }
      setLockedOk(rows.map(() => true));
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.conjugation.perfect") : t("exercise.gotIt"),
        explain:
          accentSlips > 0
            ? t("exercise.conjugation.watchAccents").replace("{n}", String(accentSlips))
            : undefined,
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const wrong = flags.filter((f) => !f).length;
    const okCount = rows.length - wrong;
    const remaining = serverRemaining ?? attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: (wrong === 1 ? t("exercise.conjugation.formOff") : t("exercise.conjugation.formsOff")).replace("{n}", String(wrong)),
        // the stripped config has no correct forms to reveal in server mode
        correctList: onGrade
          ? undefined
          : rows.map((r): [string, string] => [r.pronoun, r.correct ?? ""]),
      });
      setStreak(0);
    } else {
      const tmpl = wrong === 1 ? t("exercise.conjugation.formOffAttemptLeft") : t("exercise.conjugation.formsOffAttemptsLeft");
      setFeedback({
        kind: "no",
        msg: tmpl.replace("{n}", String(wrong)).replace("{r}", String(remaining)),
        explain:
          okCount > 0
            ? t("exercise.conjugation.nOfMRight")
                .replace("{n}", String(okCount))
                .replace("{m}", String(rows.length))
            : undefined,
      });
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ conjugations: vals });
        const pi = res.perItem;
        const flags = res.correct
          ? rows.map(() => true)
          : rows.map((r) =>
              pi && !Array.isArray(pi) ? (pi[r.pronoun] ?? false) : false,
            );
        setServerFlags(flags);
        applyFlags(flags, res.attemptsRemaining);
      } catch {
        setFeedback({ kind: "no", msg: t("exercise.submitFailed") });
      } finally {
        setChecking(false);
      }
      return;
    }
    applyFlags(rowFlags());
  };

  const handleRetry = () => {
    // CJ-02: lock the rows that were right; focus the first wrong one.
    const flags = rowFlags();
    setLockedOk(flags);
    setFeedback(null);
    const firstBad = flags.findIndex((f) => !f);
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
        canCheck={allFilled && !checking}
        checkHint={t("exercise.conjugation.fillEveryRow")}
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
            const flags = rowFlags();
            // CJ-02: locked rows stay green between attempts.
            const isOk = feedback ? flags[i] : lockedOk[i];
            const isWrong = !!feedback && !flags[i];
            const inputId = `cj-row-${i}`;
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
                {/* CJ-01: real label wired to the input. */}
                <label
                  htmlFor={inputId}
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
                </label>
                <input
                  id={inputId}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  value={v}
                  disabled={!!feedback || lockedOk[i]}
                  autoCapitalize="none"
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) =>
                    setVals({ ...vals, [r.pronoun]: e.target.value })
                  }
                  onKeyDown={(e) => {
                    // CJ-04: Enter hops to the next open row; on the last
                    // filled row it checks.
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const nextIdx = inputRefs.current.findIndex(
                      (el, j) => j > i && el && !el.disabled
                    );
                    if (nextIdx >= 0) inputRefs.current[nextIdx]?.focus();
                    else if (allFilled && !feedback) handleCheck();
                  }}
                  placeholder={placeholder}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border:
                      "2px solid " +
                      (isOk
                        ? "var(--green-500)"
                        : isWrong
                          ? "var(--clay-500)"
                          : "var(--ink-100)"),
                    borderRadius: 10,
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    fontWeight: 600,
                    background: isOk
                      ? "var(--green-50)"
                      : isWrong
                        ? "var(--clay-50)"
                        : "var(--paper)",
                  }}
                />
                {shouldShowMarks && (
                  <span
                    style={{
                      width: 20,
                      color: isOk ? "var(--green-600)" : "var(--clay-500)",
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
