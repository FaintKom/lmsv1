/**
 * Voxel item library for the My Room feature.
 *
 * Each build* function returns a THREE.Group of pre-positioned voxel boxes
 * representing one piece of furniture/decor. Positions are pinned to the spec
 * (design_handoff_student_room/design_files/room-voxels.jsx) -- do not retune.
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

// Slightly darken a hex colour (for fold/shadow accents).
export function darker(hex: number, k = 0.78): number {
  const r = Math.round(((hex >> 16) & 0xff) * k);
  const g = Math.round(((hex >> 8) & 0xff) * k);
  const b = Math.round((hex & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

// Slightly lighten a hex colour.
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

/**
 * Place a single axis-aligned voxel box. x,y,z is the back-left-bottom corner
 * in voxel units (multiplied by VOX internally).
 */
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
  vbox(g, 0, -0.5, 0, w, 0.5, d, pal.base);
  if (type === "wood") {
    for (let z = 0; z < d; z += 2) {
      vbox(g, 0, 0, z, w, 0.05, 0.1, pal.dark, { transparent: true, opacity: 0.6 });
    }
  } else if (type === "tile") {
    for (let x = 0; x < w; x += 2) {
      for (let z = 0; z < d; z += 2) {
        if ((x + z) % 4 === 0) {
          vbox(g, x, 0, z, 2, 0.05, 2, pal.dark, { transparent: true, opacity: 0.4 });
        }
      }
    }
  } else if (type === "carpet") {
    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        if ((x * 7 + z * 13) % 11 === 0) {
          vbox(g, x, 0, z, 1, 0.04, 1, pal.dark, { transparent: true, opacity: 0.5 });
        }
      }
    }
  }
  return g;
}

export function walls(color: number = COL.lavender, w = 14, d = 14, h = 12): THREE.Group {
  const g = new THREE.Group();
  // left wall (x = 0 face)
  vbox(g, -0.6, 0, 0, 0.6, h, d, color);
  // back wall (z = 0 face)
  vbox(g, 0, 0, -0.6, w, h, 0.6, color);
  // crown moulding (top)
  vbox(g, -0.6, h - 0.4, 0, 0.6, 0.4, d, COL.cream, { transparent: true, opacity: 0.55 });
  vbox(g, 0, h - 0.4, -0.6, w, 0.4, 0.6, COL.cream, { transparent: true, opacity: 0.55 });
  // baseboard
  vbox(g, -0.6, 0, 0, 0.6, 0.5, d, COL.cream, { transparent: true, opacity: 0.35 });
  vbox(g, 0, 0, -0.6, w, 0.5, 0.6, COL.cream, { transparent: true, opacity: 0.35 });
  return g;
}

// ── items ──────────────────────────────────────────────────────────────

export type BedVariant = "basic" | "kids" | "double";

