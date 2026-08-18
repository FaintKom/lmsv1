"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { Video, VideoOff } from "lucide-react";

import { fetchBreakoutToken, fetchMediaToken, type MediaToken } from "@/lib/api/live";
import { useTranslation } from "@/lib/i18n/context";

import "@livekit/components-styles";

/**
 * Where the browser connects when the server did not name a host.
 *
 * An empty `url` means same origin: nginx proxies /rtc to the media server, so
 * the media rides the certificate and the port the platform already has, and
 * there is no second hostname for anybody to configure or get wrong.
 */
function resolveServerUrl(url: string): string {
  if (url) return url;
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/rtc`;
}

function Tiles() {
  // Camera and screen share in one grid. A placeholder keeps a tile for
  // somebody whose camera is off, so the grid matches the roster beside it
  // instead of quietly dropping people out of the room.
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );

  return (
    <GridLayout tracks={tracks} className="h-full">
      <ParticipantTile />
    </GridLayout>
  );
}

/**
 * Audio and video for one live lesson, inside the lesson's own page.
 *
 * Joining is a deliberate act rather than something that happens on load:
 * opening a lesson should not reach for somebody's camera before they have
 * decided to be seen.
 */
export function MediaStage({
  lessonId,
  breakoutIndex = null,
}: {
  lessonId: string;
  /**
   * Which breakout room this viewer belongs in, or null for the main room.
   *
   * Changing it re-joins: a split that only relabelled the interface would
   * leave the whole class in one room still hearing each other, which is the
   * opposite of what a breakout is for.
   */
  breakoutIndex?: number | null;
}) {
  const { t } = useTranslation();
  const [grant, setGrant] = useState<MediaToken | null>(null);
  const joinedAs = useRef<number | null>(null);

  const join = useMutation({
    mutationFn: () =>
      breakoutIndex === null
        ? fetchMediaToken(lessonId)
        : fetchBreakoutToken(lessonId, breakoutIndex),
    onSuccess: (g) => {
      joinedAs.current = breakoutIndex;
      setGrant(g);
    },
  });

  // Follow the teacher between rooms, but only once already in one: somebody
  // who has not pressed Join is not dragged into a call by a split.
  useEffect(() => {
    if (grant && joinedAs.current !== breakoutIndex) {
      setGrant(null);
      join.mutate();
    }
  }, [breakoutIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (grant) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface-2">
        <LiveKitRoom
          serverUrl={resolveServerUrl(grant.url)}
          token={grant.token}
          connect
          audio
          video
          // Forward only the qualities a tile is actually showing. With
          // simulcast this is what lets a class-sized room run on two cores:
          // fourteen thumbnails cost fourteen thumbnails, not fourteen full
          // streams.
          options={{ adaptiveStream: true, dynacast: true }}
          onDisconnected={() => setGrant(null)}
          className="flex h-full flex-col"
        >
          <div className="min-h-0 flex-1">
            <Tiles />
          </div>
          <RoomAudioRenderer />
          <ControlBar
            variation="minimal"
            controls={{
              microphone: true,
              camera: true,
              screenShare: grant.can_publish_screen,
              chat: false,
              leave: true,
            }}
          />
        </LiveKitRoom>
      </div>
    );
  }

  // 503 is the host saying it has reached the ceiling a measurement gave it.
  // The lesson keeps its board, its tasks and its roster; only the video is
  // missing, and saying which is the difference between a limit and a fault.
  const atCapacity =
    join.isError &&
    typeof join.error === "object" &&
    join.error !== null &&
    "response" in join.error &&
    (join.error as { response?: { status?: number } }).response?.status === 503;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 rounded-md border border-border bg-surface-2 p-6 text-center">
      {atCapacity ? (
        <>
          <VideoOff className="h-6 w-6 text-text-muted" aria-hidden />
          <p className="text-sm font-bold text-text">{t("live.media.unavailable")}</p>
          <p className="text-xs text-text-muted">{t("live.media.unavailableHint")}</p>
        </>
      ) : (
        <>
          <Video className="h-6 w-6 text-text-muted" aria-hidden />
          <button
            type="button"
            onClick={() => join.mutate()}
            disabled={join.isPending}
            className="btn-pop rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg disabled:opacity-60"
          >
            {join.isPending ? t("live.media.connecting") : t("live.media.join")}
          </button>
          {join.isError && !atCapacity && (
            <p className="text-xs text-text-muted">{t("live.media.failed")}</p>
          )}
        </>
      )}
    </div>
  );
}
