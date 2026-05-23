"use client";

/**
 * LessonShell — Duolingo-style lesson chrome.
 *
 * Wraps every V2 exercise to provide a consistent frame:
 *   - top bar  : quit × · progress bar with "N / M" · streak · hearts
 *   - body     : eyebrow + title + the exercise itself
 *   - bottom   : either the action bar (Skip + Check) or a feedback sheet
 *                (green/coral) that swaps in after onCheck.
 *
 * Adopted from the 2026-05-23 design package (shell.jsx). Styles live in
 * globals.css under `.lf-*` and `.gp-*` so this file stays markup-only.
 *
 * Progress contract:
 *   - step + totalSteps → bar fills (step/totalSteps) AND shows "N / M" label
 *   - progress (legacy %) → bar fills, no label
 *   - neither             → bar hidden (use for standalone practice)
 */

import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type FeedbackKind = "ok" | "no";

export interface LessonFeedback {
  kind: FeedbackKind;
  msg?: string;
  /** Reveal the canonical correct answer (string form). */
  correct?: string;
  /** Optional short explanation. */
  explain?: string;
}

export interface LessonShellProps {
  /**
   * Hearts = attempts remaining for the CURRENT task. Each task starts with
   * its own pool (default 3 in QuizV2). On a wrong attempt the count drops
   * by one and the pill pulses; at 0 the task ends and the answer is
   * revealed. New task resets the pool.
   */
  hearts?: number;
  /** Display only — the "/ max" caption next to the heart count. */
  maxHearts?: number;
  /**
   * Streak = number of tasks the student has correctly solved in a row
   * (zero-indexed; resets to 0 on a failed task, NOT on a single wrong
   * attempt if there are still retries left).
   */
  streak?: number;
  /** Hide hearts + streak (passive content: theory, scorm). */
  hideStats?: boolean;

  // Lesson position
  step?: number;
  totalSteps?: number;
  /** Legacy raw percentage if no step context. */
  progress?: number;

  // Content
  eyebrow?: ReactNode;
  /** May contain <span className="gp-mark"> for sun-300 highlight. */
  title?: ReactNode;
  children?: ReactNode;

  // Submission
  feedback: LessonFeedback | null;
  canCheck: boolean;
  onCheck: () => void;
  onContinue: () => void;
  /** Optional. When provided + feedback is wrong, the bottom sheet shows
   * "Try again" instead of "Continue" — caller resets the question state. */
  onRetry?: () => void;
  checkLabel?: string;
  /** Default true; hide for game flows. */
  showSkip?: boolean;
  onSkip?: () => void;
  /** Triggers the heart-pulse animation on the heart pill. */
  lostHeart?: boolean;
  /** Triggered by the top-left × button. */
  onQuit?: () => void;
}

/* ─── Inline icons (no extra dep) ─────────────────────────────────── */

const Ico = {
  X: ({ s = 16 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  Heart: ({ s = 14, filled = true }: { s?: number; filled?: boolean }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  ),
  Flame: ({ s = 14 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 9 9 11 11 11c-.5-2 1-3 1-5 0-2-1-3-1-3s1.5.5 1 4Zm-2 8.5C9 11 8 12.5 8 14a4 4 0 0 0 8 0c0-2-1.5-3-2.5-3-.5 1 .5 2-.5 3-.5.5-1 .5-1.5 0-1-1 0-2-1.5-3.5Z" />
    </svg>
  ),
  CheckThick: ({ s = 20 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12 5 5L20 7" />
    </svg>
  ),
  XThick: ({ s = 20 }: { s?: number }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
};

/* ─── Feedback sheet (bottom) ─────────────────────────────────────── */

export function FeedbackSheet({
  feedback,
  onContinue,
  onRetry,
}: {
  feedback: LessonFeedback;
  onContinue: () => void;
  /** When provided + feedback is wrong, sheet shows "Try again" instead of
   * "Continue" so the student can retake the same task with the remaining
   * attempts. Caller is responsible for clearing pick state on retry. */
  onRetry?: () => void;
}) {
  const ok = feedback.kind === "ok";
  const canRetry = !ok && !!onRetry;
  return (
    <div className={"lf-bottom " + (ok ? "correct" : "wrong")}>
      <div className="lf-fb-row">
        <span className={"lf-fb-icon " + (ok ? "ok" : "no")}>
          {ok ? <Ico.CheckThick /> : <Ico.XThick />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={"lf-fb-text " + (ok ? "ok" : "no")}>
            {feedback.msg || (ok ? "Nicely done!" : canRetry ? "Try again" : "Not quite")}
          </div>
          {feedback.correct && !ok && !canRetry && (
            <div className="lf-fb-correct">
              Answer: <b>{feedback.correct}</b>
            </div>
          )}
          {feedback.explain && <div className="lf-fb-sub">{feedback.explain}</div>}
        </div>
        <button
          className={"gp-btn " + (ok ? "" : "coral")}
          onClick={canRetry ? onRetry : onContinue}
          style={{ padding: "14px 30px" }}
        >
          {canRetry ? "Try again" : "Continue"}
        </button>
      </div>
    </div>
  );
}

/* ─── Confetti hook ────────────────────────────────────────────────── */

const CONFETTI_COLORS = [
  "var(--green-500)",
  "var(--sun-400)",
  "var(--coral-500)",
  "var(--green-300)",
  "var(--sun-300)",
];

function ConfettiBurst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 200,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        shape: i % 3,
      })),
    []
  );
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left + "%",
            background: p.color,
            borderRadius: p.shape === 0 ? "2px" : p.shape === 1 ? "50%" : "0",
            animationDelay: p.delay + "ms",
          }}
        />
      ))}
    </>
  );
}

