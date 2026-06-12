"use client";

/**
 * InequalityGraphV2 — graph y ⋚ mx+b by adjusting line + operator + shading.
 *
 * Adopted from q-math-templates.jsx · InequalityGraphExerciseV2.
 * Student picks m, b, op (>, ≥, <, ≤) and which side to shade.
 * Dashed line for strict inequalities, solid for non-strict.
 *
 * Exercise-mechanics handoff (ex-graphs.jsx · InequalityGraphV2):
 * - GX-01 viewBox-only SVG (`.gx-svg`) inside `.gx-layout`.
 * - GX-03 Check unlocks only after the child shades a side.
 * - GX-04/IG-04 wrong-attempt hint counts the right settings and names
 *         the off ones (slope/intercept/symbol/shaded side) — no values.
 * - IG-03 `signed()` formatter — reveal never renders "2x + -3".
 *
 * Per-task HP + streak; retry resets controls.
 */

import { useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { GridAxes } from "@/components/exercises/v2/_grid-axes";
import { useTranslation } from "@/lib/i18n/context";

export type InequalityOp = ">" | ">=" | "<" | "<=";
export type ShadeSide = "above" | "below";

export interface InequalityGraphV2Props {
  target: { m: number; b: number; op: InequalityOp };
  range?: number;
  eyebrow?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

interface SliderProps {
  label: string;
  v: number;
  setV: (n: number) => void;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
}

function SliderCtrl({ label, v, setV, min, max, step, disabled }: SliderProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="gp-eyebrow">{label}</span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            color: "var(--green-700)",
            fontSize: 13,
          }}
        >
          {v}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={v}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => setV(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--green-600)" }}
      />
    </div>
  );
}

const SIZE = 380;
const PAD = 36;
const OPS: InequalityOp[] = [">", ">=", "<", "<="];
const opSym = (o: InequalityOp) => (o === ">=" ? "≥" : o === "<=" ? "≤" : o);

/** IG-03: render "+ 3" / "− 3", never "+ -3". */
const signed = (n: number) => (n >= 0 ? `+ ${n}` : `− ${Math.abs(n)}`);

export function InequalityGraphV2({
  target,
  range = 6,
  eyebrow,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: InequalityGraphV2Props) {
  const scale = (SIZE - PAD * 2) / (range * 2);
  const toX = (vv: number) => PAD + (vv + range) * scale;
  const toY = (vv: number) => PAD + (range - vv) * scale;

  const [m, setM] = useState(0);
  const [b, setB] = useState(0);
  const [op, setOp] = useState<InequalityOp>(">=");
  const [side, setSide] = useState<ShadeSide | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();

  const linePath =`M ${toX(-range)} ${toY(m * -range + b)} L ${toX(range)} ${toY(m * range + b)}`;
  const dashed = op === ">" || op === "<";
  const shading =
    side === "above"
      ? `M ${toX(-range)} ${toY(m * -range + b)} L ${toX(range)} ${toY(m * range + b)} L ${toX(range)} ${toY(range)} L ${toX(-range)} ${toY(range)} Z`
      : side === "below"
        ? `M ${toX(-range)} ${toY(m * -range + b)} L ${toX(range)} ${toY(m * range + b)} L ${toX(range)} ${toY(-range)} L ${toX(-range)} ${toY(-range)} Z`
        : "";

  const correctSide: ShadeSide = target.op.includes(">") ? "above" : "below";

  const handleCheck = () => {
    const oks = [
      m === target.m,
      b === target.b,
      op === target.op,
      side === correctSide,
    ];
    if (oks.every(Boolean)) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.inequalityGraph.regionMatches") : t("exercise.gotIt"),
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
      // IG-03: proper sign formatting on reveal.
      setFeedback({
        kind: "no",
        msg: t("exercise.inequalityGraph.notQuite"),
        correct: `y ${opSym(target.op)} ${target.m}x ${signed(target.b)}`,
      });
      setStreak(0);
    } else {
      // GX-04/IG-04: count right settings, name the off ones.
      const names = [
        t("exercise.inequalityGraph.nameSlope"),
        t("exercise.inequalityGraph.nameIntercept"),
        t("exercise.inequalityGraph.nameSymbol"),
        t("exercise.inequalityGraph.nameSide"),
      ];
      const offNames = names.filter((_, i) => !oks[i]);
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? t("exercise.inequalityGraph.notQuiteAttempt") : t("exercise.inequalityGraph.notQuiteAttempts")).replace("{n}", String(remaining)),
        explain: t("exercise.inequalityGraph.settingsRight")
          .replace("{ok}", String(4 - offNames.length))
          .replace("{names}", offNames.join(", ")),
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
        title={
          <>
            {t("exercise.inequalityGraph.graph")}{" "}
            <span
              className="gp-mark"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              y {opSym(target.op)} {target.m}x {signed(target.b)}
            </span>
          </>
        }
        feedback={feedback}
        canCheck={!!side && !feedback}
        checkHint={t("exercise.inequalityGraph.checkHint")}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="gx-svg">
            <GridAxes range={range} size={SIZE} pad={PAD} />
            {side && (
              <path d={shading} fill="var(--green-300)" opacity="0.35" />
            )}
            <path
              d={linePath}
              stroke="var(--green-700)"
              strokeWidth="2.5"
              strokeDasharray={dashed ? "5 4" : "0"}
              fill="none"
            />
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SliderCtrl
              label="slope · m"
              v={m}
              setV={setM}
              min={-3}
              max={3}
              step={1}
              disabled={!!feedback}
            />
            <SliderCtrl
              label="intercept · b"
              v={b}
              setV={setB}
              min={-5}
              max={5}
              step={1}
              disabled={!!feedback}
            />
            <div>
              <span
                className="gp-eyebrow"
                style={{ marginBottom: 4, display: "block" }}
              >
                operator
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 4,
                }}
              >
                {OPS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => !feedback && setOp(o)}
                    aria-pressed={op === o}
                    style={{
                      padding: "8px 0",
                      borderRadius: 8,
                      minHeight: 36,
                      background: op === o ? "var(--ink-900)" : "var(--paper-2)",
                      color: op === o ? "#fff" : "var(--ink-700)",
                      border:
                        "2px solid " +
                        (op === o ? "var(--ink-900)" : "var(--ink-200)"),
                      cursor: feedback ? "default" : "pointer",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 14,
                    }}
                  >
                    {opSym(o)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span
                className="gp-eyebrow"
                style={{ marginBottom: 4, display: "block" }}
              >
                shade which side
              </span>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 4,
                }}
              >
                {(["above", "below"] as ShadeSide[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => !feedback && setSide(s)}
                    aria-pressed={side === s}
                    style={{
                      padding: "10px 0",
                      borderRadius: 8,
                      minHeight: 40,
                      background:
                        side === s ? "var(--green-600)" : "var(--paper-2)",
                      color: side === s ? "#fff" : "var(--ink-700)",
                      border:
                        "2px solid " +
                        (side === s ? "var(--green-700)" : "var(--ink-200)"),
                      cursor: feedback ? "default" : "pointer",
                      fontFamily: "var(--font-sans)",
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
