"use client";

/**
 * ScormPackageV2 — embedded SCORM player visual shell (mock advance).
 *
 * Adopted from q-other.jsx · SCORMPackageExerciseV2. The component
 * renders a SCORM-player-style frame: chrome bar with progress %, slide
 * card with title + next button, and a final completion screen.
 *
 * For now slides advance via Next button (mock); real SCORM ingestion
 * stays in the parent lesson player (it injects `onSlideComplete` to
 * report cmi.progress_measure / cmi.completion_status from scorm-again).
 *
 * No HP — completion-tracked content. Streak +1 on module complete.
 */

import { useState } from "react";
import { Check } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface ScormSlide {
  title: string;
}

export interface ScormPackageV2Props {
  slides: ScormSlide[];
  /** Score reported back when module completes. */
  finalScore?: number;
  /** Out-of value for the score. Default 100. */
  scoreMax?: number;
  /** Filename shown in the chrome. */
  packageName?: string;
  /** Eyebrow + version string. */
  version?: string;
  eyebrow?: string;
  title?: string;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    score: number;
    streak: number;
  }) => void;
}

const SLIDE_BG = [
  "var(--green-500)",
  "var(--sun-400)",
  "var(--coral-500)",
  "var(--green-700)",
];

export function ScormPackageV2({
  slides,
  finalScore = 92,
  scoreMax = 100,
  packageName = "module.zip",
  version,
  eyebrow,
  title,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: ScormPackageV2Props) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  // SC-01: progress reflects the FURTHEST slide reached, not the current one,
  // so stepping Back doesn't make the bar appear to regress.
  const [maxSeen, setMaxSeen] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [streak, setStreak] = useState(initialStreak);
  const { fire, layer } = useConfetti();

  const progress = done
    ? 100
    : Math.round(((maxSeen + 1) / Math.max(1, slides.length)) * 100);

  const goBack = () => {
    if (feedback || idx === 0) return;
    setIdx(idx - 1);
  };

  const advance = () => {
    if (feedback) return;
    if (idx >= slides.length - 1) {
      setDone(true);
      setFeedback({
        kind: "ok",
        msg: t("exercise.scorm.moduleComplete").replace("{score}", String(finalScore)).replace("{max}", String(scoreMax)),
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const next = idx + 1;
    setIdx(next);
    setMaxSeen((m) => Math.max(m, next));
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      score: feedback?.kind === "ok" ? finalScore : 0,
      streak,
    });
  };

  const slide = slides[idx];

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hideStats
        eyebrow={eyebrow ?? version}
        title={title ?? t("exercise.scorm.title")}
        feedback={feedback}
        canCheck={false}
        onCheck={() => {}}
        showSkip={false}
        onContinue={handleContinue}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div
            style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {/* chrome */}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--ink-100)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--ink-50)",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--ink-500)",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: "var(--green-500)",
                }}
              />
              SCORM PLAYER · ENGAGED · {progress}%
              <span style={{ marginLeft: "auto" }}>{packageName}</span>
            </div>
            {/* slide */}
            <div
              style={{
                padding: 28,
                minHeight: 280,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                gap: 16,
                background: "#fafbf6",
                position: "relative",
              }}
            >
              {!done && slide ? (
                <>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 16,
                      background: SLIDE_BG[idx % SLIDE_BG.length],
                      boxShadow: "0 6px 0 0 rgba(0,0,0,0.15)",
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 32,
                    }}
                  >
                    {idx + 1}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="gp-eyebrow">
                      {t("exercise.scorm.slideOf").replace("{n}", String(idx + 1)).replace("{total}", String(slides.length))}
                    </div>
                    <h3 style={{ margin: "6px 0 0", fontSize: 19, fontWeight: 800 }}>
                      {slide.title}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink-500)",
                        marginTop: 8,
                        maxWidth: 320,
                      }}
                    >
                      {t("exercise.scorm.slideContentDesc")}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      type="button"
                      onClick={goBack}
                      disabled={idx === 0}
                      className="gp-btn ghost"
                      style={{ padding: "10px 18px", fontSize: 13 }}
                    >
                      {t("exercise.scorm.back")}
                    </button>
                    <button
                      type="button"
                      onClick={advance}
                      className="gp-btn"
                      style={{ padding: "10px 24px", fontSize: 13 }}
                    >
                      {t("exercise.scorm.nextSlide")}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      background: "var(--green-600)",
                      display: "grid",
                      placeItems: "center",
                      color: "#fff",
                    }}
                    className="gp-pop"
                  >
                    <Check size={40} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontWeight: 800,
                        color: "var(--green-800)",
                      }}
                    >
                      {t("exercise.scorm.moduleCompleteHeader")}
                    </h3>
                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--ink-500)",
                        marginTop: 6,
                      }}
                    >
                      {t("exercise.scorm.scoreReported").replace("{score}", String(finalScore)).replace("{max}", String(scoreMax))}
                    </p>
                  </div>
                </>
              )}
            </div>
            {/* progress strip */}
            <div
              style={{
                height: 6,
                background: "var(--ink-100)",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: `${progress}%`,
                  background: "var(--green-500)",
                  transition: "width 200ms",
                }}
              />
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
