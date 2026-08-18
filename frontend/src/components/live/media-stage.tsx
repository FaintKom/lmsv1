"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GridLayout,
  MediaDeviceMenu,
  ParticipantTile,
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

import { type MediaToken } from "@/lib/api/live";
import { useCall, type CallSlotUi } from "@/components/live/call-provider";
import { RecordingIndicator } from "@/components/live/recording-indicator";
import { useTranslation } from "@/lib/i18n/context";

import "@livekit/components-styles";


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
  /**
   * Whether being off is worth warning about.
   *
   * A microphone or camera that is off is something the person probably wants
   * to know — they may be talking to nobody. A screen nobody is sharing is
   * simply the resting state of a lesson, and painting it like a fault trains
   * people to ignore the colour that matters.
   */
  warnWhenOff = true,
}: {
  source: ToggleSource;
  onIcon: typeof Mic;
  offIcon: typeof Mic;
  onLabel: string;
  offLabel: string;
  warnWhenOff?: boolean;
}) {
  const { toggle, enabled, pending } = useTrackToggle({ source });
  const Icon = enabled ? OnIcon : OffIcon;

  const tone = enabled
    ? warnWhenOff
      ? "border-border bg-surface text-text"
      : "border-primary bg-primary text-primary-fg"
    : warnWhenOff
      ? "border-clay-500 bg-clay-500 text-white"
      : "border-border bg-surface text-text";

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={enabled}
      title={enabled ? offLabel : onLabel}
      className={`btn-pop inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2.5 py-1.5 text-2xs font-bold disabled:opacity-50 ${tone}`}
    >
      <Icon size={14} aria-hidden />
      {enabled ? onLabel : offLabel}
    </button>
  );
}

function RoomControls({
  canShareScreen,
  onLeave,
}: {
  canShareScreen: boolean;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const room = useRoomContext();

  return (
    // Its own row, wrapping onto more rows rather than over the faces. The
    // labels are wider than the icons this panel was measured for, and a
    // control that lands on top of somebody's video is worse than one that
    // takes a second line.
    <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border bg-surface-2 px-2 py-1.5">
      <ControlToggle
        source={Track.Source.Microphone}
        onIcon={Mic}
        offIcon={MicOff}
        onLabel={t("live.media.micOn")}
        offLabel={t("live.media.micOff")}
      />
      <span className="lk-button-group-menu shrink-0">
        <MediaDeviceMenu kind="audioinput" />
      </span>

      <ControlToggle
        source={Track.Source.Camera}
        onIcon={Video}
        offIcon={VideoOff}
        onLabel={t("live.media.camOn")}
        offLabel={t("live.media.camOff")}
      />
      <span className="lk-button-group-menu shrink-0">
        <MediaDeviceMenu kind="videoinput" />
      </span>

      {canShareScreen && (
        <ControlToggle
          source={Track.Source.ScreenShare}
          onIcon={MonitorUp}
          offIcon={MonitorX}
          onLabel={t("live.media.screenOn")}
          offLabel={t("live.media.screenOff")}
          warnWhenOff={false}
        />
      )}

      <button
        type="button"
        onClick={() => {
          void room.disconnect();
          onLeave();
        }}
        className="btn-pop ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-2xs font-bold text-text"
      >
        <LogOut size={14} aria-hidden />
        {t("live.media.leave")}
      </button>
    </div>
  );
}

function Tiles({ onScreenShare }: { onScreenShare?: (sharing: boolean) => void }) {
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

  // Reported upward so the page can give a shared screen the room it needs.
  // Only this side of the boundary knows a screen is being shared, and only the
  // page can decide what shrinks to make space (FR-031).
  const sharing = tracks.some((t) => t.source === Track.Source.ScreenShare);
  useEffect(() => {
    onScreenShare?.(sharing);
  }, [sharing, onScreenShare]);

  return (
    <GridLayout tracks={tracks} className="h-full">
      <ParticipantTile />
    </GridLayout>
  );
}

/**
 * Where the call is drawn on a lesson page, and the way in when nobody is in
 * one yet.
 *
 * The room itself lives in `CallProvider`, above the router, so that clicking a
 * link during a lesson does not hang up (FR-033). This component only claims a
 * place on the page for it: a container the provider portals into while this
 * page is open, and gives back — as a small floating panel — the moment it is
 * not.
 */
export function MediaStage({
  lessonId,
  breakoutIndex = null,
  onScreenShare,
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
  /**
   * Told when somebody starts or stops sharing a screen, so the page around
   * this one can give it the space it needs (FR-031). A shared screen shown in
   * a strip beside a placeholder is a lesson nobody can read.
   */
  onScreenShare?: (sharing: boolean) => void;
}) {
  const { t } = useTranslation();
  const call = useCall();
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const inThisLesson = call.lessonId === lessonId;

  const ui = useMemo<CallSlotUi>(
    () => ({
      render: (grant) => (
        <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface-2">
          <div className="min-h-0 flex-1">
            <Tiles onScreenShare={onScreenShare} />
          </div>
          <div className="flex items-center justify-between gap-2 px-2 pt-1">
            <RecordingIndicator lessonId={lessonId} canRecord={grant.can_record} />
          </div>
          <RoomControls canShareScreen={grant.can_publish_screen} onLeave={call.leave} />
        </div>
      ),
    }),
    [lessonId, onScreenShare, call.leave],
  );

  // Claim the space while this page is open, hand it back when it closes. The
  // provider draws the floating panel the moment there is nowhere to portal to.
  useEffect(() => {
    if (!inThisLesson) return;
    call.setSlot(box, ui);
    return () => call.setSlot(null, null);
  }, [box, ui, inThisLesson, call]);

  // Follow the teacher between rooms, but only once already in one: somebody
  // who has not pressed Join is not dragged into a call by a split.
  useEffect(() => {
    if (inThisLesson) call.join(lessonId, breakoutIndex);
  }, [breakoutIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (inThisLesson) return <div ref={setBox} className="h-full" />;

  // 503 is the host saying it has reached the ceiling a measurement gave it.
  // The lesson keeps its board, its tasks and its roster; only the video is
  // missing, and saying which is the difference between a limit and a fault.
  const err = call.error;
  const atCapacity =
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    (err as { response?: { status?: number } }).response?.status === 503;

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
          <p className="text-sm font-bold text-text">{t("live.media.notJoinedYet")}</p>
          <p className="max-w-xs text-xs text-text-muted">{t("live.media.joinExplains")}</p>
          <button
            type="button"
            onClick={() => call.join(lessonId, breakoutIndex)}
            disabled={call.connecting}
            className="btn-pop rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-fg disabled:opacity-60"
          >
            {call.connecting ? t("live.media.connecting") : t("live.media.join")}
          </button>
          {!!err && !atCapacity && (
            <p className="text-xs text-text-muted">{t("live.media.failed")}</p>
          )}
        </>
      )}
    </div>
  );
}