export function buildBed(variant: BedVariant = "basic"): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 5, 1.8, 8, COL.woodMid);
  vbox(g, 0, 0, 0, 5, 0.5, 8, darker(COL.woodMid));
  vbox(g, 0, -0.05, 0, 0.4, 0.4, 0.4, COL.woodDark);
  vbox(g, 4.6, -0.05, 0, 0.4, 0.4, 0.4, COL.woodDark);
  vbox(g, 0, -0.05, 7.6, 0.4, 0.4, 0.4, COL.woodDark);
  vbox(g, 4.6, -0.05, 7.6, 0.4, 0.4, 0.4, COL.woodDark);
  vbox(g, 0.2, 1.8, 0.2, 4.6, 1.0, 7.6, COL.white);
  vbox(g, 0.2, 2.45, 0.2, 4.6, 0.08, 7.6, COL.cream, { transparent: true, opacity: 0.6 });
  vbox(g, 0.2, 2.78, 1.6, 4.6, 0.08, 0.8, COL.cream);
  const blanket =
    variant === "kids" ? COL.coral : variant === "double" ? COL.lavender : COL.green;
  vbox(g, 0.2, 2.8, 2.4, 4.6, 0.2, 5.4, blanket);
  vbox(g, 0.2, 2.8, 7.4, 4.6, 0.35, 0.6, darker(blanket));
  // Polka dots on the blanket. Lift them well above y=3.0 (blanket top) so
  // they don't z-fight that face.
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      vbox(g, 1.0 + c * 1.4, 3.08, 3.0 + r * 1.2, 0.25, 0.05, 0.25, darker(blanket, 0.65));
    }
  }
  vbox(g, 0.5, 2.85, 0.4, 4.0, 0.55, 1.4, COL.white);
  vbox(g, 0.5, 2.86, 1.75, 4.0, 0.06, 0.05, COL.cream);
  vbox(g, 1.4, 3.4, 0.55, 2.2, 0.35, 0.7, variant === "kids" ? COL.sun : COL.coralSoft);
  vbox(g, 0, 1.8, -0.4, 5, 3.5, 0.4, COL.woodDark);
  vbox(g, 0.4, 2.2, -0.45, 1.7, 2.6, 0.05, COL.woodMid);
  vbox(g, 2.9, 2.2, -0.45, 1.7, 2.6, 0.05, COL.woodMid);
  vbox(g, 0.1, 5.3, -0.4, 0.4, 0.3, 0.4, COL.woodDark);
  vbox(g, 4.5, 5.3, -0.4, 0.4, 0.3, 0.4, COL.woodDark);
  if (variant === "kids") {
    vbox(g, 1.8, 3.5, 0.6, 1.1, 0.9, 0.9, COL.white);
    vbox(g, 1.9, 4.4, 0.7, 0.9, 0.9, 0.7, COL.white);
    vbox(g, 1.95, 5.2, 0.75, 0.25, 0.5, 0.25, COL.white);
    vbox(g, 2.65, 5.2, 0.75, 0.25, 0.5, 0.25, COL.white);
    vbox(g, 2.02, 5.28, 0.85, 0.1, 0.3, 0.1, COL.coralSoft);
    vbox(g, 2.72, 5.28, 0.85, 0.1, 0.3, 0.1, COL.coralSoft);
    vbox(g, 2.05, 4.7, 0.62, 0.12, 0.12, 0.04, COL.black);
    vbox(g, 2.55, 4.7, 0.62, 0.12, 0.12, 0.04, COL.black);
    vbox(g, 2.3, 4.5, 0.62, 0.2, 0.1, 0.04, COL.coral);
  }
  return g;
}

export type DeskVariant = "wood" | "white";

export function buildDesk(variant: DeskVariant = "wood"): THREE.Group {
  const g = new THREE.Group();
  const top = variant === "white" ? COL.white : COL.woodLight;
  const leg = variant === "white" ? COL.metal : COL.woodMid;
  vbox(g, 0, 2.8, 0, 5, 0.4, 3, top);
  vbox(g, 0.2, 0, 0.2, 0.4, 2.8, 0.4, leg);
  vbox(g, 4.4, 0, 0.2, 0.4, 2.8, 0.4, leg);
  vbox(g, 0.2, 0, 2.4, 0.4, 2.8, 0.4, leg);
  vbox(g, 4.4, 0, 2.4, 0.4, 2.8, 0.4, leg);
  vbox(g, 3.7, 1.3, 0.2, 1.2, 1.5, 0.2, leg);
  vbox(g, 4.1, 1.85, 0.1, 0.4, 0.1, 0.15, COL.metal);
  return g;
}

export function buildChair(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 1.5, 0, 2, 0.3, 2, COL.blue);
  vbox(g, 0.2, 0, 0.2, 0.3, 1.5, 0.3, COL.woodDark);
  vbox(g, 1.5, 0, 0.2, 0.3, 1.5, 0.3, COL.woodDark);
  vbox(g, 0.2, 0, 1.5, 0.3, 1.5, 0.3, COL.woodDark);
  vbox(g, 1.5, 0, 1.5, 0.3, 1.5, 0.3, COL.woodDark);
  vbox(g, 0, 1.8, 0, 2, 2.5, 0.3, COL.blue);
  return g;
}

