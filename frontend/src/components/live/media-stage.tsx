"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CarouselLayout,
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
  /** Sits inside a bordered group with its device menu, so it draws no border. */
  joined = false,
}: {
  source: ToggleSource;
  onIcon: typeof Mic;
  offIcon: typeof Mic;
  onLabel: string;
  offLabel: string;
  warnWhenOff?: boolean;
  joined?: boolean;
}) {
  const { toggle, enabled, pending } = useTrackToggle({ source });
  const Icon = enabled ? OnIcon : OffIcon;

  const tone = enabled
    ? warnWhenOff
      ? "bg-surface text-text"
      : "bg-primary text-primary-fg"
    : warnWhenOff
      ? "bg-clay-500 text-white"
      : "bg-surface text-text";
  const shape = joined
    ? "rounded-l-sm"
    : "rounded-sm border " + (enabled && !warnWhenOff ? "border-primary" : enabled || !warnWhenOff ? "border-border" : "border-clay-500");

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      disabled={pending}
      aria-pressed={enabled}
      title={enabled ? offLabel : onLabel}
      className={`btn-pop inline-flex shrink-0 items-center gap-1 px-2 py-1 text-3xs font-bold disabled:opacity-50 ${shape} ${tone}`}
    >
      <Icon size={14} aria-hidden />
      {enabled ? onLabel : offLabel}
    </button>
  );
}

function RoomControls({
  canShareScreen,
  onLeave,
  recording,
}: {
  canShareScreen: boolean;
  onLeave: () => void;
  /** The record control, kept in the same row so it stops sitting alone. */
  recording: React.ReactNode;
}) {
  const { t } = useTranslation();
  const room = useRoomContext();

  return (
    // One row, two groups: what you are publishing on the left, what you do to
    // the call on the right. Each toggle and its device menu are joined into a
    // single control, because "camera" and "which camera" are one decision and
    // reading them as two separate buttons is what made this panel look
    // scattered (T105).
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border bg-surface-2 px-1.5 py-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex shrink-0 items-center rounded-sm border border-border bg-surface">
          <ControlToggle
            source={Track.Source.Microphone}
            onIcon={Mic}
            offIcon={MicOff}
            onLabel={t("live.media.micOn")}
            offLabel={t("live.media.micOff")}
            joined
          />
          <span className="lk-button-group-menu shrink-0 border-l border-border">
            <MediaDeviceMenu kind="audioinput" />
          </span>
        </span>

        <span className="inline-flex shrink-0 items-center rounded-sm border border-border bg-surface">
          <ControlToggle
            source={Track.Source.Camera}
            onIcon={Video}
            offIcon={VideoOff}
            onLabel={t("live.media.camOn")}
            offLabel={t("live.media.camOff")}
            joined
          />
          <span className="lk-button-group-menu shrink-0 border-l border-border">
            <MediaDeviceMenu kind="videoinput" />
          </span>
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
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {recording}
        <button
          type="button"
          onClick={() => {
            void room.disconnect();
            onLeave();
          }}
          className="btn-pop inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-2xs font-bold text-text"
        >
          <LogOut size={14} aria-hidden />
          {t("live.media.leave")}
        </button>
      </div>
    </div>
  );
}

function ScreenSceneEmpty() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <MonitorX className="h-6 w-6 text-text-muted" aria-hidden />
      <p className="text-sm font-bold text-text">{t("live.media.screenSceneEmpty")}</p>
    </div>
  );
}

