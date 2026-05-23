"use client";

/**
 * VennDiagramV2 — count students per region (numbers mode).
 *
 * Adopted from q-math-templates.jsx · VennDiagramExerciseV2. Two
 * overlapping circles (A, B). Methodist supplies which regions are
 * `given` (rendered as locked values) and which are blanks the
 * student must compute. Four regions: a_only, intersection, b_only,
 * neither.
 *
 * Per-task HP + streak; retry preserves entered values.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export type VennRegion = "a_only" | "intersection" | "b_only" | "neither";

export interface VennDiagramV2Props {
  setA: string;
  setB: string;
  /** Total population shown in eyebrow strip. */
  total?: number;
  /** Map of region → given value (read-only). */
  given?: Partial<Record<VennRegion, number>>;
  /** Map of region → correct answer for blank regions. */
  answers: Partial<Record<VennRegion, number>>;
  /** Sentence shown below the diagram explaining the constraints. */
  prompt?: string;
  eyebrow?: string;
  title?: React.ReactNode;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

const POSITIONS: Record<VennRegion, { x: number; y: number }> = {
  a_only: { x: 120, y: 130 },
  intersection: { x: 210, y: 130 },
  b_only: { x: 300, y: 130 },
  neither: { x: 380, y: 230 },
};

export function VennDiagramV2({
  setA,
  setB,
  total,
  given = {},
  answers,
  prompt,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: VennDiagramV2Props) {
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

  const blanks = Object.keys(answers) as VennRegion[];
  const allFilled = blanks.every((k) => (vals[k] || "").trim().length > 0);

  const handleCheck = () => {
    const res: Partial<Record<VennRegion, boolean>> = {};
    let wrong = 0;
    for (const k of blanks) {
      const n = parseFloat(vals[k] || "");
      const ok = n === answers[k];
      res[k] = ok;
      if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? `Regions add up${total !== undefined ? ` to ${total}` : ""}.`
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
    const msg = `${wrong} region${wrong === 1 ? "" : "s"} wrong.`;
    const explain =
      total !== undefined
        ? `All four regions must sum to the total (${total}).`
        : "All four regions together cover the universe.";
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg, explain });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `${msg} ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
        explain,
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

  const regionInput = (key: VennRegion) => {
    const pos = POSITIONS[key];
    const isGiven = given[key] != null;
    const v = isGiven ? given[key]! : vals[key] || "";
    const isOk = results[key] === true;
    const isNo = results[key] === false;
    return (
      <foreignObject
        key={key}
        x={pos.x - 22}
        y={pos.y - 16}
        width="44"
        height="32"
        style={{ overflow: "visible" }}
      >
        {isGiven ? (
          <div
            style={{
              width: 44,
              height: 32,
              borderRadius: 8,
              background: "rgba(255,255,255,0.95)",
              border: "2px solid var(--ink-200)",
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              fontSize: 16,
              color: "var(--ink-900)",
            }}
          >
            {v}
          </div>
        ) : (
          <input
            value={vals[key] || ""}
            disabled={!!feedback}
            onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
            placeholder="?"
            style={{
              width: 44,
              height: 32,
              padding: 0,
              borderRadius: 8,
              border: `2px solid ${isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-200)"}`,
              background: isOk
                ? "var(--green-50)"
                : isNo
                  ? "var(--coral-50)"
                  : "rgba(255,255,255,0.95)",
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              fontSize: 16,
              textAlign: "center",
              color: "var(--ink-900)",
              outline: "none",
            }}
          />
        )}
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
        title={
          title ?? (
            <>
              {total !== undefined ? `${total} · ` : ""}
              {setA} ∪ {setB}
            </>
          )
        }
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
              height: 240,
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
            }}
          >
            {total !== undefined && (
              <text
                x="20"
                y="24"
                fontFamily="var(--font-mono)"
                fontSize="11"
                fill="var(--ink-500)"
                fontWeight="600"
                letterSpacing="0.08em"
              >
                UNIVERSE · {total}
              </text>
            )}
            <circle
              cx="160"
              cy="130"
              r="80"
              fill="var(--green-300)"
              opacity="0.5"
              stroke="var(--green-700)"
              strokeWidth="2"
            />
            <circle
              cx="260"
              cy="130"
              r="80"
              fill="var(--sun-300)"
              opacity="0.5"
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
              {setA}
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
              {setB}
            </text>
            {(["a_only", "intersection", "b_only", "neither"] as VennRegion[]).map(
              regionInput
            )}
            <text
              x="380"
              y="218"
              fontFamily="var(--font-mono)"
              fontSize="9"
              fill="var(--ink-500)"
              textAnchor="middle"
              fontWeight="600"
            >
              NEITHER
            </text>
          </svg>
          {prompt && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: "var(--ink-50)",
                borderRadius: 10,
                fontSize: 13,
                color: "var(--ink-700)",
              }}
            >
              {prompt}
            </div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}
