/**
 * Voxel character builder for the My Avatar feature.
 *
 * Character is centred on origin in voxel coordinates: feet y=0, head
 * top ~y=7.5. Body width spans roughly x=-1..+1 (arms outside).
 *
 * STRICT RULE: within a single builder no two boxes may share volume.
 * Boxes can touch a face but never overlap. Decoration must protrude
 * past the surface it decorates, never sit inside it. Frames around
 * inserts split into strips with the insert filling the centre hole.
 * Enforced by scripts/detect-overlaps.ts.
 */
import * as THREE from "three";

import { COL, VOX, darker, vbox } from "@/lib/room/voxels";

const SKIN = 0xe8b89a;
const SKIN_DARK = darker(SKIN, 0.85);

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

// ── core body ──────────────────────────────────────────────────────────

/**
 * Which body parts to draw. Avatar accessories don't always fully envelop
 * the underlying skin — when they don't, the skin would peek through or
 * z-fight. So the body builder takes a hint from the equipped outfit and
 * OMITS the parts that get covered. Head, neck, hands and ears are
 * always drawn (no outfit covers them).
 *
 *  - `legs: false` drops both legs entirely.
 *  - `legs: "calf-only"` keeps only the mid-calf segment (y=0.4..1.0)
 *    so sport shorts + socks show bare skin between them.
 *  - `upperArms: false` drops both upper-arm boxes (long-sleeve outfits).
 *  - `torso: false` drops the torso box (any outfit with a top covers it).
 */
export interface BodyOpts {
  legs?: boolean | "calf-only";
  upperArms?: boolean;
  torso?: boolean;
}

const FULL_BODY: Required<BodyOpts> = {
  legs: true,
  upperArms: true,
  torso: true,
};

/** Map an outfit id to the body parts it covers (so skin doesn't show). */
export function bodyOptsForOutfit(outfit: string | null | undefined): BodyOpts {
  if (!outfit) return FULL_BODY;
  switch (outfit) {
    case "avatar-outfit-cozy":
    case "avatar-outfit-hoodie":
    case "avatar-outfit-suit":
      // Long sleeves + full pants — drop everything covered.
      return { legs: false, upperArms: false, torso: false };
    case "avatar-outfit-tshirt":
    case "avatar-outfit-dress":
      // Short sleeves cover only the shoulder cap; upper arm stays visible
      // (sleeve sits above the upper-arm box). Pants/skirt covers all legs.
      return { legs: false, upperArms: true, torso: false };
    case "avatar-outfit-sport":
      // Shorts cover the upper leg, socks cover the foot — keep the calf.
      return { legs: "calf-only", upperArms: true, torso: false };
    default:
      return FULL_BODY;
  }
}

function emitLegs(g: THREE.Group, lx: number, w: number, legs: BodyOpts["legs"]): void {
  if (legs === false) return;
  if (legs === "calf-only") {
    box(g, lx, 0.4, -0.4, w, 0.6, 0.8, SKIN);
    box(g, 0.0, 0.4, -0.4, w, 0.6, 0.8, SKIN);
    return;
  }
  box(g, lx, 0, -0.4, w, 2.2, 0.8, SKIN);
  box(g, 0.0, 0, -0.4, w, 2.2, 0.8, SKIN);
}

export function buildBoyBody(opts: BodyOpts = FULL_BODY): THREE.Group {
  const g = new THREE.Group();
  emitLegs(g, -0.6, 0.6, opts.legs ?? true);
  if (opts.torso ?? true) {
    box(g, -0.85, 2.2, -0.5, 1.7, 2.4, 1.0, SKIN);
  }
  if (opts.upperArms ?? true) {
    box(g, -1.45, 2.8, -0.45, 0.6, 1.7, 0.9, SKIN);
    box(g, 0.85, 2.8, -0.45, 0.6, 1.7, 0.9, SKIN);
  }
  // Hands.
  box(g, -1.45, 2.3, -0.5, 0.6, 0.5, 1.0, SKIN_DARK);
  box(g, 0.85, 2.3, -0.5, 0.6, 0.5, 1.0, SKIN_DARK);
  // Neck.
  box(g, -0.3, 4.6, -0.3, 0.6, 0.4, 0.6, SKIN_DARK);
  // Head.
  box(g, -0.7, 5.0, -0.55, 1.4, 0.7, 1.1, SKIN);
  box(g, -0.8, 5.7, -0.6, 1.6, 1.0, 1.2, SKIN);
  // Ears.
  box(g, -0.95, 5.9, -0.3, 0.15, 0.6, 0.6, SKIN);
  box(g, 0.8, 5.9, -0.3, 0.15, 0.6, 0.6, SKIN);
  return g;
}

