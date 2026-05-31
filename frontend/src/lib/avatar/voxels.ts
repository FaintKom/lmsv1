/**
 * Voxel character builder for the My Avatar feature — CHIBI proportions.
 *
 * Cute chibi figure: a big head (~43% of total height), a short stubby body,
 * stubby arms/legs and big eyes. Reference vibe: Crossy Road / Animal Crossing
 * voxel characters. Feet sit at y=0; the head top is ~y=6.5. The figure is
 * centred on x=0. The FRONT of the figure (the face) is the −Z side; the
 * scene rotates the group y=π so the face turns toward the camera.
 *
 * STRICT RULE: within a single builder no two boxes may share volume. Boxes
 * can touch a face but never overlap. Decoration must protrude past the
 * surface it decorates, never sit inside it. Frames around inserts split into
 * strips with the insert filling the centre hole. Enforced by
 * scripts/detect-overlaps.ts.
 *
 * All geometry is expressed against the shared {@link A} anchor spec so the
 * whole wardrobe stays consistent; tweak the skeleton there, not per builder.
 */
import * as THREE from "three";

import { COL, VOX, darker, vbox } from "@/lib/room/voxels";

const SKIN = 0xf1c5a0;
const SKIN_DARK = darker(SKIN, 0.86);
const MOUTH = 0xcc5b50;
const BROW = 0x5a3a1e;

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

// ── shared chibi anchor spec ────────────────────────────────────────────
// Voxel units, min-corner convention (matches vbox). Front face = −Z.
export const A = {
  // legs
  legY: 0,
  legH: 1.6,
  legTopY: 1.6,
  legZ: -0.45,
  legD: 0.9,
  // torso
  torsoY: 1.6,
  torsoH: 1.9,
  torsoTopY: 3.5,
  torsoFrontZ: -0.6,
  torsoBackZ: 0.6,
  torsoD: 1.2,
  // arms / hands
  armY: 1.9,
  armH: 1.4,
  armTopY: 3.3,
  handY: 1.45,
  handH: 0.45,
  // neck
  neckY: 3.5,
  neckH: 0.2,
  // head (big!)
  headY: 3.7,
  headH: 2.8,
  headTopY: 6.5,
  headHalfW: 1.4, // x −1.4 .. 1.4
  headFrontZ: -1.25,
  headBackZ: 1.25,
  headD: 2.5,
  headCenterY: 5.1,
  // face decal layers, stacked toward the camera (more negative = closer)
  faceZ0: -1.31, // touches head front
  faceZ1: -1.37,
  faceZ2: -1.43,
  // eyes
  eyeY: 4.55,
  eyeH: 0.62,
} as const;

// ── core body ──────────────────────────────────────────────────────────

/**
 * Which body parts to draw. Outfits don't always envelop the skin, so the
 * body builder OMITS parts an outfit covers to avoid z-fighting. Head, neck,
 * hands and ears are always drawn (no outfit covers them).
 *
 *  - `legs: false` drops both legs.
 *  - `legs: "calf-only"` keeps only the lower-leg segment (shorts + socks).
 *  - `upperArms: false` drops the upper-arm boxes (long sleeves).
 *  - `torso: false` drops the torso box (any top covers it).
 */
export interface BodyOpts {
  legs?: boolean | "calf-only";
  upperArms?: boolean;
  torso?: boolean;
}

const FULL_BODY: Required<BodyOpts> = { legs: true, upperArms: true, torso: true };

export function bodyOptsForOutfit(outfit: string | null | undefined): BodyOpts {
  if (!outfit) return FULL_BODY;
  switch (outfit) {
    case "avatar-outfit-cozy":
    case "avatar-outfit-hoodie":
    case "avatar-outfit-suit":
      return { legs: false, upperArms: false, torso: false };
    case "avatar-outfit-tshirt":
    case "avatar-outfit-dress":
      return { legs: false, upperArms: true, torso: false };
    case "avatar-outfit-sport":
      return { legs: "calf-only", upperArms: true, torso: false };
    default:
      return FULL_BODY;
  }
}

/** Two symmetric stubby legs, touching at x=0 (face touch, no overlap). */
function emitLegs(g: THREE.Group, w: number, legs: BodyOpts["legs"]): void {
  if (legs === false) return;
  if (legs === "calf-only") {
    box(g, -w, A.legY, A.legZ, w, 0.9, A.legD, SKIN);
    box(g, 0, A.legY, A.legZ, w, 0.9, A.legD, SKIN);
    return;
  }
  box(g, -w, A.legY, A.legZ, w, A.legH, A.legD, SKIN);
  box(g, 0, A.legY, A.legZ, w, A.legH, A.legD, SKIN);
}

