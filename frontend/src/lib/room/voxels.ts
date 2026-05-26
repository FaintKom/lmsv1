/**
 * Voxel item library for the My Room feature.
 *
 * Each build* function returns a THREE.Group of pre-positioned voxel boxes
 * representing one piece of furniture/decor.
 *
 * STRICT RULE: within a single builder, no two boxes may share volume.
 * Boxes can share a face (coplanar touch) but never overlap. This is
 * enforced by scripts/detect-overlaps.ts and a vitest assertion.
 * Decorative details sit OUT of (protruding past) the surface they
 * decorate, never inside it. Frames around inserts split into 4 strips
 * with the insert filling the centre hole — no nested cuboids.
 *
 * 1 voxel = 0.4 world units. y is up. x,y,z passed to vbox is the
 * back-left-bottom corner of the box, not the centre.
 */
import * as THREE from "three";

export const VOX = 0.4;

// ── colour palette ─────────────────────────────────────────────────────
export const COL = {
  woodLight: 0xd9a26a,
  woodMid: 0xb07a3e,
  woodDark: 0x6b4422,
  white: 0xf2efe7,
  cream: 0xe8e1ce,
  charcoal: 0x2a2a2a,
  black: 0x111111,
  metal: 0x8a8f95,
  glass: 0x9fc6d9,
  screen: 0x111c2a,
  green: 0x6bc44d,
  mint: 0x65c8b3,
  greenDeep: 0x0a8754,
  coral: 0xff7a5c,
  coralSoft: 0xffae9a,
  sun: 0xffd84d,
  paper: 0xfafbf6,
  lavender: 0xa48dc8,
  pink: 0xffb6c1,
  blue: 0x6da3d6,
  red: 0xc94335,
  leaf: 0x4d9a3b,
  leafDark: 0x2d6b22,
  pot: 0xc46b3c,
  rugTeal: 0x2a8a8a,
  rugWarm: 0xc46b3c,
  rugMint: 0xb0d9c2,
} as const;

