"use client";

/**
 * FunctionMachineV2 — feed inputs to a "machine", discover the rule.
 *
 * Methodist supplies a `rule(x)` function + canonical accepted rule
 * strings + a pretty display. Student types numbers into the funnel,
 * watches them animate through the machine, sees outputs accumulate
 * in a log, then types the rule they discovered.
 *
 * Exercise-mechanics handoff (ex-graphs2.jsx · FunctionMachineV2):
 * - FM-01 sanitised decimal input (comma → dot, one dot, leading minus)
 *         with inputMode="decimal"; Enter feeds the machine.
 * - FM-02 rule normalisation strips "f(x)=", "y=", "*", whitespace and
 *         case before comparing — consistent with TablePatternV2.
 * - FM-04 duplicate-input nudge ("you already tried 5 — try a NEW
 *         number") + method hint on a wrong rule guess.
 * - GX-01 `.gx-layout` so the panel stacks below in narrow containers.
 *
 * Per-task HP + streak.
 *
 * Design system: green machine body, sun input pill, coral output pill,
 * LessonShell chrome.
 */

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface FunctionMachineV2Props {
  /** The hidden rule. Component never reveals the function body. */
  rule: (x: number) => number;
  /** Canonical accepted rule strings. Normalized for comparison. */
  ruleAccepted: string[];
  /** Pretty rule shown on reveal, e.g. "f(x) = 3x − 2". */
  ruleDisplay: string;
  /** Suggested input values shown as quick-pick chips. */
  sampleInputs?: number[];
  eyebrow?: string;
  title?: string;
  /** Min inputs the student must run before Check enabled. Default 3. */
  minRuns?: number;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

interface RunEntry {
  x: number;
  y: number;
}

// FM-02: strip whitespace, case, "*", "f(x)=" and "y=" before comparing.
const normRule = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/\*/g, "")
    .replace(/^f\(x\)=/, "")
    .replace(/^y=/, "");

/** FM-01: comma → dot (RU decimal habit), one dot max, digits + leading minus only. */
const sanitizeNum = (s: string): string => {
  let out = "";
  let hasDot = false;
  for (const raw of s) {
    const ch = raw === "," ? "." : raw;
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !hasDot) {
      out += ".";
      hasDot = true;
    } else if ((ch === "-" || ch === "−") && out === "") out += "-";
  }
  return out.slice(0, 8);
};