/** Shared head + neck + ears (gender-neutral big chibi head). */
function emitHead(g: THREE.Group): void {
  // Neck (short, hidden under head).
  box(g, -0.35, A.neckY, -0.3, 0.7, A.neckH, 0.6, SKIN_DARK);
  // Big head cube.
  box(g, -A.headHalfW, A.headY, A.headFrontZ, A.headHalfW * 2, A.headH, A.headD, SKIN);
  // Ears protrude OUTSIDE the head x range (touch the side faces).
  box(g, -A.headHalfW - 0.18, 4.5, -0.3, 0.18, 0.7, 0.6, SKIN);
  box(g, A.headHalfW, 4.5, -0.3, 0.18, 0.7, 0.6, SKIN);
}

export function buildBoyBody(opts: BodyOpts = FULL_BODY): THREE.Group {
  const g = new THREE.Group();
  emitLegs(g, 0.7, opts.legs ?? true);
  if (opts.torso ?? true) {
    box(g, -0.95, A.torsoY, A.torsoFrontZ, 1.9, A.torsoH, A.torsoD, SKIN);
  }
  if (opts.upperArms ?? true) {
    box(g, -1.5, A.armY, -0.4, 0.55, A.armH, 0.8, SKIN);
    box(g, 0.95, A.armY, -0.4, 0.55, A.armH, 0.8, SKIN);
  }
  // Hands (always; touch arm bottoms at y=armY).
  box(g, -1.55, A.handY, -0.45, 0.6, A.handH, 0.9, SKIN_DARK);
  box(g, 0.95, A.handY, -0.45, 0.6, A.handH, 0.9, SKIN_DARK);
  emitHead(g);
  return g;
}

export function buildGirlBody(opts: BodyOpts = FULL_BODY): THREE.Group {
  const g = new THREE.Group();
  emitLegs(g, 0.62, opts.legs ?? true);
  if (opts.torso ?? true) {
    box(g, -0.82, A.torsoY, -0.55, 1.64, A.torsoH, 1.1, SKIN);
  }
  if (opts.upperArms ?? true) {
    box(g, -1.34, A.armY, -0.38, 0.5, A.armH, 0.76, SKIN);
    box(g, 0.84, A.armY, -0.38, 0.5, A.armH, 0.76, SKIN);
  }
  box(g, -1.4, A.handY, -0.42, 0.56, A.handH, 0.84, SKIN_DARK);
  box(g, 0.84, A.handY, -0.42, 0.56, A.handH, 0.84, SKIN_DARK);
  emitHead(g);
  return g;
}

export function buildBody(variant: string, outfit?: string | null): THREE.Group {
  const opts = bodyOptsForOutfit(outfit);
  if (variant === "avatar-body-girl") return buildGirlBody(opts);
  return buildBoyBody(opts);
}

// ── hair ──────────────────────────────────────────────────────────────

export interface HairOpts {
  /** Skip the part of the hair above the crown (y >= headTop) when a hat is on. */
  noTopCap?: boolean;
}

export function hairOptsForHat(hat: string | null | undefined): HairOpts {
  if (!hat) return {};
  return { noTopCap: true };
}

/**
 * Helper: a thin hair shell wrapping the head (top cap + side panels + front
 * fringe + back). Each band sits in a distinct y/z range so nothing overlaps.
 */
function hairShell(
  g: THREE.Group,
  c: number,
  opts: { noTop: boolean; sideBottomY?: number; fringeBottomY?: number; fringeDepth?: number },
): void {
  const sideBottom = opts.sideBottomY ?? 5.2;
  const fringeBottom = opts.fringeBottomY ?? 5.55;
  if (!opts.noTop) {
    // Top cap sits ON the head top (slight overhang for a rounded look).
    box(g, -1.45, A.headTopY, -1.32, 2.9, 0.5, 2.62, c);
  }
  // Side panels OUTSIDE the head x range (touch the side faces).
  box(g, -1.5, sideBottom, -1.32, 0.1, A.headTopY - sideBottom, 2.62, c);
  box(g, 1.4, sideBottom, -1.32, 0.1, A.headTopY - sideBottom, 2.62, c);
  // Front fringe IN FRONT of the head face (above the eyes).
  box(g, -1.4, fringeBottom, A.faceZ0, 2.8, A.headTopY - fringeBottom, opts.fringeDepth ?? 0.06, c);
  // Back hair behind the head.
  box(g, -1.4, sideBottom, A.headBackZ, 2.8, A.headTopY - sideBottom, 0.06, c);
}

