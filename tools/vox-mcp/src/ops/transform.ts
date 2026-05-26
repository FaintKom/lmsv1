/**
 * Spatial transforms over the dense grid. All operations rebuild the cells
 * array from scratch (cheap for grid sizes we use, <256³) to avoid in-place
 * aliasing bugs.
 */
import { decodeFile } from "../vox/decoder.js";
import { encodeFile } from "../vox/encoder.js";
import {
  boundingBox,
  index,
  makeEmpty,
  type Dims,
  type Region,
  type VoxModel,
} from "../vox/grid.js";

export interface TransformResult {
  path: string;
  bytes: number;
  dims: Dims;
}

type Axis = "x" | "y" | "z";

function commit(p: string, m: VoxModel): TransformResult {
  const bytes = encodeFile(p, m);
  return { path: p, bytes, dims: m.dims };
}

export function voxMirror(p: string, axis: Axis): TransformResult {
  const src = decodeFile(p);
  const dst = makeEmpty(src.dims, src.palette);
  const { dims } = src;
  for (let z = 0; z < dims.z; z++) {
    for (let y = 0; y < dims.y; y++) {
      for (let x = 0; x < dims.x; x++) {
        const c = src.cells[index(dims, x, y, z)];
        if (c === 0) continue;
        const nx = axis === "x" ? dims.x - 1 - x : x;
        const ny = axis === "y" ? dims.y - 1 - y : y;
        const nz = axis === "z" ? dims.z - 1 - z : z;
        dst.cells[index(dims, nx, ny, nz)] = c;
      }
    }
  }
  return commit(p, dst);
}

/**
 * 90° CCW rotation around the given axis, repeated {steps} times (mod 4).
 * Each call to applyOneStep rotates the current point relative to the
 * current grid dims, so we track dims as they swap and apply step-by-step.
 */
export function voxRotate(p: string, axis: Axis, steps: number): TransformResult {
  const k = ((steps % 4) + 4) % 4;
  const src = decodeFile(p);
  if (k === 0) return commit(p, src);

  // Walk one quarter-turn at a time, swapping dims as needed.
  let curDims: Dims = { ...src.dims };
  let curCells = src.cells;
  for (let i = 0; i < k; i++) {
    const next = rotateOnce(curDims, curCells, axis);
    curDims = next.dims;
    curCells = next.cells;
  }
  return commit(p, { dims: curDims, palette: src.palette, cells: curCells });
}

function rotateOnce(
  dims: Dims,
  cells: Uint8Array,
  axis: Axis,
): { dims: Dims; cells: Uint8Array } {
  const newDims: Dims =
    axis === "z" ? { x: dims.y, y: dims.x, z: dims.z } :
    axis === "y" ? { x: dims.z, y: dims.y, z: dims.x } :
                   { x: dims.x, y: dims.z, z: dims.y };

  const out = new Uint8Array(newDims.x * newDims.y * newDims.z);
  for (let z = 0; z < dims.z; z++) {
    for (let y = 0; y < dims.y; y++) {
      for (let x = 0; x < dims.x; x++) {
        const c = cells[x + y * dims.x + z * dims.x * dims.y];
        if (c === 0) continue;
        let nx = x, ny = y, nz = z;
        if (axis === "z") {
          // CCW around z: (x, y) -> (y, dims.x - 1 - x)
          nx = y;
          ny = dims.x - 1 - x;
        } else if (axis === "y") {
          // CCW around y: (x, z) -> (z, dims.x - 1 - x)
          nx = z;
          nz = dims.x - 1 - x;
        } else {
          // CCW around x: (y, z) -> (z, dims.y - 1 - y)
          ny = z;
          nz = dims.y - 1 - y;
        }
        out[nx + ny * newDims.x + nz * newDims.x * newDims.y] = c;
      }
    }
  }
  return { dims: newDims, cells: out };
}

export type TranslateMode = "clip" | "wrap" | "resize";

