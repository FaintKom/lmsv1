"use client";

import { useRef } from "react";

import { RoomCanvas, type RoomCanvasHandle } from "@/components/room/room-canvas";
import { SceneHud } from "@/components/room/scene-hud";
import { useRoomState } from "@/hooks/use-room";
import { useTranslation } from "@/lib/i18n/context";

export default function MyRoomPage() {
  const { t } = useTranslation();
  const { data: state, isLoading, isError } = useRoomState();
  const canvasRef = useRef<RoomCanvasHandle | null>(null);

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
      {/* Scene */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden lg:h-full">
        <RoomCanvas ref={canvasRef} state={state} />
        <SceneHud
          onReset={() => canvasRef.current?.resetCamera()}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
        />
      </div>

      {/* Shop placeholder — Sprint C wires the real panel */}
      <aside className="border-t border-ink-100 bg-paper-2 p-6 lg:border-l lg:border-t-0">
        <div className="rounded-lg border-2 border-dashed border-ink-200 p-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">
            Sprint C
          </p>
          <p className="mt-2 text-sm font-semibold text-ink-700">
            {t("room.shop.comingSoon")}
          </p>
          <p className="mt-3 text-xs text-text-muted">
            Wallet: <span className="font-bold tabular-nums">{state.wallet}</span> XP
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {state.catalog.length} items in catalog
          </p>
        </div>
      </aside>
    </div>
  );
}