export function buildHair(variant: string, opts: HairOpts = {}): THREE.Group {
  const g = new THREE.Group();
  const noTop = opts.noTopCap === true;
  switch (variant) {
    case "avatar-hair-bald":
      return g;
    case "avatar-hair-long": {
      const c = 0xf2c75c;
      hairShell(g, c, { noTop, sideBottomY: 5.2, fringeBottomY: 5.5 });
      // Long side curtains hanging down OUTSIDE the head (past the ears).
      box(g, -1.5, 2.9, -1.0, 0.18, 2.3, 2.0, c);
      box(g, 1.32, 2.9, -1.0, 0.18, 2.3, 2.0, c);
      // Back length down the spine, behind torso.
      box(g, -0.9, 2.9, 1.31, 1.8, 2.4, 0.16, c);
      return g;
    }
    case "avatar-hair-curly": {
      const c = 0xb5503a;
      if (!noTop) {
        // Bumpy top — three poufs along the crown (distinct x bands).
        box(g, -1.4, A.headTopY, -1.0, 0.95, 0.7, 2.0, c);
        box(g, -0.45, A.headTopY, -1.0, 0.9, 0.85, 2.0, c);
        box(g, 0.45, A.headTopY, -1.0, 0.95, 0.7, 2.0, c);
      }
      // Side tufts + fringe + back.
      box(g, -1.52, 5.0, -1.0, 0.16, 1.5, 2.0, c);
      box(g, 1.36, 5.0, -1.0, 0.16, 1.5, 2.0, c);
      box(g, -1.4, 5.5, A.faceZ0, 2.8, 1.0, 0.08, c);
      box(g, -1.4, 5.0, A.headBackZ, 2.8, 1.5, 0.1, c);
      return g;
    }
    case "avatar-hair-bun": {
      const c = 0x6b4422;
      if (noTop) return g; // a bun perched on a hat looks worse than no hair
      hairShell(g, c, { noTop: false, sideBottomY: 5.4, fringeBottomY: 5.6 });
      // The bun on top, toward the back.
      box(g, -0.55, A.headTopY + 0.5, -0.1, 1.1, 0.85, 0.85, c);
      return g;
    }
    case "avatar-hair-mohawk": {
      if (noTop) return g;
      const c = 0xff7a5c;
      // Central crest of rising blocks along the crown.
      box(g, -0.3, A.headTopY, -0.4, 0.6, 0.7, 1.6, c);
      box(g, -0.22, A.headTopY + 0.7, -0.25, 0.44, 0.45, 1.2, c);
      return g;
    }
    case "avatar-hair-short":
    default: {
      const c = 0x6b4422;
      hairShell(g, c, { noTop, sideBottomY: 5.25, fringeBottomY: 5.55 });
      return g;
    }
  }
}

// ── face ──────────────────────────────────────────────────────────────

/** A pair of big chibi eyes (dark blocks + corner highlights). */
function eyes(g: THREE.Group, h: number = A.eyeH): void {
  box(g, -0.72, A.eyeY, A.faceZ0, 0.44, h, 0.06, COL.black);
  box(g, 0.28, A.eyeY, A.faceZ0, 0.44, h, 0.06, COL.black);
  // Highlights protrude in front of the eyes.
  box(g, -0.62, A.eyeY + h - 0.2, A.faceZ1, 0.15, 0.16, 0.06, COL.white);
  box(g, 0.38, A.eyeY + h - 0.2, A.faceZ1, 0.15, 0.16, 0.06, COL.white);
}

