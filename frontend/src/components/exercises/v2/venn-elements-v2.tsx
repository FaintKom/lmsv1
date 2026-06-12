"use client";

/**
 * VennElementsV2 — drag specific items into Venn regions (classify mode).
 *
 * Adopted from q-math-templates.jsx · VennDiagramElementsExerciseV2.
 * Methodist supplies items + correct-region map (region: "a_only" |
 * "intersection" | "b_only" | "neither"). Student drags from bank
 * into a region; tapping a placed chip sends it back to the bank.
 *
 * Per-task HP + streak; retry locks correct placements (VE-05) so the
 * student fixes only the wrong regions.
 *
 * Interaction (VE-01): pointer events with capture — HTML5 drag-and-drop
 * never fires on iOS/Android touch. A press that doesn't move arms the
 * chip (tap-to-arm → tap-a-region); all four drop zones become visibly
 * outlined while dragging or armed (VE-02).
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

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
  x: number;
  y: number;
  w: number;
  h: number;
}

const ZONES: DropZone[] = [
  { id: "a_only", x: 115, y: 135, w: 92, h: 90 },
  { id: "intersection", x: 210, y: 135, w: 64, h: 90 },
  { id: "b_only", x: 305, y: 135, w: 92, h: 90 },
  { id: "neither", x: 378, y: 222, w: 80, h: 64 },
];

interface DragState {
  key: string;
  dx: number;
  dy: number;
  over: VennRegion | null;
  moved: boolean;
}

export function VennElementsV2({
  setA,
  setB,
  items,
  correct,
  hint,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: VennElementsV2Props) {
  const { t } = useTranslation();
  const [placed, setPlaced] = useState<Record<string, VennRegion>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [lockedOk, setLockedOk] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const start = useRef({ x: 0, y: 0 });
  const zoneRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { fire, layer } = useConfetti();

  /** VE-04: human-readable region names for feedback and ARIA. */
  const regionName = (rid: VennRegion): string =>
    ({
      a_only: t("exercise.venn.aOnly"),
      intersection: t("exercise.venn.both"),
      b_only: t("exercise.venn.bOnly"),
      neither: t("exercise.venn.neither"),
    })[rid];

  const zoneAt = (x: number, y: number): VennRegion | null => {
    for (const z of ZONES) {
      const el = zoneRefs.current[z.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z.id;
    }
    return null;
  };

  const expected = (key: string): VennRegion => correct[key] ?? "neither";

  const down = (key: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (feedback || lockedOk[key]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ key, dx: 0, dy: 0, over: null, moved: false });
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({
      ...drag,
      dx,
      dy,
      over: zoneAt(e.clientX, e.clientY),
      moved: drag.moved || Math.hypot(dx, dy) > 6,
    });
  };
  const up = () => {
    if (!drag) return;
    const { key, over, moved } = drag;
    setDrag(null);
    if (!moved) {
      // Tap: placed chip returns to the bank; bank chip toggles armed.
      if (placed[key]) {
        setPlaced((p) => {
          const np = { ...p };
          delete np[key];
          return np;
        });
        setResults((r) => {
          const nr = { ...r };
          delete nr[key];
          return nr;
        });
      } else {
        setArmed((a) => (a === key ? null : key));
      }
      return;
    }
    setArmed(null);
    if (over) setPlaced((p) => ({ ...p, [key]: over }));
  };
  const zoneTap = (zid: VennRegion) => {
    if (!armed || feedback) return;
    const key = armed;
    setArmed(null);
    setPlaced((p) => ({ ...p, [key]: zid }));
  };

  const allPlaced = items.every((it) => placed[String(it)]);

  const handleCheck = () => {
    const res: Record<string, boolean> = {};
    let wrong = 0;
    for (const it of items) {
      const key = String(it);
      const ok = placed[key] === expected(key);
      res[key] = ok;
      if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) {
      setFeedback({
        kind: "ok",
        msg:
          usedAttempts === 0
            ? t("exercise.vennElements.everyItemRight")
            : t("exercise.gotIt"),
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
        msg: (wrong === 1 ? t("exercise.vennElements.wrongOne") : t("exercise.vennElements.wrongMany")).replace("{n}", String(wrong)),
        // VE-04: human region names, not raw ids.
        explain: items
          .map((it) => `${it} → ${regionName(expected(String(it)))}`)
          .join(", "),
      });
      setStreak(0);
    } else {
      const tmpl = remaining === 1 ? t("exercise.vennElements.wrongOneAttempt") : t("exercise.vennElements.wrongOneAttempts");
      setFeedback({
        kind: "no",
        msg: tmpl.replace("{n}", String(wrong)).replace("{r}", String(remaining)),
        explain: t("exercise.vennElements.retryKeepsCorrect"),
      });
    }
  };

  /** VE-05: lock correct placements, bounce wrong chips back to the bank. */
  const handleRetry = () => {
    const locks: Record<string, boolean> = {};
    const keep: Record<string, VennRegion> = {};
    for (const it of items) {
      const key = String(it);
      if (results[key]) {
        locks[key] = true;
        keep[key] = placed[key];
      }
    }
    setLockedOk(locks);
    setPlaced(keep);
    setResults({});
    setFeedback(null);
  };

  const handleContinue = () => {
    const wrongCount = items.filter(
      (it) => placed[String(it)] !== expected(String(it))
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

  const chip = (it: VennItem, inZone: boolean) => {
    const key = String(it);
    const isDrag = drag !== null && drag.key === key;
    const isArmed = armed === key;
    const ok = results[key] === true || lockedOk[key];
    const no = results[key] === false;
    return (
      <button
        key={key}
        type="button"
        className={(isArmed ? "armed " : "") + (inZone ? "landed" : "")}
        onPointerDown={down(key)}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (placed[key]) {
              // Keyboard return-to-bank for placed chips.
              setPlaced((p) => {
                const np = { ...p };
                delete np[key];
                return np;
              });
              setResults((r) => {
                const nr = { ...r };
                delete nr[key];
                return nr;
              });
            } else {
              setArmed((a) => (a === key ? null : key));
            }
          }
        }}
        aria-pressed={isArmed}
        aria-label={
          inZone
            ? `${key} — ${regionName(placed[key])}${lockedOk[key] ? " ✓" : ""}`
            : key
        }
        disabled={!!feedback || lockedOk[key]}
        style={{
          display: "inline-grid",
          placeItems: "center",
          minWidth: inZone ? 30 : 40,
          minHeight: inZone ? 30 : 40,
          padding: "0 9px",
          borderRadius: 999,
          background: ok
            ? "var(--green-500)"
            : no
              ? "var(--err-border)"
              : "var(--paper-2)",
          color: ok || no ? "#fff" : "var(--ink-900)",
          border: `2px solid ${ok ? "var(--green-700)" : no ? "var(--err-fg)" : isArmed ? "var(--green-600)" : "var(--ink-300)"}`,
          boxShadow: isArmed
            ? "0 0 0 4px var(--green-100)"
            : inZone
              ? "none"
              : "0 2px 0 0 var(--ink-200)",
          fontFamily: "var(--font-mono)",
          fontWeight: 800,
          fontSize: inZone ? 12.5 : 15,
          cursor: feedback || lockedOk[key] ? "default" : "grab",
          margin: 1,
          touchAction: "none",
          userSelect: "none",
          transform:
            isDrag && drag.moved
              ? `translate(${drag.dx}px, ${drag.dy}px) scale(1.15)`
              : "none",
          zIndex: isDrag ? 40 : "auto",
          position: "relative",
          transition: isDrag
            ? "none"
            : "transform 200ms, background 150ms, border-color 150ms",
          animation: no ? "fb-shake calc(0.4s * var(--mdur)) ease both" : undefined,
        }}
      >
        {it}
      </button>
    );
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
              {t("exercise.vennElements.dragToRegion").replace("{a}", setA).replace("{b}", setB)}
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
                y="38"
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
                y="38"
                fontFamily="var(--font-sans)"
                fontWeight="800"
                fontSize="13"
                fill="var(--sun-700)"
                textAnchor="middle"
              >
                B · {setB}
              </text>
              <text
                x="378"
                y="190"
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
            {ZONES.map((z) => {
              const isOver = drag !== null && drag.over === z.id;
              // VE-02: zones become visible while dragging OR when armed.
              const isTarget = (!!armed || (drag !== null && drag.moved)) && !feedback;
              return (
                <div
                  key={z.id}
                  ref={(el) => {
                    zoneRefs.current[z.id] = el;
                  }}
                  role={armed ? "button" : undefined}
                  tabIndex={armed ? 0 : -1}
                  aria-label={
                    armed
                      ? `${armed} → ${regionName(z.id)}`
                      : regionName(z.id)
                  }
                  onClick={() => zoneTap(z.id)}
                  onKeyDown={(e) => {
                    if (armed && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      zoneTap(z.id);
                    }
                  }}
                  style={{
                    position: "absolute",
                    left: `${(z.x / 420) * 100}%`,
                    top: `${(z.y / 260) * 100}%`,
                    transform: "translate(-50%, -50%)",
                    width: `${(z.w / 420) * 100}%`,
                    minHeight: z.h,
                    padding: 4,
                    background: isOver
                      ? "rgba(255,255,255,0.9)"
                      : isTarget
                        ? "rgba(255,255,255,0.45)"
                        : "transparent",
                    border: `2px dashed ${isOver ? "var(--green-600)" : isTarget ? "var(--ink-300)" : "transparent"}`,
                    borderRadius: 12,
                    transition: "background 120ms, border-color 120ms",
                    display: "flex",
                    flexWrap: "wrap",
                    alignContent: "center",
                    justifyContent: "center",
                    cursor: armed ? "pointer" : "default",
                  }}
                >
                  {items.filter((it) => placed[String(it)] === z.id).map((it) => chip(it, true))}
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
              minHeight: 52,
            }}
          >
            {unplaced.length === 0 ? (
              <span
                style={{ fontSize: 12, color: "var(--ink-400)", padding: 10 }}
              >
                {t("exercise.allPlacedHitCheck")}
              </span>
            ) : (
              unplaced.map((it) => chip(it, false))
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
            {hint ?? t("exercise.vennElements.defaultHint")}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
