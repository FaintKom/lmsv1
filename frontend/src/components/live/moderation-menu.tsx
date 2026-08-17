"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Hand, MicOff, MonitorUp, UserMinus } from "lucide-react";

import {
  muteParticipant,
  removeParticipant,
  setFloor,
  setScreenShare,
  type RosterMember,
} from "@/lib/api/live";
import { getApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";

/**
 * What a teacher can do to one participant.
 *
 * Every action here is refused by the server for anybody who is not this
 * lesson's teacher, so these buttons are a convenience and not the control.
 * Hiding a button has never stopped anybody.
 */
export function ModerationMenu({
  lessonId,
  member,
  hasFloor,
  canShare,
}: {
  lessonId: string;
  member: RosterMember;
  hasFloor: boolean;
  canShare: boolean;
}) {
  const { t } = useTranslation();
  const [sharing, setSharing] = useState(canShare);

  const mute = useMutation({
    mutationFn: () => muteParticipant(lessonId, member.id),
    onSuccess: () => toast.success(t("live.media.muted")),
    onError: (e) => toast.error(getApiError(e)),
  });

  const remove = useMutation({
    mutationFn: () => removeParticipant(lessonId, member.id),
    onSuccess: () => toast.success(t("live.media.removed")),
    onError: (e) => toast.error(getApiError(e)),
  });

  const floor = useMutation({
    // Pressing it again takes the floor back, which is why the argument is a
    // participant or nobody rather than a separate "clear" action.
    mutationFn: () => setFloor(lessonId, hasFloor ? null : member.id),
    onError: (e) => toast.error(getApiError(e)),
  });

  const share = useMutation({
    mutationFn: () => setScreenShare(lessonId, member.id, !sharing),
    onSuccess: () => setSharing((s) => !s),
    onError: (e) => toast.error(getApiError(e)),
  });

  const button =
    "btn-pop inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-2xs font-bold text-text disabled:opacity-50";

  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        className={button}
        onClick={() => mute.mutate()}
        disabled={mute.isPending}
      >
        <MicOff size={13} aria-hidden />
        {t("live.media.mute")}
      </button>

      <button
        type="button"
        className={button}
        onClick={() => floor.mutate()}
        disabled={floor.isPending}
        // Answers the raised hand the roster already shows. There is no second
        // hand-raise anywhere in the product, and there is not going to be one.
        title={member.signal === "hand" ? t("live.media.handRaised") : undefined}
      >
        <Hand size={13} aria-hidden />
        {hasFloor ? t("live.media.floorTake") : t("live.media.floorGive")}
      </button>

      <button
        type="button"
        className={button}
        onClick={() => share.mutate()}
        disabled={share.isPending}
      >
        <MonitorUp size={13} aria-hidden />
        {sharing ? t("live.media.shareRevoke") : t("live.media.shareAllow")}
      </button>

      <button
        type="button"
        className={`${button} text-clay-600`}
        onClick={() => remove.mutate()}
        disabled={remove.isPending}
      >
        <UserMinus size={13} aria-hidden />
        {t("live.media.remove")}
      </button>
    </div>
  );
}