export function buildFace(variant: string): THREE.Group {
  const g = new THREE.Group();
  switch (variant) {
    case "avatar-face-wink": {
      // Left eye open, right eye a happy closed arc (single bar).
      box(g, -0.72, A.eyeY, A.faceZ0, 0.44, A.eyeH, 0.06, COL.black);
      box(g, -0.62, A.eyeY + A.eyeH - 0.2, A.faceZ1, 0.15, 0.16, 0.06, COL.white);
      box(g, 0.28, A.eyeY + 0.18, A.faceZ0, 0.44, 0.12, 0.06, COL.black);
      box(g, -0.28, 4.05, A.faceZ0, 0.56, 0.16, 0.06, MOUTH);
      return g;
    }
    case "avatar-face-blush": {
      eyes(g);
      box(g, -0.22, 4.0, A.faceZ0, 0.44, 0.18, 0.06, MOUTH);
      // Cheeks OUTSIDE the eyes, soft pink, semi-transparent.
      box(g, -1.05, 4.25, A.faceZ0, 0.34, 0.24, 0.06, 0xff8fa6, { transparent: true, opacity: 0.75 });
      box(g, 0.71, 4.25, A.faceZ0, 0.34, 0.24, 0.06, 0xff8fa6, { transparent: true, opacity: 0.75 });
      return g;
    }
    case "avatar-face-cool": {
      // Sunglasses bar across the eyes + bridge in front + small smirk.
      box(g, -0.78, A.eyeY + 0.1, A.faceZ0, 1.56, 0.4, 0.06, COL.charcoal);
      box(g, -0.08, A.eyeY + 0.2, A.faceZ1, 0.16, 0.08, 0.06, COL.charcoal);
      box(g, -0.05, 4.05, A.faceZ0, 0.5, 0.14, 0.06, MOUTH);
      return g;
    }
    case "avatar-face-determined": {
      // Angled brows ABOVE the eyes.
      box(g, -0.74, A.eyeY + A.eyeH + 0.05, A.faceZ0, 0.42, 0.1, 0.06, BROW);
      box(g, 0.32, A.eyeY + A.eyeH + 0.05, A.faceZ0, 0.42, 0.1, 0.06, BROW);
      eyes(g, 0.42);
      box(g, -0.28, 4.05, A.faceZ0, 0.56, 0.1, 0.06, BROW);
      return g;
    }
    case "avatar-face-glasses": {
      // Round-ish frames (4-strip rings) + eyes inside the holes + smile.
      eyes(g, 0.42);
      // left frame
      box(g, -0.82, A.eyeY - 0.05, A.faceZ1, 0.06, 0.62, 0.06, COL.charcoal);
      box(g, -0.28, A.eyeY - 0.05, A.faceZ1, 0.06, 0.62, 0.06, COL.charcoal);
      box(g, -0.82, A.eyeY - 0.05, A.faceZ1, 0.6, 0.06, 0.06, COL.charcoal);
      box(g, -0.82, A.eyeY + 0.51, A.faceZ1, 0.6, 0.06, 0.06, COL.charcoal);
      // right frame
      box(g, 0.22, A.eyeY - 0.05, A.faceZ1, 0.06, 0.62, 0.06, COL.charcoal);
      box(g, 0.76, A.eyeY - 0.05, A.faceZ1, 0.06, 0.62, 0.06, COL.charcoal);
      box(g, 0.22, A.eyeY - 0.05, A.faceZ1, 0.6, 0.06, 0.06, COL.charcoal);
      box(g, 0.22, A.eyeY + 0.51, A.faceZ1, 0.6, 0.06, 0.06, COL.charcoal);
      // bridge
      box(g, -0.05, A.eyeY + 0.2, A.faceZ1, 0.1, 0.06, 0.06, COL.charcoal);
      box(g, -0.22, 4.05, A.faceZ0, 0.44, 0.16, 0.06, MOUTH);
      return g;
    }
    case "avatar-face-smile":
    default: {
      eyes(g);
      // Open smile.
      box(g, -0.3, 4.0, A.faceZ0, 0.6, 0.16, 0.06, MOUTH);
      box(g, -0.18, 3.86, A.faceZ0, 0.36, 0.12, 0.06, MOUTH);
      return g;
    }
  }
}

// ── outfit ────────────────────────────────────────────────────────────
// The body torso/arms/legs are omitted under outfits (see bodyOptsForOutfit),
// so outfit pieces ARE the figure here. Torso top sits exactly at torsoTopY;
// long-sleeve boxes touch the torso at x=±1.0; bottoms cover the legs.

function pants(g: THREE.Group, c: number): void {
  box(g, -0.72, 0, -0.5, 0.72, A.legH, 1.0, c);
  box(g, 0, 0, -0.5, 0.72, A.legH, 1.0, c);
}

