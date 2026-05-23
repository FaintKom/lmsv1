"use client";

/**
 * CodeChallengeV2 — split-pane editor + test panel in LessonShell chrome.
 *
 * Adopted from q-programming.jsx · CodeChallengeExerciseV2. Visual
 * port — execution is delegated: caller provides `onRun` / `onSubmit`
 * async callbacks that return test results. Component owns code
 * state, tab state, and the LessonShell HP/streak wrapping.
 *
 * Real backend wiring (sandbox executor at /api/v1/exercises/sandbox)
 * happens in a parent ExerciseV2 shell, not here.
 *
 * Note: this is a TEXTAREA-based editor (no Monaco) to keep the
 * component lightweight. A Monaco upgrade can swap the editor div
 * without touching state shape.
 */

import { useState } from "react";
import { Play, Check, X } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface CodeChallengeExample {
  input: string;
  output: string;
}

export interface CodeChallengeTestResult {
  id: number;
  name: string;
  passed: boolean;
  /** Execution time in ms. */
  time?: number;
  /** Hidden tests show "Hidden test" instead of name. */
  hidden?: boolean;
  expected?: string;
  actual?: string;
}

export interface CodeChallengeProblem {
  title: string;
  desc: string;
  /** Initial code shown in the editor. */
  starter: string;
  /** Display label, e.g. "Python 3". */
  language?: string;
  /** Filename rendered in the editor header. */
  filename?: string;
  examples: CodeChallengeExample[];
}

