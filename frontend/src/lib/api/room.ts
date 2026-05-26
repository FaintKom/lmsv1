/**
 * Typed wrappers around /api/v1/gamification/room/* endpoints.
 * Response shapes mirror backend Pydantic schemas (RoomStateResponse etc.).
 */
import apiClient from "@/lib/api-client";

export interface RoomCatalogItem {
  id: string;
  slot: string;
  group_name: string;
  name: string;
  i18n_key: string;
  price: number;
  is_default: boolean;
  swatch: string | null;
  color_hex: string | null;
  floor_type: string | null;
  /** 'room' (furniture/decor) or 'avatar' (character parts). */
  item_type: "room" | "avatar";
}

export interface RoomEquipOffset {
  item_id: string | null;
  offset_dx: number;
  offset_dy: number;
  offset_dz: number;
  /** Rotation around Y, degrees in [0, 360). */
  offset_rot: number;
}

export interface RoomState {
  wallet: number;
  equipped: Record<string, RoomEquipOffset>;
  catalog: RoomCatalogItem[];
}

export interface RoomEquipPayload {
  slot: string;
  item_id: string | null;
}

export interface RoomLayoutPayload {
  slot: string;
  offset_dx: number;
  offset_dy: number;
  offset_dz: number;
  offset_rot: number;
}

export async function fetchRoomState(): Promise<RoomState> {
  const { data } = await apiClient.get<RoomState>("/gamification/room/state");
  return data;
}

export async function equipRoomItem(payload: RoomEquipPayload): Promise<RoomState> {
  const { data } = await apiClient.post<RoomState>("/gamification/room/equip", payload);
  return data;
}

export async function setRoomLayout(payload: RoomLayoutPayload): Promise<RoomState> {
  const { data } = await apiClient.post<RoomState>("/gamification/room/layout", payload);
  return data;
}
