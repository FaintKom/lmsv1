/**
 * Voxel character builder for the My Avatar feature.
 *
 * The character is centered around the origin in voxel coordinates:
 *   feet at y=0, head top around y=7.5.
 *   width spans roughly x = -1 .. +1 (body) with arms outside that.
 *
 * Each builder returns a THREE.Group. buildAvatar() stacks them.
 */
import * as THREE from "three";

import { COL, VOX, darker, vbox } from "@/lib/room/voxels";

const SKIN = 0xe8b89a;
const SKIN_DARK = darker(SKIN, 0.85);

// Helper: vbox positioned relative to (0,0,0) origin of the character group.
function box(
  g: THREE.Group,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
  opts: { transparent?: boolean; opacity?: number } = {},
): void {
  vbox(g, x, y, z, w, h, d, color, opts);
}

// ── core body (always rendered, neutral skin) ──────────────────────────

export function buildBody(): THREE.Group {
  const g = new THREE.Group();
  box(g, -0.6, 0, -0.4, 0.6, 2.2, 0.8, SKIN);
  box(g, 0.0, 0, -0.4, 0.6, 2.2, 0.8, SKIN);
  box(g, -0.8, 2.2, -0.5, 1.6, 2.4, 1.0, SKIN);
  box(g, -1.4, 2.3, -0.45, 0.6, 2.2, 0.9, SKIN);
  box(g, 0.8, 2.3, -0.45, 0.6, 2.2, 0.9, SKIN);
  box(g, -0.3, 4.6, -0.3, 0.6, 0.4, 0.6, SKIN_DARK);
  box(g, -0.8, 5.0, -0.6, 1.6, 1.7, 1.2, SKIN);
  box(g, -0.9, 5.5, -0.4, 0.1, 0.4, 0.5, SKIN);
  box(g, 0.8, 5.5, -0.4, 0.1, 0.4, 0.5, SKIN);
  return g;
}

// ── hair (6 variants) ──────────────────────────────────────────────────

export function buildHair(variant: string): THREE.Group {
  const g = new THREE.Group();
  switch (variant) {
    case "avatar-hair-bald":
      return g;
    case "avatar-hair-long": {
      const c = 0xf5d272;
      box(g, -0.9, 6.7, -0.7, 1.8, 0.3, 1.3, c);
      box(g, -0.9, 4.4, -0.7, 0.3, 2.5, 1.2, c);
      box(g, 0.6, 4.4, -0.7, 0.3, 2.5, 1.2, c);
      box(g, -0.7, 6.6, -0.7, 1.4, 0.5, 0.2, c);
      return g;
    }
    case "avatar-hair-curly": {
      const c = 0xc94335;
      box(g, -1.0, 6.5, -0.7, 2.0, 0.7, 1.3, c);
      box(g, -1.0, 5.8, -0.7, 0.3, 0.8, 1.2, c);
      box(g, 0.7, 5.8, -0.7, 0.3, 0.8, 1.2, c);
      box(g, -0.4, 7.1, -0.3, 0.8, 0.4, 0.6, c);
      return g;
    }
    case "avatar-hair-bun": {
      const c = 0x6b4422;
      box(g, -0.9, 6.6, -0.7, 1.8, 0.3, 1.3, c);
      box(g, -0.45, 7.0, -0.05, 0.9, 0.7, 0.6, c);
      return g;
    }
    case "avatar-hair-mohawk": {
      const c = 0xff7a5c;
      box(g, -0.25, 6.7, -0.3, 0.5, 1.2, 0.6, c);
      box(g, -0.15, 7.7, -0.2, 0.3, 0.4, 0.4, c);
      return g;
    }
    case "avatar-hair-short":
    default: {
      const c = 0x6b4422;
      // top cap
      box(g, -0.9, 6.6, -0.7, 1.8, 0.4, 1.4, c);
      // wrap-around to cover the full head, not just thin strips
      box(g, -0.9, 5.6, -0.75, 1.8, 1.0, 0.2, c); // back face
      box(g, -0.9, 5.6, 0.55, 1.8, 1.0, 0.2, c); // front bangs
      box(g, -0.95, 5.6, -0.5, 0.2, 1.0, 1.1, c); // left side
      box(g, 0.75, 5.6, -0.5, 0.2, 1.0, 1.1, c); // right side
      return g;
    }
  }
}

// ── face (6 variants) ──────────────────────────────────────────────────