export function buildOutfit(variant: string): THREE.Group {
  const g = new THREE.Group();
  const tY = A.torsoY;
  const tH = A.torsoH; // torso top lands exactly at torsoTopY (3.5)
  switch (variant) {
    case "avatar-outfit-cozy": {
      const c = COL.cream;
      const cuff = darker(c, 0.85);
      box(g, -1.0, tY, -0.65, 2.0, tH, 1.3, c); // torso
      box(g, -1.66, A.armY - 0.05, -0.45, 0.66, A.armH + 0.1, 0.9, c); // left sleeve
      box(g, 1.0, A.armY - 0.05, -0.45, 0.66, A.armH + 0.1, 0.9, c); // right sleeve
      box(g, -1.66, A.armY - 0.2, -0.47, 0.66, 0.15, 0.94, cuff); // left cuff
      box(g, 1.0, A.armY - 0.2, -0.47, 0.66, 0.15, 0.94, cuff); // right cuff
      pants(g, COL.woodMid);
      return g;
    }
    case "avatar-outfit-hoodie": {
      const c = 0x4a9b66;
      box(g, -1.0, tY, -0.65, 2.0, tH, 1.3, c);
      box(g, -1.66, A.armY - 0.05, -0.45, 0.66, A.armH + 0.1, 0.9, c);
      box(g, 1.0, A.armY - 0.05, -0.45, 0.66, A.armH + 0.1, 0.9, c);
      // Hood collar ABOVE the torso.
      box(g, -1.0, A.torsoTopY, -0.7, 2.0, 0.4, 1.4, c);
      // Drawstrings + pocket protrude forward of the torso.
      box(g, -0.3, 2.4, -0.72, 0.05, 0.9, 0.05, COL.white);
      box(g, 0.25, 2.4, -0.72, 0.05, 0.9, 0.05, COL.white);
      box(g, -0.6, 2.2, -0.72, 1.2, 0.16, 0.06, darker(c, 0.85));
      pants(g, COL.charcoal);
      return g;
    }
    case "avatar-outfit-dress": {
      const c = 0xff7a5c;
      // Bodice.
      box(g, -1.0, tY, -0.65, 2.0, tH, 1.3, c);
      // Short shoulder sleeves (cap on the upper arm).
      box(g, -1.62, A.armTopY - 0.45, -0.45, 0.62, 0.55, 0.9, c);
      box(g, 1.0, A.armTopY - 0.45, -0.45, 0.62, 0.55, 0.9, c);
      // Skirt tiers BELOW the bodice (top tier ends at the bodice bottom).
      box(g, -1.05, 1.0, -0.7, 2.1, 0.6, 1.4, c);
      box(g, -1.25, 0.2, -0.85, 2.5, 0.8, 1.7, c);
      // Waist sash in front of the bodice.
      box(g, -1.0, tY, -0.71, 2.0, 0.2, 0.06, darker(c, 0.7));
      return g;
    }
    case "avatar-outfit-sport": {
      const top = 0x6da3d6;
      const bottom = COL.charcoal;
      const stripe = COL.sun;
      box(g, -1.0, tY, -0.65, 2.0, tH, 1.3, top);
      box(g, -1.62, A.armTopY - 0.45, -0.45, 0.62, 0.55, 0.9, top);
      box(g, 1.0, A.armTopY - 0.45, -0.45, 0.62, 0.55, 0.9, top);
      // Chest stripe in front.
      box(g, -1.0, 2.9, -0.71, 2.0, 0.2, 0.06, stripe);
      // Shorts (upper leg; top meets the torso bottom).
      box(g, -0.72, 0.9, -0.5, 0.72, 0.7, 1.0, bottom);
      box(g, 0, 0.9, -0.5, 0.72, 0.7, 1.0, bottom);
      // Socks (lower leg).
      box(g, -0.72, 0, -0.5, 0.72, 0.5, 1.0, COL.white);
      box(g, 0, 0, -0.5, 0.72, 0.5, 1.0, COL.white);
      // Side stripes OUTSIDE the shorts.
      box(g, -0.77, 1.0, -0.55, 0.05, 0.6, 0.05, stripe);
      box(g, 0.72, 1.0, -0.55, 0.05, 0.6, 0.05, stripe);
      return g;
    }
    case "avatar-outfit-suit": {
      const c = COL.charcoal;
      box(g, -1.0, tY, -0.65, 2.0, tH, 1.3, c); // jacket
      // Lapels protrude forward.
      box(g, -0.6, 3.0, -0.71, 0.32, 0.6, 0.06, darker(c, 0.6));
      box(g, 0.28, 3.0, -0.71, 0.32, 0.6, 0.06, darker(c, 0.6));
      // Shirt placket + tie, stacked further forward.
      box(g, -0.1, 1.8, -0.77, 0.2, 1.8, 0.06, COL.white);
      box(g, -0.12, 3.0, -0.83, 0.24, 0.16, 0.06, COL.red);
      box(g, -0.1, 1.9, -0.83, 0.2, 1.2, 0.06, COL.red);
      // Pocket square.
      box(g, -0.62, 2.7, -0.71, 0.22, 0.1, 0.06, COL.white);
      // Sleeves + cuffs.
      box(g, -1.66, A.armY - 0.05, -0.45, 0.66, A.armH + 0.1, 0.9, c);
      box(g, 1.0, A.armY - 0.05, -0.45, 0.66, A.armH + 0.1, 0.9, c);
      box(g, -1.66, A.armY - 0.2, -0.47, 0.66, 0.15, 0.94, COL.white);
      box(g, 1.0, A.armY - 0.2, -0.47, 0.66, 0.15, 0.94, COL.white);
      pants(g, c);
      return g;
    }
    case "avatar-outfit-tshirt":
    default: {
      const c = COL.blue;
      box(g, -1.0, tY, -0.65, 2.0, tH, 1.3, c);
      // Short sleeves (cap the shoulders).
      box(g, -1.62, A.armTopY - 0.5, -0.45, 0.62, 0.6, 0.9, c);
      box(g, 1.0, A.armTopY - 0.5, -0.45, 0.62, 0.6, 0.9, c);
      // Neckline accent in front.
      box(g, -0.4, A.torsoTopY - 0.12, -0.71, 0.8, 0.1, 0.06, darker(c, 0.75));
      pants(g, COL.woodDark);
      // Belt + buckle in front.
      box(g, -0.62, 1.55, -0.71, 1.24, 0.16, 0.06, COL.woodDark);
      box(g, -0.08, 1.57, -0.77, 0.16, 0.14, 0.06, COL.sun);
      return g;
    }
  }
}

// ── accessory (legacy single slot) ──────────────────────────────────────

