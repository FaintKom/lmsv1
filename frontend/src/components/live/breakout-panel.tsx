"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone, Split, Users } from "lucide-react";

import {
  createBreakouts,
  gatherBreakouts,
  messageBreakouts,
  type BreakoutGroup,
} from "@/lib/api/live";
import { getApiError } from "@/lib/api-client";
import { useTranslation } from "@/lib/i18n/context";

/**
 * Split the class into small rooms, talk to all of them, gather them back.
 *
 * Cheaper for the host than the plenary, not dearer: subscriptions scale with
 * the square of a room's population, so five threes cost about a seventh of one
 * fifteen. Splitting a class is the kindest thing a teacher can do to the
 * server.
 */
export function BreakoutPanel({
  lessonId,
  groups,
  onGroups,
}: {
  lessonId: string;
  groups: BreakoutGroup[];
  onGroups: (g: BreakoutGroup[]) => void;
}) {
  const { t } = useTranslation();
  const [size, setSize] = useState(3);
  const [text, setText] = useState("");

  const split = useMutation({
    mutationFn: () => createBreakouts(lessonId, size),
    onSuccess: onGroups,
    onError: (e) => toast.error(getApiError(e)),
  });

  const gather = useMutation({
    mutationFn: () => gatherBreakouts(lessonId),
    onSuccess: () => onGroups([]),
    onError: (e) => toast.error(getApiError(e)),
  });

  const shout = useMutation({
    mutationFn: () => messageBreakouts(lessonId, text.trim()),
    onSuccess: () => setText(""),
    onError: (e) => toast.error(getApiError(e)),
  });

  const button =
    "btn-pop inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 py-1.5 text-2xs font-bold text-text disabled:opacity-50";

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <label htmlFor="breakout-size" className="text-2xs font-bold text-text-muted">
          {t("live.media.breakoutSize")}
        </label>
        <input
          id="breakout-size"
          type="number"
          min={2}
          max={8}
          value={size}
          onChange={(e) => setSize(Math.max(2, Math.min(8, Number(e.target.value) || 3)))}
          className="w-14 rounded-sm border border-border bg-surface px-2 py-1 text-xs text-text"
        />
        <button
          type="button"
          className={button}
          onClick={() => split.mutate()}
          disabled={split.isPending}
        >
          <Split size={13} aria-hidden />
          {t("live.media.breakoutSplit")}
        </button>
        {groups.length > 0 && (
          <button
            type="button"
            className={button}
            onClick={() => gather.mutate()}
            disabled={gather.isPending}
          >
            <Users size={13} aria-hidden />
            {t("live.media.breakoutGather")}
          </button>
        )}
      </div>

      {groups.length > 0 && (
        <>
          <div className="text-2xs text-text-muted">
            {t("live.media.breakoutCount")}: {groups.length}
          </div>
          <div className="flex gap-1.5">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("live.media.breakoutMessage")}
              className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-2 py-1 text-xs text-text"
            />
            <button
              type="button"
              className={button}
              onClick={() => shout.mutate()}
              disabled={shout.isPending || !text.trim()}
            >
              <Megaphone size={13} aria-hidden />
              {t("live.media.breakoutSend")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
