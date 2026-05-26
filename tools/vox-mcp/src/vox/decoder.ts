/**
 * Decode .vox files via parse-magica-voxel, then materialise as a VoxModel
 * (dense Uint8Array grid).
 */
import * as fs from "node:fs";

// Types ambient-declared in src/types.d.ts.
import parseMagicaVoxel from "parse-magica-voxel";

import { fromSparse, type Dims, type Rgba, type VoxModel } from "./grid.js";

interface ParsedVox {
  SIZE: { x: number; y: number; z: number };
  XYZI: Array<{ x: number; y: number; z: number; c: number }>;
  RGBA: Array<{ r: number; g: number; b: number; a: number }>;
}

export function decodeBuffer(buf: Uint8Array): VoxModel {
  const parsed = parseMagicaVoxel(buf) as ParsedVox;
  const dims: Dims = parsed.SIZE;
  // parse-magica-voxel returns 256 palette entries (the full RGBA chunk).
  // Trim trailing all-zero slots so palette length matches actual paint colours,
  // then ensure at least 1 entry so getSlot never returns undefined.
  const palette: Rgba[] = parsed.RGBA.slice();
  while (palette.length > 1) {
    const last = palette[palette.length - 1];
    if (last.r === 0 && last.g === 0 && last.b === 0 && last.a === 0) {
      palette.pop();
    } else {
      break;
    }
  }
  return fromSparse(dims, palette, parsed.XYZI);
}

export function decodeFile(path: string): VoxModel {
  const buf = fs.readFileSync(path);
  return decodeBuffer(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
}
