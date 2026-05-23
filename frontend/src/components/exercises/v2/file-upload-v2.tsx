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

export interface FileUploadResult {
  ok: boolean;
  msg: string;
  explain?: string;
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

const defaultStubSubmit = async (): Promise<FileUploadResult> => ({
  ok: true,
  msg: "Uploaded — awaiting review.",
  explain: "Your teacher will leave feedback within 48h.",
});

export function FileUploadV2({
  accept = ".pdf,.docx,.txt",
  maxLabel = "or click to browse · max 25 MB",
  onSubmit = defaultStubSubmit,
  eyebrow,
  title = "Upload your file",
  dropLabel = "Drop a PDF, DOCX, or TXT here",
  streak: initialStreak = 0,
  onQuit,
  onFinish,
}: FileUploadV2Props) {
  const [file, setFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [hover, setHover] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [streak, setStreak] = useState(initialStreak);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { fire, layer } = useConfetti();

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setHover(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setSubmitting(true);
    try {
      const r = await onSubmit(file);
      setFeedback({
        kind: r.ok ? "ok" : "no",
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
        title={title}
        feedback={feedback}
        canCheck={!!file && !submitting}
        onCheck={handleSubmit}
        checkLabel={submitting ? "Uploading…" : "Submit"}
        showSkip={false}
        onContinue={handleContinue}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div
            onClick={() => !feedback && inputRef.current?.click()}
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
              {file ? file.name : dropLabel}
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--ink-400)",
                marginTop: 6,
              }}
            >
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · ready`
                : maxLabel}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={accept}
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
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
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!feedback) setFile(null);
                }}
                disabled={!!feedback}
                aria-label="Remove file"
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
