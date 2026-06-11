"use client";

/**
 * CategorizeV2 — drag items into labeled buckets.
 *
 * Upgraded to the feedback-grammar handoff (ex-drag.jsx · ExCategorize):
 * Pointer-Events chip drag (`.fb-chip-drag`) — the held chip lifts with a
 * 2° tilt (amplitude via --mamp), the bucket under the pointer highlights
 * (`.fb-bucket.over`, hit-testing via bounding rects), and the drop flashes
 * `gotcha` (instant correct) / `reject` (instant wrong — the chip springs
 * back) / `catch` (deferred accept). Landed chips pop in (`.landed`).
 *
 * Reads existing `categorize` config `{ categories: [{ name, items }] }` —
 * the `items` array under each category is the canonical membership; items
 * are flattened into the tray for display.
 *
 * Two grading modes:
 *   - deferred (default): any bucket accepts; grading happens on Check.
 *     Correct chips lock `ok`, wrong chips shake `no` and return to the
 *     tray. Before checking, a click on a bucketed chip returns it to the
 *     tray. Retry keeps the correctly placed chips.
 *   - instant (`deferred={false}`): each drop grades immediately; the Check
 *     button is replaced by a passive caption (LessonShell `instant`).
 *     Retry restarts the whole task.
 *
 * Same per-task HP + streak as the rest of the V2 family.
 */

