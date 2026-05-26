"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Circle,
  RotateCcw,
  RotateCw,
  UserCircle,
} from "lucide-react";

import type { RoomState } from "@/lib/api/room";
import { useSetLayout } from "@/hooks/use-room";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { MOVABLE_SLOTS, MOVE_AXES, ROT_STEP_DEG } from "@/lib/room/placement";

import { ItemPreview } from "./item-preview";

interface LayoutDPadProps {
  state: RoomState;
}

export function LayoutDPad({ state }: LayoutDPadProps) {
  const { t } = useTranslation();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const setLayout = useSetLayout();

  // Show every movable slot the user has -- equipped items + the always-present
  // avatar (the avatar virtual slot has no item_id but is still positionable).
  const movableShown = MOVABLE_SLOTS.filter((slot) => {
    if (slot === "avatar") return true;
    return Boolean(state.equipped[slot]?.item_id);
  });

  const byId = new Map(state.catalog.map((i) => [i.id, i]));

  const selected = selectedSlot ? state.equipped[selectedSlot] : null;
  const axes = selectedSlot ? MOVE_AXES[selectedSlot] ?? [] : [];

  function send(dx: number, dy: number, dz: number, rot: number): void {
    if (!selectedSlot) return;
    setLayout.mutate({
      slot: selectedSlot,
      offset_dx: dx,
      offset_dy: dy,
      offset_dz: dz,
      offset_rot: ((rot % 360) + 360) % 360,
    });
  }

  function cur() {
    return selected ?? { offset_dx: 0, offset_dy: 0, offset_dz: 0, offset_rot: 0 };
  }

  function move(deltaDx: number, deltaDz: number): void {
    if (!selectedSlot) return;
    const c = cur();
    const newDx = clamp((c.offset_dx ?? 0) + deltaDx, -12, 12);
    const newDz = clamp((c.offset_dz ?? 0) + deltaDz, -12, 12);
    send(newDx, c.offset_dy ?? 0, newDz, c.offset_rot ?? 0);
  }

  function lift(deltaDy: number): void {
    if (!selectedSlot) return;
    const c = cur();
    const newDy = clamp((c.offset_dy ?? 0) + deltaDy, -24, 24);
    send(c.offset_dx ?? 0, newDy, c.offset_dz ?? 0, c.offset_rot ?? 0);
  }

  function rotate(deltaDeg: number): void {
    if (!selectedSlot) return;
    const c = cur();
    send(c.offset_dx ?? 0, c.offset_dy ?? 0, c.offset_dz ?? 0, (c.offset_rot ?? 0) + deltaDeg);
  }

  function reset(): void {
    if (!selectedSlot) return;
    setLayout.mutate({
      slot: selectedSlot,
      offset_dx: 0,
      offset_dy: 0,
      offset_dz: 0,
      offset_rot: 0,
    });
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <p className="text-[11px] text-text-muted">{t("room.layout.helper")}</p>

      <div className="grid grid-cols-2 gap-2.5 overflow-y-auto pr-1">
        {movableShown.map((slot) => {
          const equip = state.equipped[slot];
          const isSelected = slot === selectedSlot;
          const dx = equip?.offset_dx ?? 0;
          const dy = equip?.offset_dy ?? 0;
          const dz = equip?.offset_dz ?? 0;
          const rot = equip?.offset_rot ?? 0;
          const moved = dx !== 0 || dy !== 0 || dz !== 0 || rot !== 0;

          if (slot === "avatar") {
            return (
              <SlotCard
                key={slot}
                isSelected={isSelected}
                onClick={() => setSelectedSlot(slot)}
                title={t("nav.myAvatar")}
                preview={
                  <div className="grid h-full place-items-center text-ink-700">
                    <UserCircle className="h-12 w-12" strokeWidth={1.5} />
                  </div>
                }
                deltaLabel={
                  moved
                    ? `Δ +${dx}, +${dy}, +${dz}${rot ? `, ${rot}°` : ""}`
                    : t("room.layout.default")
                }
                moved={moved}
              />
            );
          }

          const item = equip?.item_id ? byId.get(equip.item_id) : null;
          if (!item) return null;
          return (
            <SlotCard
              key={slot}
              isSelected={isSelected}
              onClick={() => setSelectedSlot(slot)}
              title={t(item.i18n_key) || item.name}
              preview={<ItemPreview id={item.id} />}
              deltaLabel={
                moved
                  ? `Δ +${dx}, +${dz}${rot ? `, ${rot}°` : ""}`
                  : t("room.layout.default")
              }
              moved={moved}
            />
          );
        })}
      </div>

      <div className="mt-auto flex items-center justify-center gap-4">
        <div className="grid grid-cols-3 gap-1">
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

        <div className="flex flex-col gap-1">
          <DPadButton
            disabled={!selectedSlot || !axes.includes("y")}
            ariaLabel={t("room.layout.dpad.liftUp")}
            onClick={() => lift(1)}
          >
            <ChevronsUp className="h-4 w-4" />
          </DPadButton>
          <DPadButton
            disabled={!selectedSlot || !axes.includes("y")}
            ariaLabel={t("room.layout.dpad.liftDown")}
            onClick={() => lift(-1)}
          >
            <ChevronsDown className="h-4 w-4" />
          </DPadButton>
        </div>
        <div className="flex flex-col gap-1">
          <DPadButton
            disabled={!selectedSlot}
            ariaLabel={t("room.layout.dpad.rotateLeft")}
            onClick={() => rotate(-ROT_STEP_DEG)}
          >
            <RotateCcw className="h-4 w-4" />
          </DPadButton>
          <DPadButton
            disabled={!selectedSlot}
            ariaLabel={t("room.layout.dpad.rotateRight")}
            onClick={() => rotate(ROT_STEP_DEG)}
          >
            <RotateCw className="h-4 w-4" />
          </DPadButton>
        </div>
      </div>
    </div>
  );
}

function SlotCard({
  isSelected,
  onClick,
  title,
  preview,
  deltaLabel,
  moved,
}: {
  isSelected: boolean;
  onClick: () => void;
  title: string;
  preview: React.ReactNode;
  deltaLabel: string;
  moved: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 rounded-[12px] border bg-paper-2 p-2 text-left transition-all",
        isSelected ? "border-green-500 shadow-sm" : "border-ink-100 hover:border-green-300",
      )}
    >
      <div className="aspect-[10/7] overflow-hidden rounded-md bg-white p-2">{preview}</div>
      <p className="truncate text-[12px] font-semibold text-ink-700">{title}</p>
      <span
        className={cn(
          "self-start rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          moved ? "bg-coral-50 text-coral-700" : "bg-ink-100 text-text-muted",
        )}
      >
        {deltaLabel}
      </span>
    </button>
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
