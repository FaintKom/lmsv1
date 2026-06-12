"use client";

/**
 * CardSortV2 — drag cards into category columns (like CategorizeV2 but
 * with multi-line equation cards and 3 columns).
 *
 * Adopted from q-math-templates.jsx · CardSortExerciseV2. Differs from
 * CategorizeV2 by accepting card-level `text` (so the same card content
 * isn't used as identity) and a stable 3-column grid.
 *
 * Per-task HP + streak; retry locks correct placements (CS-02) so the
 * student fixes only the wrong columns.
 *
 * Interaction (CS-01): pointer events with capture — HTML5 drag-and-drop
 * never fires on iOS/Android touch. A press that doesn't move arms the
 * card (tap-to-arm → tap-a-column), which is simultaneously the touch
 * fallback, the keyboard path, and the screen-reader path.
 */

import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface SortCategory {
  id: string;
  label: string;
  /** Bucket bg colour. Defaults rotate. */
  color?: string;
  /** Bucket dashed-border colour when hover. */
  border?: string;
  /** Label text colour. */
  text?: string;
}

export interface SortCard {
  id: string;
  text: string;
  /** ID of the correct category. */
  cat: string;
}

export interface CardSortV2Props {
  categories: SortCategory[];
  cards: SortCard[];
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
    wrongCount: number;
  }) => void;
}

const DEFAULTS: Required<Pick<SortCategory, "color" | "border" | "text">>[] = [
  { color: "var(--green-50)", border: "var(--green-300)", text: "var(--green-800)" },
  { color: "var(--sun-50)", border: "var(--sun-400)", text: "var(--sun-700)" },
  { color: "var(--coral-50)", border: "var(--coral-300)", text: "var(--coral-700)" },
  { color: "var(--ink-50)", border: "var(--ink-300)", text: "var(--ink-700)" },
];

interface DragState {
  id: string;
  dx: number;
  dy: number;
  over: string | null;
  moved: boolean;
}

