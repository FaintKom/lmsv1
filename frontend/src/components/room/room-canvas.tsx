"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import type { RoomState } from "@/lib/api/room";
import { AVATAR_EQUIP_KEY, AVATAR_SLOTS, type AvatarSlot } from "@/lib/avatar/catalog";
import type { AvatarEquip } from "@/lib/avatar/voxels";
import { TIES } from "@/lib/room/placement";
import type { FloorType } from "@/lib/room/voxels";

import { useRoomScene, type RoomSceneApi } from "./use-room-scene";

interface RoomCanvasProps {
  state: RoomState;
}

/** Imperative handle for the camera HUD buttons. */
export interface RoomCanvasHandle {
  resetCamera: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const RoomCanvas = forwardRef<RoomCanvasHandle, RoomCanvasProps>(function RoomCanvas(
  { state },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { api, ready } = useRoomScene(canvasRef);

  useImperativeHandle(
    ref,
    () => ({
      resetCamera: () => api?.resetCamera(),
      zoomIn: () => api?.zoom(-2),
      zoomOut: () => api?.zoom(2),
    }),
    [api],
  );

  // Catalog lookups keyed by id (cheap; runs only when catalog changes).
  const byId = useMemo(() => {
    const map = new Map<string, RoomState["catalog"][number]>();
    for (const item of state.catalog) map.set(item.id, item);
    return map;
  }, [state.catalog]);

  // Walls + floor sync — only when those slots change.
  const wallItemId = state.equipped.wall?.item_id ?? null;
  useEffect(() => {
    if (!ready || !api) return;
    if (!wallItemId) return;
    const item = byId.get(wallItemId);
    api.setWall(item?.color_hex ?? null);
  }, [ready, api, wallItemId, byId]);

  const floorItemId = state.equipped.floor?.item_id ?? null;
  useEffect(() => {
    if (!ready || !api) return;
    if (!floorItemId) return;
    const item = byId.get(floorItemId);
    const type = (item?.floor_type ?? "wood") as FloorType;
    api.setFloor(type);
  }, [ready, api, floorItemId, byId]);

  // Everything else — when equipped or offsets change.
  useEffect(() => {
    if (!ready || !api) return;
    syncSlots(api, state);
  }, [ready, api, state]);

  // Avatar — rebuild whenever an avatar slot changes.
  const avatarEquip = useMemo<AvatarEquip>(() => {
    const out: AvatarEquip = {};
    for (const slot of AVATAR_SLOTS) {
      const key = AVATAR_EQUIP_KEY[slot as AvatarSlot];
      out[key] = state.equipped[slot]?.item_id ?? null;
    }
    return out;
  }, [state.equipped]);

  useEffect(() => {
    if (!ready || !api) return;
    api.setAvatar(avatarEquip);
  }, [ready, api, avatarEquip]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none select-none"
      style={{
        background:
          "radial-gradient(ellipse at 50% 70%, #efeae0 0%, #d6c9b6 100%)",
      }}
    />
  );
});

/**
 * Walk every slot in the equipped map (except wall/floor) and push it into the
 * scene with its composed offset. Tied children inherit their parent's offset.
 */
function syncSlots(api: RoomSceneApi, state: RoomState): void {
  // Map child slot → parent slot for quick lookup.
  const parentOf = new Map<string, string>();
  for (const [parent, children] of Object.entries(TIES)) {
    for (const child of children) parentOf.set(child, parent);
  }

  for (const [slot, payload] of Object.entries(state.equipped)) {
    if (slot === "wall" || slot === "floor") continue;
    if (slot.startsWith("avatar_")) continue; // handled by setAvatar
    const parent = parentOf.get(slot);
    let dx = payload.offset_dx;
    let dz = payload.offset_dz;
    if (parent) {
      const parentEquip = state.equipped[parent];
      if (parentEquip) {
        dx = parentEquip.offset_dx;
        dz = parentEquip.offset_dz;
      }
    }
    api.setSlot(slot, payload.item_id, dx, dz);
  }
}
