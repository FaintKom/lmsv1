/**
 * Dense voxel grid representation + helpers.
 *
 * Coordinate convention (MagicaVoxel):
 *   x → right
 *   y → forward (depth)
 *   z → up
 *
 * Storage: flat Uint8Array, size = dims.x * dims.y * dims.z.
 * Cell value: 0 = empty, 1..255 = palette index (1-based, matching MV).
 */

export interface Dims {
  x: number;
  y: number;
  z: number;
}

export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Voxel {
  x: number;
  y: number;
  z: number;
  c: number;
}

export interface Region {
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

export interface VoxModel {
  dims: Dims;
  palette: Rgba[];
  /** Dense grid. cells[idx(x,y,z)] = colour index (0 = empty). */
  cells: Uint8Array;
}

export function makeEmpty(dims: Dims, palette: Rgba[] = []): VoxModel {
  const cells = new Uint8Array(dims.x * dims.y * dims.z);
  return { dims, palette: palette.slice(), cells };
}

export function fromSparse(
  dims: Dims,
  palette: Rgba[],
  voxels: Voxel[],
): VoxModel {
  const m = makeEmpty(dims, palette);
  for (const v of voxels) {
    if (
      v.x < 0 || v.x >= dims.x ||
      v.y < 0 || v.y >= dims.y ||
      v.z < 0 || v.z >= dims.z
    ) continue;
    m.cells[index(dims, v.x, v.y, v.z)] = v.c;
  }
  return m;
}

export function toSparse(m: VoxModel): Voxel[] {
  const out: Voxel[] = [];
  const { dims, cells } = m;
  for (let z = 0; z < dims.z; z++) {
    for (let y = 0; y < dims.y; y++) {
      for (let x = 0; x < dims.x; x++) {
        const c = cells[index(dims, x, y, z)];
        if (c > 0) out.push({ x, y, z, c });
      }
    }
  }
  return out;
}

export function index(dims: Dims, x: number, y: number, z: number): number {
  return x + y * dims.x + z * dims.x * dims.y;
}

export function get(m: VoxModel, x: number, y: number, z: number): number {
  if (!inBounds(m.dims, x, y, z)) return 0;
  return m.cells[index(m.dims, x, y, z)];
}

export function set(
  m: VoxModel,
  x: number,
  y: number,
  z: number,
  c: number,
): boolean {
  if (!inBounds(m.dims, x, y, z)) return false;
  m.cells[index(m.dims, x, y, z)] = c & 0xff;
  return true;
}

export function inBounds(dims: Dims, x: number, y: number, z: number): boolean {
  return (
    x >= 0 && x < dims.x &&
    y >= 0 && y < dims.y &&
    z >= 0 && z < dims.z
  );
}

export function countVoxels(m: VoxModel): number {
  let n = 0;
  for (let i = 0; i < m.cells.length; i++) if (m.cells[i] > 0) n++;
  return n;
}

/** Inclusive at min, exclusive at max — like array slices. */
export function normaliseRegion(r: Region, dims: Dims): Region {
  const clamp = (v: number, lo: number, hi: number): number =>
    Math.max(lo, Math.min(hi, v));
  return {
    x0: clamp(Math.min(r.x0, r.x1), 0, dims.x),
    y0: clamp(Math.min(r.y0, r.y1), 0, dims.y),
    z0: clamp(Math.min(r.z0, r.z1), 0, dims.z),
    x1: clamp(Math.max(r.x0, r.x1), 0, dims.x),
    y1: clamp(Math.max(r.y0, r.y1), 0, dims.y),
    z1: clamp(Math.max(r.z0, r.z1), 0, dims.z),
  };
}

export function wholeRegion(dims: Dims): Region {
  return { x0: 0, y0: 0, z0: 0, x1: dims.x, y1: dims.y, z1: dims.z };
}

/** Tightest bounding box around non-empty cells. Returns null for empty grids. */
export function boundingBox(m: VoxModel): Region | null {
  const { dims, cells } = m;
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -1, maxY = -1, maxZ = -1;
  for (let z = 0; z < dims.z; z++) {
    for (let y = 0; y < dims.y; y++) {
      for (let x = 0; x < dims.x; x++) {
        if (cells[index(dims, x, y, z)] === 0) continue;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
      }
    }
  }
  if (maxX < 0) return null;
  return { x0: minX, y0: minY, z0: minZ, x1: maxX + 1, y1: maxY + 1, z1: maxZ + 1 };
}