export function buildMonitor(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 1.25, 0, 0.5, 0.5, 0.4, 0.5, COL.charcoal);
  vbox(g, 1.4, 0.4, 0.65, 0.2, 0.6, 0.2, COL.charcoal);
  vbox(g, 0, 1, 0.4, 3, 2, 0.25, COL.charcoal);
  vbox(g, 0.15, 1.15, 0.65, 2.7, 1.7, 0.05, COL.screen);
  vbox(g, 2.7, 1.2, 0.7, 0.1, 0.1, 0.05, COL.green);
  vbox(g, 0.2, 0, 1.2, 2.6, 0.15, 0.8, COL.charcoal);
  return g;
}

export function buildBookshelfTall(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 3, 0.3, 1, COL.woodMid);
  vbox(g, 0, 8, 0, 3, 0.3, 1, COL.woodMid);
  vbox(g, 0, 0, 0, 0.3, 8, 1, COL.woodMid);
  vbox(g, 2.7, 0, 0, 0.3, 8, 1, COL.woodMid);
  vbox(g, 0.3, 2.5, 0, 2.4, 0.2, 1, COL.woodMid);
  vbox(g, 0.3, 5, 0, 2.4, 0.2, 1, COL.woodMid);
  vbox(g, 0, 0, 1 - 0.2, 3, 8, 0.2, COL.woodDark);
  const colors = [COL.red, COL.green, COL.blue, COL.sun, COL.lavender, COL.coral];
  for (let i = 0; i < 5; i++) {
    vbox(g, 0.5 + i * 0.4, 0.3, 0.3, 0.3, 2, 0.6, colors[i % colors.length]);
  }
  for (let i = 0; i < 4; i++) {
    vbox(g, 0.6 + i * 0.45, 2.7, 0.3, 0.35, 2, 0.55, colors[(i + 2) % colors.length]);
  }
  vbox(g, 0.6, 5.2, 0.3, 0.6, 0.4, 0.6, COL.sun);
  vbox(g, 0.8, 5.6, 0.5, 0.2, 0.5, 0.2, COL.sun);
  vbox(g, 1.5, 5.2, 0.3, 0.5, 0.5, 0.5, COL.pot);
  vbox(g, 1.45, 5.7, 0.25, 0.6, 0.5, 0.6, COL.leaf);
  return g;
}

export function buildBookshelfWall(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 4, 0.2, 1, COL.woodMid);
  const colors = [COL.red, COL.green, COL.blue, COL.sun, COL.lavender];
  for (let i = 0; i < 6; i++) {
    vbox(g, 0.4 + i * 0.5, 0.2, 0.3, 0.4, 1.6, 0.6, colors[i % colors.length]);
  }
  return g;
}

export type DresserVariant = "blue" | "cream";

export function buildDresser(variant: DresserVariant = "blue"): THREE.Group {
  const g = new THREE.Group();
  const body = variant === "blue" ? COL.mint : COL.cream;
  const accent = darker(body, 0.78);
  vbox(g, 0, 0, 0, 4, 4, 2, body);
  vbox(g, -0.1, 4, -0.1, 4.2, 0.25, 2.2, darker(body, 0.85));
  vbox(g, 0.15, 0.3, 1.95, 3.7, 1.0, 0.06, accent);
  vbox(g, 0.15, 1.5, 1.95, 3.7, 1.0, 0.06, accent);
  vbox(g, 0.15, 2.7, 1.95, 3.7, 1.0, 0.06, accent);
  for (let row = 0; row < 3; row++) {
    const y = 0.7 + row * 1.2;
    vbox(g, 1.1, y, 2.01, 0.25, 0.25, 0.1, COL.woodDark);
    vbox(g, 2.65, y, 2.01, 0.25, 0.25, 0.1, COL.woodDark);
  }
  vbox(g, 0.2, -0.3, 0.2, 0.3, 0.3, 0.3, COL.woodDark);
  vbox(g, 3.5, -0.3, 0.2, 0.3, 0.3, 0.3, COL.woodDark);
  vbox(g, 0.2, -0.3, 1.5, 0.3, 0.3, 0.3, COL.woodDark);
  vbox(g, 3.5, -0.3, 1.5, 0.3, 0.3, 0.3, COL.woodDark);
  vbox(g, 0.4, 4.25, 0.5, 0.35, 0.6, 0.35, COL.white);
  vbox(g, 0.45, 4.85, 0.55, 0.25, 0.25, 0.25, COL.cream);
  vbox(g, 0.5, 5.1, 0.6, 0.15, 0.2, 0.15, COL.sun);
  vbox(g, 1.1, 4.25, 0.5, 0.5, 0.75, 0.5, COL.coralSoft);
  vbox(g, 1.3, 5.0, 0.65, 0.15, 0.4, 0.15, COL.leafDark);
  vbox(g, 1.2, 5.4, 0.55, 0.35, 0.25, 0.35, COL.coral);
  vbox(g, 1.27, 5.6, 0.62, 0.2, 0.1, 0.2, COL.sun);
  vbox(g, 2.0, 4.25, 0.4, 1.2, 1.2, 0.15, COL.cream);
  vbox(g, 2.1, 4.35, 0.32, 1.0, 1.0, 0.04, COL.blue);
  vbox(g, 2.3, 4.55, 0.30, 0.6, 0.6, 0.04, COL.coralSoft);
  vbox(g, 2.4, 4.25, 0.6, 0.15, 0.6, 0.15, COL.cream);
  vbox(g, 3.3, 4.25, 0.6, 0.55, 0.25, 0.5, COL.green);
  vbox(g, 3.32, 4.5, 0.57, 0.5, 0.22, 0.55, COL.coral);
  return g;
}

