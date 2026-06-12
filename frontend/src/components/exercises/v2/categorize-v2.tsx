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
  /** True once the pointer travelled past the tap threshold — separates a
   * tap (arm the chip, CT-01) from a real drag. */
  moved: boolean;
}

/** CT-03: per-bucket colour swatch dots (cycled). */
const BUCKET_SWATCHES = [
  "var(--green-400)",
  "var(--sun-400)",
  "var(--coral-300)",
  "var(--info)",
];

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
  /** CT-01: tapped/Enter-armed chip — the next bucket tap places it. */
  const [armedChip, setArmedChip] = useState<string | null>(null);
  /** Visually-hidden live region for place/return announcements. */
  const [announce, setAnnounce] = useState("");
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

  /** One wrong round: -1 heart; out of hearts = reveal + task over.
   * CT-02: `silent` skips the feedback sheet while hearts remain — the
   * inline bucket shake carries the message. */
  const loseRound = (msg: string, opts?: { silent?: boolean }) => {
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: t("exercise.outOfAttempts"), correct: reveal() });
      setStreak(0);
      return;
    }
    if (!opts?.silent) setFeedback({ kind: "no", msg });
  };

  /** Shared landing for drag-drop and tap/Enter-a-bucket (CT-01). */
  const placeChip = (item: string, bucketName: string) => {
    if (deferred) {
      // Any bucket accepts — grading happens on the Check button.
      setPlaced((p) => ({ ...p, [item]: bucketName }));
      setFlash({ key: bucketName, kind: "catch" });
      setAnnounce(
        t("exercise.categorize.announcePlaced")
          .replace("{item}", item)
          .replace("{bucket}", bucketName)
      );
      setTimeout(() => setFlash(null), 450);
      return;
    }

    // Instant mode: grade on drop.
    if (correctCat[item] === bucketName) {
      const next = { ...placed, [item]: bucketName };
      setPlaced(next);
      setChipStates((s) => ({ ...s, [item]: "ok" }));
      setFlash({ key: bucketName, kind: "gotcha" });
      setAnnounce(
        t("exercise.categorize.announceCorrect")
          .replace("{item}", item)
          .replace("{bucket}", bucketName)
      );
      setTimeout(() => setFlash(null), 450);
      if (Object.keys(next).length === all.length) {
        setTimeout(() => winTask(), 380);
      }
    } else {
      // CT-02: inline bucket shake + heart loss; the full sheet only opens
      // when the last heart goes.
      setFlash({ key: bucketName, kind: "reject" });
      setAnnounce(
        t("exercise.categorize.announceWrong")
          .replace("{item}", item)
          .replace("{bucket}", bucketName)
      );
      setTimeout(() => setFlash(null), 450);
      loseRound(t("exercise.categorize.wrongBucket"), { silent: true });
    }
  };

  const down = (item: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (feedback || chipStates[item]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ item, dx: 0, dy: 0, over: null, moved: false });
  };
  const move = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!drag) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({
      ...drag,
      dx,
      dy,
      over: bucketAt(e.clientX, e.clientY),
      moved: drag.moved || Math.hypot(dx, dy) > 6,
    });
  };
  const up = () => {
    if (!drag) return;
    const { item, over, moved } = drag;
    setDrag(null);
    if (!moved) {
      // CT-01: a tap (no drag) arms the chip — next bucket tap places it.
      setArmedChip((a) => (a === item ? null : item));
      return;
    }
    setArmedChip(null);
    if (!over) return; // chip springs back via the base transform transition
    placeChip(item, over);
  };

  /** CT-01: tap/Enter on a bucket while a chip is armed. */
  const bucketTap = (name: string) => {
    if (!armedChip || feedback) return;
    const item = armedChip;
    setArmedChip(null);
    placeChip(item, name);
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
    setAnnounce(t("exercise.categorize.announceReturned").replace("{item}", item));
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
      {/* Visually-hidden aria-live region: place / return / verdict. */}
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
        title={title ?? t("exercise.categorize.title")}
        feedback={feedback}
        canCheck={deferred && tray.length === 0 && !grading && !feedback}
        checkHint={t("exercise.categorize.checkHint")}
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
              const isArmed = armedChip === it;
              return (
                // CT-01: chips are real buttons — tap/Enter arms, then a
                // bucket tap/Enter places. Drag still works via pointers.
                <button
                  key={it}
                  type="button"
                  className={
                    "fb-chip-drag" + (isDrag && drag.moved ? " dragging" : "") + (isArmed ? " armed" : "")
                  }
                  style={
                    isDrag && drag.moved
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (feedback || chipStates[it]) return;
                      setArmedChip((a) => (a === it ? null : it));
                    }
                  }}
                  aria-pressed={isArmed}
                  aria-label={t(
                    isArmed
                      ? "exercise.categorize.chipArmedAria"
                      : "exercise.categorize.chipAria"
                  ).replace("{item}", it)}
                >
                  {it}
                </button>
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
          {/* CT-05: auto-fit grid — buckets reflow instead of squashing. */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 16,
            }}
          >
            {categories.map((c, ci) => {
              const inBucket = all.filter((it) => placed[it] === c.name);
              const isOver = drag !== null && drag.over === c.name;
              const isFlash = flash !== null && flash.key === c.name;
              const isTarget = !!armedChip && !feedback;
              return (
                <div
                  key={c.name}
                  ref={(el) => {
                    bucketRefs.current[c.name] = el;
                  }}
                  className={
                    "fb-bucket" +
                    (isOver ? " over" : "") +
                    (isFlash ? " " + flash.kind : "") +
                    (isTarget && !isOver && !isFlash ? " target" : "")
                  }
                  // CT-01: while a chip is armed the bucket is the actionable
                  // half of the tap-tap pair.
                  role={isTarget ? "button" : undefined}
                  tabIndex={isTarget ? 0 : -1}
                  aria-label={
                    isTarget
                      ? t("exercise.categorize.bucketPlaceAria")
                          .replace("{item}", armedChip!)
                          .replace("{bucket}", c.name)
                      : t("exercise.categorize.bucketAria")
                          .replace("{bucket}", c.name)
                          .replace("{n}", String(inBucket.length))
                  }
                  onClick={() => bucketTap(c.name)}
                  onKeyDown={(e) => {
                    if (isTarget && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      bucketTap(c.name);
                    }
                  }}
                  style={
                    // Honour explicit colour overrides, but never while the
                    // bucket is highlighting/flashing (inline beats class).
                    (c.color || c.border) && !isOver && !isFlash
                      ? { background: c.color, borderColor: c.border }
                      : undefined
                  }
                >
                  {/* CT-03: readable title — 14px sans bold + colour swatch
                      (class base is 10px grey mono; inline overrides). */}
                  <div
                    className="fb-bucket-title"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      fontWeight: 800,
                      textTransform: "none",
                      letterSpacing: "normal",
                      color: "var(--ink-700)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 4,
                        flex: "none",
                        background:
                          c.border ?? BUCKET_SWATCHES[ci % BUCKET_SWATCHES.length],
                      }}
                    />
                    {c.name}
                    <span className="cnt" style={{ marginLeft: "auto" }}>
                      {inBucket.length}
                    </span>
                  </div>
                  {inBucket.map((it) => {
                    const st = chipStates[it];
                    const returnable = deferred && !st && !feedback;
                    return (
                      <button
                        key={it}
                        type="button"
                        className={"fb-chip-drag landed" + (st ? " " + st : "")}
                        onClick={(e) => {
                          e.stopPropagation();
                          unplace(it);
                        }}
                        disabled={!returnable}
                        title={returnable ? t("exercise.categorize.tapToReturn") : undefined}
                        aria-label={
                          returnable
                            ? t("exercise.categorize.placedChipAria")
                                .replace("{item}", it)
                                .replace("{bucket}", c.name)
                            : undefined
                        }
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
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-300)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 18,
            }}
          >
            {t("exercise.categorize.tapHint")}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