export function darker(hex: number, k = 0.78): number {
  const r = Math.round(((hex >> 16) & 0xff) * k);
  const g = Math.round(((hex >> 8) & 0xff) * k);
  const b = Math.round((hex & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

export function lighter(hex: number, k = 1.22): number {
  const r = Math.min(255, Math.round(((hex >> 16) & 0xff) * k));
  const g = Math.min(255, Math.round(((hex >> 8) & 0xff) * k));
  const b = Math.min(255, Math.round((hex & 0xff) * k));
  return (r << 16) | (g << 8) | b;
}

interface VboxOpts {
  transparent?: boolean;
  opacity?: number;
}

export function vbox(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: number,
  opts: VboxOpts = {},
): THREE.Mesh {
  const geom = new THREE.BoxGeometry(w * VOX, h * VOX, d * VOX);
  const mat = new THREE.MeshLambertMaterial({ color, ...opts });
  const m = new THREE.Mesh(geom, mat);
  m.position.set((x + w / 2) * VOX, (y + h / 2) * VOX, (z + d / 2) * VOX);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// ── room shell: floor + walls ──────────────────────────────────────────

export type FloorType = "wood" | "tile" | "carpet" | "moss";

const FLOOR_PALETTE: Record<FloorType, { base: number; dark: number }> = {
  wood: { base: COL.woodLight, dark: COL.woodMid },
  tile: { base: COL.cream, dark: COL.white },
  carpet: { base: COL.coralSoft, dark: COL.coral },
  moss: { base: 0x7fb069, dark: 0x5a9148 },
};

export function flooring(type: FloorType, w = 14, d = 14): THREE.Group {
  const g = new THREE.Group();
  const pal = FLOOR_PALETTE[type] ?? FLOOR_PALETTE.wood;
  // Surface accents are drawn AS the base by splitting into non-overlapping
  // cells (no separate overlay layer that would share volume with the base).
  if (type === "wood") {
    // Plank stripes — each plank gets its own non-overlapping z band.
    const planks = Math.ceil(d / 2);
    for (let p = 0; p < planks; p++) {
      const z0 = p * 2;
      const stripeZ = z0 + 1.9;
      vbox(g, 0, -0.5, z0, w, 0.5, 1.9, pal.base);
      const gap = d - stripeZ;
      if (gap >= 0.1) {
        vbox(g, 0, -0.5, stripeZ, w, 0.5, 0.1, pal.dark);
      }
    }
  } else if (type === "tile") {
    for (let x = 0; x < w; x += 2) {
      for (let z = 0; z < d; z += 2) {
        const dark = (x + z) % 4 === 0;
        vbox(g, x, -0.5, z, 2, 0.5, 2, dark ? pal.dark : pal.base);
      }
    }
  } else if (type === "carpet") {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        const dark = (x * 7 + z * 13) % 11 === 0;
        vbox(g, x, -0.5, z, 1, 0.5, 1, dark ? pal.dark : pal.base);
      }
    }
  } else {
    // moss — test asserts exactly 1 child.
    vbox(g, 0, -0.5, 0, w, 0.5, d, pal.base);
  }
  return g;
}

export function walls(color: number = COL.lavender, w = 14, d = 14, h = 12): THREE.Group {
  const g = new THREE.Group();
  // Test asserts exactly 6 children: 2 wall slabs + 2 crown + 2 baseboard.
  // Crown + baseboard sit OUTSIDE the wall slab (offset in front toward the
  // room interior) so they share only a face with it.
  vbox(g, -0.6, 0, 0, 0.6, h, d, color); // left wall slab
  vbox(g, 0, 0, -0.6, w, h, 0.6, color); // back wall slab
  vbox(g, 0, h - 0.4, 0, 0.1, 0.4, d, COL.cream, { transparent: true, opacity: 0.55 });
  vbox(g, 0, h - 0.4, 0, w, 0.4, 0.1, COL.cream, { transparent: true, opacity: 0.55 });
  vbox(g, 0, 0, 0, 0.1, 0.5, d, COL.cream, { transparent: true, opacity: 0.35 });
  vbox(g, 0, 0, 0, w, 0.5, 0.1, COL.cream, { transparent: true, opacity: 0.35 });
  return g;
}

// ── items ──────────────────────────────────────────────────────────────

export type BedVariant = "basic" | "kids" | "double";

export function buildBed(variant: BedVariant = "basic"): THREE.Group {
  const g = new THREE.Group();
  // Frame split into two height bands (no nested cuboids).
  vbox(g, 0, 0, 0, 5, 0.5, 8, darker(COL.woodMid)); // base trim (dark)
  vbox(g, 0, 0.5, 0, 5, 1.3, 8, COL.woodMid); // upper frame
  // Feet — entirely BELOW the base trim (y=-0.4..0) so they don't share
  // volume with it.
  vbox(g, 0, -0.4, 0, 0.4, 0.4, 0.4, COL.woodDark);
  vbox(g, 4.6, -0.4, 0, 0.4, 0.4, 0.4, COL.woodDark);
  vbox(g, 0, -0.4, 7.6, 0.4, 0.4, 0.4, COL.woodDark);
  vbox(g, 4.6, -0.4, 7.6, 0.4, 0.4, 0.4, COL.woodDark);
  // Mattress sits flush on the frame top (y=1.8..2.8).
  vbox(g, 0.2, 1.8, 0.2, 4.6, 1.0, 7.6, COL.white);
  // Blanket sits flush on mattress (y=2.8..3.0), covering z=2.4..7.8.
  const blanket =
    variant === "kids" ? COL.coral : variant === "double" ? COL.lavender : COL.green;
  vbox(g, 0.2, 2.8, 2.4, 4.6, 0.2, 5.4, blanket);
  // Foot-end fold sits ABOVE the blanket top (y=3.0..3.35).
  vbox(g, 0.2, 3.0, 7.4, 4.6, 0.35, 0.6, darker(blanket));
  // Polka dots ABOVE the blanket top (y=3.0..3.05).
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      vbox(g, 1.0 + c * 1.4, 3.0, 3.0 + r * 1.2, 0.25, 0.05, 0.25, darker(blanket, 0.65));
    }
  }
  // Pillow sits in front of the blanket (z=0.4..1.8, no z overlap with
  // blanket z=2.4..7.8) and on top of mattress (y=2.8..3.35).
  vbox(g, 0.5, 2.8, 0.4, 4.0, 0.55, 1.4, COL.white);
  // Pillow-end ribbon — above pillow top (y=3.35..3.7).
  vbox(g, 1.4, 3.35, 0.55, 2.2, 0.35, 0.7, variant === "kids" ? COL.sun : COL.coralSoft);
  // Headboard — sits BEHIND the frame footprint at z=-0.4..0.
  vbox(g, 0, 1.8, -0.4, 5, 3.5, 0.4, COL.woodDark);
  // Headboard inlay panels — protrude BACK behind the headboard slab
  // (z=-0.45..-0.4) so they share only a face.
  vbox(g, 0.4, 2.2, -0.45, 1.7, 2.6, 0.05, COL.woodMid);
  vbox(g, 2.9, 2.2, -0.45, 1.7, 2.6, 0.05, COL.woodMid);
  // Bedposts — sit ENTIRELY behind the headboard slab (z=-0.9..-0.5,
  // headboard z=-0.4..0).
  vbox(g, -0.1, 1.8, -0.9, 0.5, 3.5, 0.4, COL.woodDark);
  vbox(g, 4.6, 1.8, -0.9, 0.5, 3.5, 0.4, COL.woodDark);
  if (variant === "kids") {
    // Plushie placed ABOVE the pillow ribbon top (y>=3.7), no overlap.
    vbox(g, 1.8, 3.7, 0.6, 1.1, 0.9, 0.9, COL.white); // body
    vbox(g, 1.9, 4.6, 0.7, 0.9, 0.9, 0.7, COL.white); // head
    // Ears ABOVE head (y>=5.5).
    vbox(g, 1.95, 5.5, 0.75, 0.25, 0.5, 0.25, COL.white);
    vbox(g, 2.65, 5.5, 0.75, 0.25, 0.5, 0.25, COL.white);
    // Eyes + nose sit IN FRONT of the head (z<=0.7, head front is z=0.7).
    // Head xz=0.7..1.4 → place face details at z=0.66..0.7 (just outside).
    vbox(g, 2.05, 4.95, 0.66, 0.12, 0.12, 0.04, COL.black);
    vbox(g, 2.55, 4.95, 0.66, 0.12, 0.12, 0.04, COL.black);
    vbox(g, 2.3, 4.75, 0.66, 0.2, 0.1, 0.04, COL.coral);
  }
  return g;
}

export type DeskVariant = "wood" | "white";

