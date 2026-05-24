"use client";

/**
 * DialogueV2 — chat-bubble conversation with a multiple-choice reply.
 *
 * Adopted from q-language.jsx · DialogueExerciseV2. Renders any number
 * of NPC messages (left-aligned bubbles), then asks the student to
 * pick the right reply from a list of options. Picked reply previews
 * on the right before checking.
 *
 * Per-task HP + streak; retry preserves selection so the student can
 * change their mind without re-reading every option.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

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
  const [pick, setPick] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const correctOpt = options.find((o) => o.correct);

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
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{ display: "flex", gap: 12, marginBottom: 18 }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, var(--coral-300), var(--sun-400))",
                  display: "grid",
                  placeItems: "center",
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 16,
                  flexShrink: 0,
                }}
              >
                {m.initial ?? m.speaker[0]?.toUpperCase() ?? "?"}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--ink-500)",
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {m.speaker}
                </div>
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--paper-2)",
                    border: "2px solid var(--ink-100)",
                    borderRadius: "18px 18px 18px 4px",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "var(--ink-900)",
                    maxWidth: 320,
                  }}
                >
                  {m.text}
                </div>
              </div>
            </div>
          ))}

          {/* your reply preview */}
          {pick && !feedback && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  padding: "12px 16px",
                  background: "var(--green-600)",
                  color: "#fff",
                  borderRadius: "18px 18px 4px 18px",
                  fontSize: 16,
                  fontWeight: 600,
                  maxWidth: 320,
                }}
              >
                {options.find((o) => o.id === pick)?.text}
              </div>
            </div>
          )}
        </div>

        <div
          className="gp-eyebrow"
          style={{ textAlign: "center", marginBottom: 10 }}
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
            let state = "";
            if (feedback) {
              if (o.correct) state = "correct";
              else if (o.id === pick) state = "wrong";
              else state = "locked";
            } else if (o.id === pick) state = "selected";
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
                disabled={!!feedback}
                onClick={() => setPick(o.id)}
              >
                {o.text}
              </button>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}
