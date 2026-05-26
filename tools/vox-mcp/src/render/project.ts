/**
 * Project each voxel cube into a set of visible-face quads in screen space.
 * Uses orthographic projection — no perspective foreshortening — which is
 * exactly what voxel art expects.
 *
 * For each non-empty cell, we test which of its 6 neighbours are empty (or
 * out of bounds) — those faces are visible and get emitted as quads. This
 * gives the "skin" of the model with no internal triangles.
 */
import { dot, type Camera, type V3 } from "./camera.js";
import type { FaceKind } from "./light.js";
import { getSlot } from "../vox/palette.js";
import { type Rgba, type VoxModel, index } from "../vox/grid.js";

export interface QuadPoint {
  sx: number;
  sy: number;
}

export interface Quad {
  /** Four screen-space corners, ordered CCW. */
  pts: QuadPoint[];
  /** Average view-space depth (for painter's algorithm sort). */
  depth: number;
  color: Rgba;
  face: FaceKind;
}

interface FaceDef {
  kind: FaceKind;
  normal: V3;
  /** 4 corner offsets within the unit cube (each 0 or 1). */
  corners: V3[];
}

const FACES: FaceDef[] = [
  {
    kind: "right",
    normal: { x: 1, y: 0, z: 0 },
    corners: [
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 1, z: 1 },
      { x: 1, y: 0, z: 1 },
    ],
  },
  {
    kind: "left",
    normal: { x: -1, y: 0, z: 0 },
    corners: [
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 1, z: 1 },
    ],
  },
  {
    kind: "back",
    normal: { x: 0, y: 1, z: 0 },
    corners: [
      { x: 1, y: 1, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 1, z: 1 },
      { x: 1, y: 1, z: 1 },
    ],
  },
  {
    kind: "front",
    normal: { x: 0, y: -1, z: 0 },
    corners: [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 0, z: 1 },
      { x: 0, y: 0, z: 1 },
    ],
  },
  {
    kind: "top",
    normal: { x: 0, y: 0, z: 1 },
    corners: [
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 1 },
      { x: 1, y: 1, z: 1 },
      { x: 0, y: 1, z: 1 },
    ],
  },
  {
    kind: "bottom",
    normal: { x: 0, y: 0, z: -1 },
    corners: [
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
    ],
  },
];

export interface ProjectOptions {
  width: number;
  height: number;
  /** Multiplier applied after fitting to canvas. 1.0 = exact fit, smaller = padding. */
  zoom?: number;
}

export function project(
  m: VoxModel,
  camera: Camera,
  opts: ProjectOptions,
): { quads: Quad[] } {
  const { dims, cells } = m;
  const halfX = dims.x / 2;
  const halfY = dims.y / 2;
  const halfZ = dims.z / 2;

  type RawQuad = {
    pts: V3[];
    depth: number;
    color: Rgba;
    face: FaceKind;
  };
  const raw: RawQuad[] = [];

  for (let z = 0; z < dims.z; z++) {
    for (let y = 0; y < dims.y; y++) {
      for (let x = 0; x < dims.x; x++) {
        const c = cells[index(dims, x, y, z)];
        if (c === 0) continue;
        const color = getSlot(m.palette, c);
        for (const f of FACES) {
          const nx = x + f.normal.x;
          const ny = y + f.normal.y;
          const nz = z + f.normal.z;
          let neighbourFilled = false;
          if (
            nx >= 0 && nx < dims.x &&
            ny >= 0 && ny < dims.y &&
            nz >= 0 && nz < dims.z
          ) {
            neighbourFilled = cells[index(dims, nx, ny, nz)] > 0;
          }
          if (neighbourFilled) continue;

          // Back-face cull: skip faces whose normal points away from camera.
          if (dot(f.normal, camera.forward) > 0.001) continue;

          const ox = x - halfX;
          const oy = y - halfY;
          const oz = z - halfZ;

          const pts = f.corners.map((p) => ({
            x: ox + p.x,
            y: oy + p.y,
            z: oz + p.z,
          }));
          const depth =
            (dot(pts[0], camera.forward) +
              dot(pts[1], camera.forward) +
              dot(pts[2], camera.forward) +
              dot(pts[3], camera.forward)) /
            4;
          raw.push({ pts, depth, color, face: f.kind });
        }
      }
    }
  }

  let minSx = Infinity, maxSx = -Infinity, minSy = Infinity, maxSy = -Infinity;
  const projected: Array<{ pts: QuadPoint[]; depth: number; color: Rgba; face: FaceKind }> = [];
  for (const q of raw) {
    const pts2 = q.pts.map((p) => ({
      sx: dot(p, camera.right),
      sy: dot(p, camera.up),
    }));
    for (const pt of pts2) {
      if (pt.sx < minSx) minSx = pt.sx;
      if (pt.sx > maxSx) maxSx = pt.sx;
      if (pt.sy < minSy) minSy = pt.sy;
      if (pt.sy > maxSy) maxSy = pt.sy;
    }
    projected.push({ pts: pts2, depth: q.depth, color: q.color, face: q.face });
  }

  if (!isFinite(minSx)) {
    return { quads: [] };
  }

  const zoom = opts.zoom ?? 0.92;
  const span = Math.max(maxSx - minSx, maxSy - minSy);
  const scale = (Math.min(opts.width, opts.height) / Math.max(span, 1e-6)) * zoom;
  const cx = (minSx + maxSx) / 2;
  const cy = (minSy + maxSy) / 2;
  const halfW = opts.width / 2;
  const halfH = opts.height / 2;

  const quads: Quad[] = projected.map((q) => ({
    depth: q.depth,
    color: q.color,
    face: q.face,
    pts: q.pts.map((p) => ({
      sx: halfW + (p.sx - cx) * scale,
      // Canvas Y grows downward; flip so screen-up renders as visually up.
      sy: halfH - (p.sy - cy) * scale,
    })),
  }));

  // Painter's algorithm: paint deepest first.
  quads.sort((a, b) => b.depth - a.depth);
  return { quads };
}
