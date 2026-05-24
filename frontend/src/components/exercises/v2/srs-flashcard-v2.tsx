"use client";

/**
 * SRSFlashcardV2 — Anki-style deck review with FSRS-6 scheduling.
 *
 * Adopted from q-language.jsx · SRSFlashcardExerciseV2. Methodist
 * supplies an ordered list of cards `{front, back, hint?}`. Each card
 * is paired with an internal FSRS Card state on mount (or hydrated
 * from `initialSchedule`). On rating, ts-fsrs computes next interval +
 * state; rating buttons show the real next-due interval ("<10m", "3d").
 *
 * Streak only — no per-task HP. `onFinish` returns the updated
 * `schedule` (keyed by card.front) so the parent can persist to
 * backend (e.g. POST /api/v1/srs/cards/upsert).
 */

import { useMemo, useState } from "react";
import {
  Card,
  fsrs,
  Rating,
  type Grade,
  createEmptyCard,
  type FSRSParameters,
  type RecordLog,
} from "ts-fsrs";
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

/** Per-card schedule snapshot — what the parent persists. */
export interface SRSCardSchedule {
  /** Serialized due date (ISO string). */
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string;
}

export interface SRSFlashcardV2Props {
  cards: SRSCard[];
  /** Optional pre-existing schedule keyed by card.front. */
  initialSchedule?: Record<string, SRSCardSchedule>;
  /** Optional FSRS parameter overrides (defaults are FSRS-6). */
  fsrsParams?: Partial<FSRSParameters>;
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
    /** Updated FSRS schedule per card (front → snapshot). Persist this. */
    schedule: Record<string, SRSCardSchedule>;
  }) => void;
}

interface ButtonMeta {
  rating: Grade;
  key: keyof SRSRatingStats;
  label: string;
  color: string;
  shadow: string;
  textColor: string;
}

const BUTTONS: ButtonMeta[] = [
  {
    rating: Rating.Again,
    key: "again",
    label: "Again",
    color: "var(--coral-500)",
    shadow: "var(--coral-700)",
    textColor: "#fff",
  },
  {
    rating: Rating.Hard,
    key: "hard",
    label: "Hard",
    color: "var(--sun-400)",
    shadow: "var(--sun-500)",
    textColor: "var(--ink-900)",
  },
  {
    rating: Rating.Good,
    key: "good",
    label: "Good",
    color: "var(--green-600)",
    shadow: "var(--green-700)",
    textColor: "#fff",
  },
  {
    rating: Rating.Easy,
    key: "easy",
    label: "Easy",
    color: "var(--green-500)",
    shadow: "var(--green-700)",
    textColor: "#fff",
  },
];

/** Convert SRSCardSchedule (serialized) → ts-fsrs Card. */
function hydrate(s: SRSCardSchedule): Card {
  return {
    due: new Date(s.due),
    stability: s.stability,
    difficulty: s.difficulty,
    elapsed_days: s.elapsed_days,
    scheduled_days: s.scheduled_days,
    reps: s.reps,
    lapses: s.lapses,
    state: s.state,
    last_review: s.last_review ? new Date(s.last_review) : undefined,
    learning_steps: 0,
  };
}

/** Convert ts-fsrs Card → SRSCardSchedule (serializable). */
function snapshot(c: Card): SRSCardSchedule {
  return {
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.last_review ? c.last_review.toISOString() : undefined,
  };
}

/** Format scheduled_days as a compact label: "<10m", "1h", "3d", "2mo". */
function formatInterval(scheduledDays: number): string {
  if (scheduledDays < 1 / 1440) return "<1m";
  if (scheduledDays < 1 / 24) {
    const min = Math.round(scheduledDays * 1440);
    return `${min}m`;
  }
  if (scheduledDays < 1) {
    const h = Math.round(scheduledDays * 24);
    return `${h}h`;
  }
  if (scheduledDays < 30) {
    const d = Math.round(scheduledDays);
    return `${d}d`;
  }
  if (scheduledDays < 365) {
    const mo = Math.round(scheduledDays / 30);
    return `${mo}mo`;
  }
  return `${Math.round(scheduledDays / 365)}y`;
}

export function SRSFlashcardV2({
  cards,
  initialSchedule,
  fsrsParams,
  eyebrowPrefix = "DECK",
  frontLabel = "FRONT",
  backLabel = "BACK",
  title = "Review",
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: SRSFlashcardV2Props) {
  const scheduler = useMemo(() => fsrs(fsrsParams), [fsrsParams]);

  // Card state per index — lazy hydrated from initialSchedule or empty.
  const [cardStates, setCardStates] = useState<Card[]>(() =>
    cards.map((c) => {
      const seed = initialSchedule?.[c.front];
      return seed ? hydrate(seed) : createEmptyCard();
    })
  );

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
  const cardState = cardStates[idx];

  // Preview next intervals for the rating buttons — RecordLog has 1..4.
  const previewLog: RecordLog | null = useMemo(() => {
    if (!cardState || !flipped) return null;
    return scheduler.repeat(cardState, new Date());
  }, [cardState, flipped, scheduler]);

  const intervalLabel = (rating: Grade): string => {
    if (!previewLog) return "";
    const item = previewLog[rating];
    if (!item) return "";
    return formatInterval(item.card.scheduled_days);
  };

  const rate = (rating: Grade, key: keyof SRSRatingStats) => {
    if (!cardState) return;
    const { card: nextCard } = scheduler.next(cardState, new Date(), rating);
    const nextStates = cardStates.slice();
    nextStates[idx] = nextCard;
    setCardStates(nextStates);

    const nextStats = { ...stats, [key]: stats[key] + 1 };
    setStats(nextStats);

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
    const schedule: Record<string, SRSCardSchedule> = {};
    cards.forEach((c, i) => {
      schedule[c.front] = snapshot(cardStates[i]);
    });
    onFinish?.({
      correct: known === cards.length,
      stats,
      total: cards.length,
      streak,
      schedule,
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
                    onClick={() => rate(b.rating, b.key)}
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
                      {intervalLabel(b.rating)}
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
