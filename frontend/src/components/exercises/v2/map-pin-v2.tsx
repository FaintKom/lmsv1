"use client";

/**
 * MapPinDropV2 — drop a pin on a target location within a map.
 *
 * Adopted from q-other.jsx · MapPinDropExerciseV2. Methodist provides
 * the map content (SVG, <img>, or any ReactNode) plus a target {x, y}
 * in percent + tolerance. Component handles click capture, pin
 * rendering, distance check, and reveal-on-miss.
 *
 * Per-task HP + streak; retry preserves pin position so student
 * can nudge.
 */

import { useRef, useState } from "react";
import { MapPin } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export interface MapPinDropV2Props {
  /** Target location as percent of map (0-100, both axes). */
  target: { x: number; y: number };
  /** Match tolerance in percent. Default 6. */
  tolerance?: number;
  /** Map background. Pass SVG / img / div with bg image. */
  mapContent: React.ReactNode;
  /** Hint shown when student is out of attempts. */
  correctHint?: string;
  /** Map aspect ratio CSS string. Default "1.4 / 1". */
  aspectRatio?: string;
  eyebrow?: string;
  title?: React.ReactNode;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
    pin: { x: number; y: number } | null;
  }) => void;
}

export function MapPinDropV2({
  target,
  tolerance = 6,
  mapContent,
  correctHint,
  aspectRatio = "1.4 / 1",
  eyebrow,
  title = "Drop a pin",
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: MapPinDropV2Props) {
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const { fire, layer } = useConfetti();

  const drop = (e: React.MouseEvent) => {
    if (feedback || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPin({ x, y });
  };

  const dist = pin ? Math.hypot(pin.x - target.x, pin.y - target.y) : Infinity;

  const handleCheck = () => {
    if (dist <= tolerance) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "Right on target." : "Got it!",
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
        msg: "Off by quite a bit.",
        correct: correctHint,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `Off by quite a bit — ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
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
      pin,
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
        title={title}
        feedback={feedback}
        canCheck={!!pin}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          ref={mapRef}
          onClick={drop}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 540,
            margin: "0 auto",
            aspectRatio,
            background: "linear-gradient(180deg, #cce7ff 0%, #b3d9ff 100%)",
            borderRadius: 18,
            border: "2px solid var(--ink-100)",
            cursor: feedback ? "default" : "crosshair",
            overflow: "hidden",
          }}
        >
          {mapContent}
          {/* Drop pin */}
          {pin && (
            <div
              style={{
                position: "absolute",
                left: `${pin.x}%`,
                top: `${pin.y}%`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
                color: feedback
                  ? feedback.kind === "ok"
                    ? "var(--green-600)"
                    : "var(--coral-500)"
                  : "var(--coral-500)",
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
                transition: "color 200ms",
              }}
            >
              <MapPin size={32} />
            </div>
          )}
          {/* Correct pin on wrong / out-of-attempts */}
          {feedback && feedback.kind === "no" && (
            <div
              style={{
                position: "absolute",
                left: `${target.x}%`,
                top: `${target.y}%`,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
                color: "var(--green-600)",
              }}
              className="gp-pop"
            >
              <MapPin size={32} />
            </div>
          )}
        </div>
        <div
          style={{
            textAlign: "center",
            marginTop: 12,
            fontSize: 13,
            color: "var(--ink-400)",
          }}
        >
          {!pin
            ? "Tap anywhere on the map"
            : `Pin at (${Math.round(pin.x)}%, ${Math.round(pin.y)}%)`}
        </div>
      </LessonShell>
    </div>
  );
}