export function buildDesk(variant: DeskVariant = "wood"): THREE.Group {
  const g = new THREE.Group();
  const top = variant === "white" ? COL.white : COL.woodLight;
  const leg = variant === "white" ? COL.metal : COL.woodMid;
  const drawer = variant === "white" ? COL.cream : darker(COL.woodLight, 0.85);
  // Tabletop.
  vbox(g, 0, 2.8, 0, 5, 0.4, 3, top);
  // Two front legs only — the drawer column takes the place of the back
  // pair of legs on the right.
  vbox(g, 0.2, 0, 0.2, 0.4, 2.8, 0.4, leg); // front-left
  vbox(g, 0.2, 0, 2.4, 0.4, 2.8, 0.4, leg); // back-left
  // Drawer column on the right — runs from floor up to just below the
  // tabletop. Its z range (0.6..2.4) leaves clear gaps to both leg z (0.2..0.6)
  // and back z (2.4..3.0).
  vbox(g, 3.6, 0, 0.6, 1.4, 2.8, 1.8, drawer);
  // Drawer faces protrude FORWARD of the column (z=0.55..0.6).
  vbox(g, 3.65, 0.3, 0.55, 1.3, 1.0, 0.05, darker(drawer, 0.85));
  vbox(g, 3.65, 1.4, 0.55, 1.3, 1.0, 0.05, darker(drawer, 0.85));
  // Drawer pulls protrude further forward (z=0.5..0.55).
  vbox(g, 4.0, 0.7, 0.5, 0.6, 0.1, 0.05, COL.metal);
  vbox(g, 4.0, 1.8, 0.5, 0.6, 0.1, 0.05, COL.metal);
  // Modesty back panel between front-left leg (x=0.2..0.6) and drawer
  // column (x=3.6..5.0). Place at z=2.7..2.8 — between leg back z=0.6 and
  // tabletop back z=3.0, and OUTSIDE the column z range.
  vbox(g, 0.6, 1.6, 2.7, 3.0, 1.1, 0.1, darker(top, 0.7));
  return g;
}

export function buildChair(): THREE.Group {
  const g = new THREE.Group();
  // Test asserts exactly 6 children: seat + 4 legs + back.
  vbox(g, 0, 1.5, 0, 2, 0.3, 2, COL.blue);
  vbox(g, 0.2, 0, 0.2, 0.3, 1.5, 0.3, COL.woodDark);
  vbox(g, 1.5, 0, 0.2, 0.3, 1.5, 0.3, COL.woodDark);
  vbox(g, 0.2, 0, 1.5, 0.3, 1.5, 0.3, COL.woodDark);
  vbox(g, 1.5, 0, 1.5, 0.3, 1.5, 0.3, COL.woodDark);
  // Back rises above the seat (y starts at 1.8 = seat top).
  vbox(g, 0, 1.8, 0, 2, 2.5, 0.3, COL.blue);
  return g;
}

export function buildMonitor(): THREE.Group {
  const g = new THREE.Group();
  // Stand base + neck riser.
  vbox(g, 0.9, 0, 0.4, 1.2, 0.15, 0.7, COL.charcoal);
  vbox(g, 1.4, 0.15, 0.55, 0.2, 0.85, 0.2, COL.charcoal);
  // Bezel built as 4 strips around a 2.7×1.7 hole. Frame outer x=0..3,
  // y=1..3, z=0.4..0.65.
  vbox(g, 0, 1, 0.4, 3, 0.15, 0.25, COL.charcoal); // bottom strip
  vbox(g, 0, 2.85, 0.4, 3, 0.15, 0.25, COL.charcoal); // top strip
  vbox(g, 0, 1.15, 0.4, 0.15, 1.7, 0.25, COL.charcoal); // left strip
  vbox(g, 2.85, 1.15, 0.4, 0.15, 1.7, 0.25, COL.charcoal); // right strip
  // Screen substrate fills the hole back (z=0.4..0.45).
  vbox(g, 0.15, 1.15, 0.4, 2.7, 1.7, 0.05, COL.charcoal);
  // Glass face just in front of substrate (z=0.45..0.5).
  vbox(g, 0.15, 1.15, 0.45, 2.7, 1.7, 0.05, COL.screen);
  // UI bands ON the glass — protrude further forward (z=0.5..0.55). Their
  // y ranges are non-overlapping (1.3..1.8, 1.95..2.35, 2.45..2.75).
  vbox(g, 0.2, 2.45, 0.5, 2.6, 0.3, 0.05, 0x4a9b66);
  vbox(g, 0.2, 1.95, 0.5, 1.6, 0.4, 0.05, 0x6da3d6);
  vbox(g, 0.2, 1.3, 0.5, 1.2, 0.5, 0.05, 0xc94335);
  // Brand strip + LED protrude FORWARD past the bottom bezel front face.
  vbox(g, 1.3, 1.05, 0.36, 0.4, 0.05, 0.04, COL.metal);
  vbox(g, 2.7, 1.05, 0.36, 0.1, 0.08, 0.04, COL.green);
  // Keyboard slab.
  vbox(g, 0.2, 0, 1.2, 2.6, 0.12, 0.8, COL.charcoal);
  // Keys protrude UPWARD (y>=0.12) so they're above the keyboard top.
  // Row y range = 0.12..0.15 (h=0.03), all keys share that range but each
  // sits in its own xz cell so no two keys overlap.
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 8; c++) {
      vbox(g, 0.35 + c * 0.3, 0.12, 1.3 + r * 0.22, 0.22, 0.03, 0.16, COL.cream);
    }
  }
  // Spacebar — on its own z row (1.95..2.13), no overlap with key rows.
  vbox(g, 0.8, 0.12, 1.95, 1.5, 0.03, 0.18, COL.cream);
  // Mouse beside keyboard.
  vbox(g, 2.9, 0, 1.6, 0.4, 0.12, 0.55, COL.charcoal);
  // Mouse scroll wheel protrudes above the mouse top (y=0.12..0.14).
  vbox(g, 3.0, 0.12, 1.7, 0.2, 0.02, 0.1, darker(COL.charcoal, 0.6));
  return g;
}

