/**
 * Avatar slot helpers + item-type filters used by the avatar builder
 * and the room scene.
 */

export const AVATAR_SLOTS = [
  "avatar_hair",
  "avatar_face",
  "avatar_outfit",
  "avatar_accessory",
] as const;

export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

/** Maps an avatar slot to the AvatarEquip key consumed by buildAvatar(). */
export const AVATAR_EQUIP_KEY: Record<AvatarSlot, "hair" | "face" | "outfit" | "accessory"> = {
  avatar_hair: "hair",
  avatar_face: "face",
  avatar_outfit: "outfit",
  avatar_accessory: "accessory",
};

export function isAvatarSlot(slot: string): slot is AvatarSlot {
  return (AVATAR_SLOTS as readonly string[]).includes(slot);
}
