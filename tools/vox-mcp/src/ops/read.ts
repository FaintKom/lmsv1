/**
 * Read-side MCP tools: list directories, decode .vox, expose info + palette.
 */
import * as fs from "node:fs";
import * as path from "node:path";

import { decodeFile } from "../vox/decoder.js";
import { countVoxels, toSparse, type Rgba, type Voxel } from "../vox/grid.js";

export interface VoxReadResult {
  path: string;
  dims: { x: number; y: number; z: number };
  palette: Rgba[];
  voxels: Voxel[];
}

export interface VoxInfoResult {
  path: string;
  dims: { x: number; y: number; z: number };
  voxelCount: number;
  paletteCount: number;
  fileBytes: number;
}

export function voxList(dir: string): string[] {
  const out: string[] = [];
  function walk(d: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".vox")) out.push(p);
    }
  }
  walk(dir);
  out.sort();
  return out;
}

export function voxRead(p: string): VoxReadResult {
  const m = decodeFile(p);
  return {
    path: p,
    dims: m.dims,
    palette: m.palette,
    voxels: toSparse(m),
  };
}

export function voxInfo(p: string): VoxInfoResult {
  const m = decodeFile(p);
  const stat = fs.statSync(p);
  return {
    path: p,
    dims: m.dims,
    voxelCount: countVoxels(m),
    paletteCount: m.palette.length,
    fileBytes: stat.size,
  };
}

export function voxPalette(p: string): Rgba[] {
  const m = decodeFile(p);
  return m.palette;
}
