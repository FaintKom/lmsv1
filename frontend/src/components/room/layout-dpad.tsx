"use client";

import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Circle } from "lucide-react";

import type { RoomState } from "@/lib/api/room";
import { useSetLayout } from "@/hooks/use-room";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { MOVABLE_SLOTS, MOVE_AXES, TIES } from "@/lib/room/placement";

import { ItemPreview } from "./item-preview";

interface LayoutDPadProps {
  state: RoomState;
}

export function LayoutDPad({ state }: LayoutDPadProps) {
  const { t } = useTranslation();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const setLayout = useSetLayout();

  // Only show movable slots that currently have an item equipped.
  const movableEquipped = MOVABLE_SLOTS.filter(
    (slot) => state.equipped[slot]?.item_id,
  );

  const byId = new Map(state.catalog.map((i) => [i.id, i]));

  const selected = selectedSlot ? state.equipped[selectedSlot] : null;
  const axes = selectedSlot ? MOVE_AXES[selectedSlot] ?? [] : [];

  function move(dx: number, dz: number): void {
    if (!selectedSlot || !selected) return;
    const newDx = clamp((selected.offset_dx ?? 0) + dx, -12, 12);
    const newDz = clamp((selected.offset_dz ?? 0) + dz, -12, 12);
    setLayout.mutate({ slot: selectedSlot, offset_dx: newDx, offset_dz: newDz });
  }

  function reset(): void {
    if (!selectedSlot) return;
    setLayout.mutate({ slot: selectedSlot, offset_dx: 0, offset_dz: 0 });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <p className="text-[11px] text-text-muted">{t("room.layout.helper")}</p>

      {/* Movable slot cards */}
      <div className="grid grid-cols-2 gap-2.5 overflow-y-auto pr-1">
        {movableEquipped.map((slot) => {
          const equip = state.equipped[slot];
          if (!equip?.item_id) return null;
          const item = byId.get(equip.item_id);
          if (!item) return null;
          const isSelected = slot === selectedSlot;
          const dx = equip.offset_dx ?? 0;
          const dz = equip.offset_dz ?? 0;
          const moved = dx !== 0 || dz !== 0;
          const tiedCount = TIES[slot]?.length ?? 0;
          return (
            <button
              key={slot}
              type="button"
              onClick={() => setSelectedSlot(slot)}
              className={cn(
                "flex flex-col gap-2 rounded-[12px] border bg-paper-2 p-2 text-left transition-all",
                isSelected ? "border-green-500 shadow-sm" : "border-ink-100 hover:border-green-300",
              )}
            >
              <div className="aspect-[10/7] overflow-hidden rounded-md bg-white p-2">
                <ItemPreview id={item.id} />
              </div>
              <p className="truncate text-[12px] font-semibold text-ink-700">
                {t(item.i18n_key) || item.name}
              </p>
              <div className="flex items-center gap-1 text-[10px] font-medium">
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5",
                    moved ? "bg-coral-50 text-coral-700" : "bg-ink-100 text-text-muted",
                  )}
                >
                  {moved ? `Δ +${dx}, +${dz}` : t("room.layout.default")}
                </span>
                {tiedCount > 0 && (
                  <span className="rounded-full bg-yellow-100 px-1.5 py-0.5 text-yellow-800">
                    +{tiedCount} {t("room.layout.tied")}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* D-pad */}
      <div className="mt-auto grid grid-cols-3 gap-1 self-center">
        <DPadButton disabled ariaLabel="" onClick={() => {}}>
          <span />
        </DPadButton>
        <DPadButton
          disabled={!selectedSlot || !axes.includes("z")}
          ariaLabel={t("room.layout.dpad.up")}
          onClick={() => move(0, -1)}
        >
          <ArrowUp className="h-4 w-4" />
        </DPadButton>
        <DPadButton disabled ariaLabel="" onClick={() => {}}>
          <span />
        </DPadButton>

        <DPadButton
          disabled={!selectedSlot || !axes.includes("x")}
          ariaLabel={t("room.layout.dpad.left")}
          onClick={() => move(-1, 0)}
        >
          <ArrowLeft className="h-4 w-4" />
        </DPadButton>
        <DPadButton
          disabled={!selectedSlot}
          ariaLabel={t("room.layout.dpad.reset")}
          onClick={reset}
        >
          <Circle className="h-3 w-3" />
        </DPadButton>
        <DPadButton
          disabled={!selectedSlot || !axes.includes("x")}
          ariaLabel={t("room.layout.dpad.right")}
          onClick={() => move(1, 0)}
        >
          <ArrowRight className="h-4 w-4" />
        </DPadButton>

        <DPadButton disabled ariaLabel="" onClick={() => {}}>
          <span />
        </DPadButton>
        <DPadButton
          disabled={!selectedSlot || !axes.includes("z")}
          ariaLabel={t("room.layout.dpad.down")}
          onClick={() => move(0, 1)}
        >
          <ArrowDown className="h-4 w-4" />
        </DPadButton>
        <DPadButton disabled ariaLabel="" onClick={() => {}}>
          <span />
        </DPadButton>
      </div>
    </div>
  );
}

function DPadButton({
  children,
  disabled,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "grid h-[38px] w-[38px] place-items-center rounded-lg border border-ink-100 bg-paper-2 text-ink-700 transition-colors",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-green-400 hover:bg-green-50 hover:text-green-800",
      )}
    >
      {children}
    </button>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