export function buildAccessory(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  switch (variant) {
    case "avatar-acc-book": {
      // Held up in front of the right hand.
      box(g, 1.0, 1.5, -0.95, 0.7, 0.55, 0.5, COL.red);
      box(g, 1.02, 2.05, -0.93, 0.66, 0.06, 0.46, COL.white);
      return g;
    }
    case "avatar-acc-backpack": {
      box(g, -0.8, 2.0, A.torsoBackZ, 1.6, 1.6, 0.5, COL.coral);
      box(g, -0.55, 2.2, A.torsoBackZ - 0.06, 0.45, 0.45, 0.06, COL.cream);
      box(g, 0.1, 2.2, A.torsoBackZ - 0.06, 0.45, 0.45, 0.06, COL.cream);
      return g;
    }
    case "avatar-acc-headphones": {
      // Ear cups OUTSIDE the head + a band over the top.
      box(g, -1.62, 4.4, -0.35, 0.22, 0.7, 0.7, COL.charcoal);
      box(g, 1.4, 4.4, -0.35, 0.22, 0.7, 0.7, COL.charcoal);
      box(g, -1.45, A.headTopY, -0.12, 2.9, 0.22, 0.24, COL.charcoal);
      return g;
    }
    case "avatar-acc-cape": {
      const c = 0xc94335;
      box(g, -1.0, 1.6, A.torsoBackZ, 2.0, 2.4, 0.1, c);
      // Collar sits ABOVE the cape top (cape top = 1.6 + 2.4 = 4.0).
      box(g, -0.95, 4.0, A.torsoBackZ - 0.05, 1.9, 0.3, 0.2, COL.sun);
      return g;
    }
    case "avatar-acc-pet": {
      // Cradled in the right hand (not on the floor).
      petBlock(g, 1.05, 1.55, -0.5);
      return g;
    }
  }
  return g;
}

// ── hat ──────────────────────────────────────────────────────────────
// All hats sit ON or ABOVE the head top (y = headTopY).

export function buildHat(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  const top = A.headTopY;
  switch (variant) {
    case "avatar-hat-cap": {
      box(g, -1.35, top, -1.2, 2.7, 0.5, 2.4, COL.red);
      // Brim OUTSIDE the crown z range (front).
      box(g, -1.35, top, -1.95, 2.7, 0.24, 0.75, COL.red);
      return g;
    }
    case "avatar-hat-beanie": {
      // Body + accent band below it + pom-pom on top.
      box(g, -1.42, top - 0.1, -1.3, 2.84, 0.7, 2.6, COL.charcoal);
      box(g, -1.42, top - 0.28, -1.3, 2.84, 0.18, 2.6, 0xc94335);
      box(g, -0.22, top + 0.6, -0.22, 0.44, 0.44, 0.44, 0xc94335);
      return g;
    }
    case "avatar-hat-wizard": {
      const c = 0x4a3b8b;
      box(g, -1.45, top, -1.35, 2.9, 0.3, 2.7, c); // wide brim
      box(g, -0.85, top + 0.3, -0.85, 1.7, 0.8, 1.7, c);
      box(g, -0.5, top + 1.1, -0.5, 1.0, 0.8, 1.0, c);
      box(g, -0.22, top + 1.9, -0.22, 0.44, 0.7, 0.44, c);
      box(g, -0.15, top + 2.6, -0.15, 0.3, 0.3, 0.3, COL.sun); // star tip
      return g;
    }
    case "avatar-hat-crown": {
      const c = COL.sun;
      box(g, -1.3, top, -1.25, 2.6, 0.45, 2.5, c); // band
      // Spikes ABOVE the band (front + back rows).
      box(g, -1.2, top + 0.45, -1.2, 0.32, 0.55, 0.3, c);
      box(g, -0.2, top + 0.45, -1.2, 0.32, 0.7, 0.3, c);
      box(g, 0.88, top + 0.45, -1.2, 0.32, 0.55, 0.3, c);
      box(g, -1.2, top + 0.45, 0.9, 0.32, 0.55, 0.3, c);
      box(g, -0.2, top + 0.45, 0.9, 0.32, 0.7, 0.3, c);
      box(g, 0.88, top + 0.45, 0.9, 0.32, 0.55, 0.3, c);
      // Jewel in front of the band (touches the band front face at z=−1.25).
      box(g, -0.12, top + 0.1, -1.35, 0.24, 0.18, 0.1, 0xff3050);
      return g;
    }
    case "avatar-hat-chef": {
      box(g, -1.2, top, -1.2, 2.4, 0.35, 2.4, COL.white); // band
      box(g, -1.45, top + 0.35, -1.4, 2.9, 0.95, 2.8, COL.white); // puff
      return g;
    }
    case "avatar-hat-graduate": {
      box(g, -1.2, top, -1.15, 2.4, 0.3, 2.3, COL.charcoal); // skullcap
      box(g, -1.6, top + 0.3, -1.6, 3.2, 0.16, 3.2, COL.charcoal); // mortarboard
      // Tassel string + bell OUTSIDE the board edge.
      box(g, 1.4, top + 0.46, -1.2, 0.07, 0.5, 0.07, 0xffd84d);
      box(g, 1.36, top - 0.1, -0.8, 0.16, 0.24, 0.16, 0xffd84d);
      return g;
    }
  }
  return g;
}

