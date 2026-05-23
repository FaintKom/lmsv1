"use client";

/**
 * VennElementsV2 — drag specific items into Venn regions (classify mode).
 *
 * Adopted from q-math-templates.jsx · VennDiagramElementsExerciseV2.
 * Methodist supplies items + correct-region map (region: "a_only" |
 * "intersection" | "b_only" | "neither"). Student drags from bank
 * into a region; clicking a placed chip sends it back to the bank.
 *
 * Per-task HP + streak; retry preserves placements.
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";

export type VennRegion = "a_only" | "intersection" | "b_only" | "neither";

export type VennItem = string | number;

export interface VennElementsV2Props {
  setA: string;
  setB: string;
  items: VennItem[];
  /** Map of item (as string key) → correct region. Missing keys default to "neither". */
  correct: Partial<Record<string, VennRegion>>;
  hint?: string;
  eyebrow?: string;
  title?: React.ReactNode;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    wrongCount: number;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

interface DropZone {
  id: VennRegion;
  label: string;
  x: number;
  y: number;
  w: number;
}

const ZONES: DropZone[] = [
  { id: "a_only", label: "A only", x: 120, y: 130, w: 90 },
  { id: "intersection", label: "Both", x: 210, y: 130, w: 60 },
  { id: "b_only", label: "B only", x: 300, y: 130, w: 90 },
  { id: "neither", label: "Neither", x: 380, y: 215, w: 70 },
];

