"use client";

/**
 * MatchingV2 — connect a left term with its matching right term.
 *
 * Upgraded to the feedback-grammar handoff (ex-matching.jsx): two ways to
 * connect — click-click (pick a tile, then its pair) and pointer-drag (hold
 * a tile, a rubber-band thread follows the cursor, release over the target).
 * An absolutely-positioned SVG overlay (`fb-linksvg`) draws committed lines
 * (`fb-line-done`), soft uncommitted links (`fb-line-soft`), wrong-pair
 * flashes (`fb-line-wrong`) and the live cursor thread (`fb-line-cursor`).
 *
 * Two grading modes:
 *   - deferred (default): pairs link softly; grading happens on Check.
 *     Correct pairs lock with a line-draw, wrong pairs flash + shake and
 *     unlink so the student fixes only those. Retry keeps matched pairs.
 *   - instant (`deferred={false}`): each connected pair grades immediately;
 *     the Check button is replaced by a passive caption (LessonShell
 *     `instant`). Retry restarts the whole task.
 *
 * Same per-task HP + streak as the rest of the V2 family. Streak is
 * decided once at the end of the task: solved = +1, gave up = 0.
 */

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface MatchingPair {
  left: string;
  right: string;
}

export interface MatchingV2Props {
  pairs: MatchingPair[];
  eyebrow?: string;
  title?: string;
  /** Max wrong rounds before the task ends in failure. Default = pairs.length */
  maxAttemptsPerTask?: number;
  streak?: number;
  /**
   * Deferred grading (default true): pairs link softly and are graded on
   * the Check button. Set false for instant mode — each pair grades the
   * moment it is connected.
   */
  deferred?: boolean;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; wrongAttempts: number; streak: number }) => void;
}

type Side = "L" | "R";

interface TilePick {
  side: Side;
  idx: number;
}

interface Point {
  x: number;
  y: number;
}

/** [leftIdx, rightIdx] — soft (unchecked) connection. */
type SoftLink = [number, number];

interface DragState {
  side: Side;
  idx: number;
  x0: number;
  y0: number;
  moved: boolean;
  prevPicked: TilePick | null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Drag threshold (px) that separates a click from a thread-drag. */
const DRAG_THRESHOLD = 6;

export function MatchingV2({
  pairs,
  eyebrow,
  title,
  maxAttemptsPerTask,
  streak: initialStreak = 0,
  deferred = true,
  onQuit,
  onFinish,
}: MatchingV2Props) {
  const maxAttempts = maxAttemptsPerTask ?? pairs.length;
  const indices = pairs.map((_, i) => i);
  const [leftOrder] = useState(() => shuffle(indices));
  const [rightOrder] = useState(() => shuffle(indices));
  const [picked, setPicked] = useState<TilePick | null>(null);
  const [hot, setHot] = useState<TilePick | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [links, setLinks] = useState<SoftLink[]>([]);
  const [freshLink, setFreshLink] = useState<number | null>(null);
  const [fresh, setFresh] = useState<number | null>(null);
  const [wrongPairs, setWrongPairs] = useState<SoftLink[] | null>(null);
  const [cursor, setCursor] = useState<Point | null>(null);
  const [, setTick] = useState(0);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttempts);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const dragRef = useRef<DragState | null>(null);

  // Re-render on resize so the SVG anchors recompute against fresh rects.
  useEffect(() => {
    const onResize = () => setTick((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const anchor = (side: Side, idx: number): Point | null => {
    const el = tileRefs.current[side + idx];
    const wrap = wrapRef.current;
    if (!el || !wrap) return null;
    const r = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    return {
      x: (side === "L" ? r.right : r.left) - w.left,
      y: r.top + r.height / 2 - w.top,
    };
  };

  const bezier = (a: Point, b: Point): string => {
    const c = Math.max(30, Math.abs(b.x - a.x) * 0.45);
    const dir = b.x >= a.x ? 1 : -1;
    return `M ${a.x} ${a.y} C ${a.x + c * dir} ${a.y}, ${b.x - c * dir} ${b.y}, ${b.x} ${b.y}`;
  };

  const winTask = () => {
    setFeedback({ kind: "ok", msg: t("exercise.matching.allMatched") });
    setStreak((s) => s + 1);
    fire();
  };

  /** One wrong round: -1 heart; out of hearts = reveal + task over. */
  const loseRound = (msg: string) => {
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setWrongAttempts((w) => w + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.outOfAttempts"),
        correct: pairs.map((p) => `${p.left} → ${p.right}`).join(", "),
      });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg });
    }
  };