export function FunctionMachineV2({
  rule,
  ruleAccepted,
  ruleDisplay,
  sampleInputs = [1, 2, 5, 10],
  eyebrow,
  title,
  minRuns = 3,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: FunctionMachineV2Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<RunEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [lastOut, setLastOut] = useState<number | null>(null);
  const [dupNudge, setDupNudge] = useState<number | null>(null);
  const [guess, setGuess] = useState("");
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const runTimer = useRef<number | null>(null);
  const nudgeTimer = useRef<number | null>(null);
  const { fire, layer } = useConfetti();

  useEffect(
    () => () => {
      if (runTimer.current) window.clearTimeout(runTimer.current);
      if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
    },
    []
  );

  const acceptedNorm = ruleAccepted.map(normRule);

  const runOne = (xRaw: number | string) => {
    if (feedback || running) return;
    const x = typeof xRaw === "number" ? xRaw : parseFloat(xRaw);
    if (!Number.isFinite(x)) return;
    // FM-04: nudge instead of silently re-running a duplicate input.
    if (history.some((h) => h.x === x)) {
      setDupNudge(x);
      if (nudgeTimer.current) window.clearTimeout(nudgeTimer.current);
      nudgeTimer.current = window.setTimeout(() => setDupNudge(null), 1600);
      setInput("");
      return;
    }
    setRunning(true);
    setLastOut(null);
    runTimer.current = window.setTimeout(() => {
      const y = rule(x);
      setHistory((h) => [...h, { x, y }]);
      setLastOut(y);
      setRunning(false);
      setInput("");
    }, 600);
  };

  const handleCheck = () => {
    const ok = acceptedNorm.includes(normRule(guess));
    if (ok) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.functionMachine.ruleCracked") : t("exercise.gotIt"),
        explain: ruleDisplay,
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
        msg: t("exercise.functionMachine.notTheRule"),
        correct: ruleDisplay,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.functionMachine.notQuiteTryMoreAttempt") : t("exercise.functionMachine.notQuiteTryMoreAttempts")).replace("{n}", String(remaining)),
        // FM-04: method hint — how to investigate, not what the rule is.
        explain: t("exercise.functionMachine.methodHint"),
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
  const canCheck =
    history.length >= minRuns && guess.trim().length > 0 && !feedback;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.functionMachine.title")}
        feedback={feedback}
        canCheck={canCheck}
        checkHint={
          history.length < minRuns
            ? t("exercise.functionMachine.checkHintFeed").replace("{n}", String(minRuns))
            : t("exercise.functionMachine.checkHintGuess")
        }
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div className="gx-layout" style={{ maxWidth: 640 }}>
          {/* Machine */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div
              style={{
                background: "var(--sun-50)",
                border: "2px solid var(--sun-300)",
                borderRadius: 999,
                padding: "10px 16px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 18,
                minWidth: 120,
                textAlign: "center",
                color: "var(--ink-900)",
                transition: "transform 600ms",
                transform: running ? "translateY(40px)" : "translateY(0)",
              }}
            >
              x = {input || "?"}
            </div>
            <ArrowDown size={18} color="var(--ink-400)" />
            <div
              style={{
                width: "min(220px, 100%)",
                padding: "26px 24px",
                background: "var(--green-600)",
                color: "#fff",
                border: "3px solid var(--green-700)",
                borderRadius: 18,
                textAlign: "center",
                fontFamily: "var(--font-sans)",
                fontWeight: 800,
                fontSize: 16,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow: "0 6px 0 var(--green-800)",
              }}
            >
              {running ? "computing…" : "f(x) = ???"}
            </div>
            <ArrowDown size={18} color="var(--ink-400)" />
            <div
              style={{
                background:
                  lastOut !== null ? "var(--coral-50)" : "var(--ink-50)",
                border: `2px solid ${lastOut !== null ? "var(--coral-300)" : "var(--ink-200)"}`,
                borderRadius: 999,
                padding: "10px 16px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 18,
                minWidth: 120,
                textAlign: "center",
                color: lastOut !== null ? "var(--coral-700)" : "var(--ink-400)",
                transition: "all 200ms",
              }}
            >
              y = {lastOut !== null ? lastOut : "?"}
            </div>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* FM-04: duplicate-input nudge */}
              {dupNudge !== null && (
                <span className="gp-checkhint" style={{ right: "auto", left: 0 }}>
                  {t("exercise.functionMachine.alreadyTried").replace("{x}", String(dupNudge))}
                </span>
              )}
              <input
                type="text"
                inputMode="decimal"
                value={input}
                disabled={running || !!feedback}
                aria-label={t("exercise.functionMachine.inputAria")}
                onChange={(e) => setInput(sanitizeNum(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim() !== "") runOne(input);
                }}
                placeholder="x"
                style={{
                  width: 80,
                  padding: "10px 10px",
                  borderRadius: 10,
                  border: "2px solid var(--ink-200)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 16,
                  fontWeight: 700,
                  textAlign: "center",
                  background: "var(--paper-2)",
                  color: "var(--ink-900)",
                  outline: "none",
                  minHeight: 44,
                }}
              />
              <button
                type="button"
                onClick={() => runOne(input)}
                disabled={running || !!feedback || input.trim() === ""}
                className="gp-btn"
                style={{ padding: "10px 18px", fontSize: 13 }}
              >
                {t("exercise.functionMachine.feed")}
              </button>
            </div>
            {sampleInputs.length > 0 && (
              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ink-400)",
                    alignSelf: "center",
                  }}
                >
                  {t("exercise.functionMachine.try")}
                </span>
                {sampleInputs.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => runOne(n)}
                    disabled={running || !!feedback}
                    style={{
                      padding: "4px 10px",
                      background: "var(--ink-50)",
                      border: "1px solid var(--ink-200)",
                      borderRadius: 999,
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--ink-700)",
                      cursor:
                        running || feedback ? "default" : "pointer",
                      opacity: history.some((h) => h.x === n) ? 0.35 : 1,
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* History + rule guess */}
          <div>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>
              {t("exercise.functionMachine.history")} · {history.length} / {minRuns}+
            </div>
            <div
              style={{
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 12,
                padding: 8,
                minHeight: 100,
                maxHeight: 200,
                overflowY: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--ink-900)",
                marginBottom: 14,
              }}
            >
              {history.length === 0 ? (
                <div
                  style={{
                    color: "var(--ink-400)",
                    fontSize: 11,
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  {t("exercise.functionMachine.feedSomeX")}
                </div>
              ) : (
                history.map((h, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "3px 6px",
                    }}
                  >
                    <span style={{ color: "var(--sun-700)" }}>x={h.x}</span>
                    <span style={{ color: "var(--ink-300)" }}>→</span>
                    <span style={{ color: "var(--coral-700)" }}>y={h.y}</span>
                  </div>
                ))
              )}
            </div>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>
              {t("exercise.functionMachine.whatIsFx")}
            </div>
            <input
              value={guess}
              disabled={!!feedback}
              aria-label={t("exercise.functionMachine.guessAria")}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canCheck) handleCheck();
              }}
              placeholder="f(x) = …"
              className="gp-input"
              style={{
                fontFamily: "var(--font-mono)",
                textAlign: "center",
                fontSize: 14,
              }}
            />
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