export function buildFace(variant: string): THREE.Group {
  const g = new THREE.Group();
  const eyeZ = -0.65;
  switch (variant) {
    case "avatar-face-wink": {
      box(g, -0.45, 6.0, eyeZ, 0.2, 0.05, 0.05, COL.black);
      box(g, 0.25, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, -0.3, 5.5, eyeZ, 0.6, 0.1, 0.05, COL.coral);
      return g;
    }
    case "avatar-face-blush": {
      box(g, -0.4, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, 0.2, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, -0.25, 5.5, eyeZ, 0.5, 0.1, 0.05, COL.coral);
      box(g, -0.75, 5.7, eyeZ, 0.3, 0.2, 0.05, 0xff8fa6, { transparent: true, opacity: 0.7 });
      box(g, 0.45, 5.7, eyeZ, 0.3, 0.2, 0.05, 0xff8fa6, { transparent: true, opacity: 0.7 });
      return g;
    }
    case "avatar-face-cool": {
      box(g, -0.65, 5.95, eyeZ, 1.3, 0.35, 0.07, COL.black);
      box(g, -0.05, 6.05, eyeZ, 0.1, 0.05, 0.07, COL.black);
      box(g, -0.25, 5.5, eyeZ, 0.5, 0.1, 0.05, COL.charcoal);
      return g;
    }
    case "avatar-face-determined": {
      box(g, -0.5, 6.05, eyeZ, 0.3, 0.05, 0.05, COL.black);
      box(g, 0.2, 6.05, eyeZ, 0.3, 0.05, 0.05, COL.black);
      box(g, -0.4, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, 0.2, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, -0.3, 5.5, eyeZ, 0.6, 0.08, 0.05, COL.charcoal);
      return g;
    }
    case "avatar-face-glasses": {
      box(g, -0.5, 5.9, eyeZ, 0.45, 0.4, 0.05, COL.black);
      box(g, 0.05, 5.9, eyeZ, 0.45, 0.4, 0.05, COL.black);
      box(g, -0.42, 5.98, eyeZ + 0.02, 0.3, 0.25, 0.03, 0x9fc6d9, { transparent: true, opacity: 0.5 });
      box(g, 0.13, 5.98, eyeZ + 0.02, 0.3, 0.25, 0.03, 0x9fc6d9, { transparent: true, opacity: 0.5 });
      box(g, -0.05, 6.0, eyeZ, 0.1, 0.05, 0.05, COL.black);
      box(g, -0.2, 5.5, eyeZ, 0.4, 0.1, 0.05, COL.coral);
      return g;
    }
    case "avatar-face-smile":
    default: {
      box(g, -0.4, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, 0.2, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, -0.3, 5.5, eyeZ, 0.6, 0.1, 0.05, COL.coral);
      box(g, -0.4, 5.4, eyeZ, 0.1, 0.1, 0.05, COL.coral);
      box(g, 0.3, 5.4, eyeZ, 0.1, 0.1, 0.05, COL.coral);
      return g;
    }
  }
}

// ── outfit (6 variants) ────────────────────────────────────────────────

export function buildOutfit(variant: string): THREE.Group {
  const g = new THREE.Group();
  switch (variant) {
    case "avatar-outfit-cozy": {
      const c = COL.cream;
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      box(g, -1.45, 2.3, -0.5, 0.65, 2.3, 1.0, c);
      box(g, 0.8, 2.3, -0.5, 0.65, 2.3, 1.0, c);
      box(g, -0.6, 0, -0.45, 0.7, 2.3, 0.9, COL.woodMid);
      box(g, -0.05, 0, -0.45, 0.7, 2.3, 0.9, COL.woodMid);
      return g;
    }
    case "avatar-outfit-hoodie": {
      const c = 0x4a9b66;
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      box(g, -1.45, 2.3, -0.5, 0.65, 2.3, 1.0, c);
      box(g, 0.8, 2.3, -0.5, 0.65, 2.3, 1.0, c);
      box(g, -0.85, 4.3, -0.7, 1.7, 0.5, 1.3, c);
      box(g, -0.6, 0, -0.45, 0.7, 2.3, 0.9, COL.charcoal);
      box(g, -0.05, 0, -0.45, 0.7, 2.3, 0.9, COL.charcoal);
      return g;
    }
    case "avatar-outfit-dress": {
      const c = 0xff7a5c;
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      box(g, -1.0, 0.5, -0.65, 2.0, 1.8, 1.3, c);
      box(g, -1.45, 2.7, -0.5, 0.65, 1.5, 1.0, c);
      box(g, 0.8, 2.7, -0.5, 0.65, 1.5, 1.0, c);
      return g;
    }
    case "avatar-outfit-sport": {
      const top = 0x6da3d6;
      const bottom = COL.charcoal;
      const stripe = COL.sun;
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, top);
      box(g, -1.45, 2.3, -0.5, 0.65, 2.3, 1.0, top);
      box(g, 0.8, 2.3, -0.5, 0.65, 2.3, 1.0, top);
      box(g, -0.6, 0, -0.45, 0.7, 2.3, 0.9, bottom);
      box(g, -0.05, 0, -0.45, 0.7, 2.3, 0.9, bottom);
      box(g, -0.55, 0.4, -0.5, 0.05, 1.6, 0.05, stripe);
      box(g, 0.45, 0.4, -0.5, 0.05, 1.6, 0.05, stripe);
      return g;
    }
    case "avatar-outfit-suit": {
      const c = COL.charcoal;
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      box(g, -0.05, 2.3, -0.6, 0.1, 2.0, 0.06, COL.white);
      box(g, -0.1, 4.3, -0.6, 0.2, 0.15, 0.06, COL.red);
      box(g, -1.45, 2.3, -0.5, 0.65, 2.3, 1.0, c);
      box(g, 0.8, 2.3, -0.5, 0.65, 2.3, 1.0, c);
      box(g, -0.6, 0, -0.45, 0.7, 2.3, 0.9, c);
      box(g, -0.05, 0, -0.45, 0.7, 2.3, 0.9, c);
      return g;
    }
    case "avatar-outfit-tshirt":
    default: {
      const c = COL.blue;
      // torso
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      // sleeves cover the WHOLE arm so the skin underneath isn't exposed
      box(g, -1.5, 2.3, -0.55, 0.7, 2.3, 1.1, c);
      box(g, 0.8, 2.3, -0.55, 0.7, 2.3, 1.1, c);
      // pants
      box(g, -0.6, 0, -0.45, 0.7, 2.3, 0.9, COL.woodDark);
      box(g, -0.05, 0, -0.45, 0.7, 2.3, 0.9, COL.woodDark);
      return g;
    }
  }
}