  /** Resolve a pair — shared exit for click-click and drag-drop. */
  const resolvePair = (lIdx: number, rIdx: number) => {
    setHot(null);
    setPicked(null);
    setCursor(null);
    if (deferred) {
      // Just link softly — grading happens on the Check button.
      setLinks((ls) => [
        ...ls.filter((p) => p[0] !== lIdx && p[1] !== rIdx),
        [lIdx, rIdx],
      ]);
      setFreshLink(lIdx);
      return;
    }
    if (lIdx === rIdx) {
      const nm = [...matched, lIdx];
      setMatched(nm);
      setFresh(lIdx);
      if (nm.length === pairs.length) {
        setTimeout(() => winTask(), 380);
      }
    } else {
      setWrongPairs([[lIdx, rIdx]]);
      setTimeout(() => {
        setWrongPairs(null);
        loseRound(t("exercise.matching.noMatch"));
      }, 620);
    }
  };

  /** Deferred check: correct pairs lock, wrong pairs flash and unlink. */
  const check = () => {
    const ok = links.filter((p) => p[0] === p[1]);
    const bad = links.filter((p) => p[0] !== p[1]);
    if (ok.length) {
      setMatched((m) => [...m, ...ok.map((p) => p[0])]);
      setFresh(ok[0][0]);
    }
    if (bad.length === 0) {
      setLinks([]);
      setFreshLink(null);
      setTimeout(() => winTask(), 380);
    } else {
      setLinks(bad);
      setWrongPairs(bad);
      setTimeout(() => {
        setWrongPairs(null);
        setLinks([]);
        loseRound(
          bad.length === 1
            ? t("exercise.matching.oneUnlinked")
            : t("exercise.matching.manyUnlinked").replace("{n}", String(bad.length))
        );
      }, 700);
    }
  };

  /** Retry keeps matched pairs in deferred mode; instant restarts the task. */
  const retry = () => {
    if (!deferred) {
      setMatched([]);
      setFresh(null);
    }
    setLinks([]);
    setFreshLink(null);
    setPicked(null);
    setWrongPairs(null);
    setCursor(null);
    setFeedback(null);
  };