export function buildGirlBody(opts: BodyOpts = FULL_BODY): THREE.Group {
  const g = new THREE.Group();
  emitLegs(g, -0.55, 0.55, opts.legs ?? true);
  if (opts.torso ?? true) {
    box(g, -0.75, 2.2, -0.5, 1.5, 2.4, 1.0, SKIN);
  }
  if (opts.upperArms ?? true) {
    box(g, -1.3, 2.8, -0.45, 0.55, 1.7, 0.85, SKIN);
    box(g, 0.75, 2.8, -0.45, 0.55, 1.7, 0.85, SKIN);
  }
  // Hands.
  box(g, -1.3, 2.3, -0.5, 0.55, 0.5, 0.95, SKIN_DARK);
  box(g, 0.75, 2.3, -0.5, 0.55, 0.5, 0.95, SKIN_DARK);
  // Neck.
  box(g, -0.25, 4.6, -0.3, 0.5, 0.4, 0.6, SKIN_DARK);
  // Head.
  box(g, -0.65, 5.0, -0.55, 1.3, 0.7, 1.1, SKIN);
  box(g, -0.8, 5.7, -0.6, 1.6, 1.0, 1.2, SKIN);
  // Ears.
  box(g, -0.95, 5.9, -0.3, 0.15, 0.6, 0.6, SKIN);
  box(g, 0.8, 5.9, -0.3, 0.15, 0.6, 0.6, SKIN);
  return g;
}

/**
 * Dispatcher. `outfit` optional — when given, the body omits parts that
 * the outfit covers so the two layers don't z-fight (legs under pants,
 * torso under shirt, upper arms under sleeves).
 */
export function buildBody(variant: string, outfit?: string | null): THREE.Group {
  const opts = bodyOptsForOutfit(outfit);
  if (variant === "avatar-body-girl") return buildGirlBody(opts);
  return buildBoyBody(opts);
}

// ── hair ──────────────────────────────────────────────────────────────

export function buildHair(variant: string): THREE.Group {
  const g = new THREE.Group();
  switch (variant) {
    case "avatar-hair-bald":
      return g;
    case "avatar-hair-long": {
      const c = 0xf5d272;
      // Top cap above crown (y=6.7..7.0).
      box(g, -0.9, 6.7, -0.7, 1.8, 0.3, 1.3, c);
      // Bangs IN FRONT of crown (z=-0.7..-0.6, just outside crown z=-0.6).
      box(g, -0.7, 6.3, -0.7, 1.4, 0.4, 0.1, c);
      // Side curtains OUTSIDE crown x (crown x=-0.8..0.8).
      box(g, -1.0, 4.4, -0.7, 0.2, 2.3, 1.3, c);
      box(g, 0.8, 4.4, -0.7, 0.2, 2.3, 1.3, c);
      return g;
    }
    case "avatar-hair-curly": {
      const c = 0xc94335;
      // Cap above crown.
      box(g, -1.0, 6.7, -0.7, 2.0, 0.5, 1.3, c);
      // Side tufts OUTSIDE crown x range.
      box(g, -1.05, 5.8, -0.7, 0.25, 0.9, 1.3, c);
      box(g, 0.8, 5.8, -0.7, 0.25, 0.9, 1.3, c);
      // Top pouf ABOVE cap top y=7.2.
      box(g, -0.4, 7.2, -0.3, 0.8, 0.4, 0.6, c);
      return g;
    }
    case "avatar-hair-bun": {
      const c = 0x6b4422;
      box(g, -0.9, 6.7, -0.7, 1.8, 0.3, 1.3, c);
      box(g, -0.45, 7.0, -0.05, 0.9, 0.7, 0.6, c);
      return g;
    }
    case "avatar-hair-mohawk": {
      const c = 0xff7a5c;
      // Main strip.
      box(g, -0.25, 6.7, -0.3, 0.5, 0.8, 0.6, c);
      // Tip ABOVE main strip top y=7.5.
      box(g, -0.15, 7.5, -0.2, 0.3, 0.4, 0.4, c);
      return g;
    }
    case "avatar-hair-short":
    default: {
      const c = 0x6b4422;
      // Top cap (above crown y=6.7).
      box(g, -0.9, 6.7, -0.7, 1.8, 0.4, 1.4, c);
      // Wrap-around. To avoid corner overlap, sides span the FULL z range
      // (z=-0.7..0.7), front+back are SHORTER in x (start at -0.75 vs side
      // ends at -0.75) so they don't share volume with sides.
      box(g, -0.75, 5.6, -0.7, 1.5, 1.1, 0.1, c); // back strip (z=-0.7..-0.6)
      box(g, -0.75, 5.6, 0.6, 1.5, 1.1, 0.1, c); // front bangs (z=0.6..0.7)
      box(g, -0.9, 5.6, -0.6, 0.15, 1.1, 1.2, c); // left side
      box(g, 0.75, 5.6, -0.6, 0.15, 1.1, 1.2, c); // right side
      return g;
    }
  }
}

