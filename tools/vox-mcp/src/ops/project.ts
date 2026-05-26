/**
 * Project-specific helpers — copy edited .vox files into the running game's
 * public/voxels directory so RoomCanvas / AvatarCanvas pick them up.
 */
import * as fs from "node:fs";
import * as path from "node:path";

export interface PublishResult {
  src: string;
  dest: string;
  bytes: number;
}

const DEFAULT_PUBLIC = "/data/public";

export function voxPublish(srcPath: string, itemId: string, publicDir = DEFAULT_PUBLIC): PublishResult {
  if (!fs.existsSync(srcPath)) {
    throw new Error(`vox_publish: source not found: ${srcPath}`);
  }
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const dest = path.join(publicDir, `${itemId}.vox`);
  fs.copyFileSync(srcPath, dest);
  const stat = fs.statSync(dest);
  return { src: srcPath, dest, bytes: stat.size };
}
