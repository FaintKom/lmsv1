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
  onSubmission?: (s: {
    student_id: string;
    exercise_id: string;
    passed: boolean | null;
    score: number | null;
  }) => void;
  onMessage?: (m: { text: string }) => void;
  onLessonEnded?: () => void;
  /** Fires false on stream drop, true once reconnected — drive a
   * "reconnecting" indicator so students know they may be behind. */
  onConnectionChange?: (connected: boolean) => void;
}

const EVENT_NAMES = [
  "scene_changed",
  "board_delta",
  "settings_changed",
  "poll_started",
  "poll_closed",
  "poll_progress",
  "presence",
  "signal",
  "signals_cleared",
  "submission",
  "message",
  "lesson_ended",
] as const;

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
      submission: (d) => handlersRef.current.onSubmission?.(d),
      message: (d) => handlersRef.current.onMessage?.(d),
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
      for (const name of EVENT_NAMES) {
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
