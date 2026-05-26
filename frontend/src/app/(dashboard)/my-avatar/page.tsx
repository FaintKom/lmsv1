"use client";

import { AvatarBuilderPanel } from "@/components/avatar/avatar-builder-panel";
import { AvatarCanvas } from "@/components/avatar/avatar-canvas";
import { useRoomState } from "@/hooks/use-room";
import { useTranslation } from "@/lib/i18n/context";

export default function MyAvatarPage() {
  const { t } = useTranslation();
  const { data: state, isLoading, isError } = useRoomState();

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-text-muted">
        {t("room.loading")}
      </div>
    );
  }

  if (isError || !state) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-sm text-coral-700">
        {t("room.error")}
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 gap-0 lg:grid-cols-[1fr_380px]">
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden lg:h-full">
        <AvatarCanvas state={state} />
        <div className="pointer-events-none absolute left-6 top-6 max-w-md">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gray-500">
            {t("nav.achievements")} · {t("nav.myAvatar")}
          </p>
          <h1 className="mt-2 text-[26px] font-extrabold leading-tight text-ink-700">
            {t("avatar.welcomePrefix")}{" "}
            <span
              className="inline-block rounded-[6px] px-2 py-0 text-ink-900"
              style={{
                background: "#ffe9a3",
                transform: "rotate(-1.5deg)",
                display: "inline-block",
              }}
            >
              {t("avatar.welcomeHighlight")}
            </span>
          </h1>
        </div>
      </div>

      <aside className="overflow-y-auto border-t border-ink-100 bg-paper-2 lg:border-l lg:border-t-0">
        <AvatarBuilderPanel state={state} />
      </aside>
    </div>
  );
}