// ── glasses ────────────────────────────────────────────────────────────
// Sit in front of the eyes (face decal layers); separate slot from face.

export function buildGlasses(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  const z = A.faceZ1;
  const y = A.eyeY - 0.05;
  switch (variant) {
    case "avatar-glasses-round": {
      // Two 4-strip rings + bridge.
      box(g, -0.82, y, z, 0.06, 0.62, 0.06, COL.black);
      box(g, -0.28, y, z, 0.06, 0.62, 0.06, COL.black);
      box(g, -0.82, y, z, 0.6, 0.06, 0.06, COL.black);
      box(g, -0.82, y + 0.56, z, 0.6, 0.06, 0.06, COL.black);
      box(g, 0.22, y, z, 0.06, 0.62, 0.06, COL.black);
      box(g, 0.76, y, z, 0.06, 0.62, 0.06, COL.black);
      box(g, 0.22, y, z, 0.6, 0.06, 0.06, COL.black);
      box(g, 0.22, y + 0.56, z, 0.6, 0.06, 0.06, COL.black);
      box(g, -0.06, y + 0.25, z, 0.12, 0.06, 0.06, COL.black);
      return g;
    }
    case "avatar-glasses-shades": {
      box(g, -0.82, y + 0.05, z, 1.64, 0.42, 0.06, COL.black);
      box(g, -0.06, y + 0.15, A.faceZ2, 0.12, 0.08, 0.06, COL.black);
      return g;
    }
    case "avatar-glasses-monocle": {
      // Ring over the right eye + a drop chain.
      box(g, 0.22, y, z, 0.06, 0.62, 0.06, COL.sun);
      box(g, 0.76, y, z, 0.06, 0.62, 0.06, COL.sun);
      box(g, 0.22, y, z, 0.6, 0.06, 0.06, COL.sun);
      box(g, 0.22, y + 0.56, z, 0.6, 0.06, 0.06, COL.sun);
      box(g, 0.76, 4.0, z, 0.04, 0.62, 0.06, COL.sun);
      return g;
    }
    case "avatar-glasses-ski": {
      box(g, -0.95, y, z, 1.9, 0.6, 0.07, 0x111111);
      box(g, -0.88, y + 0.06, A.faceZ2, 1.76, 0.46, 0.05, 0x55ddff, { transparent: true, opacity: 0.6 });
      // Strap around the head sides.
      box(g, -1.45, y + 0.15, -0.3, 0.08, 0.3, 1.6, COL.coral);
      box(g, 1.37, y + 0.15, -0.3, 0.08, 0.3, 1.6, COL.coral);
      return g;
    }
    case "avatar-glasses-3d": {
      box(g, -0.82, y, z, 0.62, 0.5, 0.06, COL.red);
      box(g, 0.2, y, z, 0.62, 0.5, 0.06, 0x3060ff);
      box(g, -0.06, y + 0.2, z, 0.12, 0.06, 0.06, COL.black);
      return g;
    }
  }
  return g;
}

// ── back ──────────────────────────────────────────────────────────────
// Mounted behind the torso (z >= torsoBackZ).

export function buildBack(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  const bz = A.torsoBackZ;
  switch (variant) {
    case "avatar-back-backpack": {
      box(g, -0.85, 1.8, bz, 1.7, 1.7, 0.5, COL.coral);
      box(g, -0.55, 2.0, bz - 0.06, 0.45, 0.45, 0.06, COL.cream);
      box(g, 0.1, 2.0, bz - 0.06, 0.45, 0.45, 0.06, COL.cream);
      // Shoulder straps on the FRONT of the torso.
      box(g, -0.75, 1.9, A.torsoFrontZ - 0.06, 0.16, 1.7, 0.12, COL.coral);
      box(g, 0.59, 1.9, A.torsoFrontZ - 0.06, 0.16, 1.7, 0.12, COL.coral);
      return g;
    }
    case "avatar-back-cape": {
      box(g, -1.05, 1.2, bz, 2.1, 2.6, 0.1, 0xc94335);
      // Collar sits ABOVE the cape top (cape top = 1.2 + 2.6 = 3.8).
      box(g, -1.0, 3.8, bz - 0.05, 2.0, 0.3, 0.2, COL.sun);
      return g;
    }
    case "avatar-back-wings": {
      const c = COL.white;
      box(g, -1.95, 2.4, bz, 0.8, 1.9, 0.12, c);
      box(g, -2.35, 2.9, bz, 0.4, 1.1, 0.12, c);
      box(g, 1.15, 2.4, bz, 0.8, 1.9, 0.12, c);
      box(g, 1.95, 2.9, bz, 0.4, 1.1, 0.12, c);
      return g;
    }
    case "avatar-back-quiver": {
      box(g, 0.6, 2.0, bz, 0.55, 2.5, 0.55, COL.woodDark);
      box(g, 0.66, 4.5, bz, 0.1, 0.45, 0.1, COL.coral);
      box(g, 0.82, 4.5, bz, 0.1, 0.45, 0.1, 0xffd84d);
      box(g, 0.98, 4.5, bz, 0.1, 0.45, 0.1, COL.green);
      return g;
    }
    case "avatar-back-jetpack": {
      box(g, -0.55, 1.9, bz, 1.1, 2.0, 0.6, COL.metal);
      // Nozzles below the tank (top meets the tank bottom at y=1.9).
      box(g, -0.45, 1.68, bz + 0.05, 0.32, 0.22, 0.32, COL.charcoal);
      box(g, 0.13, 1.68, bz + 0.05, 0.32, 0.22, 0.32, COL.charcoal);
      // Flames below the nozzles.
      box(g, -0.4, 1.28, bz + 0.1, 0.22, 0.4, 0.22, 0xff7700, { transparent: true, opacity: 0.85 });
      box(g, 0.18, 1.28, bz + 0.1, 0.22, 0.4, 0.22, 0xff7700, { transparent: true, opacity: 0.85 });
      return g;
    }
  }
  return g;
}