export interface CodeChallengeV2Props {
  problem: CodeChallengeProblem;
  /** Optional language picker options. Defaults to just `problem.language`. */
  languages?: string[];
  /** Called when student presses Run. Should return stdout/stderr text. */
  onRun?: (code: string, language: string) => Promise<string>;
  /** Called when student presses Submit. Should return full test results. */
  onSubmit?: (code: string, language: string) => Promise<CodeChallengeTestResult[]>;
  eyebrow?: string;
  hint?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    passed: number;
    total: number;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

type Tab = "output" | "tests";

export function CodeChallengeV2({
  problem,
  languages,
  onRun,
  onSubmit,
  eyebrow,
  hint,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: CodeChallengeV2Props) {
  const langs = languages ?? [problem.language ?? "Python 3"];
  const [code, setCode] = useState(problem.starter);
  const [language, setLanguage] = useState(langs[0]);
  const [tab, setTab] = useState<Tab>("output");
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState<string>("");
  const [results, setResults] = useState<CodeChallengeTestResult[] | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const handleRun = async () => {
    if (!onRun) return;
    setRunning(true);
    setTab("output");
    try {
      const stdout = await onRun(code, language);
      setOutput(stdout);
    } catch (err) {
      setOutput(String(err));
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;
    setRunning(true);
    setTab("tests");
    try {
      const r = await onSubmit(code, language);
      setResults(r);
      const passed = r.filter((t) => t.passed).length;
      const total = r.length;
      if (passed === total) {
        setFeedback({
          kind: "ok",
          msg:
            usedAttempts === 0
              ? `${passed}/${total} tests passed.`
              : `${passed}/${total} — got there!`,
        });
        setStreak((s) => s + 1);
        fire();
      } else {
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        setUsedAttempts((u) => u + 1);
        setLostHeart(true);
        setTimeout(() => setLostHeart(false), 500);
        if (remaining <= 0) {
          setFeedback({
            kind: "no",
            msg: `${passed}/${total} tests passed.`,
            explain: hint ?? "Out of attempts — review the failing tests below.",
          });
          setStreak(0);
        } else {
          setFeedback({
            kind: "no",
            msg: `${passed}/${total} tests passed.`,
            explain: `${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
          });
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const handleRetry = () => {
    setFeedback(null);
  };

  const handleContinue = () => {
    const passed = (results ?? []).filter((t) => t.passed).length;
    onFinish?.({
      correct: feedback?.kind === "ok",
      passed,
      total: results?.length ?? 0,
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const passedCount = (results ?? []).filter((t) => t.passed).length;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={problem.title}
        feedback={feedback}
        canCheck={!running && code.trim().length > 0}
        onCheck={handleSubmit}
        checkLabel="Submit"
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: 14,
            height: "100%",
            minHeight: 320,
          }}
        >
          {/* Left — problem + examples */}
          <div
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              padding: 18,
              fontSize: 13.5,
              lineHeight: 1.55,
              overflowY: "auto",
            }}
          >
            <p style={{ margin: "0 0 14px 0", color: "var(--ink-700)" }}>
              {problem.desc}
            </p>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>
              Examples
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {problem.examples.map((ex, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--ink-50)",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--ink-500)",
                    }}
                  >
                    Input:
                  </div>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--ink-900)",
                    }}
                  >
                    {ex.input}
                  </code>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--ink-500)",
                      marginTop: 6,
                    }}
                  >
                    Output:
                  </div>
                  <code
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--ink-900)",
                    }}
                  >
                    {ex.output}
                  </code>
                </div>
              ))}
            </div>
          </div>
          {/* Right — editor + output */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={!!feedback}
                style={{
                  background: "var(--paper-2)",
                  border: "2px solid var(--ink-100)",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-700)",
                }}
              >
                {langs.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleRun}
                disabled={running || !onRun || !!feedback}
                style={{
                  background: "var(--paper-2)",
                  border: "2px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink-700)",
                  cursor: running || !onRun ? "default" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Play size={12} /> Run
              </button>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-400)",
                }}
              >
                {problem.filename ?? "solution"}
              </span>
            </div>
            <div
              style={{
                flex: "1 1 200px",
                minHeight: 0,
                background: "#1a2a1f",
                borderRadius: 12,
                padding: 14,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                lineHeight: 1.55,
                color: "#d4f1c4",
                overflow: "auto",
                position: "relative",
              }}
            >
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                disabled={!!feedback}
                style={{
                  width: "100%",
                  height: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  color: "#d4f1c4",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                }}
              />
            </div>
            {/* output / tests panel */}
            <div
              style={{
                background: "var(--ink-50)",
                borderRadius: 12,
                border: "2px solid var(--ink-100)",
                minHeight: 110,
                maxHeight: 180,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid var(--ink-100)",
                }}
              >
                {(["output", "tests"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "8px 14px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: tab === t ? "var(--green-700)" : "var(--ink-400)",
                      borderBottom:
                        tab === t
                          ? "2px solid var(--green-600)"
                          : "2px solid transparent",
                    }}
                  >
                    {t}
                    {t === "tests" && results
                      ? ` · ${passedCount}/${results.length}`
                      : ""}
                  </button>
                ))}
              </div>
              <div
                style={{
                  flex: 1,
                  overflow: "auto",
                  padding: 10,
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                }}
              >
                {tab === "output" ? (
                  running ? (
                    <span style={{ color: "var(--ink-400)" }}>Running…</span>
                  ) : output ? (
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: "pre-wrap",
                        color: "var(--ink-700)",
                      }}
                    >
                      {output}
                    </pre>
                  ) : (
                    <span style={{ color: "var(--ink-500)" }}>
                      {"> "}Press Run to test.
                    </span>
                  )
                ) : !results ? (
                  <span style={{ color: "var(--ink-400)" }}>
                    Submit to run all test cases.
                  </span>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {results.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "4px 8px",
                          background: t.passed
                            ? "var(--green-50)"
                            : "var(--coral-50)",
                          borderRadius: 6,
                          color: t.passed
                            ? "var(--green-800)"
                            : "var(--coral-700)",
                        }}
                      >
                        <span
                          style={{
                            width: 14,
                            height: 14,
                            borderRadius: 999,
                            background: t.passed
                              ? "var(--green-600)"
                              : "var(--coral-500)",
                            display: "grid",
                            placeItems: "center",
                            color: "#fff",
                          }}
                        >
                          {t.passed ? <Check size={10} /> : <X size={10} />}
                        </span>
                        <span style={{ flex: 1 }}>
                          {t.hidden ? "Hidden test" : `Test ${t.id} · ${t.name}`}
                        </span>
                        {t.time !== undefined && (
                          <span style={{ opacity: 0.7 }}>{t.time}ms</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
