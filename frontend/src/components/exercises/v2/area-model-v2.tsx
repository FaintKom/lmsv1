"use client";

/**
 * AreaModelV2 — partial-products multiplication via area rectangles.
 *
 * Methodist supplies a × b and "split" decompositions (e.g. 23 × 14
 * → a-split [20, 3], b-split [10, 4]). Component renders a grid of
 * partial-product rectangles, each sized proportionally and labeled
 * with its dimensions; student fills each cell's area + the grand
 * total.
 *
 * Per-task HP + streak. Teaches the distributive property visually.
 *
 * Design system: green/sun tinted cells, mono inputs, LessonShell
 * chrome.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface AreaModelV2Props {
  a: number;
  b: number;
  /** Decompositions — must sum to `a` and `b` respectively. */
  splits: { a: number[]; b: number[] };
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

const CELL_PAL = [
  "var(--green-50)",
  "var(--sun-50)",
  "var(--coral-50)",
  "var(--ink-50)",
];

export function AreaModelV2({
  a,
  b,
  splits,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: AreaModelV2Props) {
  const [cells, setCells] = useState<Record<string, string>>({});
  const [total, setTotal] = useState("");
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [totalOk, setTotalOk] = useState<boolean | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const expectedTotal = a * b;
  const expectedCell = (r: number, c: number) => splits.b[r] * splits.a[c];

  const allFilled =
    total.trim().length > 0 &&
    splits.b.every((_, r) =>
      splits.a.every((__, c) => (cells[`${r},${c}`] || "").trim().length > 0)
    );

  const handleCheck = () => {
    const res: Record<string, boolean> = {};
    let wrong = 0;
    splits.b.forEach((_, r) => {
      splits.a.forEach((__, c) => {
        const key = `${r},${c}`;
        const v = parseFloat(cells[key] || "");
        const ok = v === expectedCell(r, c);
        res[key] = ok;
        if (!ok) wrong++;
      });
    });
    setResults(res);
    const tOk = parseFloat(total) === expectedTotal;
    setTotalOk(tOk);
    if (wrong === 0 && tOk) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? `${a} × ${b} = ${expectedTotal}.`
            : "Got it!",
        explain: `${splits.a.join(" + ")} × ${splits.b.join(" + ")} = sum of all ${
          splits.a.length * splits.b.length
        } partial products.`,
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
    const msg = !tOk
      ? wrong > 0
        ? `${wrong} cell${wrong === 1 ? "" : "s"} off and the total is wrong.`
        : "Cells are right, but the total isn't."
      : `${wrong} cell${wrong === 1 ? "" : "s"} off.`;
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg,
        correct: `${a} × ${b} = ${expectedTotal}`,
      });
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
              Fill the area model for{" "}
              <span
                className="gp-mark"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {a} × {b}
              </span>
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
          {/* a-split labels (across top) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `60px ${splits.a.map((n) => `${n}fr`).join(" ")}`,
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <div />
            {splits.a.map((n, c) => (
              <div
                key={`ax-${c}`}
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "var(--green-700)",
                }}
              >
                {n}
              </div>
            ))}
          </div>
          {/* rows */}
          {splits.b.map((bn, r) => (
            <div
              key={`row-${r}`}
              style={{
                display: "grid",
                gridTemplateColumns: `60px ${splits.a.map((n) => `${n}fr`).join(" ")}`,
                gap: 4,
                marginBottom: 4,
                alignItems: "stretch",
              }}
            >
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: 16,
                  color: "var(--coral-700)",
                }}
              >
                {bn}
              </div>
              {splits.a.map((an, c) => {
                const key = `${r},${c}`;
                const v = cells[key] || "";
                const isOk = results[key] === true;
                const isNo = results[key] === false;
                const palIdx = (r + c) % CELL_PAL.length;
                return (
                  <div
                    key={key}
                    style={{
                      background: isOk
                        ? "var(--green-50)"
                        : isNo
                          ? "var(--coral-50)"
                          : CELL_PAL[palIdx],
                      border: `2px solid ${
                        isOk
                          ? "var(--green-500)"
                          : isNo
                            ? "var(--coral-500)"
                            : "var(--ink-200)"
                      }`,
                      borderRadius: 10,
                      padding: 8,
                      minHeight: Math.max(48, bn * 8),
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "var(--ink-500)",
                      }}
                    >
                      {bn} × {an}
                    </div>
                    <input
                      value={v}
                      disabled={!!feedback}
                      onChange={(e) =>
                        setCells({ ...cells, [key]: e.target.value })
                      }
                      placeholder="?"
                      inputMode="numeric"
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        borderRadius: 6,
                        border: "1px solid var(--ink-200)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 15,
                        textAlign: "center",
                        background: "var(--paper)",
                        color: "var(--ink-900)",
                        outline: "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          {/* total row */}
          <div
            style={{
              marginTop: 18,
              padding: 14,
              background: "var(--paper-2)",
              border: `2px solid ${
                totalOk === true
                  ? "var(--green-500)"
                  : totalOk === false
                    ? "var(--coral-500)"
                    : "var(--ink-100)"
              }`,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--ink-700)",
              }}
            >
              {a} × {b} =
            </span>
            <input
              value={total}
              disabled={!!feedback}
              onChange={(e) => setTotal(e.target.value)}
              placeholder="?"
              inputMode="numeric"
              style={{
                width: 100,
                padding: "8px 10px",
                borderRadius: 8,
                border: `2px solid ${
                  totalOk === true
                    ? "var(--green-500)"
                    : totalOk === false
                      ? "var(--coral-500)"
                      : "var(--ink-200)"
                }`,
                background:
                  totalOk === true
                    ? "var(--green-50)"
                    : totalOk === false
                      ? "var(--coral-50)"
                      : "var(--paper)",
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                fontSize: 18,
                textAlign: "center",
                color: "var(--ink-900)",
              }}
            />
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--ink-400)",
              textAlign: "center",
              fontFamily: "var(--font-mono)",
            }}
          >
            Each cell = (row × col). Total = sum of cells.
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