import { useMemo, useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface CategorizeCategory {
  name: string;
  items: string[];
  /** Optional bucket bg + border colour overrides (default: `.fb-bucket`). */
  color?: string;
  border?: string;
}

export interface CategorizeV2Props {
  categories: CategorizeCategory[];
  eyebrow?: string;
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  /**
   * Deferred grading (default true): every bucket accepts the chip and
   * grading happens on the Check button. Set false for instant mode — each
   * drop grades the moment it lands.
   */
  deferred?: boolean;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
}

type ChipState = "ok" | "no";
type FlashKind = "gotcha" | "reject" | "catch";

interface DragState {
  item: string;
  dx: number;
  dy: number;
  over: string | null;
}

export function CategorizeV2({
  categories,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  deferred = true,
  onQuit,
  onFinish,
}: CategorizeV2Props) {
  const { t } = useTranslation();

  const all = useMemo(() => categories.flatMap((c) => c.items), [categories]);
  /** item → its canonical category name. */
  const correctCat = useMemo(() => {
    const m: Record<string, string> = {};
    categories.forEach((c) => c.items.forEach((it) => (m[it] = c.name)));
    return m;
  }, [categories]);

  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [chipStates, setChipStates] = useState<Record<string, ChipState>>({});
  const [drag, setDrag] = useState<DragState | null>(null);
  const [flash, setFlash] = useState<{ key: string; kind: FlashKind } | null>(null);
  /** True between Check and the feedback sheet (the 750ms shake window). */
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const start = useRef({ x: 0, y: 0 });
  const bucketRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const { fire, layer } = useConfetti();

  const tray = all.filter((it) => !placed[it]);
  const reveal = () =>
    categories.map((c) => `${c.items.join(", ")} → ${c.name}`).join(" · ");

  /** Bucket under the pointer — bounding-rect hit-testing (capture-safe). */
  const bucketAt = (x: number, y: number): string | null => {
    for (const c of categories) {
      const el = bucketRefs.current[c.name];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return c.name;
    }
    return null;
  };

  const winTask = () => {
    setFeedback({
      kind: "ok",
      msg: usedAttempts === 0 ? t("exercise.categorize.spotOn") : t("exercise.gotIt"),
    });
    setStreak((s) => s + 1);
    fire();
  };

  /** One wrong round: -1 heart; out of hearts = reveal + task over. */
  const loseRound = (msg: string) => {
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: t("exercise.outOfAttempts"), correct: reveal() });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg });
    }
  };

  const down = (item: string) => (e: React.PointerEvent<HTMLDivElement>) => {
    if (feedback) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ item, dx: 0, dy: 0, over: null });
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    setDrag({
      ...drag,
      dx: e.clientX - start.current.x,
      dy: e.clientY - start.current.y,
      over: bucketAt(e.clientX, e.clientY),
    });
  };
  const up = () => {
    if (!drag) return;
    const { item, over } = drag;
    setDrag(null);
    if (!over) return; // chip springs back via the base transform transition

    if (deferred) {
      // Any bucket accepts — grading happens on the Check button.
      setPlaced((p) => ({ ...p, [item]: over }));
      setFlash({ key: over, kind: "catch" });
      setTimeout(() => setFlash(null), 450);
      return;
    }

    // Instant mode: grade on drop.
    if (correctCat[item] === over) {
      const next = { ...placed, [item]: over };
      setPlaced(next);
      setChipStates((s) => ({ ...s, [item]: "ok" }));
      setFlash({ key: over, kind: "gotcha" });
      setTimeout(() => setFlash(null), 450);
      if (Object.keys(next).length === all.length) {
        setTimeout(() => winTask(), 380);
      }
    } else {
      setFlash({ key: over, kind: "reject" });
      setTimeout(() => setFlash(null), 450);
      loseRound(t("exercise.categorize.wrongBucket"));
    }
  };

  /** Deferred check: correct chips lock `ok`, wrong chips shake `no` and
   * return to the tray (kept in place with marks when the task is over). */
  const handleCheck = () => {
    if (grading) return;
    setGrading(true);
    const states: Record<string, ChipState> = {};
    const bad: string[] = [];
    all.forEach((it) => {
      if (!placed[it]) return;
      const ok = placed[it] === correctCat[it];
      states[it] = ok ? "ok" : "no";
      if (!ok) bad.push(it);
    });
    setChipStates(states);
    if (bad.length === 0) {
      winTask();
      return;
    }
    const taskOver = attemptsLeft - 1 <= 0;
    setTimeout(() => {
      if (!taskOver) {
        // Wrong chips spring back to the tray; correct ones stay locked.
        setPlaced((p) => {
          const np = { ...p };
          bad.forEach((it) => delete np[it]);
          return np;
        });
        setChipStates((s) => {
          const ns = { ...s };
          bad.forEach((it) => delete ns[it]);
          return ns;
        });
      }
      setGrading(false);
      loseRound(
        bad.length === 1
          ? t("exercise.categorize.oneReturned")
          : t("exercise.categorize.manyReturned").replace("{n}", String(bad.length))
      );
    }, 750);
  };

  /** Click on an unchecked bucketed chip — back to the tray (deferred only). */
  const unplace = (item: string) => {
    if (!deferred || feedback || chipStates[item]) return;
    setPlaced((p) => {
      const np = { ...p };
      delete np[item];
      return np;
    });
  };

  /** Retry keeps correctly placed chips in deferred mode; instant restarts. */
  const handleRetry = () => {
    if (!deferred) {
      setPlaced({});
      setChipStates({});
    }
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
        title={title ?? t("exercise.categorize.title")}
        feedback={feedback}
        canCheck={deferred && tray.length === 0 && !grading && !feedback}
        instant={!deferred}
        instantLabel={t("exercise.categorize.hintInstant")}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
          {/* ── Tray ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
              minHeight: 60,
              marginBottom: 26,
            }}
          >
            {tray.map((it) => {
              const isDrag = drag !== null && drag.item === it;
              return (
                <div
                  key={it}
                  className={"fb-chip-drag" + (isDrag ? " dragging" : "")}
                  style={
                    isDrag
                      ? {
                          transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(calc(2deg * var(--mamp))) scale(1.06)`,
                        }
                      : feedback
                        ? { cursor: "default" }
                        : undefined
                  }
                  onPointerDown={down(it)}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={up}
                >
                  {it}
                </div>
              );
            })}
            {tray.length === 0 && (
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--ink-300)",
                  alignSelf: "center",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {deferred && !feedback
                  ? t("exercise.allPlacedHitCheck")
                  : t("exercise.categorize.allSorted")}
              </span>
            )}
          </div>

          {/* ── Buckets ── */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {categories.map((c) => {
              const inBucket = all.filter((it) => placed[it] === c.name);
              const isOver = drag !== null && drag.over === c.name;
              const isFlash = flash !== null && flash.key === c.name;
              return (
                <div
                  key={c.name}
                  ref={(el) => {
                    bucketRefs.current[c.name] = el;
                  }}
                  className={
                    "fb-bucket" +
                    (isOver ? " over" : "") +
                    (isFlash ? " " + flash.kind : "")
                  }
                  style={
                    // Honour explicit colour overrides, but never while the
                    // bucket is highlighting/flashing (inline beats class).
                    (c.color || c.border) && !isOver && !isFlash
                      ? { background: c.color, borderColor: c.border }
                      : undefined
                  }
                >
                  <div className="fb-bucket-title">
                    {c.name}
                    <span className="cnt">{inBucket.length}</span>
                  </div>
                  {inBucket.map((it) => {
                    const st = chipStates[it];
                    const returnable = deferred && !st && !feedback;
                    return (
                      <div
                        key={it}
                        className={"fb-chip-drag landed" + (st ? " " + st : "")}
                        onClick={() => unplace(it)}
                        title={returnable ? t("exercise.categorize.tapToReturn") : undefined}
                        style={{
                          cursor: returnable ? "pointer" : "default",
                          alignSelf: "flex-start",
                          borderColor: st
                            ? undefined
                            : deferred
                              ? "color-mix(in oklab, var(--link-color) 55%, var(--ink-100))"
                              : "var(--green-300)",
                          background: st
                            ? undefined
                            : deferred
                              ? "color-mix(in oklab, var(--link-color) 7%, var(--paper-2))"
                              : "var(--green-50)",
                        }}
                      >
                        {it}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