// ── face ──────────────────────────────────────────────────────────────

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
      box(g, -0.65, 5.95, eyeZ, 1.3, 0.35, 0.05, COL.black);
      // Bridge IN FRONT of shades.
      box(g, -0.05, 6.05, eyeZ - 0.05, 0.1, 0.05, 0.05, COL.black);
      box(g, -0.25, 5.5, eyeZ, 0.5, 0.1, 0.05, COL.charcoal);
      return g;
    }
    case "avatar-face-determined": {
      // Eyebrows ABOVE eyes.
      box(g, -0.5, 6.25, eyeZ, 0.3, 0.05, 0.05, COL.black);
      box(g, 0.2, 6.25, eyeZ, 0.3, 0.05, 0.05, COL.black);
      // Eyes.
      box(g, -0.4, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, 0.2, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, -0.3, 5.5, eyeZ, 0.6, 0.08, 0.05, COL.charcoal);
      return g;
    }
    case "avatar-face-glasses": {
      box(g, -0.5, 5.9, eyeZ, 0.45, 0.4, 0.05, COL.black);
      box(g, 0.05, 5.9, eyeZ, 0.45, 0.4, 0.05, COL.black);
      // Lenses IN FRONT of frames (not inside).
      box(g, -0.42, 5.98, eyeZ - 0.05, 0.3, 0.25, 0.04, 0x9fc6d9, { transparent: true, opacity: 0.5 });
      box(g, 0.13, 5.98, eyeZ - 0.05, 0.3, 0.25, 0.04, 0x9fc6d9, { transparent: true, opacity: 0.5 });
      // Bridge BETWEEN frames (x=-0.05..0.05).
      box(g, -0.05, 6.0, eyeZ, 0.1, 0.05, 0.05, COL.black);
      box(g, -0.2, 5.5, eyeZ, 0.4, 0.1, 0.05, COL.coral);
      return g;
    }
    case "avatar-face-smile":
    default: {
      box(g, -0.4, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, 0.2, 6.0, eyeZ, 0.2, 0.2, 0.05, COL.black);
      box(g, -0.3, 5.5, eyeZ, 0.1, 0.1, 0.05, COL.coral);
      box(g, 0.2, 5.5, eyeZ, 0.1, 0.1, 0.05, COL.coral);
      box(g, -0.2, 5.4, eyeZ, 0.1, 0.1, 0.05, COL.coral);
      box(g, -0.1, 5.4, eyeZ, 0.1, 0.1, 0.05, COL.coral);
      box(g, 0.0, 5.4, eyeZ, 0.1, 0.1, 0.05, COL.coral);
      box(g, 0.1, 5.4, eyeZ, 0.1, 0.1, 0.05, COL.coral);
      return g;
    }
  }
}

// ── outfit ────────────────────────────────────────────────────────────

