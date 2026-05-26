/**
 * Diff two .vox files (voxel-level), and render a side-by-side comparison
 * PNG so the agent can eyeball before/after.
 */
import { createCanvas } from "canvas";

import { decodeFile } from "../vox/decoder.js";
import { index, type Dims } from "../vox/grid.js";
import { paintView } from "../render/raster.js";
import type { View } from "../render/camera.js";

export interface DiffEntry {
  x: number;
  y: number;
  z: number;
  /** undefined when the voxel is empty in that model. */
  a?: number;
  b?: number;
}

export interface DiffResult {
  pathA: string;
  pathB: string;
  dimsMatch: boolean;
  dimsA: Dims;
  dimsB: Dims;
  added: DiffEntry[];
  removed: DiffEntry[];
  recolored: DiffEntry[];
  summary: { added: number; removed: number; recolored: number };
}

export function voxDiff(pathA: string, pathB: string): DiffResult {
  const a = decodeFile(pathA);
  const b = decodeFile(pathB);
  const added: DiffEntry[] = [];
  const removed: DiffEntry[] = [];
  const recolored: DiffEntry[] = [];

  if (
    a.dims.x !== b.dims.x ||
    a.dims.y !== b.dims.y ||
    a.dims.z !== b.dims.z
  ) {
    return {
      pathA, pathB,
      dimsMatch: false,
      dimsA: a.dims, dimsB: b.dims,
      added, removed, recolored,
      summary: { added: 0, removed: 0, recolored: 0 },
    };
  }

  const { dims } = a;
  for (let z = 0; z < dims.z; z++) {
    for (let y = 0; y < dims.y; y++) {
      for (let x = 0; x < dims.x; x++) {
        const i = index(dims, x, y, z);
        const ca = a.cells[i];
        const cb = b.cells[i];
        if (ca === cb) continue;
        if (ca === 0 && cb > 0) added.push({ x, y, z, b: cb });
        else if (ca > 0 && cb === 0) removed.push({ x, y, z, a: ca });
        else recolored.push({ x, y, z, a: ca, b: cb });
      }
    }
  }

  return {
    pathA, pathB,
    dimsMatch: true,
    dimsA: a.dims, dimsB: b.dims,
    added, removed, recolored,
    summary: {
      added: added.length,
      removed: removed.length,
      recolored: recolored.length,
    },
  };
}

/** Side-by-side PNG: A on left, B on right, both at the same view + zoom. */
export function voxCompareRender(
  pathA: string,
  pathB: string,
  view: View = "iso",
  size: [number, number] = [256, 256],
): Buffer {
  const [w, h] = size;
  const a = decodeFile(pathA);
  const b = decodeFile(pathB);

  const canvas = createCanvas(w * 2, h);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w * 2, h);

  // Left half — clip to keep model A's quads from bleeding into right side.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  paintView(ctx, a, view, w, h, 0.85);
  ctx.restore();

  // Right half.
  ctx.save();
  ctx.translate(w, 0);
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  paintView(ctx, b, view, w, h, 0.85);
  ctx.restore();

  // Vertical divider.
  ctx.strokeStyle = "rgba(0, 0, 0, 0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(w, h);
  ctx.stroke();

  return canvas.toBuffer("image/png");
}
