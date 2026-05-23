"use client";

/**
 * SentenceBuilderV2 — tap word tiles in the correct order.
 *
 * Adopted from q-language.jsx · SentenceBuilderExerciseV2. Canonical
 * Duolingo tile build: source sentence on top, picked row in the
 * middle, shuffled bank (correct words + distractors) on the bottom.
 *
 * Per-task HP + streak. Retry preserves picked + bank state so the
 * student can fix the order without re-tapping every tile.
 */

import { useMemo, useState } from "react";
import { Volume2 } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface SentenceBuilderV2Props {
  source: string;
  /** Words in correct order. */
  correctWords: string[];
  /** Extra wrong-word tiles mixed into the bank. */
  distractors?: string[];
  eyebrow?: string;
  title?: string;
  explain?: string;
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

interface Tile {
  w: string;
  i: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SentenceBuilderV2({
  source,
  correctWords,
  distractors = [],
  eyebrow,
  title = "Build the sentence",
  explain,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onSpeak,
  onQuit,
  onFinish,
}: SentenceBuilderV2Props) {
  const all = useMemo(
    () => [...correctWords, ...distractors].map((w, i) => ({ w, i })),
    [correctWords, distractors]
  );
  const [bank, setBank] = useState<Tile[]>(() => shuffle(all));
  const [picked, setPicked] = useState<Tile[]>([]);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const moveToPicked = (item: Tile) => {
    if (feedback) return;
    setBank((b) => b.filter((x) => x.i !== item.i));
    setPicked((p) => [...p, item]);
  };
  const moveToBank = (item: Tile) => {
    if (feedback) return;
    setPicked((p) => p.filter((x) => x.i !== item.i));
    setBank((b) => [...b, item]);
  };

  const handleCheck = () => {
    const got = picked.map((p) => p.w);
    const isOk =
      got.length === correctWords.length &&
      got.every((w, i) => w === correctWords[i]);
    if (isOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "Excellent!" : "Got it!",
        explain,
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
        msg: "Out of attempts.",
        correct: correctWords.join(" "),
        explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `Almost — order matters. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
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
        title={title}
        feedback={feedback}
        canCheck={picked.length > 0}
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
            aria-label="Play audio"
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
              padding: "14px 16px",
              background: "var(--paper-2)",
              borderRadius: 14,
              border: "2px solid var(--ink-100)",
              fontSize: 17,
              fontWeight: 600,
              color: "var(--ink-900)",
            }}
          >
            {source}
          </div>
        </div>

        {/* picked row */}
        <div
          style={{
            minHeight: 64,
            padding: 10,
            borderTop: "2px solid var(--ink-100)",
            borderBottom: "2px solid var(--ink-100)",
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignContent: "flex-start",
            marginBottom: 20,
          }}
        >
          {picked.map((p) => (
            <button
              key={p.i}
              className="gp-tile"
              style={{ padding: "8px 14px", fontSize: 16 }}
              disabled={!!feedback}
              onClick={() => moveToBank(p)}
            >
              {p.w}
            </button>
          ))}
        </div>

        {/* bank */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            justifyContent: "center",
          }}
        >
          {bank.map((b) => (
            <button
              key={b.i}
              className="gp-tile"
              style={{ padding: "8px 14px", fontSize: 16 }}
              disabled={!!feedback}
              onClick={() => moveToPicked(b)}
            >
              {b.w}
            </button>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}