// ── accessory (5 variants, slot may be empty) ──────────────────────────

export function buildAccessory(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  switch (variant) {
    case "avatar-acc-book": {
      box(g, -0.7, 2.3, 0.6, 0.7, 0.5, 0.7, COL.red);
      box(g, -0.65, 2.55, 0.65, 0.6, 0.05, 0.6, COL.white);
      return g;
    }
    case "avatar-acc-backpack": {
      box(g, -0.75, 2.4, 0.55, 1.5, 2.0, 0.5, COL.coral);
      box(g, -0.55, 2.5, 0.55, 0.4, 0.4, 0.06, COL.cream);
      box(g, 0.15, 2.5, 0.55, 0.4, 0.4, 0.06, COL.cream);
      return g;
    }
    case "avatar-acc-headphones": {
      box(g, -1.0, 6.5, -0.5, 0.15, 0.4, 1.0, COL.charcoal);
      box(g, 0.85, 6.5, -0.5, 0.15, 0.4, 1.0, COL.charcoal);
      box(g, -0.95, 7.0, -0.05, 1.9, 0.2, 0.2, COL.charcoal);
      return g;
    }
    case "avatar-acc-cape": {
      const c = 0xc94335;
      box(g, -1.0, 2.0, 0.5, 2.0, 3.0, 0.1, c);
      box(g, -0.95, 4.6, 0.45, 1.9, 0.3, 0.2, COL.sun);
      return g;
    }
    case "avatar-acc-pet": {
      box(g, 1.5, 0, 0, 0.8, 0.6, 1.0, COL.white);
      box(g, 1.4, 0.6, 0.5, 0.7, 0.6, 0.5, COL.white);
      box(g, 1.55, 1.2, 0.55, 0.15, 0.3, 0.15, COL.white);
      box(g, 1.85, 1.2, 0.55, 0.15, 0.3, 0.15, COL.white);
      box(g, 1.55, 0.85, 0.42, 0.1, 0.1, 0.04, COL.black);
      box(g, 1.85, 0.85, 0.42, 0.1, 0.1, 0.04, COL.black);
      return g;
    }
  }
  return g;
}

// ── assembly ───────────────────────────────────────────────────────────

export interface AvatarEquip {
  hair?: string | null;
  face?: string | null;
  outfit?: string | null;
  accessory?: string | null;
}

/**
 * Stack body + hair + face + outfit + accessory into a single group.
 * Defaults pick smile / short / tshirt when no item equipped (mirrors the
 * backend is_default catalog).
 */
export function buildAvatar(equip: AvatarEquip): THREE.Group {
  const g = new THREE.Group();
  g.add(buildBody());
  g.add(buildOutfit(equip.outfit ?? "avatar-outfit-tshirt"));
  g.add(buildFace(equip.face ?? "avatar-face-smile"));
  g.add(buildHair(equip.hair ?? "avatar-hair-short"));
  g.add(buildAccessory(equip.accessory ?? null));
  return g;
}

export const AVATAR_VOX = VOX;
