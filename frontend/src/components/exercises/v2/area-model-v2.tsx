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
import { useTranslation } from "@/lib/i18n/context";

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

/**
 * AM-01: column widths track the splits proportionally, but a literal "20fr 3fr"
 * crushes the small column at ~7:1. Clamp the ratio to max 2.4:1 so every cell
 * stays readable and tappable.
 */
function gridCols(parts: number[]): string {
  const mn = Math.min(...parts);
  const fr = parts.map((p) => Math.min(p / mn, 2.4));
  return `minmax(48px, 60px) ${fr.map((f) => `minmax(64px, ${f}fr)`).join(" ")}`;
}

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
  const { t } = useTranslation();

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
            ? t("exercise.areaModel.aTimesBEquals").replace("{a}", String(a)).replace("{b}", String(b)).replace("{n}", String(expectedTotal))
            : t("exercise.gotIt"),
        explain: t("exercise.areaModel.partialProductsExplain")
          .replace("{aParts}", splits.a.join(" + "))
          .replace("{bParts}", splits.b.join(" + "))
          .replace("{n}", String(splits.a.length * splits.b.length)),
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
        ? (wrong === 1 ? t("exercise.areaModel.cellsOffOne") : t("exercise.areaModel.cellsOffMany")).replace("{n}", String(wrong))
        : t("exercise.areaModel.cellsRightTotalWrong")
      : (wrong === 1 ? t("exercise.areaModel.cellsOffOnlyOne") : t("exercise.areaModel.cellsOffOnlyMany")).replace("{n}", String(wrong));
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg,
        correct: `${a} × ${b} = ${expectedTotal}`,
      });
      setStreak(0);
    } else {
      const attemptsMsg = (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining));
      setFeedback({
        kind: "no",
        msg: `${msg} ${attemptsMsg}`,
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
              {t("exercise.areaModel.fillForA")}{" "}
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
        <div style={{ maxWidth: 520, margin: "0 auto", overflowX: "auto" }}>
          {/* a-split labels (across top) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: gridCols(splits.a),
              alignItems: "center",
              marginBottom: 4,
              minWidth: "min-content",
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
                gridTemplateColumns: gridCols(splits.a),
                gap: 4,
                marginBottom: 4,
                alignItems: "stretch",
                minWidth: "min-content",
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
                        whiteSpace: "nowrap",
                      }}
                    >
                      {bn} × {an}
                    </div>
                    <input
                      value={v}
                      disabled={!!feedback}
                      aria-label={`${bn} × ${an}`}
                      onChange={(e) =>
                        setCells({
                          ...cells,
                          [key]: e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      placeholder="?"
                      inputMode="numeric"
                      style={{
                        width: "100%",
                        minHeight: 40,
                        padding: "8px 6px",
                        borderRadius: 6,
                        border: "1px solid var(--ink-200)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 16,
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
              aria-label={`${a} × ${b}`}
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
            {t("exercise.areaModel.cellRowCol")}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
