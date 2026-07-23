"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
  onSubmission?: (s: {
    student_id: string;
    exercise_id: string;
    passed: boolean | null;
    score: number | null;
  }) => void;
  onMessage?: (m: { text: string }) => void;
  onLessonEnded?: () => void;
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
  handlersRef.current = handlers;

  useEffect(() => {
    if (!lessonId) return;
    const es = new EventSource(`/api/v1/live-lessons/${lessonId}/events`);
    let hadDrop = false;

    es.onopen = () => {
      if (hadDrop) {
        qc.invalidateQueries({ queryKey: ["live", lessonId] });
      }
    };
    es.onerror = () => {
      hadDrop = true; // EventSource auto-reconnects
    };

    const dispatch: Record<string, (data: never) => void> = {
      scene_changed: (d) => handlersRef.current.onSceneChanged?.(d),
      board_delta: (d) => handlersRef.current.onBoardDelta?.(d),
      settings_changed: (d) => handlersRef.current.onSettingsChanged?.(d),
      poll_started: (d) => handlersRef.current.onPollStarted?.(d),
      poll_closed: (d) => handlersRef.current.onPollClosed?.(d),
      poll_progress: (d) => handlersRef.current.onPollProgress?.(d),
      presence: (d) => handlersRef.current.onPresence?.(d),
      signal: (d) => handlersRef.current.onSignal?.(d),
      submission: (d) => handlersRef.current.onSubmission?.(d),
      message: (d) => handlersRef.current.onMessage?.(d),
      lesson_ended: () => {
        handlersRef.current.onLessonEnded?.();
        es.close();
      },
    };
    for (const name of EVENT_NAMES) {
      es.addEventListener(name, (e) => {
        dispatch[name](JSON.parse((e as MessageEvent).data));
      });
    }
    return () => es.close();
  }, [lessonId, qc]);
}
