"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { LiveKitRoom, RoomAudioRenderer } from "@livekit/components-react";

import { fetchBreakoutToken, fetchMediaToken, type MediaToken } from "@/lib/api/live";
import { resolveServerUrl } from "@/lib/live/server-url";

import "@livekit/components-styles";

/**
 * The call, kept alive above the router.
 *
 * A room mounted inside a page dies with the page. Opening a material, a task
 * or anything else during a lesson is a route change, so every link a teacher
 * clicked dropped them out of the call they were running (FR-033).
 *
 * So the room is mounted once, here, in the root layout — the only place in a
 * Next.js application that survives navigation. Its children are then
 * *portalled* into whichever page asked for them. A portal moves the DOM
 * without unmounting the React tree, so the connection, the published tracks
 * and the room context all carry across a navigation untouched.
 *
 * When no page has asked, the same children render as a small floating panel:
 * the person is still in the call and can still get back to it, which is what
 * anybody who has used a video call expects.
 */

export interface CallSlotUi {
  /** Drawn inside the room context, wherever the room is currently shown. */
  render: (grant: MediaToken) => React.ReactNode;
}

interface CallState {
  /** The lesson currently being called, or null when not in a call. */
  lessonId: string | null;
  /** True while a grant is being fetched. */
  connecting: boolean;
  /** Last failure, so a page can explain itself rather than sit blank. */
  error: unknown;
  join: (lessonId: string, breakoutIndex: number | null) => void;
  leave: () => void;
  /**
   * Where to draw the call right now. A page registers its container on mount
   * and clears it on unmount; clearing is what turns the call into the
   * floating panel rather than into nothing.
   */
  setSlot: (el: HTMLElement | null, ui: CallSlotUi | null) => void;
}

/**
 * The two decisions this provider makes, kept as functions a test can hold.
 *
 * Both have already been wrong in production once, and neither failure was
 * visible to any check that existed:
 * - re-join used to act on every report, so a panel re-render stomped the
 *   teacher's scene choice (the flapping in T103's history);
 * - releasing a slot used to clear the interface with it, so the floating
 *   panel was an empty rectangle (T104).
 */
export function sameCall(
  current: { lessonId: string | null; breakoutIndex: number | null },
  next: { lessonId: string; breakoutIndex: number | null },
): boolean {
  return current.lessonId === next.lessonId && current.breakoutIndex === next.breakoutIndex;
}

/**
 * A page giving back its place is not an instruction to stop drawing the call.
 * The interface is only ever gained; leaving the call is what clears it, by
 * unmounting the room around it.
 */
export function keepUi(current: CallSlotUi | null, next: CallSlotUi | null): CallSlotUi | null {
  return next ?? current;
}

const CallCtx = createContext<CallState | null>(null);

export function useCall(): CallState {
  const ctx = useContext(CallCtx);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const [grant, setGrant] = useState<MediaToken | null>(null);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [slot, setSlotEl] = useState<HTMLElement | null>(null);
  const [ui, setUi] = useState<CallSlotUi | null>(null);
  const breakoutRef = useRef<number | null>(null);

  const join = useMutation({
    mutationFn: ({ lesson, index }: { lesson: string; index: number | null }) =>
      index === null ? fetchMediaToken(lesson) : fetchBreakoutToken(lesson, index),
    onSuccess: (g, vars) => {
      breakoutRef.current = vars.index;
      setLessonId(vars.lesson);
      setGrant(g);
    },
  });

  const doLeave = useCallback(() => {
    setGrant(null);
    setLessonId(null);
    breakoutRef.current = null;
  }, []);

  const joinMutate = join.mutate;
  const doJoin = useCallback(
    (lesson: string, breakoutIndex: number | null) => {
      // Asking for the room already held is not a request to reconnect. A
      // split moving somebody between rooms is, and that is the only case that
      // should tear a working connection down.
      if (
        grant &&
        sameCall({ lessonId, breakoutIndex: breakoutRef.current }, { lessonId: lesson, breakoutIndex })
      )
        return;
      joinMutate({ lesson, index: breakoutIndex });
    },
    [grant, lessonId, joinMutate],
  );

  const setSlot = useCallback((el: HTMLElement | null, next: CallSlotUi | null) => {
    setSlotEl(el);
    setUi((current) => keepUi(current, next));
  }, []);

  const value = useMemo<CallState>(
    () => ({
      lessonId,
      connecting: join.isPending,
      error: join.error,
      join: doJoin,
      leave: doLeave,
      setSlot,
    }),
    [lessonId, join.isPending, join.error, doJoin, doLeave, setSlot],
  );

  return (
    <CallCtx.Provider value={value}>
      {children}
      {grant && (
        <LiveKitRoom
          serverUrl={resolveServerUrl(grant.url, window.location.href)}
          token={grant.token}
          connect
          audio
          video
          // Forward only the qualities a tile is actually showing. With
          // simulcast this is what lets a class-sized room run on two cores:
          // fourteen thumbnails cost fourteen thumbnails, not fourteen full
          // streams.
          options={{ adaptiveStream: true, dynacast: true }}
          onDisconnected={doLeave}
          // Takes no space of its own: what you see is either portalled into a
          // page or drawn as the floating panel below.
          style={{ display: "contents" }}
        >
          <RoomAudioRenderer />
          {ui && slot ? (
            createPortal(ui.render(grant), slot)
          ) : (
            <div className="fixed bottom-4 right-4 z-50 flex h-52 w-80 flex-col overflow-hidden rounded-md border border-border bg-surface-2 shadow-md">
              {ui?.render(grant) ?? null}
            </div>
          )}
        </LiveKitRoom>
      )}
    </CallCtx.Provider>
  );
}