export function CardSortV2({
  categories,
  cards,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: CardSortV2Props) {
  const { t } = useTranslation();
  const palette = categories.map((c, i) => ({
    color: c.color ?? DEFAULTS[i % DEFAULTS.length].color,
    border: c.border ?? DEFAULTS[i % DEFAULTS.length].border,
    text: c.text ?? DEFAULTS[i % DEFAULTS.length].text,
  }));
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [lockedOk, setLockedOk] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [announce, setAnnounce] = useState("");
  const start = useRef({ x: 0, y: 0 });
  const colRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { fire, layer } = useConfetti();

  /** Hit-test pointer position against the category columns. */
  const colAt = (x: number, y: number): string | null => {
    for (const c of categories) {
      const el = colRefs.current[c.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return c.id;
    }
    return null;
  };

  const placeCard = (cardId: string, catId: string) => {
    setPlaced((p) => ({ ...p, [cardId]: catId }));
    const card = cards.find((c) => c.id === cardId);
    const cat = categories.find((c) => c.id === catId);
    setAnnounce(
      t("exercise.cardSort.placedIn")
        .replace("{card}", card?.text ?? cardId)
        .replace("{col}", cat?.label ?? catId)
    );
  };

  const down = (cardId: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (feedback || lockedOk[cardId]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ id: cardId, dx: 0, dy: 0, over: null, moved: false });
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({
      ...drag,
      dx,
      dy,
      over: colAt(e.clientX, e.clientY),
      moved: drag.moved || Math.hypot(dx, dy) > 6,
    });
  };
  const up = () => {
    if (!drag) return;
    const { id, over, moved } = drag;
    setDrag(null);
    // A press without movement is a tap → toggle armed (touch/keyboard path).
    if (!moved) {
      setArmed((a) => (a === id ? null : id));
      return;
    }
    setArmed(null);
    if (over) placeCard(id, over);
  };

  const colTap = (catId: string) => {
    if (!armed || feedback) return;
    const id = armed;
    setArmed(null);
    placeCard(id, catId);
  };

  /** CS-06: tap a placed (unlocked) card to send it back to the bank. */
  const returnCard = (cardId: string) => {
    if (feedback || lockedOk[cardId]) return;
    setPlaced((p) => {
      const np = { ...p };
      delete np[cardId];
      return np;
    });
    setResults((r) => {
      const nr = { ...r };
      delete nr[cardId];
      return nr;
    });
  };

  const allPlaced = cards.every((c) => placed[c.id]);

  const handleCheck = () => {
    const res: Record<string, boolean> = {};
    let wrong = 0;
    cards.forEach((c) => {
      const ok = placed[c.id] === c.cat;
      res[c.id] = ok;
      if (!ok) wrong++;
    });
    setResults(res);
    if (wrong === 0) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.cardSort.allSortedCorrectly") : t("exercise.gotIt"),
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
        msg: (wrong === 1 ? t("exercise.cardSort.wrongCardOne") : t("exercise.cardSort.wrongCardMany")).replace("{n}", String(wrong)),
        correct: cards
          .map(
            (c) =>
              `${c.text} → ${categories.find((cat) => cat.id === c.cat)?.label ?? c.cat}`
          )
          .join("  ·  "),
      });
      setStreak(0);
    } else {
      const tmpl = remaining === 1 ? t("exercise.cardSort.wrongOneLeft") : t("exercise.cardSort.wrongAttempts");
      setFeedback({
        kind: "no",
        msg: tmpl.replace("{n}", String(wrong)).replace("{r}", String(remaining)),
        explain: t("exercise.cardSort.retryKeepsCorrect"),
      });
    }
  };

  /** CS-02: lock correct placements, bounce wrong cards back to the bank. */
  const handleRetry = () => {
    const locks: Record<string, boolean> = {};
    const keep: Record<string, string> = {};
    cards.forEach((c) => {
      if (placed[c.id] === c.cat) {
        locks[c.id] = true;
        keep[c.id] = placed[c.id];
      }
    });
    setLockedOk(locks);
    setPlaced(keep);
    setResults({});
    setFeedback(null);
  };

  const handleContinue = () => {
    const wrongCount = cards.filter((c) => placed[c.id] !== c.cat).length;
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
      wrongCount,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  const unsorted = cards.filter((c) => !placed[c.id]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <span
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}
        aria-live="polite"
      >
        {announce}
      </span>
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.cardSort.title")}
        feedback={feedback}
        canCheck={allPlaced}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {categories.map((c, idx) => {
              const cardsHere = cards.filter((cd) => placed[cd.id] === c.id);
              const pal = palette[idx];
              const isOver = drag !== null && drag.over === c.id;
              const isTarget = !!armed && !feedback;
              return (
                <div
                  key={c.id}
                  ref={(el) => {
                    colRefs.current[c.id] = el;
                  }}
                  className={isTarget && !isOver ? "fb-bucket target" : undefined}
                  role={isTarget ? "button" : undefined}
                  tabIndex={isTarget ? 0 : -1}
                  aria-label={
                    isTarget
                      ? `${t("exercise.cardSort.placeIn")} ${c.label}`
                      : `${c.label} — ${cardsHere.length}`
                  }
                  onClick={() => colTap(c.id)}
                  onKeyDown={(e) => {
                    if (isTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      colTap(c.id);
                    }
                  }}
                  style={{
                    minHeight: 150,
                    background: pal.color,
                    border: `2px dashed ${isOver ? pal.border : "var(--ink-200)"}`,
                    borderRadius: 14,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    transition: "border-color 150ms, transform 150ms",
                    transform: isOver ? "scale(1.015)" : "none",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: pal.text,
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    {c.label}
                  </div>
                  {cardsHere.map((cd) => {
                    const wrong = results[cd.id] === false;
                    const ok = results[cd.id] === true || lockedOk[cd.id];
                    return (
                      <button
                        key={cd.id}
                        type="button"
                        className="landed"
                        onClick={(e) => {
                          e.stopPropagation();
                          returnCard(cd.id);
                        }}
                        disabled={!!feedback || lockedOk[cd.id]}
                        aria-label={
                          lockedOk[cd.id]
                            ? `${cd.text} ✓`
                            : `${cd.text} — ${t("exercise.categorize.tapToReturn")}`
                        }
                        style={{
                          background: ok
                            ? "var(--green-100)"
                            : wrong
                              ? "var(--err-bg)"
                              : "var(--paper-2)",
                          padding: "8px 12px",
                          borderRadius: 8,
                          fontFamily: "var(--font-mono)",
                          fontSize: 14,
                          fontWeight: 600,
                          cursor: feedback || lockedOk[cd.id] ? "default" : "pointer",
                          boxShadow: "var(--shadow-sm)",
                          textAlign: "left",
                          border: wrong
                            ? "1.5px solid var(--err-border)"
                            : ok
                              ? "1.5px solid var(--green-400)"
                              : "1px solid var(--ink-100)",
                          color: wrong ? "var(--err-fg)" : "var(--ink-900)",
                          animation: wrong
                            ? "fb-shake calc(0.4s * var(--mdur)) ease both"
                            : undefined,
                        }}
                      >
                        {cd.text}
                        {lockedOk[cd.id] ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div
            style={{
              background: "var(--paper-2)",
              borderRadius: 14,
              border: "2px solid var(--ink-100)",
              padding: 12,
              minHeight: 70,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unsorted.length === 0 ? (
              <span style={{ color: "var(--ink-400)", fontSize: 13 }}>
                {t("exercise.allPlacedHitCheck")}
              </span>
            ) : (
              unsorted.map((cd) => {
                const isDrag = drag !== null && drag.id === cd.id;
                const isArmed = armed === cd.id;
                return (
                  <button
                    key={cd.id}
                    type="button"
                    className={
                      "fb-chip-drag" + (isDrag ? " dragging" : "") + (isArmed ? " armed" : "")
                    }
                    style={
                      isDrag && drag.moved
                        ? {
                            transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(calc(2deg * var(--mamp))) scale(1.06)`,
                            zIndex: 30,
                            touchAction: "none",
                          }
                        : { touchAction: "none" }
                    }
                    onPointerDown={down(cd.id)}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={up}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setArmed((a) => (a === cd.id ? null : cd.id));
                      }
                    }}
                    aria-pressed={isArmed}
                    disabled={!!feedback}
                  >
                    {cd.text}
                  </button>
                );
              })
            )}
          </div>
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-300)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 14,
            }}
          >
            {t("exercise.cardSort.dragOrTapHint")}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