export function buildBookshelfTall(): THREE.Group {
  const g = new THREE.Group();
  // Carcass: bottom, top, two side panels with the back panel sitting
  // BEHIND them so no shared volume.
  vbox(g, 0, 0, 0, 3, 0.3, 0.8, COL.woodMid); // bottom shelf
  vbox(g, 0, 7.7, 0, 3, 0.3, 0.8, COL.woodMid); // top shelf
  vbox(g, 0, 0.3, 0, 0.3, 7.4, 0.8, COL.woodMid); // left side
  vbox(g, 2.7, 0.3, 0, 0.3, 7.4, 0.8, COL.woodMid); // right side
  // Middle shelves — between sides at x=0.3..2.7, depth 0.8.
  vbox(g, 0.3, 2.5, 0, 2.4, 0.2, 0.8, COL.woodMid);
  vbox(g, 0.3, 5, 0, 2.4, 0.2, 0.8, COL.woodMid);
  // Back panel at z=0.8..1.0 (behind everything else).
  vbox(g, 0, 0, 0.8, 3, 8, 0.2, COL.woodDark);
  const colors = [COL.red, COL.green, COL.blue, COL.sun, COL.lavender, COL.coral];
  // Bottom shelf books (y=0.3..2.3, z=0.1..0.5).
  for (let i = 0; i < 5; i++) {
    vbox(g, 0.4 + i * 0.45, 0.3, 0.1, 0.4, 2.0, 0.4, colors[i % colors.length]);
  }
  // Middle shelf books (y=2.7..4.7).
  for (let i = 0; i < 4; i++) {
    vbox(g, 0.5 + i * 0.5, 2.7, 0.1, 0.4, 2.0, 0.4, colors[(i + 2) % colors.length]);
  }
  // Top shelf items (y starting 5.2). Box, vase pot, vase leaves — each
  // in its own xz cell.
  vbox(g, 0.5, 5.2, 0.1, 0.5, 0.4, 0.5, COL.sun);
  vbox(g, 1.4, 5.2, 0.1, 0.5, 0.5, 0.5, COL.pot);
  // Leaves sit ABOVE the pot (y=5.7..6.2) so no overlap with pot.
  vbox(g, 1.35, 5.7, 0.05, 0.6, 0.5, 0.6, COL.leaf);
  return g;
}

export function buildBookshelfWall(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 4, 0.2, 1, COL.woodMid); // wall shelf plank
  // Books on top — each at its own x range (no x overlap), z=0.3..0.9.
  const colors = [COL.red, COL.green, COL.blue, COL.sun, COL.lavender];
  for (let i = 0; i < 6; i++) {
    vbox(g, 0.4 + i * 0.55, 0.2, 0.3, 0.5, 1.6, 0.6, colors[i % colors.length]);
  }
  return g;
}

export type DresserVariant = "blue" | "cream";

export function buildDresser(variant: DresserVariant = "blue"): THREE.Group {
  const g = new THREE.Group();
  const body = variant === "blue" ? COL.mint : COL.cream;
  const accent = darker(body, 0.78);
  // Body — slightly shallower so drawer faces can protrude forward.
  vbox(g, 0, 0, 0, 4, 4, 1.9, body);
  // Top slab — sits above body (y=4..4.25).
  vbox(g, -0.1, 4, -0.1, 4.2, 0.25, 2.1, darker(body, 0.85));
  // Drawer faces protrude FORWARD of body (z=1.9..2.0).
  vbox(g, 0.15, 0.3, 1.9, 3.7, 1.0, 0.1, accent);
  vbox(g, 0.15, 1.5, 1.9, 3.7, 1.0, 0.1, accent);
  vbox(g, 0.15, 2.7, 1.9, 3.7, 1.0, 0.1, accent);
  // Drawer pulls protrude further forward (z=2.0..2.1).
  for (let row = 0; row < 3; row++) {
    const y = 0.7 + row * 1.2;
    vbox(g, 1.1, y, 2.0, 0.25, 0.25, 0.1, COL.woodDark);
    vbox(g, 2.65, y, 2.0, 0.25, 0.25, 0.1, COL.woodDark);
  }
  // Feet — entirely BELOW the body (y=-0.3..0).
  vbox(g, 0.2, -0.3, 0.2, 0.3, 0.3, 0.3, COL.woodDark);
  vbox(g, 3.5, -0.3, 0.2, 0.3, 0.3, 0.3, COL.woodDark);
  vbox(g, 0.2, -0.3, 1.5, 0.3, 0.3, 0.3, COL.woodDark);
  vbox(g, 3.5, -0.3, 1.5, 0.3, 0.3, 0.3, COL.woodDark);
  // Décor on top — each item in its own xz cell, all y>=4.25. The picture
  // frame is built as 4 strips around a canvas insert.
  // Vase (3 flush-stacked tiers).
  vbox(g, 0.4, 4.25, 0.5, 0.35, 0.6, 0.35, COL.white);
  vbox(g, 0.45, 4.85, 0.55, 0.25, 0.25, 0.25, COL.cream);
  vbox(g, 0.5, 5.1, 0.6, 0.15, 0.2, 0.15, COL.sun);
  // Flower pot + stem + bloom — all stacked along y with no overlap.
  vbox(g, 1.1, 4.25, 0.5, 0.5, 0.75, 0.5, COL.coralSoft);
  vbox(g, 1.3, 5.0, 0.65, 0.15, 0.4, 0.15, COL.leafDark);
  vbox(g, 1.2, 5.4, 0.55, 0.35, 0.25, 0.35, COL.coral);
  vbox(g, 1.27, 5.65, 0.62, 0.2, 0.1, 0.2, COL.sun);
  // Framed picture: 4 strips around 1.0×1.0 hole, canvas insert at the back.
  // Outer x=2.0..3.2, y=4.25..5.45, z=0.4..0.55.
  vbox(g, 2.0, 4.25, 0.4, 1.2, 0.1, 0.15, COL.cream); // bottom strip
  vbox(g, 2.0, 5.35, 0.4, 1.2, 0.1, 0.15, COL.cream); // top strip
  vbox(g, 2.0, 4.35, 0.4, 0.1, 1.0, 0.15, COL.cream); // left strip
  vbox(g, 3.1, 4.35, 0.4, 0.1, 1.0, 0.15, COL.cream); // right strip
  vbox(g, 2.1, 4.35, 0.4, 1.0, 1.0, 0.04, COL.blue); // canvas at back of hole
  // Painted shape protrudes forward of canvas (z=0.36..0.4).
  vbox(g, 2.3, 4.55, 0.36, 0.6, 0.6, 0.04, COL.coralSoft);
  // Candle — at its own xz cell.
  vbox(g, 2.4, 4.25, 0.7, 0.15, 0.6, 0.15, COL.cream);
  vbox(g, 2.42, 4.85, 0.72, 0.11, 0.1, 0.11, COL.sun);
  // Books pile on the right (two flush-stacked along y).
  vbox(g, 3.3, 4.25, 0.6, 0.55, 0.25, 0.5, COL.green);
  vbox(g, 3.3, 4.5, 0.6, 0.55, 0.22, 0.5, COL.coral);
  return g;
}

