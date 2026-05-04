"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

interface Card {
  id?: string;
  front: string;
  back: string;
  hint?: string;
  audio_url?: string;
  image_url?: string;
}

interface CardState {
  easiness: number;
  interval: number;       // days
  repetitions: number;
  next_review: string;    // ISO 8601
  last_grade: number;     // 0..5
}

interface SrsFlashcardProps {
  exerciseId: string;
  cards: Card[];
  instructions?: string;
  dailyNewCards?: number;
  dailyReviewCap?: number;
  onSubmit: (answers: { srs_history: Record<string, CardState> }) => void;
}

/** SM-2. Grade 0..5: 0=again, 3=hard, 4=good, 5=easy. */
function sm2(prev: CardState | undefined, grade: number): CardState {
  const baseline: CardState = prev ?? {
    easiness: 2.5,
    interval: 0,
    repetitions: 0,
    next_review: new Date().toISOString(),
    last_grade: 0,
  };
  let { easiness, interval, repetitions } = baseline;
  const newEasiness = Math.max(
    1.3,
    easiness + 0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02),
  );
  if (grade < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * newEasiness);
  }
  const next = new Date();
  next.setDate(next.getDate() + interval);
  return {
    easiness: newEasiness,
    interval,
    repetitions,
    next_review: next.toISOString(),
    last_grade: grade,
  };
}

function loadState(exerciseId: string): Record<string, CardState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(`srs_state_${exerciseId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveState(exerciseId: string, state: Record<string, CardState>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(`srs_state_${exerciseId}`, JSON.stringify(state));
}

export default function SrsFlashcardExercise({
  exerciseId,
  cards,
  instructions,
  dailyNewCards = 10,
  dailyReviewCap = 100,
  onSubmit,
}: SrsFlashcardProps) {
  const indexed = useMemo(
    () => cards.map((c, i) => ({ ...c, id: c.id || `c${i}` })),
    [cards],
  );

  const [state, setState] = useState<Record<string, CardState>>(() => loadState(exerciseId));
  const [flipped, setFlipped] = useState(false);
  const [reviewedToday, setReviewedToday] = useState(0);

  const queue = useMemo(() => {
    const now = Date.now();
    const due: typeof indexed = [];
    const fresh: typeof indexed = [];
    for (const c of indexed) {
      const s = state[c.id!];
      if (!s) {
        if (fresh.length < dailyNewCards) fresh.push(c);
      } else if (new Date(s.next_review).getTime() <= now) {
        due.push(c);
      }
    }
    return [...due, ...fresh].slice(0, dailyReviewCap);
  }, [indexed, state, dailyNewCards, dailyReviewCap]);

  const current = queue[0];

  const grade = useCallback((g: number) => {
    if (!current) return;
    const next = sm2(state[current.id!], g);
    const newState = { ...state, [current.id!]: next };
    setState(newState);
    saveState(exerciseId, newState);
    setReviewedToday((n) => n + 1);
    setFlipped(false);
  }, [current, state, exerciseId]);

  useEffect(() => {
    if (queue.length === 0 && reviewedToday > 0) {
      onSubmit({ srs_history: state });
    }
  }, [queue.length, reviewedToday, state, onSubmit]);

  const totalDue = queue.length;
  const progress = totalDue + reviewedToday > 0
    ? (reviewedToday / (totalDue + reviewedToday)) * 100
    : 0;

  if (!current) {
    return (
      <div className="gl-mobile-card text-center">
        <div className="text-3xl mb-3">🎉</div>
        <h2 className="text-2xl font-bold text-ink-900 mb-2">All done for today!</h2>
        <p className="text-ink-500">
          {reviewedToday > 0
            ? `You reviewed ${reviewedToday} card${reviewedToday === 1 ? "" : "s"}. Come back tomorrow.`
            : "No cards due right now."}
        </p>
      </div>
    );
  }

  return (
    <div className="gl-mobile-card">
      {instructions && (
        <p className="text-sm text-ink-500 mb-3">{instructions}</p>
      )}

      <div className="gl-mobile-progress" aria-label="Session progress">
        <div className="fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="text-xs text-ink-400 font-mono uppercase tracking-wider mb-4 text-center">
        {reviewedToday + 1} / {reviewedToday + totalDue}
      </div>

      <div
        className={`gl-flashcard ${flipped ? "is-flipped" : ""}`}
        onClick={() => setFlipped((f) => !f)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") setFlipped((f) => !f);
        }}
        aria-label={flipped ? "Flip back to front" : "Flip card to see answer"}
      >
        <div className="gl-flashcard-inner">
          <div className="gl-flashcard-face">
            <div className="term">{current.front}</div>
            {current.hint && <div className="hint">{current.hint}</div>}
            <div className="hint">tap to reveal</div>
          </div>
          <div className="gl-flashcard-face back">
            <div className="definition">{current.back}</div>
            <div className="hint">grade your recall below</div>
          </div>
        </div>
      </div>

      <div className="gl-thumb-zone">
        <button
          className="gl-srs-btn again"
          disabled={!flipped}
          onClick={() => grade(0)}
          aria-label="Again — didn't remember"
        >
          Again
          <small>1d</small>
        </button>
        <button
          className="gl-srs-btn hard"
          disabled={!flipped}
          onClick={() => grade(3)}
          aria-label="Hard"
        >
          Hard
          <small>{Math.max(1, Math.round((state[current.id!]?.interval ?? 1) * 1.2))}d</small>
        </button>
        <button
          className="gl-srs-btn good"
          disabled={!flipped}
          onClick={() => grade(4)}
          aria-label="Good"
        >
          Good
          <small>{(state[current.id!]?.interval ?? 1) * 2.5 | 0}d</small>
        </button>
        <button
          className="gl-srs-btn easy"
          disabled={!flipped}
          onClick={() => grade(5)}
          aria-label="Easy"
        >
          Easy
          <small>{((state[current.id!]?.interval ?? 1) * 4) | 0}d</small>
        </button>
      </div>
    </div>
  );
}
