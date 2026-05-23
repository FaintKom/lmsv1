"use client";

/**
 * VennTextV2 — describe each Venn region in your own words.
 *
 * Adopted from q-math-templates.jsx · VennDiagramTextExerciseV2.
 * Methodist supplies canonical descriptions; comparison is a loose
 * term-overlap check (50%+ of significant terms from the canonical
 * must appear in the student's text). Per-task HP + streak.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export type VennRegion = "a_only" | "intersection" | "b_only" | "neither";

export interface VennTextV2Props {
  setA: string;
  setB: string;
  /** Canonical answer per region. */
  answers: Partial<Record<VennRegion, string>>;
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

const POSITIONS: Record<VennRegion, { x: number; y: number; w: number }> = {
  a_only: { x: 120, y: 130, w: 92 },
  intersection: { x: 210, y: 130, w: 70 },
  b_only: { x: 300, y: 130, w: 92 },
  neither: { x: 380, y: 220, w: 76 },
};

const normalize = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ");

export function VennTextV2({
  setA,
  setB,
  answers,
  eyebrow,
  title = "Describe each region in your own words",
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: VennTextV2Props) {
  const [vals, setVals] = useState<Partial<Record<VennRegion, string>>>({});
  const [results, setResults] = useState<Partial<Record<VennRegion, boolean>>>(
    {}
  );
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const keys = Object.keys(answers) as VennRegion[];
  const allFilled = keys.every((k) => (vals[k] || "").trim().length > 0);

  const handleCheck = () => {
    const res: Partial<Record<VennRegion, boolean>> = {};
    let wrong = 0;
    for (const k of keys) {
      const got = normalize(vals[k] || "");
      const target = normalize(answers[k] || "");
      const terms = target.split(" ").filter((t) => t.length > 2);
      const matched = terms.filter((t) => got.includes(t)).length;
      const ok = matched >= Math.max(1, Math.floor(terms.length * 0.5));
      res[k] = ok;
      if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? "Good descriptions of each region."
            : "Got it!",
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
    const explain = (Object.entries(answers) as [VennRegion, string][])
      .map(([k, v]) => `${k}: "${v}"`)
      .join(" · ");
    const msg = `${wrong} region${wrong === 1 ? "" : "s"} off.`;
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg, explain });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `${msg} ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
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

  const regionTextarea = (key: VennRegion) => {
    const pos = POSITIONS[key];
    const isOk = results[key] === true;
    const isNo = results[key] === false;
    return (
      <foreignObject
        key={key}
        x={pos.x - pos.w / 2}
        y={pos.y - 24}
        width={pos.w}
        height={48}
        style={{ overflow: "visible" }}
      >
        <textarea
          value={vals[key] || ""}
          disabled={!!feedback}
          onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
          placeholder="describe…"
          style={{
            width: "100%",
            height: 48,
            padding: 6,
            borderRadius: 8,
            border: `2px solid ${isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-200)"}`,
            background: isOk
              ? "var(--green-50)"
              : isNo
                ? "var(--coral-50)"
                : "rgba(255,255,255,0.95)",
            fontFamily: "var(--font-sans)",
            fontWeight: 500,
            fontSize: 11,
            textAlign: "center",
            color: "var(--ink-900)",
            outline: "none",
            resize: "none",
            lineHeight: 1.2,
          }}
        />
      </foreignObject>
    );
  };

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
        canCheck={allFilled}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <svg
            viewBox="0 0 420 260"
            style={{
              width: "100%",
              height: 260,
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
            }}
          >
            <circle
              cx="160"
              cy="130"
              r="80"
              fill="var(--green-300)"
              opacity="0.42"
              stroke="var(--green-700)"
              strokeWidth="2"
            />
            <circle
              cx="260"
              cy="130"
              r="80"
              fill="var(--sun-300)"
              opacity="0.42"
              stroke="var(--sun-700)"
              strokeWidth="2"
            />
            <text
              x="100"
              y="40"
              fontFamily="var(--font-sans)"
              fontWeight="800"
              fontSize="13"
              fill="var(--green-800)"
              textAnchor="middle"
            >
              A · {setA}
            </text>
            <text
              x="320"
              y="40"
              fontFamily="var(--font-sans)"
              fontWeight="800"
              fontSize="13"
              fill="var(--sun-700)"
              textAnchor="middle"
            >
              B · {setB}
            </text>
            {keys.map(regionTextarea)}
          </svg>
        </div>
      </LessonShell>
    </div>
  );
}