export function buildSofa(): THREE.Group {
  const g = new THREE.Group();
  // Arms.
  vbox(g, 0, 0, 0, 0.5, 2.25, 3, COL.cream);
  vbox(g, 5.5, 0, 0, 0.5, 2.25, 3, COL.cream);
  // Arm caps ABOVE arms (y=2.25..2.4).
  vbox(g, 0, 2.25, 0, 0.5, 0.15, 3, lighter(COL.cream, 1.05));
  vbox(g, 5.5, 2.25, 0, 0.5, 0.15, 3, lighter(COL.cream, 1.05));
  // Seat base between arms.
  vbox(g, 0.5, 0, 0.5, 5.0, 1.5, 2.5, COL.cream);
  // Seat cushions and seams fit together without overlap:
  //   cushion A x=0.55..2.10, seam A x=2.10..2.20, cushion B x=2.20..3.75,
  //   seam B x=3.75..3.85, cushion C x=3.85..5.40.
  vbox(g, 0.55, 1.5, 0.55, 1.55, 0.55, 2.4, COL.white);
  vbox(g, 2.1, 1.5, 0.55, 0.1, 0.55, 2.4, darker(COL.white, 0.9));
  vbox(g, 2.2, 1.5, 0.55, 1.55, 0.55, 2.4, COL.white);
  vbox(g, 3.75, 1.5, 0.55, 0.1, 0.55, 2.4, darker(COL.white, 0.9));
  vbox(g, 3.85, 1.5, 0.55, 1.55, 0.55, 2.4, COL.white);
  // Backrest behind cushions (z=0..0.5).
  vbox(g, 0.5, 1.5, 0, 5.0, 2.0, 0.5, COL.cream);
  // Back cushions sit on top of seat cushions (y starts at 2.05 = seat
  // cushion top) and in front of backrest (z=0.5..0.9). Their y=2.05..3.65
  // range starts above the seat cushion top y=2.05 → no overlap with seat.
  vbox(g, 0.55, 2.05, 0.5, 1.55, 1.45, 0.4, COL.white);
  vbox(g, 2.2, 2.05, 0.5, 1.55, 1.45, 0.4, COL.white);
  vbox(g, 3.85, 2.05, 0.5, 1.55, 1.45, 0.4, COL.white);
  // Throw pillow — y starts at 2.05 (cushion top), z 0.95..1.65 (away from
  // back cushions). Tassel ABOVE pillow top.
  vbox(g, 4.6, 2.05, 0.95, 0.7, 0.7, 0.7, COL.coral);
  vbox(g, 4.65, 2.75, 1.0, 0.6, 0.05, 0.6, darker(COL.coral, 0.6));
  // Wooden feet — entirely below the sofa.
  vbox(g, 0.05, -0.25, 0.1, 0.3, 0.25, 0.3, COL.woodDark);
  vbox(g, 5.65, -0.25, 0.1, 0.3, 0.25, 0.3, COL.woodDark);
  vbox(g, 0.05, -0.25, 2.6, 0.3, 0.25, 0.3, COL.woodDark);
  vbox(g, 5.65, -0.25, 2.6, 0.3, 0.25, 0.3, COL.woodDark);
  return g;
}

export function buildCoffeeTable(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 1.2, 0, 4, 0.3, 2, COL.woodMid); // top
  vbox(g, 0.1, 0, 0.1, 0.3, 1.2, 0.3, COL.woodDark);
  vbox(g, 3.6, 0, 0.1, 0.3, 1.2, 0.3, COL.woodDark);
  vbox(g, 0.1, 0, 1.6, 0.3, 1.2, 0.3, COL.woodDark);
  vbox(g, 3.6, 0, 1.6, 0.3, 1.2, 0.3, COL.woodDark);
  // Coaster sits ABOVE top (y=1.5..1.6).
  vbox(g, 1, 1.5, 0.5, 1.2, 0.1, 0.8, COL.white);
  return g;
}

