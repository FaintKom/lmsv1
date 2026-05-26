/**
 * TanStack Query hooks for the My Room feature.
 *
 * Optimistic strategy: equip/layout mutations write to the cache immediately,
 * then the server response (which returns the full state) replaces it.
 * On error, React Query rolls back via the onError handler.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  type RoomEquipPayload,
  type RoomLayoutPayload,
  type RoomState,
  equipRoomItem,
  fetchRoomState,
  setRoomLayout,
} from "@/lib/api/room";

const ROOM_QUERY_KEY = ["gamification", "room", "state"] as const;

export function useRoomState() {
  return useQuery<RoomState>({
    queryKey: ROOM_QUERY_KEY,
    queryFn: fetchRoomState,
    staleTime: 30_000,
  });
}

export function useEquipItem() {
  const qc = useQueryClient();

  return useMutation<RoomState, Error, RoomEquipPayload, { previous: RoomState | undefined }>({
    mutationFn: equipRoomItem,
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ROOM_QUERY_KEY });
      const previous = qc.getQueryData<RoomState>(ROOM_QUERY_KEY);
      if (previous) {
        const existing = previous.equipped[payload.slot] ?? {
          item_id: null,
          offset_dx: 0,
          offset_dy: 0,
          offset_dz: 0,
          offset_rot: 0,
        };
        qc.setQueryData<RoomState>(ROOM_QUERY_KEY, {
          ...previous,
          equipped: {
            ...previous.equipped,
            [payload.slot]: { ...existing, item_id: payload.item_id },
          },
        });
      }
      return { previous };
    },
    onError: (err, _payload, ctx) => {
      if (ctx?.previous) qc.setQueryData(ROOM_QUERY_KEY, ctx.previous);
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        err.message ||
        "Failed to equip item";
      toast.error(message);
    },
    onSuccess: (state) => {
      qc.setQueryData(ROOM_QUERY_KEY, state);
    },
  });
}

export function useSetLayout() {
  const qc = useQueryClient();

  return useMutation<RoomState, Error, RoomLayoutPayload, { previous: RoomState | undefined }>({
    mutationFn: setRoomLayout,
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ROOM_QUERY_KEY });
      const previous = qc.getQueryData<RoomState>(ROOM_QUERY_KEY);
      if (previous) {
        const existing = previous.equipped[payload.slot] ?? {
          item_id: null,
          offset_dx: 0,
          offset_dy: 0,
          offset_dz: 0,
          offset_rot: 0,
        };
        qc.setQueryData<RoomState>(ROOM_QUERY_KEY, {
          ...previous,
          equipped: {
            ...previous.equipped,
            [payload.slot]: {
              ...existing,
              offset_dx: payload.offset_dx,
              offset_dy: payload.offset_dy,
              offset_dz: payload.offset_dz,
              offset_rot: payload.offset_rot,
            },
          },
        });
      }
      return { previous };
    },
    onError: (err, _payload, ctx) => {
      if (ctx?.previous) qc.setQueryData(ROOM_QUERY_KEY, ctx.previous);
      toast.error(err.message || "Failed to move item");
    },
    onSuccess: (state) => {
      qc.setQueryData(ROOM_QUERY_KEY, state);
    },
  });
}