  /** Press on a tile: hook the thread immediately — for click AND drag. */
  const tileDown = (side: Side, idx: number) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (feedback || matched.includes(idx) || wrongPairs) return;
    // Release implicit touch capture so pointerenter/elementFromPoint work
    // on the tiles we drag over.
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (deferred) {
      // Linked but unchecked tile — unlink it and take the thread again.
      setLinks((ls) => ls.filter((p) => p[side === "L" ? 0 : 1] !== idx));
    }
    dragRef.current = { side, idx, x0: e.clientX, y0: e.clientY, moved: false, prevPicked: picked };
    if (!picked || picked.side === side) {
      setPicked({ side, idx });
      const w = wrapRef.current?.getBoundingClientRect();
      if (w) setCursor({ x: e.clientX - w.left, y: e.clientY - w.top });
    }
  };

  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (d && !d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_THRESHOLD) {
      d.moved = true;
    }
    if (!picked || !wrapRef.current) return;
    const w = wrapRef.current.getBoundingClientRect();
    setCursor({ x: e.clientX - w.left, y: e.clientY - w.top });
  };

  // Release anywhere: finish the drag, or treat it as a click.
  // Re-registered every render (like the handoff) so the closure is fresh.
  useEffect(() => {
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      if (feedback) return;

      if (!d.moved) {
        // Click semantics.
        const p = d.prevPicked;
        if (p && p.side === d.side && p.idx === d.idx) {
          setPicked(null); // second click on the same tile — deselect
          setCursor(null);
        } else if (p && p.side !== d.side) {
          const lIdx = d.side === "L" ? d.idx : p.idx;
          const rIdx = d.side === "R" ? d.idx : p.idx;
          resolvePair(lIdx, rIdx); // second click — resolve the pair
        }
        return;
      }

      // Drag semantics: find the tile under the release point.
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el?.closest<HTMLElement>("[data-mside]");
      if (target) {
        const side = target.dataset.mside as Side;
        const idx = Number.parseInt(target.dataset.midx ?? "", 10);
        if (side !== d.side && !Number.isNaN(idx) && !matched.includes(idx)) {
          const lIdx = d.side === "L" ? d.idx : idx;
          const rIdx = d.side === "R" ? d.idx : idx;
          resolvePair(lIdx, rIdx);
          return;
        }
      }
      // Released into the void — the thread snaps off.
      setPicked(null);
      setCursor(null);
      setHot(null);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  });

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      wrongAttempts,
      streak,
    });
  };

  const linkFor = (side: Side, idx: number) =>
    links.find((p) => p[side === "L" ? 0 : 1] === idx);
  const inWrong = (side: Side, idx: number) =>
    !!wrongPairs?.some((p) => p[side === "L" ? 0 : 1] === idx);

  const stateFor = (side: Side, idx: number): string => {
    if (matched.includes(idx)) return fresh === idx ? "correct" : "correct locked";
    if (inWrong(side, idx)) return "wrong";
    if (picked && picked.side === side && picked.idx === idx) return "selected";
    if (picked && picked.side !== side) {
      if (hot && hot.side === side && hot.idx === idx) return "hot";
      return linkFor(side, idx) ? "linked" : "candidate";
    }
    return linkFor(side, idx) ? "linked" : "";
  };

  // Rubber-band line: from the picked tile to the cursor (or magnetised
  // to the hot drop target).
  let cursorPath: string | null = null;
  let cursorEnd: Point | null = null;
  let cursorStart: Point | null = null;
  if (picked) {
    const a = anchor(picked.side, picked.idx);
    let b: Point | null = null;
    if (hot && hot.side !== picked.side) b = anchor(hot.side, hot.idx);
    else if (cursor) b = cursor;
    if (a && b) {
      cursorPath = bezier(a, b);
      cursorStart = a;
      cursorEnd = b;
    }
  }

  const renderTile = (side: Side, idx: number) => (
    <button
      key={side + idx}
      ref={(el) => {
        tileRefs.current[side + idx] = el;
      }}
      data-mside={side}
      data-midx={idx}
      className={"gp-tile " + stateFor(side, idx)}
      style={
        side === "L"
          ? {
              fontFamily: "var(--font-mono)",
              padding: "14px 16px",
              fontSize: 16,
              width: "100%",
              textAlign: "center",
              touchAction: "none",
            }
          : {
              padding: "14px 16px",
              fontSize: 14,
              width: "100%",
              textAlign: "center",
              touchAction: "none",
            }
      }
      onPointerDown={tileDown(side, idx)}
      onPointerEnter={() => {
        if (picked && picked.side !== side && !matched.includes(idx)) {
          setHot({ side, idx });
        }
      }}
      onPointerLeave={() => setHot(null)}
    >
      {pairs[idx][side === "L" ? "left" : "right"]}
    </button>
  );

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttempts}
        streak={streak}
        lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title ?? t("exercise.matching.title")}
        feedback={feedback}
        canCheck={
          deferred &&
          links.length + matched.length === pairs.length &&
          !wrongPairs &&
          !feedback
        }
        checkLabel={t("exercise.matching.check")}
        instant={!deferred}
        instantLabel={t("exercise.matching.hintInstant")}
        showSkip={false}
        onCheck={check}
        onContinue={handleContinue}
        onRetry={attemptsLeft > 0 ? retry : undefined}
        onQuit={onQuit}
      >
        <div
          ref={wrapRef}
          className="fb-linkwrap"
          onPointerMove={onMove}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 80px",
            maxWidth: 620,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <svg className="fb-linksvg">
            {matched.map((idx) => {
              const a = anchor("L", idx);
              const b = anchor("R", idx);
              if (!a || !b) return null;
              return (
                <path
                  key={idx}
                  className={"fb-line-done" + (fresh === idx ? " fresh" : "")}
                  d={bezier(a, b)}
                />
              );
            })}
            {links.map(([l, r]) => {
              if (inWrong("L", l)) return null;
              const a = anchor("L", l);
              const b = anchor("R", r);
              if (!a || !b) return null;
              return (
                <path
                  key={"s" + l + "-" + r}
                  className={"fb-line-soft" + (freshLink === l ? " fresh" : "")}
                  d={bezier(a, b)}
                />
              );
            })}
            {wrongPairs?.map(([l, r]) => {
              const a = anchor("L", l);
              const b = anchor("R", r);
              if (!a || !b) return null;
              return (
                <path key={"w" + l + "-" + r} className="fb-line-wrong" d={bezier(a, b)} />
              );
            })}
            {cursorPath && (
              <g>
                <path className="fb-line-cursor" d={cursorPath} />
                {cursorStart && (
                  <circle className="fb-line-anchor" cx={cursorStart.x} cy={cursorStart.y} r={6} />
                )}
                {cursorEnd && (
                  <circle className="fb-line-dot" cx={cursorEnd.x} cy={cursorEnd.y} r={5} />
                )}
              </g>
            )}
          </svg>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {leftOrder.map((idx) => renderTile("L", idx))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rightOrder.map((idx) => renderTile("R", idx))}
          </div>
        </div>
        {deferred && (
          <div
            style={{
              textAlign: "center",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--ink-300)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: 22,
            }}
          >
            {t("exercise.matching.hintDeferred")}
          </div>
        )}
      </LessonShell>
    </div>
  );
}