function Tiles({
  onScreenShare,
  layout = "grid",
  rollOrientation = "vertical",
  excludeScreens = false,
}: {
  onScreenShare?: (sharing: boolean) => void;
  /**
   * "grid" fits tiles to the box and paginates the overflow — right for the
   * pupil's wide strip, wrong for the teacher's narrow panel, where pagination
   * meant a class of two showed one pupil and a class of fifteen showed the
   * panel's height (T107). "roll" is a scrollable band of every participant:
   * nobody is on a page the teacher has not turned. "screen" is the shared
   * screen alone, for the scene of the same name (FR-034): the stage shows the
   * thing being taught, and the faces stay in the strip.
   */
  layout?: "grid" | "roll" | "screen";
  /** Which way the roll runs. A phone's rail is a strip, not a column. */
  rollOrientation?: "vertical" | "horizontal";
  /**
   * Leave screen-share tracks out. Set on the rail while the same screen is
   * on the stage: showing it twice costs a second video decode to display the
   * same pixels smaller.
   */
  excludeScreens?: boolean;
}) {
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
  const shown = excludeScreens
    ? tracks.filter((tr) => tr.source !== Track.Source.ScreenShare)
    : tracks;
  useEffect(() => {
    onScreenShare?.(sharing);
  }, [sharing, onScreenShare]);

  if (layout === "screen") {
    const screens = tracks.filter((tr) => tr.source === Track.Source.ScreenShare);
    if (screens.length === 0) {
      // The teacher picked the screen scene and is not sharing yet. Saying so
      // beats a black stage that looks like a broken camera.
      return <ScreenSceneEmpty />;
    }
    return (
      <GridLayout tracks={screens} className="h-full">
        <ParticipantTile />
      </GridLayout>
    );
  }
  if (layout === "roll") {
    return (
      <CarouselLayout tracks={shown} orientation={rollOrientation} className="h-full">
        <ParticipantTile />
      </CarouselLayout>
    );
  }
  return (
    <GridLayout tracks={shown} className="h-full">
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
  layout = "grid",
  rollOrientation = "vertical",
  stageEl = null,
  stageScene = null,
  liveRecordingId,
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
  /** Passed to the tile layout — see Tiles. The teacher's panel uses "roll". */
  layout?: "grid" | "roll" | "screen";
  /** Which way the rail's roll runs — vertical column or phone strip. */
  rollOrientation?: "vertical" | "horizontal";
  /**
   * Where to draw the media SCENE, when there is one (FR-035). The stage and
   * the rail are two places, and the call is one React tree: the stage
   * content is portalled out of the same room so the connection stays single.
   */
  stageEl?: HTMLElement | null;
  /** Which media scene the stage is showing: the screen alone, or the grid. */
  stageScene?: "screen" | "faces" | null;
  /** Server truth about a running recording — see RecordingIndicator. */
  liveRecordingId?: string | null;
}) {
  const { t } = useTranslation();
  const call = useCall();
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const inThisLesson = call.lessonId === lessonId;

  const ui = useMemo<CallSlotUi>(
    () => ({
      render: (grant) => (
        <>
          <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface-2">
            {/* overflow-hidden, or the roll of tiles grows past its box and a
                video ends up on top of the controls, eating their clicks.
                When the faces are on the stage, the rail does not repeat them:
                every duplicated tile is a second video decode on a pupil's
                laptop, spent on showing the same person twice. */}
            {stageScene !== "faces" && (
              <div className="min-h-0 flex-1 overflow-hidden">
                <Tiles
                  onScreenShare={onScreenShare}
                  layout={layout}
                  rollOrientation={rollOrientation}
                  excludeScreens={stageScene === "screen"}
                />
              </div>
            )}
            <RoomControls
              canShareScreen={grant.can_publish_screen}
              onLeave={call.leave}
              recording={<RecordingIndicator
                lessonId={lessonId}
                canRecord={grant.can_record}
                liveRecordingId={liveRecordingId}
              />}
            />
          </div>
          {stageEl &&
            stageScene &&
            createPortal(
              <div className="h-full overflow-hidden">
                <Tiles layout={stageScene === "screen" ? "screen" : "grid"} />
              </div>,
              stageEl,
            )}
        </>
      ),
    }),
    [lessonId, onScreenShare, layout, rollOrientation, stageEl, stageScene, liveRecordingId, call.leave],
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