export function buildSofa(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 6, 1.5, 3, COL.cream);
  vbox(g, 0.2, 1.5, 0.4, 1.8, 0.6, 2, COL.white);
  vbox(g, 2.1, 1.5, 0.4, 1.8, 0.6, 2, COL.white);
  vbox(g, 4.0, 1.5, 0.4, 1.8, 0.6, 2, COL.white);
  vbox(g, 0, 1.5, 0, 6, 2, 0.5, COL.cream);
  vbox(g, 0, 1.5, 0, 0.4, 1.8, 3, COL.cream);
  vbox(g, 5.6, 1.5, 0, 0.4, 1.8, 3, COL.cream);
  return g;
}

export function buildCoffeeTable(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 1.2, 0, 4, 0.3, 2, COL.woodMid);
  vbox(g, 0.1, 0, 0.1, 0.3, 1.2, 0.3, COL.woodDark);
  vbox(g, 3.6, 0, 0.1, 0.3, 1.2, 0.3, COL.woodDark);
  vbox(g, 0.1, 0, 1.6, 0.3, 1.2, 0.3, COL.woodDark);
  vbox(g, 3.6, 0, 1.6, 0.3, 1.2, 0.3, COL.woodDark);
  vbox(g, 1, 1.5, 0.5, 1.2, 0.1, 0.8, COL.white);
  return g;
}

export function buildArcade(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 2, 6, 2, COL.red);
  vbox(g, 0.1, 5, 0.05, 1.8, 0.7, 0.1, COL.sun);
  vbox(g, 0.15, 3.2, 0.05, 1.7, 1.6, 0.1, COL.screen);
  vbox(g, 0.1, 2.4, 0.6, 1.8, 0.2, 1, COL.charcoal);
  vbox(g, 0.4, 2.6, 1.1, 0.2, 0.4, 0.2, COL.coral);
  vbox(g, 0.4, 2.9, 1.1, 0.4, 0.15, 0.4, COL.red);
  vbox(g, 1.2, 2.6, 1.0, 0.2, 0.15, 0.2, COL.sun);
  vbox(g, 1.5, 2.6, 1.0, 0.2, 0.15, 0.2, COL.green);
  vbox(g, 1.2, 2.6, 1.3, 0.2, 0.15, 0.2, COL.blue);
  vbox(g, 1.5, 2.6, 1.3, 0.2, 0.15, 0.2, COL.coral);
  return g;
}