export function buildOutfit(variant: string): THREE.Group {
  const g = new THREE.Group();
  switch (variant) {
    case "avatar-outfit-cozy": {
      const c = COL.cream;
      const cuff = darker(c, 0.85);
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c); // torso
      box(g, -1.55, 2.85, -0.5, 0.7, 1.85, 1.0, c); // left sleeve
      box(g, 0.85, 2.85, -0.5, 0.7, 1.85, 1.0, c); // right sleeve
      box(g, -1.55, 2.7, -0.52, 0.7, 0.15, 1.02, cuff); // left cuff
      box(g, 0.85, 2.7, -0.52, 0.7, 0.15, 1.02, cuff); // right cuff
      // Pants touch at x=0, no overlap (w=0.6 each).
      box(g, -0.6, 0, -0.45, 0.6, 2.2, 0.9, COL.woodMid);
      box(g, 0.0, 0, -0.45, 0.6, 2.2, 0.9, COL.woodMid);
      return g;
    }
    case "avatar-outfit-hoodie": {
      const c = 0x4a9b66;
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      box(g, -1.55, 2.85, -0.5, 0.7, 1.85, 1.0, c);
      box(g, 0.85, 2.85, -0.5, 0.7, 1.85, 1.0, c);
      // Hood collar ABOVE torso (y=4.7..5.1).
      box(g, -0.85, 4.7, -0.7, 1.7, 0.4, 1.3, c);
      // Drawstrings + pocket protrude forward of torso (z=-0.62..-0.55).
      box(g, -0.25, 2.5, -0.62, 0.05, 1.0, 0.05, COL.white);
      box(g, 0.2, 2.5, -0.62, 0.05, 1.0, 0.05, COL.white);
      // Pocket — single horizontal strip protruding forward, in y range
      // BELOW drawstring top y=3.5 and ABOVE pant top y=2.2 (y=2.3..2.5).
      box(g, -0.55, 2.3, -0.62, 1.1, 0.15, 0.06, darker(c, 0.85));
      // Pants.
      box(g, -0.6, 0, -0.45, 0.6, 2.2, 0.9, COL.charcoal);
      box(g, 0.0, 0, -0.45, 0.6, 2.2, 0.9, COL.charcoal);
      return g;
    }
    case "avatar-outfit-dress": {
      const c = 0xff7a5c;
      // Bodice.
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      // Short shoulder sleeves (y above hand top 2.8).
      box(g, -1.5, 3.95, -0.5, 0.65, 0.7, 1.0, c);
      box(g, 0.85, 3.95, -0.5, 0.65, 0.7, 1.0, c);
      // Skirt tiers BELOW bodice (bodice y=2.2..4.7). Tier 1 y=1.5..2.2,
      // tier 2 y=0.5..1.5 — flush stacked.
      box(g, -0.95, 1.5, -0.6, 1.9, 0.7, 1.2, c);
      box(g, -1.05, 0.5, -0.7, 2.1, 1.0, 1.4, c);
      // Waist sash protrudes IN FRONT of bodice (z=-0.61..-0.55).
      box(g, -0.85, 2.2, -0.61, 1.7, 0.2, 0.06, darker(c, 0.7));
      return g;
    }
    case "avatar-outfit-sport": {
      const top = 0x6da3d6;
      const bottom = COL.charcoal;
      const stripe = COL.sun;
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, top);
      box(g, -1.5, 3.95, -0.5, 0.65, 0.7, 1.0, top);
      box(g, 0.85, 3.95, -0.5, 0.65, 0.7, 1.0, top);
      // Chest stripe IN FRONT of torso.
      box(g, -0.85, 3.3, -0.61, 1.7, 0.18, 0.06, stripe);
      // Shorts (touch at x=0).
      box(g, -0.6, 1.0, -0.45, 0.6, 1.2, 0.9, bottom);
      box(g, 0.0, 1.0, -0.45, 0.6, 1.2, 0.9, bottom);
      // Socks (touch at x=0).
      box(g, -0.6, 0, -0.45, 0.6, 0.4, 0.9, COL.white);
      box(g, 0.0, 0, -0.45, 0.6, 0.4, 0.9, COL.white);
      // Side stripes OUTSIDE shorts x range.
      box(g, -0.65, 1.1, -0.5, 0.05, 1.1, 0.05, stripe);
      box(g, 0.6, 1.1, -0.5, 0.05, 1.1, 0.05, stripe);
      return g;
    }
    case "avatar-outfit-suit": {
      const c = COL.charcoal;
      // Jacket torso.
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      // Lapels protrude forward of jacket (z=-0.61..-0.55).
      box(g, -0.55, 4.0, -0.61, 0.3, 0.6, 0.06, darker(c, 0.6));
      box(g, 0.25, 4.0, -0.61, 0.3, 0.6, 0.06, darker(c, 0.6));
      // Shirt placket further forward (z=-0.67..-0.61).
      box(g, -0.08, 2.3, -0.67, 0.16, 1.7, 0.06, COL.white);
      // Tie protrudes further forward of placket (z=-0.73..-0.67).
      box(g, -0.1, 4.0, -0.73, 0.2, 0.15, 0.06, COL.red);
      box(g, -0.08, 2.8, -0.73, 0.16, 1.2, 0.06, COL.red);
      // Pocket square in front of jacket, separate y from lapels.
      box(g, -0.6, 3.7, -0.61, 0.2, 0.1, 0.06, COL.white);
      // Sleeves + cuffs.
      box(g, -1.55, 2.85, -0.5, 0.7, 1.85, 1.0, c);
      box(g, 0.85, 2.85, -0.5, 0.7, 1.85, 1.0, c);
      box(g, -1.55, 2.7, -0.52, 0.7, 0.15, 1.02, COL.white);
      box(g, 0.85, 2.7, -0.52, 0.7, 0.15, 1.02, COL.white);
      // Dress pants (touch at x=0).
      box(g, -0.6, 0, -0.45, 0.6, 2.2, 0.9, c);
      box(g, 0.0, 0, -0.45, 0.6, 2.2, 0.9, c);
      return g;
    }
    case "avatar-outfit-tshirt":
    default: {
      const c = COL.blue;
      box(g, -0.85, 2.2, -0.55, 1.7, 2.5, 1.1, c);
      box(g, -1.55, 3.85, -0.55, 0.7, 0.8, 1.1, c);
      box(g, 0.85, 3.85, -0.55, 0.7, 0.8, 1.1, c);
      // Neckline accent protrudes forward.
      box(g, -0.35, 4.55, -0.61, 0.7, 0.1, 0.06, darker(c, 0.75));
      // Pants (touch at x=0).
      box(g, -0.6, 0, -0.45, 0.6, 2.2, 0.9, COL.woodDark);
      box(g, 0.0, 0, -0.45, 0.6, 2.2, 0.9, COL.woodDark);
      // Belt protrudes forward of torso (z=-0.61..-0.55).
      box(g, -0.6, 2.1, -0.61, 1.2, 0.15, 0.06, COL.woodDark);
      // Buckle even further forward.
      box(g, -0.06, 2.13, -0.67, 0.12, 0.11, 0.06, COL.sun);
      return g;
    }
  }
}

