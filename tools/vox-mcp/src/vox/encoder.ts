/**
 * Encode a VoxModel into MagicaVoxel .vox binary format.
 *
 * Format reference: https://github.com/ephtracy/voxel-model/blob/master/MagicaVoxel-file-format-vox.txt
 *
 * Layout:
 *   header (8 bytes): "VOX " + uint32 version (150)
 *   MAIN chunk (header + 0 content + children)
 *     ├─ SIZE chunk    (12-byte content: x, y, z)
 *     ├─ XYZI chunk    (4 + N*4 bytes: count, then (x,y,z,c) per voxel)
 *     └─ RGBA chunk    (256 * 4 bytes: palette, slot 0 unused)
 *
 * Ported from frontend/scripts/export-vox.ts encodeVox() to keep behaviour
 * identical (the project already loads its own exports successfully).
 */
import * as fs from "node:fs";

import { toSparse, type VoxModel } from "./grid.js";

export function encodeBuffer(m: VoxModel): Buffer {
  const voxels = toSparse(m);

  function chunk(id: string, content: Buffer, children: Buffer = Buffer.alloc(0)): Buffer {
    const header = Buffer.alloc(12);
    header.write(id, 0, 4, "ascii");
    header.writeInt32LE(content.length, 4);
    header.writeInt32LE(children.length, 8);
    return Buffer.concat([header, content, children]);
  }

  const sizeContent = Buffer.alloc(12);
  sizeContent.writeInt32LE(m.dims.x, 0);
  sizeContent.writeInt32LE(m.dims.y, 4);
  sizeContent.writeInt32LE(m.dims.z, 8);
  const sizeChunk = chunk("SIZE", sizeContent);

  const xyziContent = Buffer.alloc(4 + voxels.length * 4);
  xyziContent.writeInt32LE(voxels.length, 0);
  for (let i = 0; i < voxels.length; i++) {
    const v = voxels[i];
    const off = 4 + i * 4;
    xyziContent.writeUInt8(v.x & 0xff, off);
    xyziContent.writeUInt8(v.y & 0xff, off + 1);
    xyziContent.writeUInt8(v.z & 0xff, off + 2);
    xyziContent.writeUInt8(v.c & 0xff, off + 3);
  }
  const xyziChunk = chunk("XYZI", xyziContent);

  // RGBA chunk: always 256 slots × 4 bytes. MV reads slot 0 as unused; our
  // 1-based palette index maps to (i-1) in the RGBA array on read, so we pad
  // out the high end of the chunk with zeroes when the palette is shorter.
  const rgbaContent = Buffer.alloc(256 * 4);
  for (let i = 0; i < m.palette.length && i < 255; i++) {
    const c = m.palette[i];
    const off = i * 4;
    rgbaContent.writeUInt8(c.r & 0xff, off);
    rgbaContent.writeUInt8(c.g & 0xff, off + 1);
    rgbaContent.writeUInt8(c.b & 0xff, off + 2);
    rgbaContent.writeUInt8(c.a & 0xff, off + 3);
  }
  const rgbaChunk = chunk("RGBA", rgbaContent);

  const mainChildren = Buffer.concat([sizeChunk, xyziChunk, rgbaChunk]);
  const mainChunk = chunk("MAIN", Buffer.alloc(0), mainChildren);

  const header = Buffer.alloc(8);
  header.write("VOX ", 0, 4, "ascii");
  header.writeInt32LE(150, 4);

  return Buffer.concat([header, mainChunk]);
}

export function encodeFile(path: string, m: VoxModel): number {
  const buf = encodeBuffer(m);
  fs.writeFileSync(path, buf);
  return buf.length;
}
