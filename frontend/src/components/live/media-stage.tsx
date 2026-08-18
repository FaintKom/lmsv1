"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  GridLayout,
  LiveKitRoom,
  MediaDeviceMenu,
  ParticipantTile,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  useTrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { ToggleSource } from "@livekit/components-core";
import {
  LogOut,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Video,
  VideoOff,
} from "lucide-react";

import { fetchBreakoutToken, fetchMediaToken, type MediaToken } from "@/lib/api/live";
import { RecordingIndicator } from "@/components/live/recording-indicator";
import { useTranslation } from "@/lib/i18n/context";

import "@livekit/components-styles";

/**
 * Where the browser connects when the server did not name a host.
 *
 * An empty `url` means same origin: nginx proxies /rtc to the media server, so
 * the media rides the certificate and the port the platform already has, and
 * there is no second hostname for anybody to configure or get wrong.
 */
export function resolveServerUrl(url: string, origin: string): string {
  if (url) return url;
  const scheme = origin.startsWith("https:") ? "wss" : "ws";
  // The origin, and deliberately not `${origin}/rtc`. The SDK appends `/rtc`
  // itself, so naming it here asked production for `/rtc/rtc` — a path the
  // media server does not serve, answered `404`, and retried forever behind a
  // tile that looked like a camera nobody had switched on.
  //
  // Every check this feature passed — the token, the grants, the proxy, the
  // certificate — passes with the room never connecting. There is a test
  // beside this file now, because the next person to touch it will have the
  // same instinct.
  return `${scheme}://${new URL(origin).host}`;
}

/**
 * The controls, saying what is happening rather than what would happen.
 *
 * The stock control bar draws a small monochrome icon and nothing else, so the
 * crossed-out microphone reads equally well as "you are muted" and as "press
 * this to mute" — and a teacher deciding which in the middle of a lesson is a
 * teacher not teaching. Here the label states the state, the colour carries it
 * at a glance, and a struck-through icon means one thing only: off.
 *
 * The device menus stay: a participant has to be able to pick which camera and
 * which microphone (FR-006), and that is the one part the stock bar got right.
 */
function ControlToggle({
  source,
  onIcon: OnIcon,
  offIcon: OffIcon,
  onLabel,
  offLabel,
}: {
  source: ToggleSource;
  onIcon: typeof Mic;
  offIcon: typeof Mic;
  onLabel: string;
  offLabel: string;
}) {
  const { toggle, enabled, pending } = useTrackToggle({ source });
  const Icon = enabled ? OnIcon : OffIcon;

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={enabled}
      title={enabled ? offLabel : onLabel}
      className={`btn-pop inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-2xs font-bold disabled:opacity-50 ${
        enabled
          ? "border-border bg-surface text-text"
          : "border-clay-500 bg-clay-500 text-white"
      }`}
    >
      <Icon size={14} aria-hidden />
      {enabled ? onLabel : offLabel}
    </button>
  );
}

function RoomControls({ canShareScreen }: { canShareScreen: boolean }) {
  const { t } = useTranslation();
  const room = useRoomContext();

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-2 py-1.5">
      <ControlToggle
        source={Track.Source.Microphone}
        onIcon={Mic}
        offIcon={MicOff}
        onLabel={t("live.media.micOn")}
        offLabel={t("live.media.micOff")}
      />
      <span className="lk-button-group-menu">
        <MediaDeviceMenu kind="audioinput" />
      </span>

      <ControlToggle
        source={Track.Source.Camera}
        onIcon={Video}
        offIcon={VideoOff}
        onLabel={t("live.media.camOn")}
        offLabel={t("live.media.camOff")}
      />
      <span className="lk-button-group-menu">
        <MediaDeviceMenu kind="videoinput" />
      </span>

      {canShareScreen && (
        <ControlToggle
          source={Track.Source.ScreenShare}
          onIcon={MonitorUp}
          offIcon={MonitorX}
          onLabel={t("live.media.screenOn")}
          offLabel={t("live.media.screenOff")}
        />
      )}

      <button
        type="button"
        onClick={() => void room.disconnect()}
        className="btn-pop ml-auto inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-2xs font-bold text-text"
      >
        <LogOut size={14} aria-hidden />
        {t("live.media.leave")}
      </button>
    </div>
  );
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
          onDisconnected={() => setGrant(null)}
          className="flex h-full flex-col"
        >
          <div className="min-h-0 flex-1">
            <Tiles />
          </div>
          <RoomAudioRenderer />
          <div className="flex items-center justify-between gap-2 px-2 pt-1">
            <RecordingIndicator lessonId={lessonId} canRecord={grant.can_record} />
          </div>
          <RoomControls canShareScreen={grant.can_publish_screen} />
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
