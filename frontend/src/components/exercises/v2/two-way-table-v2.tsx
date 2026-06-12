"use client";

/**
 * TwoWayTableV2 — fill missing cells in a row × col table with totals.
 *
 * Adopted from q-math-templates.jsx · TwoWayTableExerciseV2. Methodist
 * supplies row + column labels, the 2D cell matrix (use `null` for
 * blanks the student must fill), and an "r,c" → value answer map.
 * Last row + last column are styled as totals (green tint).
 *
 * Per-task HP + streak; retry preserves typed values.
 */

import { Fragment, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface TwoWayTableV2Props {
  rowLabels: string[];
  colLabels: string[];
  /** 2D matrix; null marks a blank input. Same dims as rows × cols. */
  cells: (number | null)[][];
  /** Map of "r,c" → correct value. Indices match the cells matrix. */
  answers: Record<string, number>;
  /** Hint shown below the table. */
  hint?: string;
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

export function TwoWayTableV2({
  rowLabels,
  colLabels,
  cells,
  answers,
  hint,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: TwoWayTableV2Props) {
  const { t } = useTranslation();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [lockedOk, setLockedOk] = useState<Record<string, boolean>>({}); // TW-06
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const blanks: string[] = [];
  for (let r = 0; r < cells.length; r++) {
    for (let c = 0; c < cells[r].length; c++) {
      if (cells[r][c] === null) blanks.push(`${r},${c}`);
    }
  }
  const allFilled = blanks.every((k) => (vals[k] || "").trim().length > 0);

  const handleCheck = () => {
    const res: Record<string, boolean> = {};
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
        msg: usedAttempts === 0 ? t("exercise.twoWayTable.totalsCheckOut") : t("exercise.gotIt"),
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
    const msg = (wrong === 1 ? t("exercise.twoWayTable.wrongOne") : t("exercise.twoWayTable.wrongMany")).replace("{n}", String(wrong));
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg, explain: hint });
      setStreak(0);
    } else {
      const attemptsMsg = (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining));
      setFeedback({
        kind: "no",
        msg: `${msg} ${attemptsMsg}`,
        explain: hint,
      });
    }
  };

  const handleRetry = () => {
    // TW-06: lock the cells that are already correct so the student only
    // needs to fix the wrong ones.
    const locks: Record<string, boolean> = { ...lockedOk };
    for (const k of blanks) if (results[k]) locks[k] = true;
    setLockedOk(locks);
    setResults({});
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
        title={title ?? t("exercise.twoWayTable.title")}
        feedback={feedback}
        canCheck={allFilled}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              // TW-02: label column flexes within a sane range; cells stay tappable.
              gridTemplateColumns: `minmax(72px, 100px) repeat(${colLabels.length}, minmax(56px, 1fr))`,
            }}
          >
            <div style={cellH}></div>
            {colLabels.map((c, i) => (
              <div
                key={i}
                style={{
                  ...cellH,
                  fontWeight: 800,
                  color:
                    i === colLabels.length - 1
                      ? "var(--green-700)"
                      : "var(--ink-500)",
                }}
              >
                {c}
              </div>
            ))}
            {rowLabels.map((r, ri) => (
              <Fragment key={ri}>
                <div
                  style={{
                    ...cellH,
                    borderTop: "1px solid var(--ink-100)",
                    fontWeight: 800,
                    textAlign: "left",
                    color:
                      ri === rowLabels.length - 1
                        ? "var(--green-700)"
                        : "var(--ink-700)",
                  }}
                >
                  {r}
                </div>
                {colLabels.map((_, ci) => {
                  const val = cells[ri][ci];
                  const key = `${ri},${ci}`;
                  const v = vals[key] || "";
                  const locked = lockedOk[key];
                  const isOk = results[key] === true || locked;
                  const isNo = results[key] === false;
                  const isTotal =
                    ri === rowLabels.length - 1 ||
                    ci === colLabels.length - 1;
                  if (val !== null) {
                    return (
                      <div
                        key={ci}
                        style={{
                          ...cell,
                          borderTop: "1px solid var(--ink-100)",
                          background: isTotal ? "var(--green-50)" : "var(--paper-2)",
                          color: isTotal ? "var(--green-800)" : "var(--ink-900)",
                          fontFamily: "var(--font-mono)",
                          fontWeight: isTotal ? 800 : 600,
                        }}
                      >
                        {val}
                      </div>
                    );
                  }
                  return (
                    <div
                      key={ci}
                      style={{
                        ...cell,
                        borderTop: "1px solid var(--ink-100)",
                        padding: 6,
                      }}
                    >
                      <input
                        value={v}
                        disabled={!!feedback || locked}
                        inputMode="numeric"
                        onChange={(e) =>
                          // TW-01: digits + a leading minus only.
                          setVals({
                            ...vals,
                            [key]: e.target.value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, ""),
                          })
                        }
                        placeholder="?"
                        style={{
                          width: "100%",
                          minHeight: 40,
                          padding: "8px 4px",
                          borderRadius: 6,
                          border: `2px solid ${isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-200)"}`,
                          background: isOk
                            ? "var(--green-50)"
                            : isNo
                              ? "var(--coral-50)"
                              : "var(--paper)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 16,
                          fontWeight: 700,
                          textAlign: "center",
                          color: "var(--ink-900)",
                          outline: "none",
                        }}
                      />
                    </div>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
        {hint && (
          <p
            style={{
              textAlign: "center",
              marginTop: 12,
              fontSize: 13,
              color: "var(--ink-500)",
            }}
          >
            {t("exercise.hintPrefix")} {hint}
          </p>
        )}
      </LessonShell>
    </div>
  );
}
