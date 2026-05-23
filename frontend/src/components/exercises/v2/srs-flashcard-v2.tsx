"use client";

/**
 * SRSFlashcardV2 — Anki-style deck review.
 *
 * Adopted from q-language.jsx · SRSFlashcardExerciseV2. Methodist
 * supplies an ordered list of cards `{front, back, hint?}`. Student
 * taps to flip, then rates Again / Hard / Good / Easy.
 *
 * Streak only — no per-task HP. Rating distribution returned via
 * onFinish so a wrapping shell can persist real SRS scheduling
 * (intervals stay client-side here).
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface SRSCard {
  front: string;
  back: string;
  /** Optional sub-line under the back (pinyin, IPA, etc.). */
  hint?: string;
}

export interface SRSRatingStats {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface SRSFlashcardV2Props {
  cards: SRSCard[];
  /** Eyebrow prefix, e.g. "CHINESE · DECK". Card N/Total auto-appended. */
  eyebrowPrefix?: string;
  /** Label shown on the front face (e.g. "HANZI"). */
  frontLabel?: string;
  /** Label shown on the back face (e.g. "MEANING"). */
  backLabel?: string;
  title?: string;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    stats: SRSRatingStats;
    total: number;
    streak: number;
  }) => void;
}

const BUTTONS: {
  key: keyof SRSRatingStats;
  label: string;
  color: string;
  shadow: string;
  sub: string;
  textColor: string;
}[] = [
  {
    key: "again",
    label: "Again",
    color: "var(--coral-500)",
    shadow: "var(--coral-700)",
    sub: "<1m",
    textColor: "#fff",
  },
  {
    key: "hard",
    label: "Hard",
    color: "var(--sun-400)",
    shadow: "var(--sun-500)",
    sub: "6m",
    textColor: "var(--ink-900)",
  },
  {
    key: "good",
    label: "Good",
    color: "var(--green-600)",
    shadow: "var(--green-700)",
    sub: "10m",
    textColor: "#fff",
  },
  {
    key: "easy",
    label: "Easy",
    color: "var(--green-500)",
    shadow: "var(--green-700)",
    sub: "4d",
    textColor: "#fff",
  },
];

export function SRSFlashcardV2({
  cards,
  eyebrowPrefix = "DECK",
  frontLabel = "FRONT",
  backLabel = "BACK",
  title = "Review",
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: SRSFlashcardV2Props) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState<SRSRatingStats>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const card = cards[idx];

  const rate = (key: keyof SRSRatingStats) => {
    const next = { ...stats, [key]: stats[key] + 1 };
    setStats(next);
    if (idx === cards.length - 1) {
      setDone(true);
      setStreak((s) => s + 1);
      fire();
      return;
    }
    setIdx(idx + 1);
    setFlipped(false);
  };

  const known = stats.good + stats.easy;
  const feedback: LessonFeedback | null = done
    ? { kind: "ok", msg: `Deck complete — ${known}/${cards.length} known.` }
    : null;

  const handleContinue = () => {
    onFinish?.({
      correct: known === cards.length,
      stats,
      total: cards.length,
      streak,
    });
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        streak={streak}
        eyebrow={`${eyebrowPrefix} ${done ? "DONE" : `${idx + 1} OF ${cards.length}`}`}
        title={title}
        feedback={feedback}
        onContinue={handleContinue}
        canCheck={false}
        showSkip={false}
        onCheck={() => {}}
        onQuit={onQuit}
      >
        {!done && card && (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div
              onClick={() => setFlipped(!flipped)}
              style={{
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 18,
                minHeight: 260,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                position: "relative",
                boxShadow: "0 4px 0 0 var(--ink-100)",
                marginBottom: 20,
                transition: "transform 200ms",
                userSelect: "none",
              }}
            >
              <div
                style={{ position: "absolute", top: 14, left: 14 }}
                className="gp-eyebrow"
              >
                {flipped ? backLabel : frontLabel}
              </div>
              <div style={{ textAlign: "center", padding: 24 }}>
                {!flipped ? (
                  <>
                    <div
                      style={{
                        fontSize: 64,
                        fontWeight: 700,
                        color: "var(--ink-900)",
                        lineHeight: 1.1,
                      }}
                    >
                      {card.front}
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                        color: "var(--ink-400)",
                      }}
                    >
                      Tap to flip
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        fontSize: 32,
                        fontWeight: 800,
                        color: "var(--ink-900)",
                      }}
                    >
                      {card.back}
                    </div>
                    {card.hint && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 16,
                          color: "var(--ink-500)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {card.hint}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {flipped && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                }}
              >
                {BUTTONS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => rate(b.key)}
                    style={{
                      background: b.color,
                      color: b.textColor,
                      border: "none",
                      padding: "10px 0",
                      borderRadius: 12,
                      cursor: "pointer",
                      boxShadow: `0 4px 0 0 ${b.shadow}`,
                      fontWeight: 800,
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      transition: "transform 100ms, box-shadow 100ms",
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "translateY(2px)";
                      e.currentTarget.style.boxShadow = `0 2px 0 0 ${b.shadow}`;
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = `0 4px 0 0 ${b.shadow}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "";
                      e.currentTarget.style.boxShadow = `0 4px 0 0 ${b.shadow}`;
                    }}
                  >
                    <div>{b.label}</div>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        fontWeight: 500,
                        opacity: 0.85,
                        marginTop: 2,
                      }}
                    >
                      {b.sub}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </LessonShell>
    </div>
  );
}
