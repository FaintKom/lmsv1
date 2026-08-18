"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";
import type { BoardDelta, FollowMode, Poll, PollResult, Scene, SignalType } from "@/lib/api/live";

export interface LessonChannelHandlers {
  onSceneChanged?: (scene: Scene) => void;
  onBoardDelta?: (delta: BoardDelta & { board_id: string }) => void;
  onSettingsChanged?: (s: { follow_mode: FollowMode }) => void;
  onPollStarted?: (poll: Poll) => void;
  onPollClosed?: (result: PollResult) => void;
  onPollProgress?: (p: { counts: number[] }) => void;
  onPresence?: (p: {
    student_id: string;
    online: boolean;
    view: string;
    exercise_id: string | null;
  }) => void;
  onSignal?: (s: { student_id: string; type: SignalType | null; on: boolean }) => void;
  /** scene switched — all signals were cleared server-side */
  onSignalsCleared?: () => void;
  /** a student asked a text question (teacher audience only) */
  onStudentQuestion?: (q: {
    student_id: string;
    name: string;
    text: string;
    at: string;
  }) => void;
  onSubmission?: (s: {
    student_id: string;
    exercise_id: string;
    passed: boolean | null;
    score: number | null;
  }) => void;
  onMediaFloorChanged?: (d: { user_id: string | null }) => void;
  onMediaBreakoutsChanged?: (d: { groups: { index: number; member_ids: string[] }[] }) => void;
  onMediaBreakoutMessage?: (d: { text: string }) => void;
  onMediaParticipantRemoved?: (d: { user_id: string }) => void;
  onMediaMuted?: (d: { user_id: string }) => void;
  onMediaRecordingChanged?: (d: { recording_id: string | null }) => void;
  onMediaShareGrantChanged?: (d: { user_id: string; allowed: boolean }) => void;
  onMessage?: (m: { text: string; broadcast?: boolean }) => void;
  onLessonEnded?: () => void;
  /** Fires false on stream drop, true once reconnected — drive a
   * "reconnecting" indicator so students know they may be behind. */
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * One EventSource per mounted screen. Cookies ride along (same-origin).
 * On reconnect after a drop the authoritative state is refetched — the
 * backend keeps no event history (no Last-Event-ID replay).
 */
export function useLessonChannel(lessonId: string | null, handlers: LessonChannelHandlers) {
  const qc = useQueryClient();
  // latest-handlers ref so the EventSource effect doesn't resubscribe per render
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!lessonId) return;
    let es: EventSource | null = null;
    let stopped = false;
    let hadDrop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const dispatch: Record<string, (data: never) => void> = {
      scene_changed: (d) => handlersRef.current.onSceneChanged?.(d),
      board_delta: (d) => handlersRef.current.onBoardDelta?.(d),
      settings_changed: (d) => handlersRef.current.onSettingsChanged?.(d),
      poll_started: (d) => handlersRef.current.onPollStarted?.(d),
      poll_closed: (d) => handlersRef.current.onPollClosed?.(d),
      poll_progress: (d) => handlersRef.current.onPollProgress?.(d),
      presence: (d) => handlersRef.current.onPresence?.(d),
      signal: (d) => handlersRef.current.onSignal?.(d),
      signals_cleared: () => handlersRef.current.onSignalsCleared?.(),
      student_question: (d) => handlersRef.current.onStudentQuestion?.(d),
      submission: (d) => handlersRef.current.onSubmission?.(d),
      message: (d) => handlersRef.current.onMessage?.(d),
      // Media events ride this same stream on purpose. A second channel would
      // mean a second thing to reconnect and a second thing to get out of step.
      media_floor_changed: (d) => handlersRef.current.onMediaFloorChanged?.(d),
      media_breakouts_changed: (d) => handlersRef.current.onMediaBreakoutsChanged?.(d),
      media_breakout_message: (d) => handlersRef.current.onMediaBreakoutMessage?.(d),
      media_participant_removed: (d) => handlersRef.current.onMediaParticipantRemoved?.(d),
      media_muted: (d) => handlersRef.current.onMediaMuted?.(d),
      // One handler for both edges: what the page needs to know is the current
      // truth, not which verb produced it.
      media_recording_started: (d: { recording_id: string }) =>
        handlersRef.current.onMediaRecordingChanged?.(d),
      media_recording_stopped: () =>
        handlersRef.current.onMediaRecordingChanged?.({ recording_id: null }),
      media_share_grant_changed: (d) => handlersRef.current.onMediaShareGrantChanged?.(d),
      lesson_ended: () => {
        handlersRef.current.onLessonEnded?.();
        stopped = true;
        es?.close();
      },
    };

    const connect = () => {
      es = new EventSource(`/api/v1/live-lessons/${lessonId}/events`);
      es.onopen = () => {
        handlersRef.current.onConnectionChange?.(true);
        if (hadDrop) {
          qc.invalidateQueries({ queryKey: ["live", lessonId] });
        }
      };
      es.onerror = () => {
        handlersRef.current.onConnectionChange?.(false);
        // EventSource never sees the status code, so once the access-token
        // cookie expires its native auto-reconnect loops into 401 forever —
        // passive screens (projector) make no axios calls that would refresh
        // the session. Take over reconnection: close, ping an authenticated
        // endpoint (apiClient's interceptor rotates the cookies on 401,
        // redirects to /login if the session is truly dead), reconnect.
        hadDrop = true;
        es?.close();
        void apiClient
          .get("/auth/me", { _silentError: true } as object)
          .catch(() => {})
          .finally(() => {
            if (!stopped) timer = setTimeout(connect, 2000);
          });
      };
      // Derived from the dispatch map, never a second list. There used to be a
      // hand-kept EVENT_NAMES beside the map, and every media event was added
      // to the map and forgotten in the list — so the floor, breakout moves,
      // removal notices and mutes all published into a wire nobody had plugged
      // in, and no browser ever received one (T109). A handler that exists is
      // a subscription; the map is the only place that knows.
      for (const name of Object.keys(dispatch)) {
        es.addEventListener(name, (e) => {
          dispatch[name](JSON.parse((e as MessageEvent).data) as never);
        });
      }
    };

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      es?.close();
    };
  }, [lessonId, qc]);
}
