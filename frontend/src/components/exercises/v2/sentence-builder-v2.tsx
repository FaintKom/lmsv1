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

import { useMemo, useRef, useState } from "react";
import { Volume2 } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { flyClone } from "@/components/lesson/fb-motion";
import { useTranslation } from "@/lib/i18n/context";

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
  title,
  explain,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onSpeak,
  onQuit,
  onFinish,
}: SentenceBuilderV2Props) {
  const { t } = useTranslation();
  const all = useMemo(
    () => [...correctWords, ...distractors].map((w, i) => ({ w, i })),
    [correctWords, distractors]
  );
  const [bank, setBank] = useState<Tile[]>(() => shuffle(all));
  const [picked, setPicked] = useState<Tile[]>([]);
  const [graded, setGraded] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  // SB-04: refs for the flyClone bank↔strip animation.
  const bankTileRefs = useRef<Record<number, HTMLElement | null>>({});
  const pickedTileRefs = useRef<Record<number, HTMLElement | null>>({});
  const stripRef = useRef<HTMLDivElement | null>(null);
  const bankRef = useRef<HTMLDivElement | null>(null);
  /** Tiles mid-flight — ignore re-taps until the clone lands. */
  const flying = useRef<Set<number>>(new Set());

  const moveToPicked = (item: Tile) => {
    if (feedback || flying.current.has(item.i)) return;
    flying.current.add(item.i);
    // SB-04: the word visually flies from the bank into the strip.
    flyClone(bankTileRefs.current[item.i] ?? null, stripRef.current, () => {
      flying.current.delete(item.i);
      setGraded(false);
      setBank((b) => b.filter((x) => x.i !== item.i));
      setPicked((p) => (p.some((x) => x.i === item.i) ? p : [...p, item]));
    });
  };
  // SB-02: returns ONLY the tapped tile (tracked by tile index `i`).
  const moveToBank = (item: Tile) => {
    if (feedback || flying.current.has(item.i)) return;
    flying.current.add(item.i);
    // SB-04: and flies back down on return.
    flyClone(pickedTileRefs.current[item.i] ?? null, bankRef.current, () => {
      flying.current.delete(item.i);
      setGraded(false);
      setPicked((p) => p.filter((x) => x.i !== item.i));
      setBank((b) => (b.some((x) => x.i === item.i) ? b : [...b, item]));
    });
  };

  /** Per-position tile state after grading: ripple on correct, shake on wrong. */
  const wordState = (item: Tile, pos: number): string => {
    if (!graded || !feedback) return "";
    return correctWords[pos] === item.w ? "correct" : "wrong";
  };

  const handleCheck = () => {
    setGraded(true);
    const got = picked.map((p) => p.w);
    const isOk =
      got.length === correctWords.length &&
      got.every((w, i) => w === correctWords[i]);
    if (isOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.sentenceBuilder.excellent") : t("exercise.gotIt"),
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
        msg: t("exercise.outOfAttempts"),
        correct: correctWords.join(" "),
        explain,
      });
      setStreak(0);
    } else {
      // SB-06: longest-correct-prefix coaching instead of a bare "not quite".
      let okPrefix = 0;
      while (
        okPrefix < picked.length &&
        okPrefix < correctWords.length &&
        picked[okPrefix].w === correctWords[okPrefix]
      ) {
        okPrefix++;
      }
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.sentenceBuilder.almostOrderMattersAttempt") : t("exercise.sentenceBuilder.almostOrderMattersAttempts")).replace("{n}", String(remaining)),
        explain:
          okPrefix > 1
            ? t("exercise.sentenceBuilder.firstWordsRight").replace("{n}", String(okPrefix))
            : okPrefix === 1
              ? t("exercise.sentenceBuilder.firstWordRight")
              : t("exercise.sentenceBuilder.tryDifferentStart"),
      });
    }
  };

  const handleRetry = () => {
    // Keep picked words so the student fixes the order; clear graded states.
    setGraded(false);
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
        title={title ?? t("exercise.sentenceBuilder.title")}
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
          ref={stripRef}
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
          {picked.length === 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--ink-200)",
                alignSelf: "center",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {t("exercise.sentenceBuilder.tapWordsBelow")}
            </span>
          )}
          {picked.map((p, pos) => (
            <button
              key={p.i}
              ref={(el) => {
                pickedTileRefs.current[p.i] = el;
              }}
              className={"gp-tile " + wordState(p, pos)}
              style={{ padding: "8px 14px", fontSize: 16 }}
              disabled={!!feedback && feedback.kind === "ok"}
              onClick={() => moveToBank(p)}
              title={t("exercise.sentenceBuilder.tapToReturn")}
            >
              {p.w}
            </button>
          ))}
        </div>

        {/* bank */}
        <div
          ref={bankRef}
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
              ref={(el) => {
                bankTileRefs.current[b.i] = el;
              }}
              className="gp-tile"
              style={{ padding: "8px 14px", fontSize: 16 }}
              disabled={!!feedback}
              onClick={() => moveToPicked(b)}
            >
              {b.w}
            </button>
          ))}
          {bank.length === 0 && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--ink-200)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {t("exercise.sentenceBuilder.bankEmpty")}
            </span>
          )}
        </div>
      </LessonShell>
    </div>
  );
}
