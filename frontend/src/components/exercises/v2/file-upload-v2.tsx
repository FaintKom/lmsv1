"use client";

/**
 * FileUploadV2 — drag/drop or click-to-browse single-file submission.
 *
 * Adopted from q-other.jsx · FileUploadExerciseV2. Click or drop to
 * pick a file; preview shows extension chip, name, size. Submit
 * delegated to caller's `onSubmit(file)` async callback (real upload
 * happens in a parent shell).
 *
 * No HP — teacher-review submissions don't auto-grade. Streak +1 on
 * submit success.
 */

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import {
  LessonShell,
  useConfetti,
  type LessonFeedback,
} from "@/components/lesson/lesson-shell";
import { useTranslation } from "@/lib/i18n/context";

export interface FileUploadResult {
  ok: boolean;
  msg: string;
  explain?: string;
}

/** FU-04: human KB/MB formatting. */
function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** FU-01: does the file match the accept list (extensions or mime globs)? */
function acceptMatches(file: File, accept: string): boolean {
  const rules = accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return rules.some((r) => {
    if (r.startsWith(".")) return name.endsWith(r);
    if (r.endsWith("/*")) return mime.startsWith(r.slice(0, -1));
    return mime === r;
  });
}

export interface FileUploadV2Props {
  /** Accept attribute for <input type=file>. */
  accept?: string;
  /** Hint shown under the drop zone, e.g. "max 25 MB". */
  maxLabel?: string;
  /** Async submit handler. Defaults to a 300ms ok-stub. */
  onSubmit?: (file: File) => Promise<FileUploadResult>;
  eyebrow?: string;
  title?: string;
  /** Default drop-zone copy. */
  dropLabel?: string;
  streak?: number;
  onQuit?: () => void;
  onFinish?: (r: {
    correct: boolean;
    file?: { name: string; size: number };
    streak: number;
  }) => void;
}

export function FileUploadV2({
  accept = ".pdf,.docx,.txt",
  maxLabel,
  onSubmit,
  eyebrow,
  title,
  dropLabel,
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: FileUploadV2Props) {
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [hover, setHover] = useState(false);
  const [reject, setReject] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { fire, layer } = useConfetti();
  const { t } = useTranslation();
  const dropLabelText = dropLabel ?? t("exercise.fileUpload.dropLabel");
  const maxLabelText = maxLabel ?? t("exercise.fileUpload.maxLabel");

  /** FU-01: accept the file only if it matches; else a friendly sun-toned nudge. */
  const pickFile = (f: File | null | undefined) => {
    if (!f) return;
    if (!acceptMatches(f, accept)) {
      setReject(t("exercise.fileUpload.wrongType").replace("{accept}", accept));
      return;
    }
    setReject(null);
    setFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHover(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const defaultSubmit = async (): Promise<FileUploadResult> => ({
    ok: true,
    msg: t("exercise.uploadedAwaitingReview"),
    explain: t("exercise.teacherFeedback48h"),
  });

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      const submitter = onSubmit ?? defaultSubmit;
      const r = await submitter(file);
      setFeedback({
        // FU-04: a failed upload is a system hiccup, not the child's fault —
        // neutral "meh" tone; the file stays selected for a retry.
        kind: r.ok ? "ok" : "meh",
        msg: r.msg,
        explain: r.explain,
      });
      if (r.ok) {
        setStreak((s) => s + 1);
        fire();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = () => {
    onFinish?.({
      correct: feedback?.kind === "ok",
      file: file ? { name: file.name, size: file.size } : undefined,
      streak,
    });
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        streak={streak}
        eyebrow={eyebrow}
        title={title ?? t("exercise.fileUpload.title")}
        feedback={feedback}
        canCheck={!!file && !submitting}
        onCheck={handleSubmit}
        checkLabel={submitting ? t("exercise.uploading") : t("exercise.submit")}
        showSkip={false}
        onContinue={handleContinue}
        onRetry={feedback?.kind === "meh" ? () => setFeedback(null) : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* FU-05: keyboard-accessible drop zone (button semantics). */}
          <div
            role="button"
            tabIndex={feedback ? -1 : 0}
            aria-label={dropLabelText}
            onClick={() => !feedback && inputRef.current?.click()}
            onKeyDown={(e) => {
              if (!feedback && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setHover(true);
            }}
            onDragLeave={() => setHover(false)}
            onDrop={(e) => !feedback && onDrop(e)}
            style={{
              padding: "44px 24px",
              background: hover ? "var(--green-50)" : "var(--paper-2)",
              border: `3px dashed ${hover ? "var(--green-500)" : "var(--ink-200)"}`,
              borderRadius: 18,
              textAlign: "center",
              cursor: feedback ? "default" : "pointer",
              transition: "all 150ms",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                background: "var(--green-50)",
                borderRadius: "50%",
                margin: "0 auto 14px",
                display: "grid",
                placeItems: "center",
                color: "var(--green-700)",
              }}
            >
              <Upload size={28} />
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 17,
                color: "var(--ink-900)",
              }}
            >
              {file ? file.name : dropLabelText}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-400)",
                marginTop: 6,
              }}
            >
              {file
                ? `${formatSize(file.size)} · ${t("exercise.fileUpload.ready")}`
                : maxLabelText}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              style={{ display: "none" }}
              onChange={(e) => pickFile(e.target.files?.[0])}
            />
          </div>
          {reject && (
            <div
              role="status"
              style={{
                marginTop: 12,
                padding: "10px 14px",
                background: "var(--sun-50)",
                border: "1px solid var(--sun-300)",
                borderRadius: 12,
                color: "var(--sun-700)",
                fontSize: 13,
                fontWeight: 600,
                textAlign: "center",
              }}
            >
              {reject}
            </div>
          )}
          {file && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: "var(--green-50)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "2px solid var(--green-200)",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 8,
                  background: "var(--green-600)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 800,
                  fontSize: 11,
                }}
              >
                {file.name.split(".").pop()?.toUpperCase().slice(0, 3) ?? "FILE"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--ink-900)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {file.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-500)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {formatSize(file.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!feedback) setFile(null);
                }}
                disabled={!!feedback}
                aria-label={t("exercise.removeFile")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: feedback ? "default" : "pointer",
                  color: "var(--ink-500)",
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}
