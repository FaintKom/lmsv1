/**
 * Export every hand-coded voxel item to a MagicaVoxel .vox file so the
 * artist can open / edit / re-export in MagicaVoxel and we then drop the
 * result into public/voxels/.
 *
 * Run with:
 *   cd F:\lms && npx tsx scripts/export-vox.ts
 *
 * Output: F:\lms-assets\voxels\exported\{room,avatar,shell}\<id>.vox
 *
 * Strategy:
 *   1. Import each build* function from frontend/src/lib/{room,avatar}/voxels.
 *   2. Call it -- returns a THREE.Group of voxel boxes.
 *   3. Walk children; extract each Mesh position + BoxGeometry size + colour.
 *   4. Rasterise every box into integer cells on a fine grid.
 *      1 original voxel-unit -> STEPS_PER_UNIT MagicaVoxel voxels.
 *   5. Translate so min coords land at 0 (MagicaVoxel grids start at origin).
 *   6. Build palette from unique colours (cap at 255).
 *   7. Encode .vox binary and write the file.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as THREE from "three";

import {
  buildArcade,
  buildBed,
  buildBookshelfTall,
  buildBookshelfWall,
  buildCabinetTop,
  buildChair,
  buildClock,
  buildCoffeeTable,
  buildDesk,
  buildDresser,
  buildLamp,
  buildMonitor,
  buildPictures,
  buildPlant,
  buildPlushie,
  buildRug,
  buildSofa,
  buildTrophy,
  buildWindow,
  VOX,
  flooring,
  walls,
} from "../frontend/src/lib/room/voxels";

import {
  buildAccessory,
  buildBack,
  buildBoyBody,
  buildFace,
  buildGirlBody,
  buildGlasses,
  buildHair,
  buildHand,
  buildHat,
  buildOutfit,
} from "../frontend/src/lib/avatar/voxels";

const OUTPUT_DIR = "F:\\lms-assets\\voxels\\exported";
const STEPS_PER_UNIT = 10;

interface BoxEntry {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  color: number;
}

function extractBoxes(group: THREE.Group): BoxEntry[] {
  const boxes: BoxEntry[] = [];
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const geom = obj.geometry as THREE.BoxGeometry;
    const params = geom.parameters as { width: number; height: number; depth: number };
    if (params.width === undefined) return;
    const mat = obj.material as THREE.MeshLambertMaterial;
    const color = mat.color.getHex();
    const cx = obj.position.x / VOX;
    const cy = obj.position.y / VOX;
    const cz = obj.position.z / VOX;
    const w = params.width / VOX;
    const h = params.height / VOX;
    const d = params.depth / VOX;
    boxes.push({
      x: cx - w / 2,
      y: cy - h / 2,
      z: cz - d / 2,
      w,
      h,
      d,
      color,
    });
  });
  return boxes;
}

interface RasterResult {
  voxels: Array<{ x: number; y: number; z: number; c: number }>;
  palette: number[];
  size: { x: number; y: number; z: number };
}

function rasterise(boxes: BoxEntry[]): RasterResult {
  if (boxes.length === 0) {
    return { voxels: [], palette: [], size: { x: 1, y: 1, z: 1 } };
  }

  let minX = Infinity,
    minY = Infinity,
    minZ = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity,
    maxZ = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    minZ = Math.min(minZ, b.z);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
    maxZ = Math.max(maxZ, b.z + b.d);
  }

  function toMv(u: number): number {
    return Math.round(u * STEPS_PER_UNIT);
  }

  // MV convention: x right, y forward (depth), z up.
  // THREE: x right, y up, z forward.
  // Map THREE (x, y, z) -> MV (x, z, y).
  const sizeMvX = Math.max(1, toMv(maxX) - toMv(minX));
  const sizeMvZ = Math.max(1, toMv(maxY) - toMv(minY));
  const sizeMvY = Math.max(1, toMv(maxZ) - toMv(minZ));

  const gridX = Math.min(256, sizeMvX);
  const gridY = Math.min(256, sizeMvY);
  const gridZ = Math.min(256, sizeMvZ);

  if (sizeMvX > 256 || sizeMvY > 256 || sizeMvZ > 256) {
    console.warn(
      `  WARN exceeds MV 256-axis limit (${sizeMvX}x${sizeMvY}x${sizeMvZ}); clipping`,
    );
  }

  const grid = new Uint8Array(gridX * gridY * gridZ);
  const palette: number[] = [];
  const colorToIndex = new Map<number, number>();
  function colorIndex(c: number): number {
    let idx = colorToIndex.get(c);
    if (idx !== undefined) return idx;
    if (palette.length >= 255) return 1;
    palette.push(c);
    idx = palette.length;
    colorToIndex.set(c, idx);
    return idx;
  }

  function idx(x: number, y: number, z: number): number {
    return x + y * gridX + z * gridX * gridY;
  }

  for (const b of boxes) {
    const ci = colorIndex(b.color);
    const x0 = toMv(b.x) - toMv(minX);
    const x1 = toMv(b.x + b.w) - toMv(minX);
    const z0 = toMv(b.y) - toMv(minY);
    const z1 = toMv(b.y + b.h) - toMv(minY);
    const y0 = toMv(b.z) - toMv(minZ);
    const y1 = toMv(b.z + b.d) - toMv(minZ);

    for (let z = Math.max(0, z0); z < Math.min(gridZ, z1); z++) {
      for (let y = Math.max(0, y0); y < Math.min(gridY, y1); y++) {
        for (let x = Math.max(0, x0); x < Math.min(gridX, x1); x++) {
          grid[idx(x, y, z)] = ci;
        }
      }
    }
  }

  const voxels: Array<{ x: number; y: number; z: number; c: number }> = [];
  for (let z = 0; z < gridZ; z++) {
    for (let y = 0; y < gridY; y++) {
      for (let x = 0; x < gridX; x++) {
        const c = grid[idx(x, y, z)];
        if (c > 0) voxels.push({ x, y, z, c });
      }
    }
  }

  return { voxels, palette, size: { x: gridX, y: gridY, z: gridZ } };
}

function encodeVox(r: RasterResult): Buffer {
  function chunk(id: string, content: Buffer, children: Buffer = Buffer.alloc(0)): Buffer {
    const header = Buffer.alloc(12);
    header.write(id, 0, 4, "ascii");
    header.writeInt32LE(content.length, 4);
    header.writeInt32LE(children.length, 8);
    return Buffer.concat([header, content, children]);
  }

  const sizeContent = Buffer.alloc(12);
  sizeContent.writeInt32LE(r.size.x, 0);
  sizeContent.writeInt32LE(r.size.y, 4);
  sizeContent.writeInt32LE(r.size.z, 8);
  const sizeChunk = chunk("SIZE", sizeContent);

  const xyziContent = Buffer.alloc(4 + r.voxels.length * 4);
  xyziContent.writeInt32LE(r.voxels.length, 0);
  for (let i = 0; i < r.voxels.length; i++) {
    const v = r.voxels[i];
    const off = 4 + i * 4;
    xyziContent.writeUInt8(v.x & 0xff, off);
    xyziContent.writeUInt8(v.y & 0xff, off + 1);
    xyziContent.writeUInt8(v.z & 0xff, off + 2);
    xyziContent.writeUInt8(v.c & 0xff, off + 3);
  }
  const xyziChunk = chunk("XYZI", xyziContent);

  const rgbaContent = Buffer.alloc(256 * 4);
  for (let i = 0; i < r.palette.length && i < 255; i++) {
    const c = r.palette[i];
    const off = i * 4;
    rgbaContent.writeUInt8((c >> 16) & 0xff, off);
    rgbaContent.writeUInt8((c >> 8) & 0xff, off + 1);
    rgbaContent.writeUInt8(c & 0xff, off + 2);
    rgbaContent.writeUInt8(0xff, off + 3);
  }
  const rgbaChunk = chunk("RGBA", rgbaContent);

  const mainChildren = Buffer.concat([sizeChunk, xyziChunk, rgbaChunk]);
  const mainChunk = chunk("MAIN", Buffer.alloc(0), mainChildren);

  const header = Buffer.alloc(8);
  header.write("VOX ", 0, 4, "ascii");
  header.writeInt32LE(150, 4);

  return Buffer.concat([header, mainChunk]);
}

interface Item {
  id: string;
  category: "room" | "avatar" | "shell";
  builder: () => THREE.Group;
}

const ITEMS: Item[] = [
  // shell
  { id: "shell-wall-lavender", category: "shell", builder: () => walls(0xa48dc8) },
  { id: "shell-floor-wood", category: "shell", builder: () => flooring("wood") },

  // room furniture
  { id: "bed-basic", category: "room", builder: () => buildBed("basic") },
  { id: "bed-kids", category: "room", builder: () => buildBed("kids") },
  { id: "bed-double", category: "room", builder: () => buildBed("double") },
  { id: "desk-wood", category: "room", builder: () => buildDesk("wood") },
  { id: "desk-white", category: "room", builder: () => buildDesk("white") },
  { id: "dresser-blue", category: "room", builder: () => buildDresser("blue") },
  { id: "dresser-cream", category: "room", builder: () => buildDresser("cream") },
  { id: "shelf-tall", category: "room", builder: () => buildBookshelfTall() },
  { id: "shelf-wall", category: "room", builder: () => buildBookshelfWall() },
  { id: "cabinet", category: "room", builder: () => buildCabinetTop() },
  { id: "sofa", category: "room", builder: () => buildSofa() },
  { id: "coffee-table", category: "room", builder: () => buildCoffeeTable() },
  { id: "arcade", category: "room", builder: () => buildArcade() },
  { id: "chair", category: "room", builder: () => buildChair() },
  { id: "monitor", category: "room", builder: () => buildMonitor() },
  { id: "lamp", category: "room", builder: () => buildLamp() },
  { id: "plant", category: "room", builder: () => buildPlant() },
  { id: "rug-teal", category: "room", builder: () => buildRug("teal") },
  { id: "rug-warm", category: "room", builder: () => buildRug("warm") },
  { id: "rug-mint", category: "room", builder: () => buildRug("mint") },
  { id: "pictures", category: "room", builder: () => buildPictures() },
  { id: "window", category: "room", builder: () => buildWindow() },
  { id: "plushie", category: "room", builder: () => buildPlushie() },
  { id: "trophy", category: "room", builder: () => buildTrophy() },
  { id: "clock", category: "room", builder: () => buildClock() },

  // avatar bodies
  { id: "avatar-body-boy", category: "avatar", builder: () => buildBoyBody() },
  { id: "avatar-body-girl", category: "avatar", builder: () => buildGirlBody() },

  // avatar hair
  ...[
    "avatar-hair-short",
    "avatar-hair-bald",
    "avatar-hair-long",
    "avatar-hair-curly",
    "avatar-hair-bun",
    "avatar-hair-mohawk",
  ].map((id): Item => ({ id, category: "avatar", builder: () => buildHair(id) })),

  // avatar face
  ...[
    "avatar-face-smile",
    "avatar-face-wink",
    "avatar-face-blush",
    "avatar-face-cool",
    "avatar-face-determined",
    "avatar-face-glasses",
  ].map((id): Item => ({ id, category: "avatar", builder: () => buildFace(id) })),

  // avatar outfit
  ...[
    "avatar-outfit-tshirt",
    "avatar-outfit-cozy",
    "avatar-outfit-hoodie",
    "avatar-outfit-dress",
    "avatar-outfit-sport",
    "avatar-outfit-suit",
  ].map((id): Item => ({ id, category: "avatar", builder: () => buildOutfit(id) })),

  // avatar hat
  ...[
    "avatar-hat-cap",
    "avatar-hat-beanie",
    "avatar-hat-wizard",
    "avatar-hat-crown",
    "avatar-hat-chef",
    "avatar-hat-graduate",
  ].map((id): Item => ({ id, category: "avatar", builder: () => buildHat(id) })),

  // avatar glasses
  ...[
    "avatar-glasses-round",
    "avatar-glasses-shades",
    "avatar-glasses-monocle",
    "avatar-glasses-ski",
    "avatar-glasses-3d",
  ].map((id): Item => ({ id, category: "avatar", builder: () => buildGlasses(id) })),

  // avatar back
  ...[
    "avatar-back-backpack",
    "avatar-back-cape",
    "avatar-back-wings",
    "avatar-back-quiver",
    "avatar-back-jetpack",
  ].map((id): Item => ({ id, category: "avatar", builder: () => buildBack(id) })),

  // avatar hand
  ...[
    "avatar-hand-book",
    "avatar-hand-pet",
    "avatar-hand-flower",
    "avatar-hand-balloon",
    "avatar-hand-controller",
  ].map((id): Item => ({ id, category: "avatar", builder: () => buildHand(id) })),

  // legacy single-slot accessory
  ...[
    "avatar-acc-book",
    "avatar-acc-backpack",
    "avatar-acc-headphones",
    "avatar-acc-cape",
    "avatar-acc-pet",
  ].map((id): Item => ({ id, category: "avatar", builder: () => buildAccessory(id) })),
];

function main(): void {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const cat of ["room", "avatar", "shell"]) {
    fs.mkdirSync(path.join(OUTPUT_DIR, cat), { recursive: true });
  }

  let ok = 0;
  let skip = 0;
  const stats: Array<{ id: string; size: string; voxels: number; bytes: number }> = [];

  for (const item of ITEMS) {
    try {
      const group = item.builder();
      const boxes = extractBoxes(group);
      if (boxes.length === 0) {
        console.log(`  skip ${item.id} (empty)`);
        skip++;
        continue;
      }
      const raster = rasterise(boxes);
      if (raster.voxels.length === 0) {
        console.log(`  skip ${item.id} (no voxels after rasterisation)`);
        skip++;
        continue;
      }
      const buf = encodeVox(raster);
      const dest = path.join(OUTPUT_DIR, item.category, `${item.id}.vox`);
      fs.writeFileSync(dest, buf);
      stats.push({
        id: item.id,
        size: `${raster.size.x}x${raster.size.y}x${raster.size.z}`,
        voxels: raster.voxels.length,
        bytes: buf.length,
      });
      ok++;
    } catch (err) {
      console.error(`  FAIL ${item.id}:`, err);
      skip++;
    }
  }

  console.log(`\nExported ${ok} item(s), skipped ${skip}.`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`\nSummary:`);
  console.table(stats);
}

main();
