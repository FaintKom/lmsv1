"use client";

/**
 * WhiteboardV2 — sketch on a virtual whiteboard, submit for teacher review.
 *
 * Wraps Excalidraw (MIT) for the canvas. Student draws freely; pressing
 * Submit captures both the scene JSON (rehydratable) and a PNG snapshot
 * (for inline display in the teacher's grading queue) and hands them
 * to caller's `onSubmit` async callback.
 *
 * No HP — teacher-review submissions don't auto-grade. Streak +1 on
 * submit success. Default UI uses the project design system
 * (LessonShell chrome, `gp-*` classes).
 *
 * Excalidraw is dynamic()-imported to keep the editor out of the
 * initial bundle.
 */

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

// Excalidraw is heavy (>1MB gzip) — lazy load on client only.
const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw),
  { ssr: false, loading: () => <WhiteboardLoading /> }
);

function WhiteboardLoading() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        height: 480,
        display: "grid",
        placeItems: "center",
        background: "var(--paper-2)",
        border: "2px solid var(--ink-100)",
        borderRadius: 14,
        color: "var(--ink-500)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
      }}
    >
      {t("exercise.loadingWhiteboard")}
    </div>
  );
}

// Excalidraw types are deep + the bundle is loaded lazily, so we keep
// the imperative API loosely typed. Methodist + teacher data layer
// validates the JSON shape at the persistence boundary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawAPI = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawScene = any;

export interface WhiteboardSubmission {
  /** Excalidraw scene JSON — rehydratable into the editor. */
  scene: ExcalidrawScene;
  /** PNG data URL snapshot for teacher inline preview. */
  preview: string;
}

export interface WhiteboardSubmitResult {
  ok: boolean;
  msg: string;
  explain?: string;
}

export interface WhiteboardV2Props {
  /** Excalidraw scene to hydrate on mount. */
  initialData?: ExcalidrawScene;
  /** Async submit handler. Defaults to a 300ms ok-stub. */
  onSubmit?: (s: WhiteboardSubmission) => Promise<WhiteboardSubmitResult>;
  eyebrow?: string;
  title?: string;
  /** Prompt copy shown above the canvas. */
  prompt?: string;
  /** Whiteboard height in px. Default 480. */
  height?: number;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    submitted: boolean;
    streak: number;
  }) => void;
}

export function WhiteboardV2({
  initialData,
  onSubmit,
  eyebrow,
  title,
  prompt,
  height = 480,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: WhiteboardV2Props) {
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const apiRef = useRef<ExcalidrawAPI | null>(null);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();
  const defaultSubmit = async (): Promise<WhiteboardSubmitResult> => {
    await new Promise((r) => setTimeout(r, 300));
    return {
      ok: true,
      msg: t("exercise.submittedAwaitingReview"),
      explain: t("exercise.teacherFeedback48h"),
    };
  };

  const handleSubmit = async () => {
    if (!apiRef.current || submitting) return;
    setSubmitting(true);
    try {
      const elements = apiRef.current.getSceneElements();
      const appState = apiRef.current.getAppState();
      const files = apiRef.current.getFiles();

      // exportToBlob is a separate import from @excalidraw/excalidraw.
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob: Blob = await exportToBlob({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          exportWithDarkMode: false,
        },
        files,
        mimeType: "image/png",
      });

      const preview: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const scene: ExcalidrawScene = { elements, appState, files };
      const submitter = onSubmit ?? defaultSubmit;
      const r = await submitter({ scene, preview });
      setFeedback({
        kind: r.ok ? "ok" : "no",
        msg: r.msg,
        explain: r.explain,
      });
      if (r.ok) {
        setStreak((s) => s + 1);
        fire();
      }
    } catch (err) {
      setFeedback({
        kind: "no",
        msg: t("exercise.couldNotSubmit"),
        explain: String(err),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      submitted: !!feedback,
      streak,
    });
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        streak={streak}
        eyebrow={eyebrow}
        title={title ?? t("exercise.whiteboard.title")}
        feedback={feedback}
        canCheck={!submitting && !feedback}
        onCheck={handleSubmit}
        checkLabel={submitting ? t("exercise.submitting") : t("exercise.submitForReview")}
        showSkip={false}
        onContinue={handleContinue}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          {prompt && (
            <div
              style={{
                marginBottom: 12,
                padding: "12px 14px",
                background: "var(--sun-50)",
                border: "2px solid var(--sun-300)",
                borderRadius: 12,
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                color: "var(--ink-700)",
                lineHeight: 1.5,
              }}
            >
              {prompt}
            </div>
          )}
          <div
            style={{
              height,
              borderRadius: 14,
              overflow: "hidden",
              border: "2px solid var(--ink-100)",
              background: "var(--paper-2)",
            }}
          >
            <Excalidraw
              initialData={initialData}
              excalidrawAPI={(api: ExcalidrawAPI) => {
                apiRef.current = api;
              }}
            />
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "var(--ink-400)",
              fontFamily: "var(--font-mono)",
              textAlign: "center",
            }}
          >
            {t("exercise.draftWriteDiagram")}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
