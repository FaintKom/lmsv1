"use client";

import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

interface SceneHudProps {
  onReset: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function SceneHud({ onReset, onZoomIn, onZoomOut }: SceneHudProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Top-left: breadcrumb + title */}
      <div className="pointer-events-none absolute left-6 top-6 max-w-md">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gray-500">
          {t("nav.achievements")} · {t("room.breadcrumb")}
        </p>
        <h1 className="mt-2 text-[26px] font-extrabold leading-tight text-ink-700">
          {t("room.welcomePrefix")}{" "}
          <span
            className="inline-block rounded-[6px] px-2 py-0 text-ink-900"
            style={{
              background: "#ffe9a3",
              transform: "rotate(-1.5deg)",
              display: "inline-block",
            }}
          >
            {t("room.welcomeHighlight")}
          </span>
        </h1>
      </div>

      {/* Bottom-left: drag/scroll hint pills */}
      <div className="pointer-events-none absolute bottom-6 left-6 flex flex-wrap gap-2">
        <HintPill kbd={t("room.hint.dragKey")} label={t("room.hint.dragLabel")} />
        <HintPill kbd={t("room.hint.scrollKey")} label={t("room.hint.scrollLabel")} />
      </div>

      {/* Bottom-right: camera control cluster */}
      <div className="absolute bottom-6 right-6 flex gap-1 rounded-[12px] bg-white/90 p-1.5 shadow-md backdrop-blur">
        <CameraButton ariaLabel={t("room.camera.reset")} onClick={onReset}>
          <RotateCcw className="h-4 w-4" />
        </CameraButton>
        <CameraButton ariaLabel={t("room.camera.zoomIn")} onClick={onZoomIn}>
          <ZoomIn className="h-4 w-4" />
        </CameraButton>
        <CameraButton ariaLabel={t("room.camera.zoomOut")} onClick={onZoomOut}>
          <ZoomOut className="h-4 w-4" />
        </CameraButton>
      </div>
    </>
  );
}

function HintPill({ kbd, label }: { kbd: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[11px] font-medium text-ink-700 shadow-sm backdrop-blur">
      <kbd className="rounded border border-ink-200 bg-ink-50 px-1.5 py-0.5 font-mono text-[10px] text-ink-700">
        {kbd}
      </kbd>
      {label}
    </span>
  );
}

function CameraButton({
  children,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="grid h-9 w-9 place-items-center rounded-lg text-ink-700 transition-colors hover:bg-green-50 hover:text-green-700"
    >
      {children}
    </button>
  );
}
