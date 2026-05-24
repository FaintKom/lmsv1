"use client";

/**
 * MatchingV2 — tap a left term, then tap its matching right term.
 *
 * Adopted from q-basics.jsx · MatchingExerciseV2. The source's 8-item
 * single-grid layout flowed row by row (`L L | L L | R R | R R`) — fixed
 * here with two parallel side-by-side columns so the methodist can see
 * lefts on the left, rights on the right at all times.
 *
 * Same per-task HP + streak as the rest of the V2 family. Streak is
 * decided once at the end of the task: solved = +1, gave up = 0.
 */

import { useEffect, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingV2Props {
  pairs: MatchingPair[];
  eyebrow?: string;
  title?: string;
  /** Max wrong-tap rounds before the task ends in failure. Default = pairs.length */
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; wrongAttempts: number; streak: number }) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function MatchingV2({
  pairs,
  eyebrow,
  title,
  maxAttemptsPerTask,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: MatchingV2Props) {
  const maxAttempts = maxAttemptsPerTask ?? pairs.length;
  const indices = pairs.map((_, i) => i);
  const [leftOrder] = useState(() => shuffle(indices));
  const [rightOrder] = useState(() => shuffle(indices));
  const [pickedL, setPickedL] = useState<number | null>(null);
  const [pickedR, setPickedR] = useState<number | null>(null);
  const [matched, setMatched] = useState<Record<number, "ok">>({});
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttempts);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  // Resolve a tap pair as soon as both sides are picked.
  useEffect(() => {
    if (pickedL === null || pickedR === null) return;
    if (pickedL === pickedR) {
      const nm = { ...matched, [pickedL]: "ok" as const };
      setMatched(nm);
      setPickedL(null);
      setPickedR(null);
      if (Object.keys(nm).length === pairs.length) {
        setTimeout(() => {
          setFeedback({ kind: "ok", msg: t("exercise.matching.allMatched") });
          setStreak((s) => s + 1);
          fire();
        }, 300);
      }
      return;
    }
    setWrongPair([pickedL, pickedR]);
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setWrongAttempts((w) => w + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    setTimeout(() => {
      setWrongPair(null);
      setPickedL(null);
      setPickedR(null);
      if (remaining <= 0) {
        setFeedback({
          kind: "no",
          msg: t("exercise.outOfAttempts"),
          correct: pairs.map((p) => `${p.left} → ${p.right}`).join(", "),
        });
        setStreak(0);
      }
    }, 600);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickedL, pickedR]);

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      wrongAttempts,
      streak,
    });
  };

  const stateForLeft = (idx: number) => {
    if (matched[idx] === "ok") return "correct";
    if (wrongPair && wrongPair[0] === idx) return "wrong";
    if (pickedL === idx) return "selected";
    return "";
  };
  const stateForRight = (idx: number) => {
    if (matched[idx] === "ok") return "correct";
    if (wrongPair && wrongPair[1] === idx) return "wrong";
    if (pickedR === idx) return "selected";
    return "";
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttempts}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.matching.title")}
        feedback={feedback}
        canCheck={false}
        showSkip={false}
        onCheck={() => {}}
        onContinue={handleContinue}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {leftOrder.map((idx) => (
              <button
                key={"l" + idx}
                className={"gp-tile " + stateForLeft(idx)}
                style={{
                  fontFamily: "var(--font-mono)",
                  padding: "14px 16px",
                  fontSize: 16,
                  width: "100%",
                }}
                disabled={matched[idx] === "ok" || !!feedback}
                onClick={() => setPickedL(idx)}
              >
                {pairs[idx].left}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rightOrder.map((idx) => (
              <button
                key={"r" + idx}
                className={"gp-tile " + stateForRight(idx)}
                style={{ padding: "14px 16px", fontSize: 14, width: "100%" }}
                disabled={matched[idx] === "ok" || !!feedback}
                onClick={() => setPickedR(idx)}
              >
                {pairs[idx].right}
              </button>
            ))}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
