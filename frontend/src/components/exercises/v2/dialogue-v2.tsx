"use client";

/**
 * DialogueV2 — chat-bubble conversation with a multiple-choice reply.
 *
 * Adopted from q-language.jsx · DialogueExerciseV2, upgraded with the
 * feedback-grammar handoff (ex-lang.jsx · ExDialogue). NPC messages
 * appear staged with a typing indicator before each (left-aligned
 * `fb-bubble` rows); options only show once the conversation is fully
 * "typed". Picked reply previews as a right-aligned bubble; on a wrong
 * grade the preview turns coral and shakes (`.no`).
 *
 * Per-task HP + streak.
 */

import { useEffect, useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

/** DG-03: bubbles cap to the pane, not the viewport. */
const BUBBLE_MAX_WIDTH = "min(340px, 78cqw)";

export interface DialogueNpcMessage {
  speaker: string;
  text: string;
  /** Single-letter initial for avatar; defaults to first char of speaker. */
  initial?: string;
}

export interface DialogueReplyOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface DialogueV2Props {
  /** Conversation context — NPC bubbles shown above the picker. */
  messages: DialogueNpcMessage[];
  options: DialogueReplyOption[];
  /** Shown as feedback "no" message when student picks wrong. */
  prompt?: string;
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

export function DialogueV2({
  messages,
  options,
  prompt,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: DialogueV2Props) {
  const { t } = useTranslation();
  /** How many NPC messages are revealed; typing dots show before each. */
  const [stage, setStage] = useState(0);
  const [typing, setTyping] = useState(true);
  const [pick, setPick] = useState<string | null>(null);
  /** DG-04: wrong replies stay struck out across retries. */
  const [eliminated, setEliminated] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const logRef = useRef<HTMLDivElement | null>(null);

  const correctOpt = options.find((o) => o.correct);

  /* DG-01: keep the latest bubble in view by scrolling the LOG element —
   * scrollIntoView would scroll the host app/page around the exercise. */
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [stage, typing, pick, feedback]);

  /* Staged reveal: typing dots, then the message pops in (700ms before the
   * first message, 900ms before each next one, 120ms swap gap). */
  useEffect(() => {
    if (stage >= messages.length) {
      setTyping(false);
      return;
    }
    setTyping(true);
    let swap: ReturnType<typeof setTimeout> | undefined;
    const dots = setTimeout(
      () => {
        setTyping(false);
        swap = setTimeout(() => setStage((s) => s + 1), 120);
      },
      stage === 0 ? 700 : 900
    );
    return () => {
      clearTimeout(dots);
      if (swap !== undefined) clearTimeout(swap);
    };
  }, [stage, messages.length]);

  const shown = messages.slice(0, stage);
  const allShown = stage >= messages.length;
  const nextMsg = messages[stage];

  const handleCheck = () => {
    const opt = options.find((o) => o.id === pick);
    if (opt?.correct) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.dialogue.goodReply") : t("exercise.gotIt"),
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    // DG-04: the wrong reply is struck from the options for good.
    if (pick !== null) setEliminated((e) => (e.includes(pick) ? e : [...e, pick]));
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: prompt ?? t("exercise.dialogue.wrongReply"),
        correct: correctOpt?.text,
      });
      setStreak(0);
    } else {
      const attemptsMsg = (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining));
      setFeedback({
        kind: "no",
        msg: `${prompt ?? t("exercise.dialogue.wrongReply")} ${attemptsMsg}`,
      });
    }
  };

  const handleRetry = () => {
    setPick(null);
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
        title={title ?? t("exercise.dialogue.title")}
        feedback={feedback}
        canCheck={pick !== null}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        {/* DG-05: a real log landmark, announced politely. DG-01: it owns its
            own scroll so new bubbles never scroll the host page. */}
        <div
          ref={logRef}
          role="log"
          aria-live="polite"
          style={{
            maxWidth: 480,
            margin: "0 auto",
            maxHeight: 300,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {shown.map((m, idx) => (
            <div key={idx} className="fb-bubble-row pop">
              <div className="fb-avatar" aria-hidden="true">
                {m.initial ?? m.speaker[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--ink-400)",
                    fontWeight: 700,
                    marginBottom: 3,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  {m.speaker}
                </div>
                <div className="fb-bubble" style={{ maxWidth: BUBBLE_MAX_WIDTH }}>
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {/* DG-02: typing indicator before the next NPC message */}
          {typing && !allShown && nextMsg && (
            <div className="fb-bubble-row pop">
              <div className="fb-avatar" aria-hidden="true">
                {nextMsg.initial ?? nextMsg.speaker[0]?.toUpperCase() ?? "?"}
              </div>
              <div
                className="fb-bubble fb-typing"
                aria-label={nextMsg.speaker}
                style={{ maxWidth: BUBBLE_MAX_WIDTH }}
              >
                <i></i>
                <i></i>
                <i></i>
              </div>
            </div>
          )}

          {/* DG-04: your reply lands in the log; on a wrong grade it turns
              coral + shakes, then lifts back out when you hit Try again. */}
          {pick && (
            <div className="fb-bubble-row me pop">
              <div
                className={
                  "fb-bubble me" + (feedback?.kind === "no" ? " no" : "")
                }
                style={{ maxWidth: BUBBLE_MAX_WIDTH }}
              >
                {options.find((o) => o.id === pick)?.text}
              </div>
            </div>
          )}
        </div>

        {allShown && (
          <>
            <div
              className="gp-eyebrow"
              style={{ textAlign: "center", margin: "18px 0 10px" }}
            >
              {t("exercise.chooseYourReply")}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                maxWidth: 460,
                margin: "0 auto",
              }}
            >
              {options.map((o) => {
                // Reveal the correct option only when the task is over —
                // never on a retryable miss (answer-leak guard).
                const taskOver =
                  !!feedback && (feedback.kind === "ok" || attemptsLeft <= 0);
                const isElim = eliminated.includes(o.id);
                let state = "";
                if (taskOver) {
                  if (o.correct) state = "correct";
                  else if (o.id === pick) state = "wrong";
                  else if (isElim) state = "eliminated";
                  else state = "locked";
                } else if (feedback) {
                  if (o.id === pick) state = "wrong";
                  else if (isElim) state = "eliminated";
                  else state = "locked";
                } else if (isElim) {
                  state = "eliminated"; // DG-04: struck out across retries
                } else if (o.id === pick) {
                  state = "selected";
                }
                return (
                  <button
                    key={o.id}
                    className={"gp-tile " + state}
                    style={{
                      padding: "14px 18px",
                      fontSize: 15,
                      justifyContent: "flex-start",
                      textAlign: "left",
                    }}
                    disabled={!!feedback || isElim}
                    onClick={() => setPick(o.id)}
                  >
                    {o.text}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </LessonShell>
    </div>
  );
}
