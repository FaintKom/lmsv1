"use client";

/**
 * ReadingV2 — passage on the left, multiple-choice question(s) on the right.
 *
 * Adopted from q-language.jsx · ReadingExerciseV2, upgraded with the
 * feedback-grammar handoff (ex-lang2.jsx · ReadingV2):
 *   - RD-01 the passage|question grid (`.rd-grid`) stacks passage-above in
 *     narrow containers; the passage keeps its own bounded scroll.
 *   - RD-03 multi-question flow: pass `questions[]` and the shell shows
 *     "N / M" step progress; hearts reset per question. The legacy single
 *     `question`/`options`/`correct` props still work unchanged.
 *   - RD-04 eliminated wrong picks stay struck out + disabled across
 *     retries; miss copy nudges "Look back at the story". The correct
 *     option is only revealed when the question is over (no answer leak).
 */

import { useMemo, useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";
import { ContentRenderer } from "@/components/common/content-renderer";
import type { V2GradeFn } from "@/lib/exercises/v2-adapter";

export interface ReadingQuestion {
  question: string;
  options: string[];
  /** 0-based index of correct option. Required for local (preview) grading;
   *  omitted live — the server strips it and grades via `onCheck`. */
  correct?: number;
  /** Live mode: the value to submit per option (option id when the config
   *  uses dict options; the label otherwise). */
  optionIds?: string[];
  /** Hint shown alongside wrong-attempt feedback. */
  hint?: string;
  /** Adaptive choice (specs/019): several correct ⇒ checkboxes, answered as
   *  a set of option values. */
  multiSelect?: boolean;
  /** Free-text question (specs/019): renders an input; server-checked. */
  textMode?: boolean;
}

export interface ReadingV2Props {
  passage: string;
  /** Legacy single-question props — still supported. */
  question?: string;
  options?: string[];
  /** 0-based index of correct option. */
  correct?: number;
  /** Hint shown alongside wrong-attempt feedback. */
  hint?: string;
  /** RD-03: multi-question flow over the same passage (takes precedence). */
  questions?: ReadingQuestion[];
  /** Listening (specs/068): a recording takes the passage panel's place. The
   *  rest of the task — stepper, hearts, server checking — is unchanged. */
  audioUrl?: string;
  /** 0 or absent means no limit. Counted in the browser and reset by a
   *  reload: the file is a URL, so nothing here is enforceable. */
  maxPlays?: number;
  /** The recording's text, once the server has let the student have it. */
  transcript?: string;
  /** Non-persisting per-question check (POST /exercises/:id/check). */
  onCheck?: V2GradeFn;
  /** Records the submission when the last question is solved. */
  onGrade?: V2GradeFn;
  onAnswersChange?: (answers: Record<string, unknown>) => void;
  eyebrow?: string;
  title?: string;
  passageLabel?: string;
  maxAttemptsPerTask?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    attemptsUsed: number;
    streak: number;
  }) => void;
}