export function buildLamp(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 1.6, 0.3, 1.6, COL.charcoal);
  vbox(g, 0.2, 0.3, 0.2, 1.2, 0.25, 1.2, COL.black);
  vbox(g, 0.7, 0.55, 0.7, 0.2, 5.4, 0.2, COL.metal);
  vbox(g, 0.6, 5.6, 0.6, 0.4, 0.3, 0.4, COL.charcoal);
  vbox(g, 0.1, 5.9, 0.1, 1.4, 0.3, 1.4, COL.sun);
  vbox(g, 0.2, 6.2, 0.2, 1.2, 0.3, 1.2, lighter(COL.sun, 1.05));
  vbox(g, 0.3, 6.5, 0.3, 1.0, 0.3, 1.0, COL.sun);
  vbox(g, 0.5, 6.8, 0.5, 0.6, 0.15, 0.6, COL.woodDark);
  vbox(g, 0.5, 5.9, 0.5, 0.6, 0.6, 0.6, 0xfff8c2, { transparent: true, opacity: 0.9 });
  return g;
}

export function buildPlant(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 1.4, 0.4, 1.4, darker(COL.pot, 0.7));
  vbox(g, 0.05, 0.1, 0.05, 1.3, 0.9, 1.3, COL.pot);
  vbox(g, 0, 1.0, 0, 1.4, 0.2, 1.4, darker(COL.pot, 0.85));
  vbox(g, 0.15, 1.1, 0.15, 1.1, 0.1, 1.1, 0x4d2d1a);
  vbox(g, 0.1, 1.2, 0.1, 1.2, 0.6, 1.2, COL.leaf);
  vbox(g, 0.0, 1.4, 0.3, 0.5, 0.5, 0.4, COL.leafDark);
  vbox(g, 0.9, 1.4, 0.3, 0.5, 0.5, 0.4, COL.leafDark);
  vbox(g, 0.3, 1.4, 0.9, 0.4, 0.5, 0.5, COL.leafDark);
  vbox(g, 0.55, 1.8, 0.55, 0.3, 1.4, 0.3, COL.leafDark);
  vbox(g, 0.2, 2.8, 0.4, 0.8, 0.5, 0.7, COL.leaf);
  vbox(g, 0.5, 3.1, 0.3, 0.7, 0.5, 0.7, COL.leaf);
  vbox(g, 0.4, 3.4, 0.6, 0.6, 0.4, 0.6, COL.leaf);
  vbox(g, 0.55, 3.7, 0.5, 0.3, 0.2, 0.3, COL.coral);
  vbox(g, 0.65, 3.85, 0.6, 0.15, 0.1, 0.15, COL.sun);
  return g;
}

export type RugVariant = "teal" | "warm" | "mint";

export function buildRug(variant: RugVariant = "teal"): THREE.Group {
  const g = new THREE.Group();
  const base = variant === "teal" ? COL.rugTeal : variant === "warm" ? COL.rugWarm : COL.rugMint;
  const accent = variant === "teal" ? COL.mint : variant === "warm" ? COL.sun : COL.greenDeep;
  vbox(g, 0, 0.05, 0, 5, 0.1, 4, base);
  vbox(g, 0, 0.06, 0, 5, 0.08, 0.3, accent, { transparent: true, opacity: 0.7 });
  vbox(g, 0, 0.06, 3.7, 5, 0.08, 0.3, accent, { transparent: true, opacity: 0.7 });
  vbox(g, 0, 0.06, 0, 0.3, 0.08, 4, accent, { transparent: true, opacity: 0.7 });
  vbox(g, 4.7, 0.06, 0, 0.3, 0.08, 4, accent, { transparent: true, opacity: 0.7 });
  return g;
}