export function buildArcade(): THREE.Group {
  const g = new THREE.Group();
  // Cabinet body (shallow so the deck can protrude forward).
  vbox(g, 0, 0, 0, 2, 6, 1.4, COL.red);
  // Side panels — wrap around OUTSIDE cabinet's x range so they share
  // only a face.
  vbox(g, -0.1, 0, 0, 0.1, 6, 2.0, darker(COL.red, 0.7)); // left side
  vbox(g, 2.0, 0, 0, 0.1, 6, 2.0, darker(COL.red, 0.7)); // right side
  // Bottom kick plate — entirely in front of cabinet (z=1.4..1.8).
  vbox(g, 0, 0, 1.4, 2, 0.4, 0.4, COL.charcoal);
  // Marquee in FRONT of cabinet face (z=-0.1..0). Art protrudes further
  // (z=-0.15..-0.1).
  vbox(g, 0.05, 5.0, -0.1, 1.9, 0.7, 0.1, COL.sun);
  vbox(g, 0.1, 5.05, -0.15, 1.8, 0.55, 0.05, darker(COL.sun, 0.75));
  // Screen bezel: 4 strips + glass, all in front of cabinet face.
  vbox(g, 0.15, 3.2, -0.1, 1.7, 0.1, 0.1, COL.charcoal); // bottom
  vbox(g, 0.15, 4.7, -0.1, 1.7, 0.1, 0.1, COL.charcoal); // top
  vbox(g, 0.15, 3.3, -0.1, 0.1, 1.4, 0.1, COL.charcoal); // left
  vbox(g, 1.75, 3.3, -0.1, 0.1, 1.4, 0.1, COL.charcoal); // right
  vbox(g, 0.25, 3.3, -0.1, 1.5, 1.4, 0.05, COL.screen); // glass
  // Control deck — in front of cabinet (z=1.4..2.0).
  vbox(g, 0.05, 2.3, 1.4, 1.9, 0.25, 0.6, COL.charcoal);
  // Joystick stem + ball — ABOVE deck top.
  vbox(g, 0.4, 2.55, 1.55, 0.2, 0.4, 0.2, COL.charcoal);
  vbox(g, 0.42, 2.95, 1.57, 0.16, 0.15, 0.16, COL.red);
  // Buttons — ABOVE deck top.
  vbox(g, 1.2, 2.55, 1.5, 0.2, 0.13, 0.2, COL.sun);
  vbox(g, 1.5, 2.55, 1.5, 0.2, 0.13, 0.2, COL.green);
  vbox(g, 1.2, 2.55, 1.75, 0.2, 0.13, 0.2, COL.blue);
  vbox(g, 1.5, 2.55, 1.75, 0.2, 0.13, 0.2, COL.coral);
  // Coin slot in front of cabinet face (z=-0.05..0). Insert lights protrude
  // further (z=-0.1..-0.05).
  vbox(g, 0.7, 1.5, -0.05, 0.6, 0.4, 0.05, COL.charcoal);
  vbox(g, 0.85, 1.6, -0.1, 0.3, 0.05, 0.05, COL.sun);
  return g;
}

export function buildLamp(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 1.6, 0.3, 1.6, COL.charcoal); // base disc
  vbox(g, 0.2, 0.3, 0.2, 1.2, 0.25, 1.2, COL.black); // base puck on top
  // Post stops below cap.
  vbox(g, 0.7, 0.55, 0.7, 0.2, 4.95, 0.2, COL.metal);
  // Cap — above post (y=5.5..5.85).
  vbox(g, 0.55, 5.5, 0.55, 0.5, 0.35, 0.5, COL.charcoal);
  // Shade tiers — flush-stacked above cap.
  vbox(g, 0.1, 5.85, 0.1, 1.4, 0.3, 1.4, COL.sun);
  vbox(g, 0.2, 6.15, 0.2, 1.2, 0.3, 1.2, lighter(COL.sun, 1.05));
  vbox(g, 0.3, 6.45, 0.3, 1.0, 0.3, 1.0, COL.sun);
  vbox(g, 0.4, 6.75, 0.4, 0.8, 0.15, 0.8, COL.woodDark);
  // Bulb peek — alongside post at x=0.95..1.25, BELOW cap, ABOVE post top
  // (y=5.5..5.65 is inside cap — so place at y=5.1..5.25, below cap).
  // Cap is x=0.55..1.05, z=0.55..1.05. Bulb at x=0.95..1.25, z=0.5..0.8.
  // To avoid overlap with cap (which extends to x=1.05), put bulb at
  // x=1.05..1.35 instead.
  vbox(g, 1.05, 5.1, 0.7, 0.3, 0.15, 0.2, 0xfff2a8);
  return g;
}

export function buildPlant(): THREE.Group {
  const g = new THREE.Group();
  // Pot built as U (floor + 4 walls + rim lip), no nesting.
  vbox(g, 0, 0, 0, 1.4, 0.15, 1.4, darker(COL.pot, 0.6)); // floor
  vbox(g, 0, 0.15, 0, 1.4, 0.85, 0.15, COL.pot); // front wall (z=0..0.15)
  vbox(g, 0, 0.15, 1.25, 1.4, 0.85, 0.15, COL.pot); // back wall
  vbox(g, 0, 0.15, 0.15, 0.15, 0.85, 1.1, COL.pot); // left wall
  vbox(g, 1.25, 0.15, 0.15, 0.15, 0.85, 1.1, COL.pot); // right wall
  // Soil fills the interior (x=0.15..1.25, z=0.15..1.25, y=0.15..0.9).
  vbox(g, 0.15, 0.15, 0.15, 1.1, 0.75, 1.1, 0x4d2d1a);
  // Rim lip on top of pot walls (y=1.0..1.15) — sits flush above them.
  vbox(g, 0, 1.0, 0, 1.4, 0.15, 1.4, darker(COL.pot, 0.8));
  // Stem rises above the rim (y>=1.15) so no overlap with rim or soil.
  vbox(g, 0.6, 1.15, 0.6, 0.2, 1.55, 0.2, COL.leafDark);
  // Lower foliage ring — 4 leaves around the trunk (trunk x=0.6..0.8,
  // z=0.6..0.8). Front/back leaves squeezed into the strip between left
  // and right leaves so they don't share x range.
  vbox(g, 0.0, 1.4, 0.5, 0.55, 0.5, 0.4, COL.leaf); // left
  vbox(g, 0.85, 1.4, 0.5, 0.55, 0.5, 0.4, COL.leaf); // right
  vbox(g, 0.55, 1.4, 0.0, 0.3, 0.5, 0.5, COL.leaf); // front
  vbox(g, 0.55, 1.4, 0.9, 0.3, 0.5, 0.5, COL.leaf); // back
  // Mid tier — 2 leaves at different xz, both above the lower ring.
  vbox(g, 0.05, 2.0, 0.05, 0.4, 0.4, 0.4, COL.leafDark);
  vbox(g, 0.95, 2.0, 0.95, 0.4, 0.4, 0.4, COL.leafDark);
  // Top crown (2 flush-stacked tiers along y).
  vbox(g, 0.2, 2.7, 0.3, 1.0, 0.5, 0.8, COL.leaf);
  vbox(g, 0.35, 3.2, 0.4, 0.7, 0.4, 0.6, COL.leaf);
  // Flower bud above crown, then sun stamen above bud.
  vbox(g, 0.55, 3.6, 0.55, 0.3, 0.2, 0.3, COL.coral);
  vbox(g, 0.62, 3.8, 0.62, 0.15, 0.1, 0.15, COL.sun);
  return g;
}