export function voxTranslate(
  p: string,
  dx: number,
  dy: number,
  dz: number,
  mode: TranslateMode = "clip",
): TransformResult {
  const src = decodeFile(p);
  const { dims } = src;

  if (mode === "resize") {
    const newDims: Dims = {
      x: dims.x + Math.abs(dx),
      y: dims.y + Math.abs(dy),
      z: dims.z + Math.abs(dz),
    };
    const dst = makeEmpty(newDims, src.palette);
    const ox = dx > 0 ? dx : 0;
    const oy = dy > 0 ? dy : 0;
    const oz = dz > 0 ? dz : 0;
    for (let z = 0; z < dims.z; z++) {
      for (let y = 0; y < dims.y; y++) {
        for (let x = 0; x < dims.x; x++) {
          const c = src.cells[index(dims, x, y, z)];
          if (c === 0) continue;
          dst.cells[index(newDims, x + ox, y + oy, z + oz)] = c;
        }
      }
    }
    return commit(p, dst);
  }

  const dst = makeEmpty(dims, src.palette);
  for (let z = 0; z < dims.z; z++) {
    for (let y = 0; y < dims.y; y++) {
      for (let x = 0; x < dims.x; x++) {
        const c = src.cells[index(dims, x, y, z)];
        if (c === 0) continue;
        let nx = x + dx, ny = y + dy, nz = z + dz;
        if (mode === "wrap") {
          nx = ((nx % dims.x) + dims.x) % dims.x;
          ny = ((ny % dims.y) + dims.y) % dims.y;
          nz = ((nz % dims.z) + dims.z) % dims.z;
        }
        if (
          nx >= 0 && nx < dims.x &&
          ny >= 0 && ny < dims.y &&
          nz >= 0 && nz < dims.z
        ) {
          dst.cells[index(dims, nx, ny, nz)] = c;
        }
      }
    }
  }
  return commit(p, dst);
}

/**
 * Crop to the tight bounding box of non-empty voxels. Empty grids become
 * 1×1×1 with no voxels.
 */
export function voxCrop(p: string): TransformResult {
  const src = decodeFile(p);
  const bb = boundingBox(src);
  if (!bb) {
    const dst = makeEmpty({ x: 1, y: 1, z: 1 }, src.palette);
    return commit(p, dst);
  }
  const newDims: Dims = {
    x: bb.x1 - bb.x0,
    y: bb.y1 - bb.y0,
    z: bb.z1 - bb.z0,
  };
  const dst = makeEmpty(newDims, src.palette);
  for (let z = bb.z0; z < bb.z1; z++) {
    for (let y = bb.y0; y < bb.y1; y++) {
      for (let x = bb.x0; x < bb.x1; x++) {
        const c = src.cells[index(src.dims, x, y, z)];
        if (c > 0) {
          dst.cells[index(newDims, x - bb.x0, y - bb.y0, z - bb.z0)] = c;
        }
      }
    }
  }
  return commit(p, dst);
}

export type ResizeAnchor = "min" | "centre" | "max";

export function voxResize(
  p: string,
  newDims: Dims,
  anchor: ResizeAnchor = "min",
): TransformResult {
  const src = decodeFile(p);
  const dst = makeEmpty(newDims, src.palette);
  const offset = computeAnchorOffset(src.dims, newDims, anchor);
  for (let z = 0; z < src.dims.z; z++) {
    for (let y = 0; y < src.dims.y; y++) {
      for (let x = 0; x < src.dims.x; x++) {
        const c = src.cells[index(src.dims, x, y, z)];
        if (c === 0) continue;
        const nx = x + offset.x;
        const ny = y + offset.y;
        const nz = z + offset.z;
        if (
          nx >= 0 && nx < newDims.x &&
          ny >= 0 && ny < newDims.y &&
          nz >= 0 && nz < newDims.z
        ) {
          dst.cells[index(newDims, nx, ny, nz)] = c;
        }
      }
    }
  }
  return commit(p, dst);
}

function computeAnchorOffset(
  src: Dims,
  dst: Dims,
  anchor: ResizeAnchor,
): { x: number; y: number; z: number } {
  if (anchor === "min") return { x: 0, y: 0, z: 0 };
  if (anchor === "max") {
    return { x: dst.x - src.x, y: dst.y - src.y, z: dst.z - src.z };
  }
  return {
    x: Math.floor((dst.x - src.x) / 2),
    y: Math.floor((dst.y - src.y) / 2),
    z: Math.floor((dst.z - src.z) / 2),
  };
}

export type { Region };