export function buildWindow(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, -0.2, -0.2, 0, 5.4, 0.3, 0.6, COL.woodLight);
  vbox(g, 0, 0, -0.3, 5, 4, 0.3, COL.woodLight);
  vbox(g, 0.3, 0.3, -0.05, 4.4, 3.4, 0.05, 0xfff9c2);
  vbox(g, 2.4, 0.3, -0.05, 0.2, 3.4, 0.06, COL.woodLight);
  vbox(g, 0.3, 1.9, -0.05, 4.4, 0.2, 0.06, COL.woodLight);
  vbox(g, -0.5, 4.1, 0.05, 6, 0.1, 0.2, COL.charcoal);
  vbox(g, -0.55, 4.05, 0.0, 0.15, 0.25, 0.3, COL.woodDark);
  vbox(g, 5.4, 4.05, 0.0, 0.15, 0.25, 0.3, COL.woodDark);
  for (let i = 0; i < 6; i++) {
    const x = -0.5 + i * 0.18;
    vbox(g, x, 0.2, 0.1, 0.18, 4.0, 0.18, COL.sun);
    vbox(g, x, 0.2, 0.1, 0.18, 0.15, 0.18, darker(COL.sun, 0.7));
  }
  for (let i = 0; i < 6; i++) {
    const x = 4.4 + i * 0.18;
    vbox(g, x, 0.2, 0.1, 0.18, 4.0, 0.18, COL.sun);
    vbox(g, x, 0.2, 0.1, 0.18, 0.15, 0.18, darker(COL.sun, 0.7));
  }
  vbox(g, 0.2, 0.1, 0.2, 0.4, 0.3, 0.3, COL.pot);
  vbox(g, 0.15, 0.4, 0.15, 0.5, 0.4, 0.4, COL.leaf);
  vbox(g, 0.25, 0.75, 0.25, 0.3, 0.4, 0.3, COL.leafDark);
  return g;
}

export function buildPictures(): THREE.Group {
  const g = new THREE.Group();
  const colors = [COL.coral, COL.green, COL.blue];
  for (let i = 0; i < 3; i++) {
    vbox(g, i * 1.4, 0, 0, 1.2, 1.2, 0.15, COL.white);
    vbox(g, i * 1.4 + 0.1, 0.1, 0.1, 1, 1, 0.06, colors[i]);
  }
  return g;
}

export function buildPlushie(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 1.2, 1, 0.9, COL.white);
  vbox(g, 0.05, 1, 0.05, 1.1, 1, 0.8, COL.white);
  vbox(g, 0.1, 2, 0.1, 0.3, 0.5, 0.3, COL.white);
  vbox(g, 0.8, 2, 0.1, 0.3, 0.5, 0.3, COL.white);
  vbox(g, 0.15, 2.05, 0.15, 0.2, 0.35, 0.2, COL.coralSoft);
  vbox(g, 0.85, 2.05, 0.15, 0.2, 0.35, 0.2, COL.coralSoft);
  vbox(g, 0.3, 1.4, -0.05, 0.15, 0.15, 0.05, COL.black);
  vbox(g, 0.75, 1.4, -0.05, 0.15, 0.15, 0.05, COL.black);
  vbox(g, 0.5, 1.2, -0.05, 0.2, 0.1, 0.05, COL.coral);
  return g;
}

export function buildTrophy(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 1.2, 0.3, 1.2, COL.woodDark);
  vbox(g, 0.4, 0.3, 0.4, 0.4, 0.4, 0.4, COL.sun);
  vbox(g, 0.2, 0.7, 0.2, 0.8, 1, 0.8, COL.sun);
  vbox(g, -0.1, 1, 0.2, 0.3, 0.7, 0.4, COL.sun);
  vbox(g, 1, 1, 0.2, 0.3, 0.7, 0.4, COL.sun);
  return g;
}

export function buildClock(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 1.5, 1.5, 0.2, COL.woodDark);
  vbox(g, 0.15, 0.15, -0.05, 1.2, 1.2, 0.1, COL.white);
  vbox(g, 0.7, 0.4, -0.1, 0.1, 0.6, 0.05, COL.charcoal);
  vbox(g, 0.7, 0.6, -0.1, 0.6, 0.1, 0.05, COL.charcoal);
  return g;
}

export function buildCabinetTop(): THREE.Group {
  const g = new THREE.Group();
  vbox(g, 0, 0, 0, 3, 3, 1.2, COL.sun);
  vbox(g, 0.15, 0.2, 1.2, 1.3, 2.6, 0.1, COL.cream);
  vbox(g, 1.55, 0.2, 1.2, 1.3, 2.6, 0.1, COL.cream);
  vbox(g, 1.3, 1.4, 1.3, 0.1, 0.4, 0.1, COL.woodDark);
  vbox(g, 1.6, 1.4, 1.3, 0.1, 0.4, 0.1, COL.woodDark);
  return g;
}
