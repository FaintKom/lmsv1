"use client";

import { useEffect, useState } from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { toast } from "sonner";
import { Circle, Square } from "lucide-react";

import { startLessonRecording, uploadRecording, type LessonRecorder } from "@/lib/live/recorder";
import { useTranslation } from "@/lib/i18n/context";

/**
 * Says the lesson is being recorded, to everybody, for as long as it is.
 *
 * Shown to pupils as well as the teacher, and read from the server on mount
 * rather than only from the start event: somebody joining mid-recording has to
 * find out too, and an event that fired before they arrived cannot tell them
 * (FR-020). Being recorded without being told is the situation this indicator
 * exists to prevent.
 */
export function RecordingIndicator({
  lessonId,
  canRecord,
  liveRecordingId,
}: {
  lessonId: string;
  /** Whether to offer the control. The server refuses regardless. */
  canRecord: boolean;
  /**
   * The server's current word on whether a recording is running, carried in
   * over the lesson channel. The mount-time fetch below covers somebody who
   * arrives late; this covers somebody already here when it starts — who used
   * to learn nothing at all (T110).
   */
  liveRecordingId?: string | null;
}) {
  const { t } = useTranslation();
  const { localParticipant } = useLocalParticipant();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [handle, setHandle] = useState<LessonRecorder | null>(null);
  const [busy, setBusy] = useState(false);

  // The channel outranks the mount-time snapshot, but never this browser's
  // own in-flight recording: the person who pressed the button must not have
  // their handle yanked by their own start event arriving back.
  useEffect(() => {
    if (liveRecordingId !== undefined && !handle) setRecordingId(liveRecordingId);
  }, [liveRecordingId, handle]);

  // Ask on mount, so a late arrival sees the indicator straight away.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/live-lessons/${lessonId}/media/recording`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d?.recording) setRecordingId(d.recording_id);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  async function begin() {
    setBusy(true);
    try {
      const res = await fetch(`/api/v1/live-lessons/${lessonId}/media/recording`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error(String(res.status));
      const started = await res.json();

      // Local tracks only, and the recorder enforces that rather than trusting
      // this caller to hand it the right thing.
      setHandle(await startLessonRecording(localParticipant));
      setRecordingId(started.recording_id);
    } catch {
      toast.error(t("live.media.recordFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!handle || !recordingId) return;
    setBusy(true);
    try {
      const recording = await handle.stop();
      await fetch(`/api/v1/live-lessons/${lessonId}/media/recording/stop`, {
        method: "POST",
        credentials: "include",
      });
      const saved = recordingId;
      await uploadRecording(saved, recording);
      // Handed over straight away. Otherwise the teacher has a file they can
      // only reach by knowing its id, and there is no page that lists them yet.
      toast.success(t("live.media.recordSaved"), {
        action: {
          label: t("live.media.recordOpen"),
          onClick: () => window.open(`/api/v1/recordings/${saved}/file`, "_blank"),
        },
        duration: 15000,
      });
    } catch {
      toast.error(t("live.media.recordFailed"));
    } finally {
      setHandle(null);
      setRecordingId(null);
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {recordingId && (
        <span className="inline-flex items-center gap-1 rounded-pill bg-clay-500 px-2 py-0.5 font-mono text-3xs font-bold uppercase tracking-wide text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-pill bg-white" />
          {t("live.media.recording")}
        </span>
      )}
      {canRecord && (
        <button
          type="button"
          onClick={() => (handle ? end() : begin())}
          disabled={busy}
          className="btn-pop inline-flex items-center gap-1 rounded-sm border border-border bg-surface px-2 py-1 text-3xs font-bold text-text disabled:opacity-50"
        >
          {handle ? <Square size={13} aria-hidden /> : <Circle size={13} aria-hidden />}
          {handle ? t("live.media.recordStop") : t("live.media.recordStart")}
        </button>
      )}
    </div>
  );
}
