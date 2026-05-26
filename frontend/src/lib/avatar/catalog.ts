/**
 * Avatar slot helpers + item-type filters used by the avatar builder
 * and the room scene.
 */

export const AVATAR_SLOTS = [
  "avatar_body",
  "avatar_hair",
  "avatar_face",
  "avatar_outfit",
  "avatar_hat",
  "avatar_glasses",
  "avatar_back",
  "avatar_hand",
  // legacy single-slot accessory -- kept for backwards compat
  "avatar_accessory",
] as const;

export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

type AvatarEquipKey =
  | "body"
  | "hair"
  | "face"
  | "outfit"
  | "hat"
  | "glasses"
  | "back"
  | "hand"
  | "accessory";

/** Maps an avatar slot to the AvatarEquip key consumed by buildAvatar(). */
export const AVATAR_EQUIP_KEY: Record<AvatarSlot, AvatarEquipKey> = {
  avatar_body: "body",
  avatar_hair: "hair",
  avatar_face: "face",
  avatar_outfit: "outfit",
  avatar_hat: "hat",
  avatar_glasses: "glasses",
  avatar_back: "back",
  avatar_hand: "hand",
  avatar_accessory: "accessory",
};

export function isAvatarSlot(slot: string): slot is AvatarSlot {
  return (AVATAR_SLOTS as readonly string[]).includes(slot);
}