// ── hand-held ──────────────────────────────────────────────────────────
// Held at the right hand (x ~ 0.95..1.55, hand top y ~ 1.9).

/** A small cat/pet block, parameterised by its left-x so it can sit on the
 * floor beside the avatar. */
function petBlock(g: THREE.Group, x: number, y = 0, zoff = 0): void {
  box(g, x, y, 0.2 + zoff, 0.85, 0.6, 1.0, COL.white); // body
  box(g, x - 0.05, y + 0.6, 0.65 + zoff, 0.7, 0.6, 0.5, COL.white); // head
  box(g, x + 0.02, y + 1.2, 0.7 + zoff, 0.16, 0.3, 0.16, COL.white); // ear
  box(g, x + 0.32, y + 1.2, 0.7 + zoff, 0.16, 0.3, 0.16, COL.white); // ear
  box(g, x + 0.05, y + 0.85, 0.6 + zoff, 0.1, 0.1, 0.05, COL.black); // eye
  box(g, x + 0.33, y + 0.85, 0.6 + zoff, 0.1, 0.1, 0.05, COL.black); // eye
}

export function buildHand(variant: string | null): THREE.Group {
  const g = new THREE.Group();
  if (!variant) return g;
  switch (variant) {
    case "avatar-hand-book": {
      // Rests in the right hand (grip x≈0.95..1.55, y≈1.45..1.9).
      box(g, 0.95, 1.6, -0.35, 0.75, 0.5, 0.7, 0xc94335);
      box(g, 0.97, 2.1, -0.33, 0.71, 0.06, 0.66, COL.white); // pages on top
      return g;
    }
    case "avatar-hand-pet": {
      // Cradled in the right hand (at hand height, slightly forward).
      petBlock(g, 1.05, 1.55, -0.5);
      return g;
    }
    case "avatar-hand-flower": {
      box(g, 1.2, 1.55, -0.1, 0.1, 1.5, 0.1, COL.leafDark); // stem rises from the hand
      box(g, 0.98, 3.05, -0.2, 0.5, 0.34, 0.34, 0xff8fa6); // petals
      box(g, 1.16, 3.39, -0.1, 0.18, 0.2, 0.14, COL.sun); // centre on top
      return g;
    }
    case "avatar-hand-balloon": {
      box(g, 1.3, 1.6, -0.02, 0.04, 4.8, 0.04, COL.charcoal); // string from the hand
      box(g, 1.45, 6.3, -0.3, 1.0, 1.05, 0.8, 0xff3060); // balloon floating above, outboard of head
      return g;
    }
    case "avatar-hand-controller": {
      // Held in the right hand in front of the hip (not floating at centre).
      box(g, 0.8, 1.55, -0.5, 1.0, 0.4, 0.5, COL.charcoal);
      box(g, 0.95, 1.95, -0.45, 0.15, 0.1, 0.05, COL.coral);
      box(g, 1.2, 1.95, -0.45, 0.15, 0.1, 0.05, COL.sun);
      box(g, 1.45, 1.95, -0.45, 0.15, 0.1, 0.05, COL.green);
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
  g.add(buildBody(equip.body ?? "avatar-body-boy", outfit));
  g.add(buildOutfit(outfit));
  g.add(buildFace(equip.face ?? "avatar-face-smile"));
  g.add(buildHair(equip.hair ?? "avatar-hair-short", hairOptsForHat(equip.hat)));
  g.add(buildHat(equip.hat ?? null));
  g.add(buildGlasses(equip.glasses ?? null));
  g.add(buildBack(equip.back ?? null));
  g.add(buildHand(equip.hand ?? null));
  g.add(buildAccessory(equip.accessory ?? null));
  return g;
}

export const AVATAR_VOX = VOX;