// ── accessory ──────────────────────────────────────────────────────────

export function buildAccessory(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  switch (variant) {
    case "avatar-acc-book": {
      // Cover, pages on top (no nesting).
      box(g, -0.7, 2.3, 0.6, 0.7, 0.5, 0.25, COL.red);
      box(g, -0.7, 2.8, 0.6, 0.7, 0.05, 0.25, COL.white);
      return g;
    }
    case "avatar-acc-backpack": {
      box(g, -0.75, 2.4, 0.55, 1.5, 2.0, 0.5, COL.coral);
      box(g, -0.55, 2.5, 0.49, 0.4, 0.4, 0.06, COL.cream);
      box(g, 0.15, 2.5, 0.49, 0.4, 0.4, 0.06, COL.cream);
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
      box(g, -1.0, 2.0, 0.5, 2.0, 2.5, 0.1, c);
      // Trim ABOVE cape top y=4.5.
      box(g, -0.95, 4.5, 0.45, 1.9, 0.3, 0.2, COL.sun);
      return g;
    }
    case "avatar-acc-pet": {
      box(g, 1.5, 0, 0, 0.8, 0.6, 1.0, COL.white);
      box(g, 1.4, 0.6, 0.5, 0.7, 0.6, 0.5, COL.white);
      box(g, 1.55, 1.2, 0.55, 0.15, 0.3, 0.15, COL.white);
      box(g, 1.85, 1.2, 0.55, 0.15, 0.3, 0.15, COL.white);
      box(g, 1.55, 0.85, 0.45, 0.1, 0.1, 0.05, COL.black);
      box(g, 1.85, 0.85, 0.45, 0.1, 0.1, 0.05, COL.black);
      return g;
    }
  }
  return g;
}

// ── hat ──────────────────────────────────────────────────────────────