/**
 * useConfetti — fire a burst on demand. Mount `layer` in your component;
 * call `fire()` from your success handler.
 */
export function useConfetti() {
  const [bursts, setBursts] = useState<number[]>([]);
  const fire = useCallback(() => {
    const id = Math.random();
    setBursts((bs) => [...bs, id]);
    setTimeout(() => setBursts((bs) => bs.filter((b) => b !== id)), 1500);
  }, []);
  const layer = (
    <div className="gp-confetti">
      {bursts.map((id) => (
        <ConfettiBurst key={id} />
      ))}
    </div>
  );
  return { fire, layer };
}

/* ─── Shell ────────────────────────────────────────────────────────── */

export function LessonShell({
  hearts = 5,
  maxHearts = 5,
  streak = 0,
  hideStats = false,
  step,
  totalSteps,
  progress,
  eyebrow,
  title,
  children,
  feedback,
  canCheck,
  onCheck,
  onContinue,
  onRetry,
  checkLabel = "Check",
  showSkip = true,
  onSkip,
  lostHeart = false,
  onQuit,
}: LessonShellProps) {
  void maxHearts;
  const hasStep = typeof step === "number" && typeof totalSteps === "number";
  const fill = hasStep ? (step! / totalSteps!) * 100 : progress;
  const showBar = hasStep || typeof progress === "number";

  return (
    <div className="lf-shell">
      <div className="lf-top">
        <button className="lf-close" aria-label="Quit" onClick={onQuit}>
          <Ico.X />
        </button>
        {showBar ? (
          <>
            <div className="lf-progress">
              <div className="lf-progress-fill" style={{ width: `${fill}%` }} />
            </div>
            {hasStep && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--ink-500)",
                  fontVariantNumeric: "tabular-nums",
                  flexShrink: 0,
                }}
              >
                {step} / {totalSteps}
              </span>
            )}
          </>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        {!hideStats && (
          <>
            <span className="lf-streak">
              <Ico.Flame s={14} />
              {streak}
            </span>
            <span className={"lf-hearts " + (lostHeart ? "gp-heart-loss" : "")}>
              <Ico.Heart s={14} filled />
              {hearts}
            </span>
          </>
        )}
      </div>

      <div
        style={{
          flex: 1,
          padding: "22px 24px 16px",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {(eyebrow || title) && (
          <div style={{ marginBottom: 18 }}>
            {eyebrow && <div className="gp-eyebrow">{eyebrow}</div>}
            {title && <h2 className="gp-title">{title}</h2>}
          </div>
        )}
        <div style={{ flex: 1 }}>{children}</div>
      </div>

      {feedback ? (
        <FeedbackSheet feedback={feedback} onContinue={onContinue} onRetry={onRetry} />
      ) : (
        <div className="lf-bottom" style={{ background: "var(--paper)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {showSkip && (
              <button
                className="gp-btn ghost"
                style={{ padding: "12px 22px" }}
                onClick={onSkip}
                disabled={!onSkip}
              >
                Skip
              </button>
            )}
            <button
              className="gp-btn"
              style={{ marginLeft: "auto", padding: "14px 36px" }}
              disabled={!canCheck}
              onClick={onCheck}
            >
              {checkLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
