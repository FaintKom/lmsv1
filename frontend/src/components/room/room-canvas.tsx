"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import type { RoomState } from "@/lib/api/room";
import { AVATAR_EQUIP_KEY, AVATAR_SLOTS, type AvatarSlot } from "@/lib/avatar/catalog";
import type { AvatarEquip } from "@/lib/avatar/voxels";
import type { FloorType } from "@/lib/room/voxels";

import {
  type PlacedInstance,
  type RoomSceneCallbacks,
  useRoomScene,
} from "./use-room-scene";

interface RoomCanvasProps {
  state: RoomState;
  /** Edit mode: allow clicking instances to select them. Default false (view). */
  editable?: boolean;
  /** Selection changed (id, or null when cleared). Movement is button-driven. */
  onSelect?: (id: string | null) => void;
}

/** Imperative handle for the camera HUD buttons + selection sync. */
export interface RoomCanvasHandle {
  resetCamera: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setSelected: (id: string | null) => void;
}

export const RoomCanvas = forwardRef<RoomCanvasHandle, RoomCanvasProps>(function RoomCanvas(
  { state, editable = false, onSelect },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Keep the latest callbacks in a ref so the scene reads them without remount.
  const callbacksRef = useRef<RoomSceneCallbacks>({});
  useEffect(() => {
    callbacksRef.current = { onSelect };
  }, [onSelect]);
  const { api, ready } = useRoomScene(canvasRef, callbacksRef);

  useImperativeHandle(
    ref,
    () => ({
      resetCamera: () => api?.resetCamera(),
      zoomIn: () => api?.zoom(-2),
      zoomOut: () => api?.zoom(2),
      setSelected: (id: string | null) => api?.setSelected(id),
    }),
    [api],
  );

  const byId = useMemo(() => {
    const map = new Map<string, RoomState["catalog"][number]>();
    for (const item of state.catalog) map.set(item.id, item);
    return map;
  }, [state.catalog]);

  useEffect(() => {
    if (ready && api) api.setEditable(editable);
  }, [ready, api, editable]);

  // Wall colour.
  const wallItemId = state.equipped.wall?.item_id ?? null;
  useEffect(() => {
    if (!ready || !api || !wallItemId) return;
    api.setWall(byId.get(wallItemId)?.color_hex ?? null);
  }, [ready, api, wallItemId, byId]);

  // Floor type.
  const floorItemId = state.equipped.floor?.item_id ?? null;
  useEffect(() => {
    if (!ready || !api || !floorItemId) return;
    api.setFloor((byId.get(floorItemId)?.floor_type ?? "wood") as FloorType);
  }, [ready, api, floorItemId, byId]);

  // Freeform placed instances.
  const placed = useMemo<PlacedInstance[]>(
    () =>
      state.placed.map((p) => ({
        id: p.id,
        itemId: p.item_id,
        x: p.x,
        y: p.y,
        z: p.z,
        rot: p.rot,
        scale: p.scale,
      })),
    [state.placed],
  );
  useEffect(() => {
    if (ready && api) api.setPlaced(placed);
  }, [ready, api, placed]);

  // Avatar.
  const avatarEquip = useMemo<AvatarEquip>(() => {
    const out: AvatarEquip = {};
    for (const slot of AVATAR_SLOTS) {
      out[AVATAR_EQUIP_KEY[slot as AvatarSlot]] = state.equipped[slot]?.item_id ?? null;
    }
    return out;
  }, [state.equipped]);
  const avatarOffset = state.equipped.avatar ?? {
    offset_dx: 0,
    offset_dy: 0,
    offset_dz: 0,
    offset_rot: 0,
  };
  useEffect(() => {
    if (!ready || !api) return;
    api.setAvatar(
      avatarEquip,
      avatarOffset.offset_dx,
      avatarOffset.offset_dy,
      avatarOffset.offset_dz,
      avatarOffset.offset_rot,
    );
  }, [
    ready,
    api,
    avatarEquip,
    avatarOffset.offset_dx,
    avatarOffset.offset_dy,
    avatarOffset.offset_dz,
    avatarOffset.offset_rot,
  ]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none select-none"
      style={{
        background: "radial-gradient(ellipse at 50% 70%, #efeae0 0%, #d6c9b6 100%)",
      }}
    />
  );
});