export function buildHat(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  switch (variant) {
    case "avatar-hat-cap": {
      // Cap body + brim. Brim OUTSIDE cap z range (cap z=-0.6..0.6, brim
      // z=-1.0..-0.6).
      box(g, -0.9, 6.7, -0.6, 1.8, 0.4, 1.2, COL.red);
      box(g, -0.9, 6.7, -1.0, 1.8, 0.2, 0.4, COL.red);
      return g;
    }
    case "avatar-hat-beanie": {
      // Body BELOW pom-pom. Accent band BELOW body (y=6.5..6.65 vs body
      // y=6.65..7.2).
      box(g, -0.95, 6.65, -0.65, 1.9, 0.55, 1.3, COL.charcoal);
      box(g, -0.95, 6.5, -0.65, 1.9, 0.15, 1.3, 0xc94335);
      box(g, -0.15, 7.2, -0.05, 0.3, 0.3, 0.3, 0xc94335);
      return g;
    }
    case "avatar-hat-wizard": {
      const c = 0x4a3b8b;
      box(g, -1.0, 6.7, -0.7, 2.0, 0.3, 1.4, c);
      box(g, -0.6, 7.0, -0.4, 1.2, 0.7, 0.8, c);
      box(g, -0.35, 7.7, -0.2, 0.7, 0.6, 0.5, c);
      box(g, -0.15, 8.3, -0.1, 0.3, 0.5, 0.3, c);
      box(g, -0.1, 8.8, -0.05, 0.2, 0.2, 0.2, COL.sun);
      return g;
    }
    case "avatar-hat-crown": {
      const c = COL.sun;
      box(g, -0.9, 6.7, -0.65, 1.8, 0.4, 1.3, c);
      // 6 spikes ABOVE band.
      box(g, -0.85, 7.1, -0.6, 0.25, 0.5, 0.25, c);
      box(g, -0.15, 7.1, -0.6, 0.25, 0.6, 0.25, c);
      box(g, 0.6, 7.1, -0.6, 0.25, 0.5, 0.25, c);
      box(g, -0.85, 7.1, 0.4, 0.25, 0.5, 0.25, c);
      box(g, -0.15, 7.1, 0.4, 0.25, 0.6, 0.25, c);
      box(g, 0.6, 7.1, 0.4, 0.25, 0.5, 0.25, c);
      // Jewel IN FRONT of band (z=-0.75..-0.65).
      box(g, -0.1, 6.85, -0.75, 0.2, 0.15, 0.1, 0xff3050);
      return g;
    }
    case "avatar-hat-chef": {
      box(g, -0.95, 6.7, -0.7, 1.9, 0.3, 1.4, COL.white);
      box(g, -1.1, 7.0, -0.8, 2.2, 0.9, 1.6, COL.white);
      return g;
    }
    case "avatar-hat-graduate": {
      box(g, -0.85, 6.65, -0.6, 1.7, 0.3, 1.2, COL.charcoal);
      box(g, -1.15, 6.95, -0.95, 2.3, 0.15, 1.9, COL.charcoal);
      // Tassel string ABOVE board (y=7.1..7.5), bell hangs BELOW board
      // edge (y=6.4..6.6) at x OUTSIDE skullcap (skullcap x=-0.85..0.85,
      // bell at x=0.95..1.10).
      box(g, 1.0, 7.1, -0.85, 0.06, 0.4, 0.06, 0xffd84d);
      box(g, 0.95, 6.4, -0.55, 0.15, 0.2, 0.15, 0xffd84d);
      return g;
    }
  }
  return g;
}

// ── glasses ────────────────────────────────────────────────────────────