export type RugVariant = "teal" | "warm" | "mint";

export function buildRug(variant: RugVariant = "teal"): THREE.Group {
  const g = new THREE.Group();
  const base = variant === "teal" ? COL.rugTeal : variant === "warm" ? COL.rugWarm : COL.rugMint;
  const accent = variant === "teal" ? COL.mint : variant === "warm" ? COL.sun : COL.greenDeep;
  // Border (4 strips) + central base — strict non-overlap.
  // Rug occupies x=0..5, z=0..4, y=0.05..0.15.
  vbox(g, 0, 0.05, 0, 5, 0.1, 0.3, accent); // front border
  vbox(g, 0, 0.05, 3.7, 5, 0.1, 0.3, accent); // back border
  vbox(g, 0, 0.05, 0.3, 0.3, 0.1, 3.4, accent); // left border
  vbox(g, 4.7, 0.05, 0.3, 0.3, 0.1, 3.4, accent); // right border
  vbox(g, 0.3, 0.05, 0.3, 4.4, 0.1, 3.4, base); // central field
  return g;
}

export function buildWindow(): THREE.Group {
  const g = new THREE.Group();
  // Window frame at z=-0.3..0. Glass fills hole inside frame. Curtains +
  // rod sit IN FRONT of frame at z>=0. Sill protrudes forward + below.
  // Sill — entirely below frame (y=-0.2..0) and forward (z=0..0.6).
  vbox(g, -0.2, -0.2, 0, 5.4, 0.2, 0.6, COL.woodLight);
  // Frame strips around a 4.4×3.4 glass hole (outer 5×4).
  vbox(g, 0, 0, -0.3, 5, 0.3, 0.3, COL.woodLight); // bottom strip
  vbox(g, 0, 3.7, -0.3, 5, 0.3, 0.3, COL.woodLight); // top strip
  vbox(g, 0, 0.3, -0.3, 0.3, 3.4, 0.3, COL.woodLight); // left strip
  vbox(g, 4.7, 0.3, -0.3, 0.3, 3.4, 0.3, COL.woodLight); // right strip
  // Glass fills the hole at z=-0.25..-0.2 (inside the frame's z range but
  // outside its x,y range, so no shared volume).
  vbox(g, 0.3, 0.3, -0.25, 4.4, 3.4, 0.05, 0xfff9c2);
  // Mullions — sit IN FRONT of glass at z=-0.2..-0.15. Vertical mullion
  // split above + below horizontal so they don't overlap each other.
  vbox(g, 2.4, 0.3, -0.2, 0.2, 1.55, 0.05, COL.woodLight); // lower vertical
  vbox(g, 2.4, 2.1, -0.2, 0.2, 1.6, 0.05, COL.woodLight); // upper vertical
  vbox(g, 0.3, 1.9, -0.2, 4.4, 0.2, 0.05, COL.woodLight); // horizontal
  // Curtain rod — entirely in front of the wall (z=0.05..0.25).
  vbox(g, -0.5, 4.1, 0.05, 6, 0.1, 0.2, COL.charcoal);
  // Finials sit OUTSIDE the rod's x range (left x<-0.5, right x>5.5).
  vbox(g, -0.65, 4.05, 0.0, 0.15, 0.25, 0.3, COL.woodDark); // left finial
  vbox(g, 5.5, 4.05, 0.0, 0.15, 0.25, 0.3, COL.woodDark); // right finial
  // Curtains — 6 strips each side. Height stops below curtain rod (rod
  // bottom y=4.1, so h=3.9 ends curtains at y=4.1).
  for (let i = 0; i < 6; i++) {
    const x = -0.5 + i * 0.18;
    vbox(g, x, 0.2, 0.1, 0.18, 3.9, 0.18, COL.sun);
  }
  for (let i = 0; i < 6; i++) {
    const x = 4.4 + i * 0.18;
    vbox(g, x, 0.2, 0.1, 0.18, 3.9, 0.18, COL.sun);
  }
  // Tiny potted plant on the sill, sitting in the GAP between the two
  // curtain bunches (left ends at x=0.58, right starts at x=4.4).
  vbox(g, 2.3, 0.0, 0.2, 0.4, 0.3, 0.3, COL.pot);
  vbox(g, 2.3, 0.3, 0.2, 0.4, 0.1, 0.3, COL.leafDark);
  vbox(g, 2.35, 0.4, 0.25, 0.3, 0.4, 0.3, COL.leaf);
  return g;
}

export function buildPictures(): THREE.Group {
  const g = new THREE.Group();
  const colors = [COL.coral, COL.green, COL.blue];
  // Frame as 4 strips + canvas insert inside the hole. No nested cuboids.
  // Outer 1.2×1.2, hole 1.0×1.0, depth 0.15 (frame), 0.06 (canvas) at back.
  for (let i = 0; i < 3; i++) {
    const x0 = i * 1.4;
    vbox(g, x0, 0, 0, 1.2, 0.1, 0.15, COL.white); // bottom strip
    vbox(g, x0, 1.1, 0, 1.2, 0.1, 0.15, COL.white); // top strip
    vbox(g, x0, 0.1, 0, 0.1, 1.0, 0.15, COL.white); // left strip
    vbox(g, x0 + 1.1, 0.1, 0, 0.1, 1.0, 0.15, COL.white); // right strip
    vbox(g, x0 + 0.1, 0.1, 0, 1.0, 1.0, 0.06, colors[i]); // canvas (back of hole)
  }
  return g;
}

