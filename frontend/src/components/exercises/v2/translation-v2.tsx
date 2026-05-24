"use client";

/**
 * TranslationV2 — translate a source sentence into the target language.
 *
 * Adopted from q-language.jsx · TranslationExerciseV2. Accepts an array
 * of normalized variants so methodists can list "donde esta" alongside
 * "¿dónde está". Per-task HP + streak; retry preserves the typed text
 * so the student can edit instead of re-typing from scratch.
 *
 * Audio button is rendered for visual parity but currently a no-op —
 * caller can pass `onSpeak` to wire TTS later.
 */

import { useState } from "react";
import { Volume2, Lightbulb } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface TranslationV2Props {
  source: string;
  sourceLang: string;
  targetLang: string;
  /** Normalized variants — comparison strips punctuation and lower-cases. */
  accepted: string[];
  /** Canonical correct answer shown when student fails. */
  correct: string;
  hint?: string;
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onSpeak?: () => void;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/[?¿.!¡,]/g, "").replace(/\s+/g, " ");

export function TranslationV2({
  source,
  sourceLang,
  targetLang,
  accepted,
  correct,
  hint,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onSpeak,
  onQuit,
  onFinish,
}: TranslationV2Props) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [showHint, setShowHint] = useState(false);
  const { fire, layer } = useConfetti();

  const handleCheck = () => {
    const isOk = accepted.some((a) => normalize(a) === normalize(text));
    if (isOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.translation.excellent") : t("exercise.gotIt"),
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
        correct,
        explain: hint,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.translation.closeAttemptLeft") : t("exercise.translation.closeAttemptsLeft")).replace("{n}", String(remaining)),
        explain: hint,
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

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.translation.title")}
        feedback={feedback}
        canCheck={text.trim().length > 0}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
            maxWidth: 520,
            margin: "0 auto 18px",
          }}
        >
          <button
            type="button"
            onClick={onSpeak}
            aria-label={t("exercise.playAudio")}
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--green-50)",
              color: "var(--green-700)",
              border: "2px solid var(--green-200)",
              display: "grid",
              placeItems: "center",
              cursor: onSpeak ? "pointer" : "default",
              flexShrink: 0,
            }}
          >
            <Volume2 size={20} />
          </button>
          <div
            style={{
              flex: 1,
              padding: "16px 18px",
              background: "var(--paper-2)",
              borderRadius: 14,
              border: "2px solid var(--ink-100)",
              fontSize: 19,
              fontWeight: 600,
              color: "var(--ink-900)",
              lineHeight: 1.4,
              position: "relative",
            }}
          >
            <span
              className="gp-eyebrow"
              style={{ display: "block", marginBottom: 4 }}
            >
              {sourceLang}
            </span>
            {source}
          </div>
        </div>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="gp-eyebrow" style={{ marginBottom: 8 }}>
            {targetLang} · {t("exercise.yourAnswer")}
          </div>
          <textarea
            className={
              "gp-input " +
              (feedback ? (feedback.kind === "ok" ? "correct" : "wrong") : "")
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!!feedback}
            placeholder={t("exercise.translation.typeTheTranslation").replace("{lang}", targetLang)}
            style={{
              minHeight: 96,
              resize: "none",
              fontFamily: "var(--font-sans)",
            }}
          />
          {hint && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 8,
                gap: 12,
              }}
            >
              <button
                type="button"
                onClick={() => setShowHint(!showHint)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--sun-700)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  fontSize: 13,
                }}
              >
                <Lightbulb size={16} />
                {t("exercise.hint")}
              </button>
              {showHint && (
                <span
                  style={{
                    fontSize: 13,
                    color: "var(--sun-700)",
                    background: "var(--sun-50)",
                    padding: "4px 10px",
                    borderRadius: 999,
                  }}
                >
                  {hint}
                </span>
              )}
            </div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}
