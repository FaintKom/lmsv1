/**
 * Write-side MCP tools: persist VoxModels, edit voxels in-place, manipulate
 * palette slots. Every op reads the file fresh, mutates the model, and writes
 * the whole .vox back — keeps semantics simple and avoids stale-buffer bugs.
 */
import { decodeFile } from "../vox/decoder.js";
import { encodeFile } from "../vox/encoder.js";
import {
  fromSparse,
  index,
  normaliseRegion,
  set as gridSet,
  wholeRegion,
  type Dims,
  type Region,
  type Rgba,
  type VoxModel,
  type Voxel,
} from "../vox/grid.js";
import { setSlot } from "../vox/palette.js";

export interface WriteResult {
  path: string;
  bytes: number;
}

export interface SetBatchOp {
  x: number;
  y: number;
  z: number;
  c: number;
}

export function voxWrite(
  p: string,
  dims: Dims,
  palette: Rgba[],
  voxels: Voxel[],
): WriteResult {
  const m = fromSparse(dims, palette, voxels);
  const bytes = encodeFile(p, m);
  return { path: p, bytes };
}

export function voxSet(
  p: string,
  x: number,
  y: number,
  z: number,
  colorIdx: number,
): WriteResult {
  const m = decodeFile(p);
  if (!gridSet(m, x, y, z, colorIdx)) {
    throw new Error(`vox_set out of bounds: (${x},${y},${z}) for dims ${m.dims.x}×${m.dims.y}×${m.dims.z}`);
  }
  const bytes = encodeFile(p, m);
  return { path: p, bytes };
}

export interface SetBatchResult extends WriteResult {
  applied: number;
  outOfBounds: number;
}

export function voxSetBatch(p: string, ops: SetBatchOp[]): SetBatchResult {
  const m = decodeFile(p);
  let applied = 0;
  let oob = 0;
  for (const op of ops) {
    if (gridSet(m, op.x, op.y, op.z, op.c)) applied++;
    else oob++;
  }
  const bytes = encodeFile(p, m);
  return { path: p, bytes, applied, outOfBounds: oob };
}

export interface ClearResult extends WriteResult {
  cleared: number;
}

export function voxClear(p: string, region?: Region): ClearResult {
  const m = decodeFile(p);
  const r = region ? normaliseRegion(region, m.dims) : wholeRegion(m.dims);
  let cleared = 0;
  for (let z = r.z0; z < r.z1; z++) {
    for (let y = r.y0; y < r.y1; y++) {
      for (let x = r.x0; x < r.x1; x++) {
        const i = index(m.dims, x, y, z);
        if (m.cells[i] > 0) {
          m.cells[i] = 0;
          cleared++;
        }
      }
    }
  }
  const bytes = encodeFile(p, m);
  return { path: p, bytes, cleared };
}

export interface FillResult extends WriteResult {
  filled: number;
}

export function voxFill(p: string, region: Region, colorIdx: number): FillResult {
  const m = decodeFile(p);
  const r = normaliseRegion(region, m.dims);
  const c = colorIdx & 0xff;
  let filled = 0;
  for (let z = r.z0; z < r.z1; z++) {
    for (let y = r.y0; y < r.y1; y++) {
      for (let x = r.x0; x < r.x1; x++) {
        m.cells[index(m.dims, x, y, z)] = c;
        filled++;
      }
    }
  }
  const bytes = encodeFile(p, m);
  return { path: p, bytes, filled };
}

export interface ReplaceColorResult extends WriteResult {
  replaced: number;
}

export function voxReplaceColor(
  p: string,
  oldIdx: number,
  newIdx: number,
): ReplaceColorResult {
  const m = decodeFile(p);
  let replaced = 0;
  for (let i = 0; i < m.cells.length; i++) {
    if (m.cells[i] === oldIdx) {
      m.cells[i] = newIdx & 0xff;
      replaced++;
    }
  }
  const bytes = encodeFile(p, m);
  return { path: p, bytes, replaced };
}

export interface PaletteSetResult extends WriteResult {
  paletteCount: number;
}

export function voxPaletteSet(p: string, idx: number, rgba: Rgba): PaletteSetResult {
  const m: VoxModel = decodeFile(p);
  setSlot(m.palette, idx, rgba);
  const bytes = encodeFile(p, m);
  return { path: p, bytes, paletteCount: m.palette.length };
}