export function ReadingV2({
  passage,
  question,
  options,
  correct,
  hint,
  questions,
  audioUrl,
  maxPlays = 0,
  transcript,
  onCheck,
  onGrade,
  onAnswersChange,
  eyebrow,
  title,
  passageLabel,
  maxAttemptsPerTask = 3,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: ReadingV2Props) {
  const { t } = useTranslation();
  const qs = useMemo<ReadingQuestion[]>(() => {
    if (questions && questions.length > 0) return questions;
    return [
      {
        question: question ?? "",
        options: options ?? [],
        correct: correct ?? 0,
        hint,
      },
    ];
  }, [questions, question, options, correct, hint]);

  /** Listening: one listen runs from pressing play to the recording ending.
   *  Pausing to think, resuming and scrubbing all stay inside it — a time
   *  threshold looked simpler and charged a second listen to anyone who
   *  paused in the first half-second. */
  const [plays, setPlays] = useState(0);
  const [inListen, setInListen] = useState(false);
  const [broken, setBroken] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [qIdx, setQIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  // specs/019: multi-select picks and free-text input per question.
  const [picks, setPicks] = useState<number[]>([]);
  const [textInput, setTextInput] = useState("");
  /** RD-04: wrong picks eliminated for the current question (persist retries). */
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(maxAttemptsPerTask);
  /** Wrong attempts on the current question (drives "first try!" copy). */
  const [usedAttempts, setUsedAttempts] = useState(0);
  /** Attempts across the whole task (reported in onFinish). */
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [solved, setSolved] = useState(0);
  const [lostHeart, setLostHeart] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const q = qs[qIdx];
  const multi = qs.length > 1;
  const serverGraded = !!onCheck;
  const [checking, setChecking] = useState(false);
  /** Every answer given so far, keyed by question index — the payload shape
   *  `_grade_reading` expects (string for single/text, list for multi). */
  const answersRef = useRef<Record<string, string | string[]>>({});

  /** What to submit for option `i` of the current question: the option id
   *  when the config carried dict options, the label otherwise. */
  const valueFor = (i: number) => q.optionIds?.[i] ?? q.options[i] ?? "";

  const isTextQ = !!q?.textMode;
  const isMultiQ = !isTextQ && !!q?.multiSelect;
  const canCheck = isTextQ ? textInput.trim().length > 0 : isMultiQ ? picks.length > 0 : pick !== null;

  const playsLeft = maxPlays > 0 ? Math.max(0, maxPlays - plays) : 0;
  /** Spent, and not in the middle of the last one — the player is never taken
   *  away from a recording that is still going. */
  const playsSpent = maxPlays > 0 && plays >= maxPlays && !inListen;
  const handlePlay = () => {
    if (inListen) return;
    setInListen(true);
    setPlays((n) => n + 1);
  };

  const handleCheck = async () => {
    if (checking || !canCheck) return;
    setTotalAttempts((n) => n + 1);

    let isCorrect: boolean;
    if (serverGraded) {
      answersRef.current = {
        ...answersRef.current,
        [String(qIdx)]: isTextQ
          ? textInput
          : isMultiQ
            ? picks.map(valueFor)
            : valueFor(pick as number),
      };
      onAnswersChange?.({ answers: answersRef.current });
      setChecking(true);
      try {
        const res = await onCheck!({ answers: answersRef.current });
        const pi = res.perItem;
        isCorrect = !!(pi && !Array.isArray(pi) && pi[String(qIdx)]);
        // last question solved → record the attempt once
        if (isCorrect && onGrade && qIdx === qs.length - 1) {
          void onGrade({ answers: answersRef.current });
        }
      } catch {
        setFeedback({ kind: "no", msg: t("exercise.submitFailed") });
        return;
      } finally {
        setChecking(false);
      }
    } else if (isMultiQ || isTextQ) {
      // Local preview has no rules engine — server mode covers these; treat
      // as unknown-wrong so nothing false-passes.
      isCorrect = false;
    } else {
      isCorrect = pick === q.correct;
    }

    if (isCorrect) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? t("exercise.reading.right") : t("exercise.gotIt"),
      });
      setStreak((s) => s + 1);
      setSolved((n) => n + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    if (!isMultiQ && !isTextQ && pick !== null) {
      setEliminated((e) => (e.includes(pick) ? e : [...e, pick]));
    }
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: t("exercise.outOfAttempts"),
        // nothing to reveal in server mode — the config has no answer key
        correct: q.correct != null ? q.options[q.correct] : undefined,
        explain: q.hint,
      });
      setStreak(0);
    } else {
      // RD-04: send the child back to the text, not to guessing.
      setFeedback({
        kind: "no",
        msg: (remaining === 1
          ? t(audioUrl ? "exercise.listening.listenAgainAttempt" : "exercise.reading.lookBackAttempt")
          : t(audioUrl ? "exercise.listening.listenAgainAttempts" : "exercise.reading.lookBackAttempts")
        ).replace("{n}", String(remaining)),
        explain: q.hint,
      });
    }
  };

  const handleRetry = () => {
    setPick(null);
    setFeedback(null);
    // multi/text keep their state so the student can adjust, not restart
  };

  const handleContinue = () => {
    if (qIdx + 1 < qs.length) {
      // RD-03: next question — fresh hearts, fresh eliminations.
      setQIdx((i) => i + 1);
      setPick(null);
      setPicks([]);
      setTextInput("");
      setEliminated([]);
      setFeedback(null);
      setAttemptsLeft(maxAttemptsPerTask);
      setUsedAttempts(0);
      return;
    }
    // `solved` already includes the current question when it ended "ok".
    onFinish?.({
      correct: solved === qs.length,
      attemptsUsed: totalAttempts,
      streak,
    });
  };

  const canRetry = feedback?.kind === "no" && attemptsLeft > 0;
  /** Answer reveal only when the question is over (no leak on retry). */
  const taskOver = !!feedback && (feedback.kind === "ok" || attemptsLeft <= 0);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft}
        maxHearts={maxAttemptsPerTask}
        streak={streak}
        lostHeart={lostHeart}
        step={multi ? qIdx + 1 : undefined}
        totalSteps={multi ? qs.length : undefined}
        eyebrow={eyebrow}
        title={title ?? t(audioUrl ? "exercise.listening.title" : "exercise.reading.title")}
        feedback={feedback}
        canCheck={canCheck}
        onCheck={handleCheck}
        onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined}
        onQuit={onQuit}
      >
        {/* RD-01: .rd-grid stacks passage-above inside narrow panes. */}
        <div className="rd-grid">
          <div
            style={{
              background: "var(--color-surface)",
              border: "2px solid var(--color-border)",
              borderRadius: 14,
              padding: "18px 20px",
              fontSize: 14.5,
              lineHeight: 1.6,
              color: "var(--color-text)",
              fontFamily: "var(--font-sans)",
              maxHeight: 340,
              overflowY: "auto",
            }}
          >
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>
              {passageLabel ?? t(audioUrl ? "exercise.listening.recording" : "exercise.passage")}
            </div>
            {/* specs/019 US3: passages may carry inline images as HTML —
                rendered through the same ContentRenderer lesson HTML uses.
                specs/068: a recording stands in the same panel instead. */}
            {audioUrl ? (
              <>
                {broken ? (
                  <p style={{ margin: 0, fontSize: 13.5 }}>
                    {t("exercise.listening.unavailable")}
                  </p>
                ) : playsSpent ? (
                  <p style={{ margin: 0, fontSize: 13.5 }}>
                    {t("exercise.listening.noPlaysLeft")}
                  </p>
                ) : (
                  /* Native controls: keyboard and screen readers get them for
                     free, and there is no player here worth writing. */
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio
                    ref={audioRef}
                    src={audioUrl}
                    controls
                    preload="metadata"
                    style={{ width: "100%" }}
                    onPlay={handlePlay}
                    onEnded={() => setInListen(false)}
                    onError={() => setBroken(true)}
                  />
                )}
                {maxPlays > 0 && !broken && !playsSpent && (
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {t("exercise.listening.playsLeft").replace("{n}", String(playsLeft))}
                  </p>
                )}
                {transcript && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: "1px solid var(--color-border)",
                    }}
                  >
                    <div className="gp-eyebrow" style={{ marginBottom: 6 }}>
                      {t("exercise.listening.transcript")}
                    </div>
                    <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{transcript}</p>
                  </div>
                )}
              </>
            ) : /<img|<p|<br|<h\d/i.test(passage) ? (
              <div className="prose prose-sm max-w-none">
                <ContentRenderer body={passage} format="html" />
              </div>
            ) : (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{passage}</p>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              {q.question}
            </div>
            {isTextQ ? (
              /* specs/019: free-text reading question, server-checked */
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={!!feedback}
                placeholder={t("exercise.quiz.textAnswerPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCheck && !feedback) handleCheck();
                }}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  fontSize: 14,
                  borderRadius: 12,
                  border: "2px solid var(--color-border-strong)",
                  background: "var(--color-surface)",
                  color: "var(--color-text)",
                }}
              />
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {isMultiQ && (
                <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-muted)" }}>
                  {t("exercise.quiz.pickAllThatApply")}
                </p>
              )}
              {q.options.map((opt, i) => {
                const isElim = eliminated.includes(i);
                const chosen = isMultiQ ? picks.includes(i) : pick === i;
                let state = "";
                if (taskOver) {
                  if (!isMultiQ && i === q.correct) state = "correct";
                  else if (chosen && feedback?.kind === "no") state = "wrong";
                  else if (isElim) state = "eliminated";
                  else state = "locked";
                } else if (feedback) {
                  if (chosen) state = "wrong";
                  else if (isElim) state = "eliminated";
                  else state = "locked";
                } else if (isElim) {
                  state = "eliminated"; // RD-04
                } else if (chosen) {
                  state = "selected";
                }
                return (
                  <button
                    key={i}
                    className={"gp-tile " + state}
                    style={{
                      padding: "12px 16px",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      fontSize: 14,
                    }}
                    disabled={!!feedback || isElim}
                    aria-pressed={chosen}
                    onClick={() =>
                      isMultiQ
                        ? setPicks((p) =>
                            p.includes(i) ? p.filter((x) => x !== i) : [...p, i]
                          )
                        : setPick(i)
                    }
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            )}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