export function VennElementsV2({
  setA,
  setB,
  items,
  correct,
  hint = "Drag from the bank into a region · click a placed item to send it back.",
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: VennElementsV2Props) {
  const [placed, setPlaced] = useState<Record<string, VennRegion>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<VennRegion | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const dragRef = useRef<string | null>(null);
  const { fire, layer } = useConfetti();

  const drop = (rid: VennRegion) => (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragRef.current || feedback) return;
    setPlaced({ ...placed, [dragRef.current]: rid });
    dragRef.current = null;
    setHover(null);
  };

  const allPlaced = items.every((it) => placed[String(it)]);

  const handleCheck = () => {
    const res: Record<string, boolean> = {};
    let wrong = 0;
    for (const it of items) {
      const key = String(it);
      const ok = placed[key] === (correct[key] ?? "neither");
      res[key] = ok;
      if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? "Every item's in its right region."
            : "Got it!",
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
        msg: `${wrong} in the wrong region.`,
        explain: items
          .map((it) => `${it} → ${correct[String(it)] ?? "neither"}`)
          .join(", "),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: `${wrong} in the wrong region — ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`,
      });
    }
  };

  const handleRetry = () => {
    setFeedback(null);
  };

  const handleContinue = () => {
    const wrongCount = items.filter(
      (it) => placed[String(it)] !== (correct[String(it)] ?? "neither")
    ).length;
    onFinish?.({
      correct: feedback?.kind === "ok",
      wrongCount,
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const unplaced = items.filter((it) => !placed[String(it)]);

  const chipsFor = (rid: VennRegion) => {
    const here = items.filter((it) => placed[String(it)] === rid);
    return here.map((it) => {
      const key = String(it);
      const ok = results[key] === true;
      const no = results[key] === false;
      return (
        <span
          key={key}
          draggable={!feedback}
          onDragStart={(e) => {
            dragRef.current = key;
            e.dataTransfer.effectAllowed = "move";
          }}
          onClick={() => {
            if (feedback) return;
            setPlaced((p) => {
              const np = { ...p };
              delete np[key];
              return np;
            });
          }}
          style={{
            display: "inline-grid",
            placeItems: "center",
            minWidth: 28,
            height: 28,
            padding: "0 6px",
            borderRadius: 999,
            background: ok
              ? "var(--green-500)"
              : no
                ? "var(--coral-500)"
                : "var(--paper-2)",
            color: ok || no ? "#fff" : "var(--ink-900)",
            border: `2px solid ${ok ? "var(--green-700)" : no ? "var(--coral-700)" : "var(--ink-300)"}`,
            fontFamily: "var(--font-mono)",
            fontWeight: 800,
            fontSize: 12,
            cursor: feedback ? "default" : "grab",
            margin: 1,
          }}
        >
          {it}
        </span>
      );
    });
  };

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
              Drag each item into the right region · A = {setA} · B = {setB}
            </>
          )
        }
        feedback={feedback}
        canCheck={allPlaced}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "420 / 260",
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <svg
              viewBox="0 0 420 260"
              preserveAspectRatio="xMidYMid meet"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
              }}
            >
              <text
                x="20"
                y="24"
                fontFamily="var(--font-mono)"
                fontSize="11"
                fill="var(--ink-500)"
                fontWeight="600"
                letterSpacing="0.08em"
              >
                UNIVERSE
              </text>
              <circle
                cx="160"
                cy="130"
                r="80"
                fill="var(--green-300)"
                opacity="0.42"
                stroke="var(--green-700)"
                strokeWidth="2"
              />
              <circle
                cx="260"
                cy="130"
                r="80"
                fill="var(--sun-300)"
                opacity="0.42"
                stroke="var(--sun-700)"
                strokeWidth="2"
              />
              <text
                x="100"
                y="40"
                fontFamily="var(--font-sans)"
                fontWeight="800"
                fontSize="13"
                fill="var(--green-800)"
                textAnchor="middle"
              >
                A · {setA}
              </text>
              <text
                x="320"
                y="40"
                fontFamily="var(--font-sans)"
                fontWeight="800"
                fontSize="13"
                fill="var(--sun-700)"
                textAnchor="middle"
              >
                B · {setB}
              </text>
              <text
                x="380"
                y="205"
                fontFamily="var(--font-mono)"
                fontSize="9"
                fill="var(--ink-500)"
                textAnchor="middle"
                fontWeight="700"
                letterSpacing="0.08em"
              >
                NEITHER
              </text>
            </svg>
            {ZONES.map((r) => {
              const isHover = hover === r.id;
              const left = `${(r.x / 420) * 100}%`;
              const top = `${(r.y / 260) * 100}%`;
              return (
                <div
                  key={r.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setHover(r.id);
                  }}
                  onDragLeave={() => setHover(null)}
                  onDrop={drop(r.id)}
                  style={{
                    position: "absolute",
                    left,
                    top,
                    transform: "translate(-50%, -50%)",
                    width: `${(r.w / 420) * 100}%`,
                    minHeight: 64,
                    padding: 4,
                    background: isHover
                      ? "rgba(255,255,255,0.85)"
                      : "transparent",
                    border: isHover
                      ? "2px dashed var(--green-600)"
                      : "2px dashed transparent",
                    borderRadius: 12,
                    transition: "background 120ms, border-color 120ms",
                    display: "flex",
                    flexWrap: "wrap",
                    alignContent: "center",
                    justifyContent: "center",
                  }}
                >
                  {chipsFor(r.id)}
                </div>
              );
            })}
          </div>
          {/* bank */}
          <div
            style={{
              marginTop: 12,
              padding: 10,
              background: "var(--ink-50)",
              borderRadius: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              justifyContent: "center",
              minHeight: 48,
            }}
          >
            {unplaced.length === 0 ? (
              <span
                style={{ fontSize: 12, color: "var(--ink-400)", padding: 10 }}
              >
                All placed — hit Check.
              </span>
            ) : (
              unplaced.map((it) => (
                <span
                  key={String(it)}
                  draggable={!feedback}
                  onDragStart={(e) => {
                    dragRef.current = String(it);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  style={{
                    display: "inline-grid",
                    placeItems: "center",
                    minWidth: 36,
                    height: 36,
                    padding: "0 8px",
                    borderRadius: 999,
                    background: "var(--paper-2)",
                    color: "var(--ink-900)",
                    border: "2px solid var(--ink-200)",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 800,
                    fontSize: 15,
                    cursor: feedback ? "default" : "grab",
                    boxShadow: "0 2px 0 0 var(--ink-200)",
                  }}
                >
                  {it}
                </span>
              ))
            )}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 11,
              color: "var(--ink-400)",
              textAlign: "center",
            }}
          >
            {hint}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
