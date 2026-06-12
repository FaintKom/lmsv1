"use client";

/**
 * CrosswordV2 — single-letter cell grid with across/down clues.
 *
 * Adopted from q-language.jsx · CrosswordExerciseV2, upgraded with the
 * feedback-grammar handoff (ex-lang2.jsx · CrosswordV2). Methodist supplies
 * grid dimensions + a cell map keyed by "row,col" → {ch, num?}. Words are
 * derived from contiguous runs so the caller's config shape is unchanged.
 *
 *   - CW-01 typing auto-advances along the active word; Backspace walks back
 *   - CW-02 arrow keys move the caret; tapping a crossing cell toggles
 *     direction; the clue list and grid stay in sync (active clue highlit,
 *     clicking a clue jumps to its word)
 *   - CW-03 correct letters lock green on retry ("N of M letters right")
 *   - CW-04 cell size via CSS var --cw (44px → 38px in narrow containers)
 *   - CW-05 failure reveal fills the missing letters as dashed-green ghosts
 *     instead of painting the whole grid coral
 */

import { useMemo, useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface CrosswordCell {
  /** Single uppercase letter expected in this cell. */
  ch: string;
  /** Clue number rendered in the top-left corner (1, 2, …). */
  num?: number;
}

export interface CrosswordClue {
  n: number;
  text: string;
}

export interface CrosswordV2Props {
  width: number;
  height: number;
  /** Map of "row,col" (0-based) → cell. Missing keys = blocked square. */
  cells: Record<string, CrosswordCell>;
  clues: {
    across: CrosswordClue[];
    down: CrosswordClue[];
  };
  /** Optional answer string shown on heart-exhaust, e.g. "1A: CODE · 2D: DATA". */
  answerSummary?: string;
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

/** A word derived from contiguous grid runs (the config stays cell-based). */
interface DerivedWord {
  dir: "a" | "d";
  /** Cell keys ("r,c") in reading order. */
  keys: string[];
  /** Clue number on the first cell — links the word to its clue. */
  num?: number;
}

const LETTER = /[\p{L}\p{N}]/u;

export function CrosswordV2({
  width,
  height,
  cells,
  clues,
  answerSummary,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: CrosswordV2Props) {
  const { t } = useTranslation();
  const cellKeys = useMemo(() => Object.keys(cells), [cells]);

  /* Derive words (runs of ≥2 cells); isolated cells become 1-letter "words"
   * so navigation stays total. */
  const { words, cellWords } = useMemo(() => {
    const list: DerivedWord[] = [];
    const push = (dir: "a" | "d", run: string[]) => {
      if (run.length >= 2)
        list.push({ dir, keys: run, num: cells[run[0]]?.num });
    };
    for (let r = 0; r < height; r++) {
      let run: string[] = [];
      for (let c = 0; c <= width; c++) {
        const key = `${r},${c}`;
        if (c < width && cells[key]) run.push(key);
        else {
          push("a", run);
          run = [];
        }
      }
    }
    for (let c = 0; c < width; c++) {
      let run: string[] = [];
      for (let r = 0; r <= height; r++) {
        const key = `${r},${c}`;
        if (r < height && cells[key]) run.push(key);
        else {
          push("d", run);
          run = [];
        }
      }
    }
    const map: Record<string, number[]> = {};
    list.forEach((w, wi) =>
      w.keys.forEach((k) => {
        (map[k] ||= []).push(wi);
      })
    );
    // Isolated cells (not part of any run) still need a home word.
    Object.keys(cells).forEach((k) => {
      if (!map[k]) {
        list.push({ dir: "a", keys: [k], num: cells[k]?.num });
        map[k] = [list.length - 1];
      }
    });
    return { words: list, cellWords: map };
  }, [cells, width, height]);

  const [vals, setVals] = useState<Record<string, string>>({});
  /** CW-03: cells graded correct lock green across retries. */
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  const [active, setActive] = useState<{ wi: number; k: number }>({ wi: 0, k: 0 });
  /** CW-05: after the last heart, missing letters render as green ghosts. */
  const [revealed, setRevealed] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const cellRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const activeWord = words[active.wi];
  const activeKey = activeWord?.keys[active.k];

  const focusCell = (wi: number, k: number) => {
    const key = words[wi]?.keys[k];
    if (!key) return;
    setActive({ wi, k });
    const el = cellRefs.current[key];
    if (el) {
      el.focus();
      el.select();
    }
  };

  /** Step along the active word, skipping locked cells (CW-01). */
  const advance = (wi: number, k: number, step: 1 | -1) => {
    const w = words[wi];
    if (!w) return;
    let nk = k + step;
    while (nk >= 0 && nk < w.keys.length && locked[w.keys[nk]]) nk += step;
    if (nk >= 0 && nk < w.keys.length) focusCell(wi, nk);
  };

  const allFilled = cellKeys.every(
    (k) => locked[k] || (vals[k] || "").length > 0
  );

  const handleCheck = () => {
    const total = cellKeys.length;
    const wrongKeys = cellKeys.filter(
      (k) =>
        !locked[k] &&
        (vals[k] || "").toUpperCase() !== cells[k].ch.toUpperCase()
    );
    if (wrongKeys.length === 0) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.crossword.solved") : t("exercise.gotIt"),
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
      setRevealed(true); // CW-05
      setFeedback({
        kind: "no",
        msg: t("exercise.crossword.revealShown"),
        correct: answerSummary,
      });
      setStreak(0);
    } else {
      const right = total - wrongKeys.length;
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.crossword.someLettersOffAttempt") : t("exercise.crossword.someLettersOffAttempts")).replace("{n}", String(remaining)),
        explain:
          right > 0
            ? t("exercise.crossword.lettersRight")
                .replace("{n}", String(right))
                .replace("{m}", String(total))
            : undefined,
      });
    }
  };

  const handleRetry = () => {
    // CW-03: everything currently correct locks green.
    const locks: Record<string, boolean> = {};
    cellKeys.forEach((k) => {
      if ((vals[k] || "").toUpperCase() === cells[k].ch.toUpperCase())
        locks[k] = true;
    });
    setLocked(locks);
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

  /** Cells of the active word get a soft highlight (clue ↔ grid sync). */
  const activeWordKeys = useMemo(() => {
    return new Set(activeWord?.keys ?? []);
  }, [activeWord]);

  /** Find the derived word matching a clue (by number + direction). */
  const wordForClue = (dir: "a" | "d", n: number) =>
    words.findIndex((w) => w.dir === dir && w.num === n);

  const renderClueGroup = (dir: "a" | "d", list: CrosswordClue[], label: string) => {
    if (list.length === 0) return null;
    return (
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            fontWeight: 700,
            color: "var(--ink-500)",
            fontSize: 12,
            marginBottom: 4,
          }}
        >
          {label}
        </div>
        {list.map((c) => {
          const wi = wordForClue(dir, c.n);
          const isActive = !feedback && wi >= 0 && wi === active.wi;
          return (
            <button
              key={`${dir}-${c.n}`}
              type="button"
              disabled={!!feedback || wi < 0}
              onClick={() => {
                if (wi < 0) return;
                // CW-02: clicking a clue selects its word (first open cell).
                const w = words[wi];
                let k = w.keys.findIndex((key) => !locked[key]);
                if (k < 0) k = 0;
                focusCell(wi, k);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: isActive ? "var(--green-50)" : "transparent",
                border: "none",
                borderRadius: 8,
                padding: "6px 9px",
                fontFamily: "var(--font-sans)",
                fontSize: 13.5,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? "var(--green-800)" : "var(--ink-500)",
                cursor: feedback || wi < 0 ? "default" : "pointer",
                transition: "background 120ms, color 120ms",
              }}
            >
              <b
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  marginRight: 6,
                }}
              >
                {c.n}.
              </b>
              {c.text}
            </button>
          );
        })}
      </div>
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
        title={title ?? t("exercise.crossword.title")}
        feedback={feedback}
        canCheck={allFilled}
        checkHint={t("exercise.crossword.fillEveryCell")}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            display: "flex",
            gap: 24,
            maxWidth: 560,
            margin: "0 auto",
            flexWrap: "wrap",
          }}
        >
          {/* CW-04: cell size flows from the --cw var on .cw-grid. */}
          <div className="cw-grid" role="group" aria-label={t("exercise.crossword.title")}>
            {Array.from({ length: height }, (_, r) => (
              <div key={r} style={{ display: "flex" }}>
                {Array.from({ length: width }, (_, c) => {
                  const key = `${r},${c}`;
                  const cell = cells[key];
                  if (!cell) return <div key={c} className="cw-block" />;
                  const v = vals[key] || "";
                  const isLocked = !!locked[key];
                  const isRight = v.toUpperCase() === cell.ch.toUpperCase();
                  const showReveal = revealed && !isRight && !isLocked;
                  const stateCls = feedback
                    ? isRight || isLocked
                      ? "ok"
                      : showReveal
                        ? "reveal"
                        : "no"
                    : isLocked
                      ? "ok"
                      : "";
                  const inWord = !feedback && activeWordKeys.has(key);
                  return (
                    <div key={c} className="cw-cell">
                      {cell.num !== undefined && (
                        <span className="num">{cell.num}</span>
                      )}
                      <input
                        ref={(el) => {
                          cellRefs.current[key] = el;
                        }}
                        className={stateCls || undefined}
                        value={showReveal ? cell.ch.toUpperCase() : v}
                        disabled={!!feedback || isLocked}
                        autoCapitalize="none"
                        autoComplete="off"
                        spellCheck={false}
                        aria-label={t("exercise.crossword.cellLabel")
                          .replace("{r}", String(r + 1))
                          .replace("{c}", String(c + 1))}
                        style={
                          inWord && key !== activeKey
                            ? { background: "var(--green-25)" }
                            : undefined
                        }
                        onFocus={() => {
                          // Sync the active word to where the caret landed,
                          // keeping the current direction at crossings.
                          const wis = cellWords[key] || [];
                          if (wis.length === 0) return;
                          const wi = wis.includes(active.wi)
                            ? active.wi
                            : wis[0];
                          const k = words[wi].keys.indexOf(key);
                          if (k >= 0) setActive({ wi, k });
                        }}
                        onClick={() => {
                          // CW-02: tapping the active crossing cell again
                          // toggles between the across/down word.
                          const wis = cellWords[key] || [];
                          if (
                            wis.length > 1 &&
                            wis.includes(active.wi) &&
                            activeKey === key
                          ) {
                            const other = wis.find((wi) => wi !== active.wi)!;
                            const k = words[other].keys.indexOf(key);
                            if (k >= 0) setActive({ wi: other, k });
                          }
                        }}
                        onChange={(e) => {
                          // CW-01: type → fill → hop to the next open cell.
                          const ch = e.target.value.slice(-1).toUpperCase();
                          if (!LETTER.test(ch)) return;
                          setVals((vv) => ({ ...vv, [key]: ch }));
                          advance(active.wi, active.k, 1);
                        }}
                        onKeyDown={(e) => {
                          const dir = words[active.wi]?.dir;
                          if (e.key === "Backspace") {
                            e.preventDefault();
                            if ((vals[key] || "").length > 0) {
                              setVals((vv) => ({ ...vv, [key]: "" }));
                            } else {
                              advance(active.wi, active.k, -1); // walk back
                            }
                          } else if (e.key === "ArrowRight" && dir === "a") {
                            e.preventDefault();
                            advance(active.wi, active.k, 1);
                          } else if (e.key === "ArrowLeft" && dir === "a") {
                            e.preventDefault();
                            advance(active.wi, active.k, -1);
                          } else if (e.key === "ArrowDown" && dir === "d") {
                            e.preventDefault();
                            advance(active.wi, active.k, 1);
                          } else if (e.key === "ArrowUp" && dir === "d") {
                            e.preventDefault();
                            advance(active.wi, active.k, -1);
                          }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 200, fontSize: 14 }}>
            <div className="gp-eyebrow" style={{ marginBottom: 10 }}>
              {t("exercise.clues")}
            </div>
            {renderClueGroup("a", clues.across, t("exercise.across"))}
            {renderClueGroup("d", clues.down, t("exercise.down"))}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
