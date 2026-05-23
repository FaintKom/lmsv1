"use client";

/**
 * TablePatternV2 — fill blanks in an x → f(x) table + name the rule.
 *
 * Adopted from q-math-templates.jsx · TablePatternExerciseV2.
 * Methodist supplies x values, y values (use `null` for blanks),
 * a map of blank-index → correct number, a list of accepted rule
 * strings (whitespace + case insensitive, "f(x)=" prefix stripped),
 * and a canonical rule display.
 *
 * Per-task HP + streak; retry preserves typed values.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface TablePatternV2Props {
  xValues: number[];
  /** Same length as xValues. `null` marks a blank for the student to fill. */
  yGiven: (number | null)[];
  /** Map of column index (matching null in yGiven) → correct number. */
  answers: Record<number, number>;
  /** Canonical accepted rule strings. Normalized for comparison. */
  ruleAccepted: string[];
  /** Pretty rule shown on reveal, e.g. "f(x) = 2x + 1". */
  ruleDisplay: string;
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

const cellH: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  background: "var(--ink-50)",
  color: "var(--ink-500)",
  borderRight: "1px solid var(--ink-100)",
};
const cell: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "center",
  color: "var(--ink-900)",
  borderRight: "1px solid var(--ink-100)",
};

const normRule = (s: string) =>
  s.trim().toLowerCase().replace(/\s+/g, "").replace(/^f\(x\)=/, "");

export function TablePatternV2({
  xValues,
  yGiven,
  answers,
  ruleAccepted,
  ruleDisplay,
  eyebrow,
  title = "Fill the blanks and name the rule",
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: TablePatternV2Props) {
  const [vals, setVals] = useState<Record<number, string>>({});
  const [results, setResults] = useState<Record<number, boolean>>({});
  const [rule, setRule] = useState("");
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const blankIndices = yGiven
    .map((y, i) => (y === null ? i : -1))
    .filter((i) => i >= 0);
  const allFilled = blankIndices.every(
    (i) => (vals[i] || "").trim().length > 0
  );

  const acceptedNorm = ruleAccepted.map(normRule);

  const handleCheck = () => {
    const res: Record<number, boolean> = {};
    let wrongCount = 0;
    for (const i of blankIndices) {
      const n = parseFloat(vals[i] || "");
      const ok = Math.abs(n - answers[i]) < 0.001;
      res[i] = ok;
      if (!ok) wrongCount++;
    }
    setResults(res);
    const ruleOk = acceptedNorm.includes(normRule(rule));

    if (wrongCount === 0 && ruleOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "Pattern decoded." : "Got it!",
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
    let msg: string;
    if (wrongCount === 0) {
      msg = "Numbers correct — but the rule isn't right yet.";
    } else {
      msg = `${wrongCount} number${wrongCount === 1 ? "" : "s"} wrong.`;
    }
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg, correct: ruleDisplay });
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
  const cols = xValues.length;

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
        canCheck={allFilled && rule.trim().length > 0}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `60px repeat(${cols}, 1fr)`,
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              <div style={cellH}>x</div>
              {xValues.map((x) => (
                <div key={x} style={cellH}>
                  {x}
                </div>
              ))}
              <div style={{ ...cellH, borderTop: "2px solid var(--ink-100)" }}>
                f(x)
              </div>
              {xValues.map((_, i) => {
                const y = yGiven[i];
                const v = vals[i] || "";
                const isOk = results[i] === true;
                const isNo = results[i] === false;
                if (y !== null) {
                  return (
                    <div
                      key={i}
                      style={{
                        ...cell,
                        borderTop: "2px solid var(--ink-100)",
                      }}
                    >
                      {y}
                    </div>
                  );
                }
                return (
                  <div
                    key={i}
                    style={{
                      ...cell,
                      borderTop: "2px solid var(--ink-100)",
                      padding: 4,
                    }}
                  >
                    <input
                      value={v}
                      disabled={!!feedback}
                      onChange={(e) =>
                        setVals({ ...vals, [i]: e.target.value })
                      }
                      placeholder="?"
                      style={{
                        width: "100%",
                        padding: "6px 4px",
                        borderRadius: 6,
                        border: `2px solid ${isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-200)"}`,
                        background: isOk
                          ? "var(--green-50)"
                          : isNo
                            ? "var(--coral-50)"
                            : "var(--paper)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 15,
                        fontWeight: 700,
                        textAlign: "center",
                        color: "var(--ink-900)",
                        outline: "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="gp-eyebrow" style={{ marginBottom: 6 }}>
            What's the rule?
          </div>
          <input
            value={rule}
            disabled={!!feedback}
            onChange={(e) => setRule(e.target.value)}
            placeholder={ruleDisplay}
            className="gp-input"
            style={{ fontFamily: "var(--font-mono)", textAlign: "center" }}
          />
        </div>
      </LessonShell>
    </div>
  );
}
