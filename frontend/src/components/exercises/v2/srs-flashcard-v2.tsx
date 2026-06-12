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
 *
 * Visuals follow the feedback-grammar handoff (ex-lang.jsx ·
 * ExFlashcards): true 3D flip (`.fb-card3d`), exit/enter card swap
 * (`.fb-cardwrap`), progress dots (`.fb-dots`), pressed-physics rating
 * buttons (`.fb-rate`) and the LessonShell `instant` caption instead
 * of a Check button. Styles live in globals.css.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  fsrs,
  Rating,
  createEmptyCard,
  type Card,
  type Grade,
  type FSRSParameters,
  type RecordLog,
} from "ts-fsrs";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

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

const BUTTON_STYLES: Omit<ButtonMeta, "label">[] = [
  {
    rating: Rating.Again,
    key: "again",
    color: "var(--coral-500)",
    shadow: "var(--coral-700)",
    textColor: "#fff",
  },
  {
    rating: Rating.Hard,
    key: "hard",
    color: "var(--sun-400)",
    shadow: "var(--sun-500)",
    textColor: "var(--ink-900)",
  },
  {
    rating: Rating.Good,
    key: "good",
    color: "var(--green-600)",
    shadow: "var(--green-700)",
    textColor: "#fff",
  },
  {
    rating: Rating.Easy,
    key: "easy",
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
  eyebrowPrefix,
  frontLabel,
  backLabel,
  title,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: SRSFlashcardV2Props) {
  const { t } = useTranslation();
  const scheduler = useMemo(() => fsrs(fsrsParams), [fsrsParams]);
  const resolvedEyebrowPrefix = eyebrowPrefix ?? t("exercise.deck");
  const resolvedFrontLabel = frontLabel ?? t("exercise.front");
  const resolvedBackLabel = backLabel ?? t("exercise.back");
  const resolvedTitle = title ?? t("exercise.srsFlashcard.title");
  const BUTTONS: ButtonMeta[] = BUTTON_STYLES.map((b) => ({
    ...b,
    label:
      b.key === "again"
        ? t("exercise.again")
        : b.key === "hard"
          ? t("exercise.hard")
          : b.key === "good"
            ? t("exercise.good")
            : t("exercise.easy"),
  }));

  // Card state per index — lazy hydrated from initialSchedule or empty.
  const [cardStates, setCardStates] = useState<Card[]>(() =>
    cards.map((c) => {
      const seed = initialSchedule?.[c.front];
      return seed ? hydrate(seed) : createEmptyCard();
    })
  );

  /**
   * SR-03: the SESSION queue holds card indices. "Again" re-inserts the
   * current index ~3 positions later so the lapse comes back for another
   * look this session. FSRS scheduling (cardStates) is untouched by this —
   * the queue is presentation-only.
   */
  const [queue, setQueue] = useState<number[]>(() => cards.map((_, i) => i));
  const [qPos, setQPos] = useState(0);
  /** Card indices that lapsed at least once (coral progress dots). */
  const [lapsed, setLapsed] = useState<Record<number, boolean>>({});
  const [flipped, setFlipped] = useState(false);
  /** Card-swap animation phase: enter on mount/next card, exit on rating. */
  const [anim, setAnim] = useState<"enter" | "exit">("enter");
  const swapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  useEffect(() => () => clearTimeout(swapTimer.current), []);
  const [stats, setStats] = useState<SRSRatingStats>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [done, setDone] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const cardIdx = queue[qPos];
  const card = cards[cardIdx];
  const cardState = cardStates[cardIdx];

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
    if (!cardState || anim === "exit" || done) return; // ignore taps mid-swap
    // FSRS contract preserved: every rating (incl. re-reviews of a requeued
    // card) goes through scheduler.next on that card's evolving state.
    const { card: nextCard } = scheduler.next(cardState, new Date(), rating);
    const nextStates = cardStates.slice();
    nextStates[cardIdx] = nextCard;
    setCardStates(nextStates);

    const nextStats = { ...stats, [key]: stats[key] + 1 };
    setStats(nextStats);

    // SR-03: "Again" re-queues this card ~3 positions later (or at the end).
    let nextQueue = queue;
    if (key === "again") {
      nextQueue = queue.slice();
      const reinsert = Math.min(qPos + 3, nextQueue.length);
      nextQueue.splice(reinsert, 0, cardIdx);
      setQueue(nextQueue);
      setLapsed((l) => ({ ...l, [cardIdx]: true }));
    }

    if (qPos === nextQueue.length - 1) {
      setDone(true);
      setStreak((s) => s + 1);
      fire();
      return;
    }
    // Exit → swap → enter (matches .fb-cardwrap.exit ~320ms in globals.css).
    setAnim("exit");
    swapTimer.current = setTimeout(() => {
      setQPos((p) => p + 1);
      setFlipped(false);
      setAnim("enter");
    }, 320);
  };

  /** SR-01: keys 1–4 rate the flipped card (window-level for reach). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !flipped || anim === "exit") return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) {
        const b = BUTTONS[n - 1];
        rate(b.rating, b.key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const known = stats.good + stats.easy;
  const feedback: LessonFeedback | null = done
    ? {
        kind: "ok",
        msg: t("exercise.srsFlashcard.deckComplete")
          .replace("{known}", String(known))
          .replace("{total}", String(cards.length)),
        // SR-03: completion copy explains why some cards showed up twice.
        explain:
          stats.again > 0
            ? (stats.again === 1
                ? t("exercise.srsFlashcard.lapseExplainOne")
                : t("exercise.srsFlashcard.lapseExplain")
              ).replace("{n}", String(stats.again))
            : undefined,
      }
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
        eyebrow={`${resolvedEyebrowPrefix} ${done ? t("exercise.deckDone") : t("exercise.deckCardOf").replace("{n}", String(qPos + 1)).replace("{total}", String(queue.length))}`}
        title={resolvedTitle}
        feedback={feedback}
        onContinue={handleContinue}
        canCheck={false}
        showSkip={false}
        onCheck={() => {}}
        onQuit={onQuit}
        instant
        instantLabel={
          flipped
            ? t("exercise.srsFlashcard.rateHint")
            : // SR-01: surface the keyboard path (Space flips, 1–4 rate).
              t("exercise.srsFlashcard.tapHintKeys")
        }
      >
        {!done && card && (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div
              className="fb-dots"
              aria-label={t("exercise.deckCardOf")
                .replace("{n}", String(qPos + 1))
                .replace("{total}", String(queue.length))}
            >
              {/* SR-03: dots follow the session queue; lapsed cards coral. */}
              {queue.map((ci, i) => (
                <i
                  key={i}
                  className={
                    i < qPos
                      ? lapsed[ci]
                        ? "lapse"
                        : "done"
                      : i === qPos
                        ? "cur"
                        : ""
                  }
                />
              ))}
            </div>

            <div className={`fb-cardwrap ${anim}`} style={{ marginBottom: 20 }}>
              <div
                className={"fb-card3d" + (flipped ? " flipped" : "")}
                style={{ height: 260 }}
                // SR-01: the card is a real button — Space/Enter flip it.
                role="button"
                tabIndex={0}
                aria-pressed={flipped}
                aria-label={
                  flipped
                    ? `${resolvedBackLabel}: ${card.back}`
                    : `${resolvedFrontLabel}: ${card.front}. ${t("exercise.tapToFlip")}`
                }
                onClick={() => setFlipped(true)}
                onKeyDown={(e) => {
                  if ((e.key === " " || e.key === "Enter") && !flipped) {
                    e.preventDefault();
                    setFlipped(true);
                  }
                }}
              >
                <div className="inner" style={{ height: "100%" }}>
                  <div className="fb-card-face">
                    <div style={{ textAlign: "center" }}>
                      <div className="gp-eyebrow">{resolvedFrontLabel}</div>
                      <div
                        style={{
                          // SR-05: container-relative clamp so long fronts
                          // ("извините") fit narrow panes without clipping.
                          fontSize: "clamp(34px, 13cqw, 58px)",
                          fontWeight: 700,
                          color: "var(--ink-900)",
                          lineHeight: 1.15,
                          letterSpacing: "-0.02em",
                          overflowWrap: "anywhere",
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
                        {t("exercise.tapToFlip")}
                      </div>
                    </div>
                  </div>
                  <div className="fb-card-face back">
                    <div style={{ textAlign: "center" }}>
                      <div className="gp-eyebrow">{resolvedBackLabel}</div>
                      <div
                        style={{
                          fontSize: 32,
                          fontWeight: 800,
                          color: "var(--ink-900)",
                          overflowWrap: "anywhere",
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
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {flipped && anim !== "exit" && (
              <div
                style={{
                  display: "grid",
                  // SR-02: ratings wrap to 2×2 in narrow panes instead of
                  // squeezing four unreadable columns.
                  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                  gap: 8,
                }}
              >
                {BUTTONS.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    className="fb-rate"
                    onClick={() => rate(b.rating, b.key)}
                    style={{
                      background: b.color,
                      color: b.textColor,
                      boxShadow: `0 4px 0 0 ${b.shadow}`,
                    }}
                  >
                    {b.label}
                    <small>{intervalLabel(b.rating)}</small>
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