export function buildPlushie(): THREE.Group {
  const g = new THREE.Group();
  // Body + head — two cuboids stacked along y (no overlap).
  vbox(g, 0, 0, 0, 1.2, 1, 0.9, COL.white);
  vbox(g, 0.05, 1, 0.05, 1.1, 1, 0.8, COL.white);
  // Ears above head (y=2..2.5).
  vbox(g, 0.1, 2, 0.1, 0.3, 0.5, 0.3, COL.white);
  vbox(g, 0.8, 2, 0.1, 0.3, 0.5, 0.3, COL.white);
  // Inner pink ears — protrude FORWARD of ears (z=0.05..0.1) and are
  // INSIDE the ear's y range only? No — ears x=0.1..0.4, inner x=0.15..0.35
  // means inner overlaps ear. Place inner FORWARD of ear (z=0.05..0.1
  // versus ear z=0.1..0.4) — no overlap.
  vbox(g, 0.15, 2.05, 0.05, 0.2, 0.35, 0.05, COL.coralSoft);
  vbox(g, 0.85, 2.05, 0.05, 0.2, 0.35, 0.05, COL.coralSoft);
  // Face — in front of head (head z=0.05..0.85, face z=-0.05..0.0).
  vbox(g, 0.3, 1.4, -0.05, 0.15, 0.15, 0.05, COL.black);
  vbox(g, 0.75, 1.4, -0.05, 0.15, 0.15, 0.05, COL.black);
  vbox(g, 0.5, 1.2, -0.05, 0.2, 0.1, 0.05, COL.coral);
  return g;
}

export function buildTrophy(): THREE.Group {
  const g = new THREE.Group();
  // Base, stem, cup, handles — all separated in y or x, no overlap.
  vbox(g, 0, 0, 0, 1.2, 0.3, 1.2, COL.woodDark); // base
  vbox(g, 0.4, 0.3, 0.4, 0.4, 0.4, 0.4, COL.sun); // stem
  vbox(g, 0.2, 0.7, 0.2, 0.8, 1, 0.8, COL.sun); // cup
  // Handles — entirely OUTSIDE the cup's x range (x<0.2 and x>1.0).
  vbox(g, -0.1, 1, 0.2, 0.3, 0.7, 0.4, COL.sun);
  vbox(g, 1, 1, 0.2, 0.3, 0.7, 0.4, COL.sun);
  return g;
}

export function buildClock(): THREE.Group {
  const g = new THREE.Group();
  // Frame: 4 strips around a 1.2×1.2 hole. Outer 1.5×1.5, depth 0.2.
  vbox(g, 0, 0, 0, 1.5, 0.15, 0.2, COL.woodDark); // bottom
  vbox(g, 0, 1.35, 0, 1.5, 0.15, 0.2, COL.woodDark); // top
  vbox(g, 0, 0.15, 0, 0.15, 1.2, 0.2, COL.woodDark); // left
  vbox(g, 1.35, 0.15, 0, 0.15, 1.2, 0.2, COL.woodDark); // right
  // White face fills the hole — its x,y range is inside the hole, so it
  // doesn't share volume with any frame strip.
  vbox(g, 0.15, 0.15, 0, 1.2, 1.2, 0.1, COL.white);
  // Markers IN FRONT of face (z=-0.05..0).
  vbox(g, 0.7, 1.18, -0.05, 0.1, 0.1, 0.05, COL.charcoal); // 12
  vbox(g, 0.7, 0.22, -0.05, 0.1, 0.1, 0.05, COL.charcoal); // 6
  vbox(g, 1.18, 0.7, -0.05, 0.1, 0.1, 0.05, COL.charcoal); // 3
  vbox(g, 0.22, 0.7, -0.05, 0.1, 0.1, 0.05, COL.charcoal); // 9
  vbox(g, 1.05, 1.05, -0.05, 0.07, 0.07, 0.05, COL.charcoal);
  vbox(g, 1.05, 0.38, -0.05, 0.07, 0.07, 0.05, COL.charcoal);
  vbox(g, 0.38, 0.38, -0.05, 0.07, 0.07, 0.05, COL.charcoal);
  vbox(g, 0.38, 1.05, -0.05, 0.07, 0.07, 0.05, COL.charcoal);
  // Minute hand (up) — only above centre so it doesn't cross other hand.
  vbox(g, 0.7, 0.8, -0.1, 0.1, 0.45, 0.05, COL.charcoal);
  // Hour hand (right) — only to the right of centre.
  vbox(g, 0.8, 0.7, -0.1, 0.4, 0.1, 0.05, COL.charcoal);
  // Centre cap — front-most layer; its x,y (0.69..0.81 × 0.69..0.81) does
  // not overlap either hand (minute starts at y=0.8, hour starts at x=0.8).
  vbox(g, 0.69, 0.69, -0.15, 0.12, 0.12, 0.05, COL.coral);
  return g;
}

export function buildCabinetTop(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 3, 3, 1.2, COL.sun); // body
  // Door panels IN FRONT of body (z=1.2..1.3).
  vbox(g, 0.15, 0.2, 1.2, 1.3, 2.6, 0.1, COL.cream);
  vbox(g, 1.55, 0.2, 1.2, 1.3, 2.6, 0.1, COL.cream);
  // Handles even further forward (z=1.3..1.4).
  vbox(g, 1.3, 1.4, 1.3, 0.1, 0.4, 0.1, COL.woodDark);
  vbox(g, 1.6, 1.4, 1.3, 0.1, 0.4, 0.1, COL.woodDark);
  return g;
}