export function buildGlasses(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  const eyeZ = -0.66;
  switch (variant) {
    case "avatar-glasses-round": {
      box(g, -0.5, 5.9, eyeZ, 0.45, 0.4, 0.04, COL.black);
      box(g, 0.05, 5.9, eyeZ, 0.45, 0.4, 0.04, COL.black);
      box(g, -0.05, 6.0, eyeZ, 0.1, 0.05, 0.04, COL.black);
      // Lenses IN FRONT of frames.
      box(g, -0.42, 5.98, eyeZ - 0.04, 0.3, 0.25, 0.04, 0x9fc6d9, { transparent: true, opacity: 0.4 });
      box(g, 0.13, 5.98, eyeZ - 0.04, 0.3, 0.25, 0.04, 0x9fc6d9, { transparent: true, opacity: 0.4 });
      return g;
    }
    case "avatar-glasses-shades": {
      box(g, -0.65, 5.95, eyeZ, 1.3, 0.35, 0.05, COL.black);
      // Bridge IN FRONT of shades.
      box(g, -0.05, 6.05, eyeZ - 0.05, 0.1, 0.05, 0.05, COL.black);
      return g;
    }
    case "avatar-glasses-monocle": {
      // Ring as 4 strips (no nested cuboid).
      box(g, 0.05, 5.85, eyeZ, 0.05, 0.5, 0.04, COL.sun);
      box(g, 0.5, 5.85, eyeZ, 0.05, 0.5, 0.04, COL.sun);
      box(g, 0.1, 5.85, eyeZ, 0.4, 0.05, 0.04, COL.sun);
      box(g, 0.1, 6.3, eyeZ, 0.4, 0.05, 0.04, COL.sun);
      box(g, 0.5, 5.5, eyeZ, 0.03, 0.35, 0.04, COL.sun);
      return g;
    }
    case "avatar-glasses-ski": {
      box(g, -0.7, 5.85, eyeZ, 1.4, 0.5, 0.06, 0x111111);
      // Tinted lens IN FRONT of frame (z=-0.71..-0.66).
      box(g, -0.65, 5.9, eyeZ - 0.05, 1.3, 0.4, 0.05, 0x55ddff, { transparent: true, opacity: 0.6 });
      box(g, -1.0, 5.95, -0.3, 0.05, 0.3, 1.0, COL.coral);
      box(g, 0.95, 5.95, -0.3, 0.05, 0.3, 1.0, COL.coral);
      return g;
    }
    case "avatar-glasses-3d": {
      box(g, -0.5, 5.9, eyeZ, 0.45, 0.4, 0.05, COL.red);
      box(g, 0.05, 5.9, eyeZ, 0.45, 0.4, 0.05, 0x3060ff);
      box(g, -0.05, 6.0, eyeZ, 0.1, 0.05, 0.05, COL.black);
      return g;
    }
  }
  return g;
}

// ── back ──────────────────────────────────────────────────────────────

export function buildBack(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  switch (variant) {
    case "avatar-back-backpack": {
      box(g, -0.8, 2.4, 0.55, 1.6, 2.0, 0.5, COL.coral);
      // Pockets IN FRONT of backpack (z=0.49..0.55).
      box(g, -0.55, 2.5, 0.49, 0.4, 0.4, 0.06, COL.cream);
      box(g, 0.15, 2.5, 0.49, 0.4, 0.4, 0.06, COL.cream);
      // Straps over shoulders (FRONT of avatar).
      box(g, -0.7, 2.4, -0.4, 0.15, 2.1, 0.15, COL.coral);
      box(g, 0.55, 2.4, -0.4, 0.15, 2.1, 0.15, COL.coral);
      return g;
    }
    case "avatar-back-cape": {
      // Cape body + trim ABOVE cape top.
      box(g, -1.0, 1.5, 0.5, 2.0, 3.2, 0.1, 0xc94335);
      box(g, -0.95, 4.7, 0.45, 1.9, 0.3, 0.2, COL.sun);
      return g;
    }
    case "avatar-back-wings": {
      const c = COL.white;
      box(g, -1.7, 3.0, 0.4, 0.7, 1.8, 0.1, c);
      box(g, -2.0, 3.5, 0.4, 0.3, 1.0, 0.1, c);
      box(g, 1.0, 3.0, 0.4, 0.7, 1.8, 0.1, c);
      box(g, 1.7, 3.5, 0.4, 0.3, 1.0, 0.1, c);
      return g;
    }
    case "avatar-back-quiver": {
      // Quiver body. Feathers ABOVE quiver top y=5.0.
      box(g, 0.6, 2.6, 0.55, 0.5, 2.4, 0.5, COL.woodDark);
      box(g, 0.65, 5.0, 0.55, 0.1, 0.4, 0.1, COL.coral);
      box(g, 0.8, 5.0, 0.55, 0.1, 0.4, 0.1, 0xffd84d);
      box(g, 0.95, 5.0, 0.55, 0.1, 0.4, 0.1, COL.green);
      return g;
    }
    case "avatar-back-jetpack": {
      box(g, -0.5, 2.5, 0.55, 1.0, 2.0, 0.6, COL.metal);
      box(g, -0.4, 2.3, 0.6, 0.3, 0.2, 0.3, COL.charcoal);
      box(g, 0.1, 2.3, 0.6, 0.3, 0.2, 0.3, COL.charcoal);
      box(g, -0.35, 1.9, 0.65, 0.2, 0.4, 0.2, 0xff7700, { transparent: true, opacity: 0.85 });
      box(g, 0.15, 1.9, 0.65, 0.2, 0.4, 0.2, 0xff7700, { transparent: true, opacity: 0.85 });
      return g;
    }
  }
  return g;
}

