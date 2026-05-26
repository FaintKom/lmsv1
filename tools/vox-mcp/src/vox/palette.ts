/**
 * Palette helpers. MagicaVoxel uses 1-based 8-bit indices, leaving 255 slots
 * for paint colours (slot 0 = empty / transparent).
 */
import type { Rgba } from "./grid.js";

export const MAX_PALETTE = 255;

export function rgbaEqual(a: Rgba, b: Rgba): boolean {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

/**
 * Insert {color} into palette and return its 1-based index. If already
 * present, returns the existing index. Returns 1 (and silently caps) when
 * the palette is full — caller should pre-trim or call findNearest.
 */
export function addColor(palette: Rgba[], color: Rgba): number {
  for (let i = 0; i < palette.length; i++) {
    if (rgbaEqual(palette[i], color)) return i + 1;
  }
  if (palette.length >= MAX_PALETTE) return 1;
  palette.push({ ...color });
  return palette.length;
}

export function findNearest(palette: Rgba[], color: Rgba): number {
  if (palette.length === 0) return 0;
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = p.r - color.r;
    const dg = p.g - color.g;
    const db = p.b - color.b;
    const d = dr * dr + dg * dg + db * db;
    if (d < bestDist) {
      bestDist = d;
      best = i + 1;
    }
  }
  return best;
}

export function setSlot(palette: Rgba[], idx1: number, color: Rgba): void {
  if (idx1 < 1 || idx1 > MAX_PALETTE) throw new Error(`palette index out of range: ${idx1}`);
  while (palette.length < idx1) palette.push({ r: 0, g: 0, b: 0, a: 255 });
  palette[idx1 - 1] = { ...color };
}

export function getSlot(palette: Rgba[], idx1: number): Rgba {
  const i = idx1 - 1;
  return palette[i] ?? palette[0] ?? { r: 200, g: 200, b: 200, a: 255 };
}

/** Pack three.js-style hex (0xRRGGBB) → RGBA with full alpha. */
export function hexToRgba(hex: number): Rgba {
  return {
    r: (hex >> 16) & 0xff,
    g: (hex >> 8) & 0xff,
    b: hex & 0xff,
    a: 255,
  };
}

export function rgbaToHex(c: Rgba): number {
  return ((c.r & 0xff) << 16) | ((c.g & 0xff) << 8) | (c.b & 0xff);
}
