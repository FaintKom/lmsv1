/**
 * Typed wrappers + TanStack Query hooks around /api/v1/rooms/* and the
 * journal room-board endpoint.
 *
 * Rooms are org-level managed spaces (name + capacity + site). Teachers may
 * read the list (for the schedule room dropdown); only methodist / admin /
 * super_admin may create / update / delete. Response shapes mirror the backend
 * handlers in app/rooms/router.py and app/journal/router.py.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import apiClient from "@/lib/api-client";

/** A room's kind: a physical room (offline) or a virtual meeting room (online). */
export type RoomKind = "offline" | "online";

export interface Room {
  id: string;
  org_id: string;
  name: string;
  capacity: number | null;
  site: string;
  /** Physical room (offline) or virtual meeting room (online). */
  kind: RoomKind;
  /** Permanent meeting link — only set for online rooms. */
  meeting_url: string | null;
  /** Optional FK to a managed site (null for online / unsited rooms). */
  site_id: string | null;
  active: boolean;
}

export interface RoomsResponse {
  rooms: Room[];
}

export interface RoomCreate {
  name: string;
  capacity?: number | null;
  site?: string;
  kind?: RoomKind;
  meeting_url?: string | null;
  site_id?: string | null;
}

export interface RoomUpdate {
  name?: string;
  capacity?: number | null;
  site?: string;
  active?: boolean;
  kind?: RoomKind;
  meeting_url?: string | null;
  site_id?: string | null;
}

// ── Room board (journal) ────────────────────────────────────────────────

export interface RoomBoardSlot {
  slot_id: string;
  course_id: string;
  course_title: string;
  start_time: string;
  end_time: string;
}

export interface RoomBoardRoom {
  room_id: string;
  room_name: string;
  site: string;
  site_id: string | null;
  kind: RoomKind;
  /** Convenience flag for the UI: render a Video icon when kind === "online". */
  video: boolean;
  meeting_url: string | null;
  capacity: number | null;
  active: boolean;
  slots: RoomBoardSlot[];
  utilization: number;
}

export interface RoomBoardConflict {
  room_id: string;
  room_name: string;
  slot_ids: string[];
  start_time: string;
  end_time: string;
}

export interface RoomBoardResponse {
  date: string;
  rooms: RoomBoardRoom[];
  conflicts: RoomBoardConflict[];
}

// ── Raw API functions ──────────────────────────────────────────────────

export async function fetchRooms(): Promise<RoomsResponse> {
  const { data } = await apiClient.get<RoomsResponse>("/rooms");
  return data;
}

export async function createRoom(body: RoomCreate): Promise<Room> {
  const { data } = await apiClient.post<Room>("/rooms", body);
  return data;
}

export async function updateRoom(
  roomId: string,
  body: RoomUpdate,
): Promise<Room> {
  const { data } = await apiClient.put<Room>(`/rooms/${roomId}`, body);
  return data;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await apiClient.delete(`/rooms/${roomId}`);
}

export async function fetchRoomBoard(date: string): Promise<RoomBoardResponse> {
  const { data } = await apiClient.get<RoomBoardResponse>(
    "/journal/room-board",
    { params: { date } },
  );
  return data;
}

// ── Query hooks ────────────────────────────────────────────────────────

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: fetchRooms,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRoomBoard(date: string) {
  return useQuery({
    queryKey: ["rooms", "board", date],
    queryFn: () => fetchRoomBoard(date),
    enabled: !!date,
    staleTime: 5 * 60 * 1000,
  });
}

function useInvalidateRooms() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["rooms"] });
  };
}

export function useCreateRoom() {
  const invalidate = useInvalidateRooms();
  return useMutation({
    mutationFn: (body: RoomCreate) => createRoom(body),
    onSuccess: invalidate,
  });
}

export function useUpdateRoom() {
  const invalidate = useInvalidateRooms();
  return useMutation({
    mutationFn: ({ roomId, body }: { roomId: string; body: RoomUpdate }) =>
      updateRoom(roomId, body),
    onSuccess: invalidate,
  });
}

export function useDeleteRoom() {
  const invalidate = useInvalidateRooms();
  return useMutation({
    mutationFn: (roomId: string) => deleteRoom(roomId),
    onSuccess: invalidate,
  });
}