// ── hand-held ──────────────────────────────────────────────────────────

export function buildHand(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  switch (variant) {
    case "avatar-hand-book": {
      box(g, 1.1, 2.4, 0.5, 0.7, 0.5, 0.7, 0xc94335);
      // Pages ABOVE cover top y=2.9.
      box(g, 1.12, 2.9, 0.55, 0.6, 0.05, 0.6, COL.white);
      return g;
    }
    case "avatar-hand-sword": {
      // Pommel BELOW grip, grip BELOW guard, guard BELOW blade. All
      // flush-stacked along y, no overlap.
      box(g, 1.12, 1.85, -0.12, 0.2, 0.15, 0.2, COL.metal); // pommel
      box(g, 1.12, 2.0, -0.12, 0.2, 0.3, 0.2, COL.woodDark); // grip
      box(g, 1.1, 2.3, -0.15, 0.25, 0.1, 0.25, COL.sun); // guard
      box(g, 1.15, 2.4, -0.1, 0.15, 2.4, 0.15, COL.metal); // blade
      return g;
    }
    case "avatar-hand-pet": {
      box(g, 1.5, 0, 0, 0.8, 0.6, 1.0, COL.white);
      box(g, 1.4, 0.6, 0.5, 0.7, 0.6, 0.5, COL.white);
      box(g, 1.55, 1.2, 0.55, 0.15, 0.3, 0.15, COL.white);
      box(g, 1.85, 1.2, 0.55, 0.15, 0.3, 0.15, COL.white);
      box(g, 1.55, 0.85, 0.45, 0.1, 0.1, 0.05, COL.black);
      box(g, 1.85, 0.85, 0.45, 0.1, 0.1, 0.05, COL.black);
      return g;
    }
    case "avatar-hand-flower": {
      box(g, 1.2, 2.4, -0.05, 0.1, 1.3, 0.1, COL.leafDark);
      box(g, 1.0, 3.7, -0.15, 0.5, 0.3, 0.3, 0xff8fa6);
      // Center ABOVE petals top y=4.0.
      box(g, 1.15, 4.0, -0.05, 0.2, 0.2, 0.1, COL.sun);
      return g;
    }
    case "avatar-hand-balloon": {
      box(g, 1.2, 2.4, -0.05, 0.03, 2.5, 0.03, COL.charcoal);
      box(g, 0.9, 4.9, -0.3, 0.7, 0.8, 0.6, 0xff3060);
      return g;
    }
    case "avatar-hand-controller": {
      box(g, 0.9, 2.3, 0.45, 1.0, 0.4, 0.5, COL.charcoal);
      // Buttons ABOVE controller top y=2.7.
      box(g, 1.0, 2.7, 0.5, 0.15, 0.1, 0.05, COL.coral);
      box(g, 1.25, 2.7, 0.5, 0.15, 0.1, 0.05, COL.sun);
      box(g, 1.55, 2.7, 0.5, 0.15, 0.1, 0.05, COL.green);
      return g;
    }
  }
  return g;
}

// ── assembly ───────────────────────────────────────────────────────────

export interface AvatarEquip {
  body?: string | null;
  hair?: string | null;
  face?: string | null;
  outfit?: string | null;
  hat?: string | null;
  glasses?: string | null;
  back?: string | null;
  hand?: string | null;
  accessory?: string | null;
}

export function buildAvatar(equip: AvatarEquip): THREE.Group {
  const g = new THREE.Group();
  const outfit = equip.outfit ?? "avatar-outfit-tshirt";
  // Pass the outfit through so the body omits the parts the outfit covers
  // (no more skin showing through pants / shirt).
  g.add(buildBody(equip.body ?? "avatar-body-boy", outfit));
  g.add(buildOutfit(outfit));
  g.add(buildFace(equip.face ?? "avatar-face-smile"));
  g.add(buildHair(equip.hair ?? "avatar-hair-short"));
  g.add(buildHat(equip.hat ?? null));
  g.add(buildGlasses(equip.glasses ?? null));
  g.add(buildBack(equip.back ?? null));
  g.add(buildHand(equip.hand ?? null));
  g.add(buildAccessory(equip.accessory ?? null));
  return g;
}

export const AVATAR_VOX = VOX;
