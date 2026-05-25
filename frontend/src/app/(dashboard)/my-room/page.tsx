"use client";

import { useRef } from "react";

import { RoomCanvas, type RoomCanvasHandle } from "@/components/room/room-canvas";
import { SceneHud } from "@/components/room/scene-hud";
import { ShopPanel } from "@/components/room/shop-panel";
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

      {/* Shop */}
      <aside className="overflow-y-auto border-t border-ink-100 bg-paper-2 lg:border-l lg:border-t-0">
        <ShopPanel state={state} />
      </aside>
    </div>
  );
}
