"use client";

/**
 * NumberLineV2 — drag a marker on a number line to the correct value.
 *
 * Adopted from q-math.jsx · NumberLineExerciseV2, upgraded with the
 * feedback-grammar handoff (ex-numberline.jsx): pressed marker physics
 * (`fb-marker` + grabbed/ok/no states), a value bubble while dragging,
 * tick magnet highlight (`fb-tick.near`), and a dashed ghost marker at
 * the correct answer once attempts are exhausted.
 *
 * Methodist supplies range [min, max], target value, and optional step
 * (default 1 for snapping to integers).
 *
 * Per-task HP + streak; retry preserves marker position so student
 * can nudge it.
 */

import { useEffect, useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface NumberLineV2Props {
  min: number;
  max: number;
  correct: number;
  /** Snap step (default 1). For fractional answers, pass 0.5 / 0.25 etc. */
  step?: number;
  /** Absolute tolerance. Defaults to step/2. */
  tolerance?: number;
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
    placed: number;
  }) => void;
}

type MarkerState = "" | "ok" | "no";

export function NumberLineV2({
  min,
  max,
  correct,
  step = 1,
  tolerance,
  prompt,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: NumberLineV2Props) {
  // NL-03: the marker starts at the range midpoint — when the target IS the
  // midpoint that's a free win, so offset the start by one step (clamped).
  const initialPos = (() => {
    const mid = Math.round((min + max) / 2 / step) * step;
    const tolInit = tolerance ?? step / 2;
    if (Math.abs(mid - correct) <= tolInit) {
      const shifted = mid + step <= max ? mid + step : mid - step;
      return Math.max(min, Math.min(max, shifted));
    }
    return mid;
  })();
  const [pos, setPos] = useState(initialPos);
  const [moved, setMoved] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const [markerState, setMarkerState] = useState<MarkerState>("");
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const shakeTimer = useRef<number | null>(null);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  useEffect(
    () => () => {
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
    },
    []
  );

  const tol = tolerance ?? step / 2;

  const setFromX = (clientX: number) => {
    if (feedback || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + frac * (max - min);
    const snapped = Math.round(raw / step) * step;
    // Avoid floating point drift display (e.g. 1.0000001).
    const decimals = step < 1 ? 4 : 0;
    setPos(parseFloat(snapped.toFixed(decimals)));
    // NL-04: Check stays locked until the student actually moves the marker.
    setMoved(true);
  };

  const onMarkerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (feedback) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrabbed(true);
    setMarkerState("");
  };
  const onMarkerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (grabbed) setFromX(e.clientX);
  };
  const onMarkerUp = () => setGrabbed(false);
  const onTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (feedback || grabbed) return;
    setFromX(e.clientX);
    setMarkerState("");
  };

  const handleCheck = () => {
    if (Math.abs(pos - correct) <= tol) {
      setMarkerState("ok");
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.numberLine.placedExactly") : t("exercise.gotIt"),
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
    setMarkerState("no");
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.numberLine.placedAt").replace("{pos}", String(pos)),
        correct: String(correct),
      });
      setStreak(0);
    } else {
      // Shake + coral, then settle back to neutral while the student retries.
      if (shakeTimer.current !== null) window.clearTimeout(shakeTimer.current);
      shakeTimer.current = window.setTimeout(() => setMarkerState(""), 700);
      const tmpl = remaining === 1 ? t("exercise.numberLine.placedAtAttempt") : t("exercise.numberLine.placedAtAttempts");
      setFeedback({
        kind: "no",
        msg: tmpl.replace("{pos}", String(pos)).replace("{n}", String(remaining)),
      });
    }
  };

  const handleRetry = () => {
    setMarkerState("");
    setFeedback(null);
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
      placed: pos,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const showGhost = feedback?.kind === "no" && attemptsLeft <= 0;
  const posFrac = (pos - min) / (max - min);
  const ghostFrac = (correct - min) / (max - min);
  const tickCount = Math.floor((max - min) / step) + 1;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? prompt ?? t("exercise.numberLine.title")}
        feedback={feedback}
        canCheck={moved && !feedback}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            maxWidth: 540,
            margin: "60px auto 0",
            padding: "0 28px",
          }}
        >
          <div
            ref={trackRef}
            onClick={onTrackClick}
            style={{
              position: "relative",
              height: 96,
              cursor: feedback ? "default" : "pointer",
              userSelect: "none",
              touchAction: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 56,
                left: 0,
                right: 0,
                height: 4,
                background: "var(--ink-200)",
                borderRadius: 999,
              }}
            />
            {Array.from({ length: tickCount }, (_, i) => {
              const n = parseFloat((min + i * step).toFixed(4));
              const frac = (n - min) / (max - min);
              const isZero = n === 0;
              const isNear = Math.abs(n - pos) < 1e-6;
              return (
                <div
                  key={i}
                  className={"fb-tick" + (isNear ? " near" : "")}
                  style={{
                    position: "absolute",
                    top: 50,
                    left: `${frac * 100}%`,
                    width: 2,
                    height: 16,
                    marginLeft: -1,
                    background: isZero ? "var(--ink-700)" : "var(--ink-300)",
                    borderRadius: 1,
                    transformOrigin: "bottom",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 22,
                      left: "50%",
                      transform: "translateX(-50%)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: isNear
                        ? "var(--green-700)"
                        : isZero
                          ? "var(--ink-900)"
                          : "var(--ink-500)",
                    }}
                  >
                    {n}
                  </span>
                </div>
              );
            })}
            {showGhost && (
              <div
                style={{
                  position: "absolute",
                  top: 18,
                  left: `${ghostFrac * 100}%`,
                  width: 46,
                  height: 46,
                  marginLeft: -23,
                  borderRadius: 999,
                  border: "2px dashed var(--green-500)",
                  color: "var(--green-700)",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  fontWeight: 800,
                  pointerEvents: "none",
                }}
              >
                {correct}
              </div>
            )}
            <div
              style={{
                position: "absolute",
                top: 18,
                left: `${posFrac * 100}%`,
                marginLeft: -23,
                transition: grabbed ? "none" : "left 140ms ease",
              }}
            >
              <div className={"fb-marker-bubble" + (grabbed ? " show" : "")}>
                {pos}
              </div>
              <div
                className={
                  "fb-marker" +
                  (grabbed ? " grabbed" : "") +
                  (markerState ? ` ${markerState}` : "")
                }
                onPointerDown={onMarkerDown}
                onPointerMove={onMarkerMove}
                onPointerUp={onMarkerUp}
                onPointerCancel={onMarkerUp}
              >
                {pos}
              </div>
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink-300)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 8,
            }}
          >
            {t("exercise.numberLine.dragHint")}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
