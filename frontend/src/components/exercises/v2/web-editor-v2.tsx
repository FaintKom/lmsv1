"use client";

/**
 * WebEditorV2 — HTML/CSS/JS editor with live iframe preview + requirements.
 *
 * Adopted from q-programming.jsx · WebEditorExerciseV2. Methodist supplies
 * starter code for each language tab + a list of requirements. Each
 * requirement has a `check(code) => boolean` predicate so students get
 * live tick-marks as they type.
 *
 * Submit succeeds only when ALL requirements pass. Per-task HP + streak,
 * retry preserves typed code.
 */

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface WebEditorCode {
  html: string;
  css: string;
  js: string;
}

export interface WebEditorRequirement {
  text: string;
  check: (code: WebEditorCode) => boolean;
}

export interface WebEditorV2Props {
  starter: WebEditorCode;
  requirements: WebEditorRequirement[];
  eyebrow?: string;
  title?: string;
  /** Body wrapper styles for the iframe preview, e.g. centering. */
  previewBodyStyle?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
    code: WebEditorCode;
  }) => void;
}

type Tab = "html" | "css" | "js";

const DEFAULT_PREVIEW_BODY =
  "display:grid;place-items:center;height:100vh;background:#fafbf6;margin:0";

export function WebEditorV2({
  starter,
  requirements,
  eyebrow,
  title = "Build it",
  previewBodyStyle = DEFAULT_PREVIEW_BODY,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: WebEditorV2Props) {
  const [tab, setTab] = useState<Tab>("html");
  const [code, setCode] = useState<WebEditorCode>(starter);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const srcDoc = useMemo(
    () =>
      `<html><head><style>${code.css}</style></head><body style="${previewBodyStyle}">${code.html}<script>${code.js}<\/script></body></html>`,
    [code, previewBodyStyle]
  );

  const reqStates = requirements.map((r) => ({ ...r, ok: r.check(code) }));
  const allOk = reqStates.every((r) => r.ok);

  const handleCheck = () => {
    if (allOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "All requirements met!" : "Got it!",
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
        msg: "Out of attempts.",
        explain: "Review the requirements panel.",
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `Check the requirements panel — ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
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
      code,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;

  const currentValue =
    tab === "html" ? code.html : tab === "css" ? code.css : code.js;
  const setCurrentValue = (v: string) => setCode({ ...code, [tab]: v });

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
        canCheck={true}
        onCheck={handleCheck}
        checkLabel="Submit"
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            height: "100%",
            minHeight: 360,
          }}
        >
          {/* code panel */}
          <div
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--ink-100)",
              }}
            >
              {(["html", "css", "js"] as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "10px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    color: tab === t ? "var(--green-700)" : "var(--ink-400)",
                    borderBottom:
                      tab === t
                        ? "2px solid var(--green-600)"
                        : "2px solid transparent",
                    textTransform: "lowercase",
                  }}
                >
                  {t}
                </button>
              ))}
              <span
                style={{
                  marginLeft: "auto",
                  padding: "10px 12px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-400)",
                }}
              >
                index.{tab}
              </span>
            </div>
            <textarea
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              spellCheck={false}
              disabled={!!feedback}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                padding: 14,
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                lineHeight: 1.55,
                background: "#1a2a1f",
                color: "#d4f1c4",
                resize: "none",
              }}
            />
          </div>
          {/* preview + reqs */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              minHeight: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 14,
                overflow: "hidden",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "8px 14px",
                  borderBottom: "1px solid var(--ink-100)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "var(--coral-300)",
                  }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "var(--sun-300)",
                  }}
                />
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: "var(--green-300)",
                  }}
                />
                <span
                  style={{
                    marginLeft: 10,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--ink-400)",
                  }}
                >
                  preview
                </span>
              </div>
              <iframe
                title="preview"
                srcDoc={srcDoc}
                sandbox="allow-scripts"
                style={{
                  flex: 1,
                  border: "none",
                  width: "100%",
                  background: "var(--paper)",
                }}
              />
            </div>
            <div
              style={{
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 14,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div className="gp-eyebrow">Requirements</div>
              {reqStates.map((r, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      background: r.ok ? "var(--green-600)" : "var(--ink-200)",
                      color: "#fff",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Check size={10} />
                  </span>
                  <span
                    style={{
                      color: r.ok ? "var(--green-800)" : "var(--ink-500)",
                      fontWeight: r.ok ? 700 : 500,
                    }}
                  >
                    {r.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
