"use client";

/**
 * WordSearchV2 — drag across letter cells to find target words.
 *
 * Adopted from q-language.jsx · WordSearchExerciseV2. Methodist supplies
 * a rectangular grid (array of equal-length strings) + a list of words
 * to find. Words may be placed horizontally, vertically, or diagonally,
 * and may be matched in either direction.
 *
 * No traditional HP model — finding all words = task complete (+1
 * streak). Quit / skip resets streak via onFinish payload.
 *
 * Touch + mouse (XC-06): pointer events with capture on the grid —
 * pointerdown starts on the pressed cell, pointermove resolves the cell
 * under the finger via elementFromPoint (capture routes events to the
 * grid), pointerup/cancel commits. Works identically for mouse, touch,
 * and pen; mouse-only handlers never fire on touch.
 */

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface WordSearchV2Props {
  /** Equal-length uppercase strings, one per row. */
  grid: string[];
  /** Uppercase target words. Matched horiz/vert/diag, either direction. */
  words: string[];
  eyebrow?: string;
  title?: string;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    found: number;
    total: number;
    streak: number;
  }) => void;
}

const cellsBetween = (a: string | null, b: string | null): string[] => {
  if (!a || !b) return [];
  const [ar, ac] = a.split(",").map(Number);
  const [br, bc] = b.split(",").map(Number);
  const dr = Math.sign(br - ar);
  const dc = Math.sign(bc - ac);
  if (dr === 0 && dc === 0) return [a];
  // only horiz / vert / 45° diagonal
  if (dr !== 0 && dc !== 0 && Math.abs(br - ar) !== Math.abs(bc - ac)) return [];
  const steps = Math.max(Math.abs(br - ar), Math.abs(bc - ac));
  const cells: string[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push(`${ar + dr * i},${ac + dc * i}`);
  }
  return cells;
};

export function WordSearchV2({
  grid,
  words,
  eyebrow,
  title,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: WordSearchV2Props) {
  const { t } = useTranslation();
  const [selecting, setSelecting] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const [drag, setDrag] = useState<string[]>([]);
  const [found, setFound] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [streak, setStreak] = useState(initialStreak);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const { fire, layer } = useConfetti();

  /** Resolve the letter cell under a pointer position (capture-safe). */
  const cellFromPoint = (x: number, y: number): string | null => {
    const el = document.elementFromPoint(x, y);
    const cell = el instanceof Element ? el.closest("[data-cell]") : null;
    return cell?.getAttribute("data-cell") ?? null;
  };

  const onGridDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (feedback) return;
    const k = cellFromPoint(e.clientX, e.clientY);
    if (!k) return;
    gridRef.current?.setPointerCapture(e.pointerId);
    setSelecting(true);
    setStart(k);
    setDrag([k]);
  };
  const onGridMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!selecting) return;
    const k = cellFromPoint(e.clientX, e.clientY);
    if (k) setDrag(cellsBetween(start, k));
  };
  const onUp = () => {
    if (!selecting) return;
    const word = drag
      .map((c) => {
        const [r, cc] = c.split(",").map(Number);
        return grid[r]?.[cc] ?? "";
      })
      .join("");
    const reversed = word.split("").reverse().join("");
    const matched = words.find(
      (w) => (w === word || w === reversed) && !found[w]
    );
    if (matched) {
      setFound((f) => ({ ...f, [matched]: drag }));
    }
    setSelecting(false);
    setStart(null);
    setDrag([]);
  };

  useEffect(() => {
    if (Object.keys(found).length === words.length && !feedback) {
      setTimeout(() => {
        setFeedback({
          kind: "ok",
          msg: t("exercise.wordSearch.allFound").replace("{n}", String(words.length)),
        });
        setStreak((s) => s + 1);
        fire();
      }, 200);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [found]);

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      found: Object.keys(found).length,
      total: words.length,
      streak,
    });
  };

  const allCells = new Set<string>();
  Object.values(found).forEach((cs) => cs.forEach((c) => allCells.add(c)));
  const dragSet = new Set(drag);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        streak={streak}
        eyebrow={eyebrow}
        title={title ?? t("exercise.wordSearch.title")}
        feedback={feedback}
        canCheck={false}
        showSkip={false}
        onCheck={() => {}}
        onContinue={handleContinue}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "flex",
            gap: 28,
            maxWidth: 540,
            margin: "0 auto",
            flexWrap: "wrap",
          }}
        >
          <div
            ref={gridRef}
            onPointerDown={onGridDown}
            onPointerMove={onGridMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              padding: 8,
              userSelect: "none",
              touchAction: "none",
            }}
          >
            {grid.map((row, r) => (
              <div key={r} style={{ display: "flex" }}>
                {row.split("").map((ch, c) => {
                  const k = `${r},${c}`;
                  const isFound = allCells.has(k);
                  const isDrag = dragSet.has(k);
                  return (
                    <div
                      key={c}
                      data-cell={k}
                      style={{
                        width: 36,
                        height: 36,
                        margin: 2,
                        display: "grid",
                        placeItems: "center",
                        background: isFound
                          ? "var(--green-100)"
                          : isDrag
                            ? "var(--sun-100)"
                            : "var(--paper)",
                        borderRadius: 6,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 15,
                        color: isFound ? "var(--green-800)" : "var(--ink-900)",
                        cursor: feedback ? "default" : "pointer",
                        transition: "background 120ms",
                      }}
                    >
                      {ch}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="gp-eyebrow" style={{ marginBottom: 10 }}>
              {t("exercise.toFind")}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {words.map((w) => (
                <div
                  key={w}
                  style={{
                    padding: "8px 14px",
                    background: found[w] ? "var(--green-50)" : "var(--paper-2)",
                    border: `2px solid ${found[w] ? "var(--green-500)" : "var(--ink-100)"}`,
                    borderRadius: 999,
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 14,
                    color: found[w] ? "var(--green-800)" : "var(--ink-900)",
                    textDecoration: found[w] ? "line-through" : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {found[w] && <Check size={14} />}
                  {w}
                </div>
              ))}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
