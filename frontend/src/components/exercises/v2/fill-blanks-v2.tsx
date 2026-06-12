"use client";

/**
 * FillBlanksV2 — tap a word-bank pill into a blank slot in the sentence.
 *
 * Upgraded to the feedback-grammar handoff (ex-fill.jsx, design package
 * 2026-06): words fly from the bank into the slot (flyClone), empty slots
 * pulse while hovering the bank, a clicked empty slot is "armed" as the
 * explicit target, and check paints per-slot ok/no states. Retry keeps the
 * correct words in place when answers are known client-side.
 *
 * Reads two equivalent config shapes:
 *
 *   1. Template string with `{{blank}}` markers + parallel `blanks` array:
 *      { text: "The {{blank}} of an array is the {{blank}}.",
 *        blanks: ["length", "elements"], word_bank: [...] }
 *
 *   2. Explicit parts array (test/preview convenience):
 *      { parts: ["The ", null, " of an array is the ", null, " of its elements."],
 *        blanks: ["length", "count"], wordBank: [...] }
 *
 * Per-task HP + streak from lesson-shell. With `onGrade` (live mode) the
 * server strips `blanks`, so per-slot correctness is unknown: the result
 * boolean paints all slots ok/no and retry returns every word to the bank.
 */

import { useMemo, useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { flyClone } from "@/components/lesson/fb-motion";
import { useTranslation } from "@/lib/i18n/context";
import { MaybeMath } from "@/components/common/math-renderer";
import type { V2GradeFn, V2GradeResult } from "@/lib/exercises/v2-adapter";

export interface FillBlanksV2Props {
  /** Sentence template with `{{blank}}` markers — mutually exclusive with `parts`. */
  text?: string;
  /** Pre-parsed parts (strings + nulls for blank slots). */
  parts?: (string | null)[];
  /** Correct answer for each blank, in order. Required for local (preview)
   * grading; omitted live — the server strips it and grades via `onGrade`.
   * Slot count is derived from the template, not this array. */
  blanks?: string[];
  /** All available words to choose from (must include the correct ones). */
  wordBank: string[];
  /** Optional eyebrow line. */
  eyebrow?: string;
  /** Title override. */
  title?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  /** When provided, grading is deferred to the server (integrity model B);
   * local `blanks` is ignored. */
  onGrade?: V2GradeFn;
  onQuit?: () => void;
  onFinish?: (r: { correct: boolean; attemptsUsed: number; streak: number }) => void;
}

/** Visual state of one slot: '' | flash (just landed) | ok | no (post-check). */
type SlotMark = "" | "flash" | "ok" | "no";

/** Parse `"Hello {{blank}} world {{blank}}"` → `["Hello ", null, " world ", null, ""]`. */
function parseTemplate(text: string): (string | null)[] {
  const out: (string | null)[] = [];
  const re = /\{\{blank\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push(text.slice(last, m.index));
    out.push(null);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export function FillBlanksV2({
  text,
  parts: explicitParts,
  blanks,
  wordBank,
  eyebrow,
  title,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onGrade,
  onQuit,
  onFinish,
}: FillBlanksV2Props) {
  const parts = useMemo(
    () => explicitParts ?? (text ? parseTemplate(text) : []),
    [explicitParts, text]
  );

  // Live config strips `blanks`, so slot count must come from the template
  // (null markers in `parts`), not the stripped answer array.
  const blankCount = useMemo(
    () => parts.filter((p) => p === null).length,
    [parts]
  );

  // Per-slot correctness is only known client-side in preview/local mode.
  const answersKnown = !onGrade && !!blanks;

  const [slots, setSlots] = useState<(number | null)[]>(() =>
    Array.from({ length: blankCount }, () => null)
  );
  const [slotMarks, setSlotMarks] = useState<SlotMark[]>(() =>
    Array.from({ length: blankCount }, () => "" as SlotMark)
  );
  const [used, setUsed] = useState<number[]>([]);
  /** Explicitly targeted empty slot (clicked) — next placed word goes here. */
  const [armed, setArmed] = useState<number | null>(null);
  /** True while the pointer hovers the word bank — empty slots pulse. */
  const [hoverBank, setHoverBank] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const [checking, setChecking] = useState(false);
  /** FB-02: visually-hidden live region — announces place/remove. */
  const [announce, setAnnounce] = useState("");
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const pillRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const slotRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const setSlotMark = (si: number, mark: SlotMark) =>
    setSlotMarks((ms) => ms.map((m, i) => (i === si ? mark : m)));

  const place = (wi: number) => {
    if (feedback || checking || used.includes(wi)) return;
    const si =
      armed != null && slots[armed] === null
        ? armed
        : slots.findIndex((s) => s === null);
    if (si < 0) return;
    setArmed(null);
    setUsed((u) => [...u, wi]);
    // Commit happens in the done callback — flyClone always fires it (it is
    // a plain setTimeout internally), even if the tab is backgrounded or the
    // source/target element is missing.
    flyClone(pillRefs.current[wi] ?? null, slotRefs.current[si] ?? null, () => {
      setSlots((s) => s.map((x, i) => (i === si ? wi : x)));
      setSlotMark(si, "flash");
      setAnnounce(
        t("exercise.fillBlanks.announcePlaced")
          .replace("{word}", wordBank[wi])
          .replace("{n}", String(si + 1))
      );
      window.setTimeout(() => {
        setSlotMarks((ms) => ms.map((m, i) => (i === si && m === "flash" ? "" : m)));
      }, 450);
    });
  };

  const unplace = (si: number) => {
    if (feedback || checking) return;
    if (slots[si] === null) {
      // Empty slot: arm it as the explicit target (toggle).
      setArmed((a) => (a === si ? null : si));
      return;
    }
    const wi = slots[si]!;
    // Clear the slot immediately; the clone is captured synchronously before
    // React re-renders, so the word still flies back visually.
    setSlots((s) => s.map((x, i) => (i === si ? null : x)));
    setSlotMark(si, "");
    setAnnounce(
      t("exercise.fillBlanks.announceRemoved")
        .replace("{word}", wordBank[wi])
        .replace("{n}", String(si + 1))
    );
    flyClone(slotRefs.current[si] ?? null, pillRefs.current[wi] ?? null, () => {
      setUsed((u) => u.filter((x) => x !== wi));
    });
  };

  const applyResult = (res: V2GradeResult, perSlot?: SlotMark[]) => {
    // Per-slot states when answers are known; otherwise the boolean paints
    // every slot (all ok on pass / all no on fail).
    setSlotMarks(
      perSlot ??
        Array.from({ length: blankCount }, () => (res.correct ? "ok" : "no") as SlotMark)
    );

    if (res.correct) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.fillBlanks.sweet") : t("exercise.gotIt"),
        explain: res.explain,
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }

    const remaining = res.attemptsRemaining ?? attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);

    if (res.maxReached || remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.outOfAttempts"),
        correct: res.correctAnswer ?? blanks?.join(" · "),
        explain: res.explain,
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.attemptLeft") : t("exercise.attemptsLeft")).replace("{n}", String(remaining)),
      });
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    const got = slots.map((s) => (s == null ? "" : wordBank[s]));

    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ blanks: got });
        applyResult(res);
      } catch {
        setFeedback({ kind: "no", msg: t("exercise.submitFailed") });
      } finally {
        setChecking(false);
      }
      return;
    }

    // Preview / local grading — per-slot ok/no.
    const marks = got.map((w, i): SlotMark => (w === blanks?.[i] ? "ok" : "no"));
    applyResult(
      {
        correct: marks.every((m) => m === "ok"),
        correctAnswer: blanks?.join(" · "),
        attemptsRemaining: attemptsLeft - 1,
      },
      marks
    );
  };

  // Retry: when answers are known, correct slots stay put and only the wrong
  // words return to the bank. In live mode (boolean-only grading) everything
  // returns.
  const handleRetry = () => {
    setFeedback(null);
    setArmed(null);
    if (answersKnown) {
      const keep = slots.map((wi, i) =>
        wi !== null && wordBank[wi] === blanks![i] ? wi : null
      );
      setSlots(keep);
      setUsed(keep.filter((x): x is number => x !== null));
      setSlotMarks((ms) => ms.map((m, i): SlotMark => (keep[i] !== null && m === "ok" ? "ok" : "")));
    } else {
      setSlots(Array.from({ length: blankCount }, () => null));
      setUsed([]);
      setSlotMarks(Array.from({ length: blankCount }, () => "" as SlotMark));
    }
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      attemptsUsed: usedAttempts + (feedback?.kind === "ok" ? 1 : 0),
      streak,
    });
  };

  const allFilled = slots.every((s) => s !== null);
  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      {/* FB-02: visually-hidden aria-live region for place/remove. */}
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
        title={title ?? t("exercise.fillBlanks.title")}
        feedback={feedback}
        canCheck={allFilled}
        checking={checking}
        checkHint={t("exercise.fillBlanks.checkHint")}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div
          style={{
            fontSize: 19,
            lineHeight: 2.3,
            color: "var(--ink-900)",
            maxWidth: 560,
            margin: "8px auto 28px",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {parts.map((p, i) => {
            if (p !== null) return <MaybeMath key={i} text={p} />;
            const si = parts.slice(0, i).filter((x) => x === null).length;
            const wi = slots[si];
            const mark = slotMarks[si];
            const cls =
              "fb-slot" +
              (wi !== null ? " filled" : "") +
              (armed === si ? " armed" : "") +
              (wi === null && hoverBank && !feedback ? " pulse" : "") +
              (mark ? " " + mark : "");
            // FB-01: empty slots are visible dashed wells (base `.fb-slot`
            // CSS paints text transparent); armed = "here!" invite.
            const emptyStyle: React.CSSProperties | undefined =
              wi == null && !mark
                ? armed === si
                  ? {
                      background: "var(--green-50)",
                      color: "var(--green-700)",
                    }
                  : {
                      background: "var(--ink-50)",
                      color: "var(--ink-300)",
                      borderBottomStyle: "dashed",
                    }
                : undefined;
            return (
              <button
                key={i}
                ref={(el) => {
                  slotRefs.current[si] = el;
                }}
                className={cls}
                style={emptyStyle}
                onClick={() => unplace(si)}
                title={
                  wi !== null
                    ? t("exercise.fillBlanks.slotFilledHint")
                    : t("exercise.fillBlanks.slotEmptyHint")
                }
              >
                {wi == null
                  ? armed === si
                    ? t("exercise.fillBlanks.here")
                    : "· · ·"
                  : wordBank[wi]}
              </button>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "center",
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          {wordBank.map((w, i) => (
            <button
              key={i}
              ref={(el) => {
                pillRefs.current[i] = el;
              }}
              className={"gp-tile" + (used.includes(i) ? " locked" : "")}
              // FB-04: `.gp-tile.locked` (opacity .55) is the single opacity
              // source — the old inline 0.25 multiplied it to near-invisible.
              style={{
                padding: "10px 18px",
                fontSize: 15,
                borderRadius: 999,
              }}
              disabled={used.includes(i) || !!feedback || checking}
              onClick={() => place(i)}
              onPointerEnter={() => setHoverBank(true)}
              onPointerLeave={() => setHoverBank(false)}
            >
              {w}
            </button>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}
