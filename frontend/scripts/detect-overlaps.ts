/**
 * Detect voxel-inside-voxel overlaps inside each build*() function.
 *
 * For each builder, walks the THREE.Group, extracts every mesh's AABB,
 * and reports pairs whose AABBs overlap with positive volume (coplanar
 * face touches = OK; any nested/overlapping volume = violation).
 *
 * Run: cd frontend && npx tsx scripts/detect-overlaps.ts
 */
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
} from "../src/lib/room/voxels";

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
} from "../src/lib/avatar/voxels";

interface Box {
  index: number;
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
  w: number;
  h: number;
  d: number;
}

function extractBoxes(group: THREE.Group): Box[] {
  const boxes: Box[] = [];
  let idx = 0;
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const geom = obj.geometry as THREE.BoxGeometry;
    const p = geom.parameters;
    const cx = obj.position.x;
    const cy = obj.position.y;
    const cz = obj.position.z;
    boxes.push({
      index: idx++,
      minX: cx - p.width / 2,
      minY: cy - p.height / 2,
      minZ: cz - p.depth / 2,
      maxX: cx + p.width / 2,
      maxY: cy + p.height / 2,
      maxZ: cz + p.depth / 2,
      w: p.width,
      h: p.height,
      d: p.depth,
    });
  });
  return boxes;
}

const EPS = 1e-4;

function overlapVolume(a: Box, b: Box): number {
  const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  const oz = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
  if (ox <= EPS || oy <= EPS || oz <= EPS) return 0;
  return ox * oy * oz;
}

interface Violation {
  i: number;
  j: number;
  ovX: number;
  ovY: number;
  ovZ: number;
  vol: number;
  a: Box;
  b: Box;
}

function findViolations(boxes: Box[]): Violation[] {
  const out: Violation[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i];
      const b = boxes[j];
      const vol = overlapVolume(a, b);
      if (vol > EPS) {
        const ovX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
        const ovY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
        const ovZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ);
        out.push({ i: a.index, j: b.index, ovX, ovY, ovZ, vol, a, b });
      }
    }
  }
  return out;
}

const builders: Record<string, () => THREE.Group> = {
  // room
  "bed-basic": () => buildBed("basic"),
  "bed-kids": () => buildBed("kids"),
  "bed-double": () => buildBed("double"),
  "desk-wood": () => buildDesk("wood"),
  "desk-white": () => buildDesk("white"),
  "dresser-blue": () => buildDresser("blue"),
  "dresser-cream": () => buildDresser("cream"),
  "shelf-tall": () => buildBookshelfTall(),
  "shelf-wall": () => buildBookshelfWall(),
  cabinet: () => buildCabinetTop(),
  sofa: () => buildSofa(),
  "coffee-table": () => buildCoffeeTable(),
  arcade: () => buildArcade(),
  chair: () => buildChair(),
  monitor: () => buildMonitor(),
  lamp: () => buildLamp(),
  plant: () => buildPlant(),
  "rug-teal": () => buildRug("teal"),
  "rug-warm": () => buildRug("warm"),
  "rug-mint": () => buildRug("mint"),
  pictures: () => buildPictures(),
  window: () => buildWindow(),
  plushie: () => buildPlushie(),
  trophy: () => buildTrophy(),
  clock: () => buildClock(),
  // avatar parts
  "avatar-body-boy": () => buildBoyBody(),
  "avatar-body-girl": () => buildGirlBody(),
  "outfit-cozy": () => buildOutfit("avatar-outfit-cozy"),
  "outfit-hoodie": () => buildOutfit("avatar-outfit-hoodie"),
  "outfit-dress": () => buildOutfit("avatar-outfit-dress"),
  "outfit-sport": () => buildOutfit("avatar-outfit-sport"),
  "outfit-suit": () => buildOutfit("avatar-outfit-suit"),
  "outfit-tshirt": () => buildOutfit("avatar-outfit-tshirt"),
  "face-smile": () => buildFace("avatar-face-smile"),
  "face-wink": () => buildFace("avatar-face-wink"),
  "face-blush": () => buildFace("avatar-face-blush"),
  "face-cool": () => buildFace("avatar-face-cool"),
  "face-determined": () => buildFace("avatar-face-determined"),
  "face-glasses": () => buildFace("avatar-face-glasses"),
  "hair-short": () => buildHair("avatar-hair-short"),
  "hair-long": () => buildHair("avatar-hair-long"),
  "hair-curly": () => buildHair("avatar-hair-curly"),
  "hair-bun": () => buildHair("avatar-hair-bun"),
  "hair-mohawk": () => buildHair("avatar-hair-mohawk"),
  "hat-cap": () => buildHat("avatar-hat-cap"),
  "hat-beanie": () => buildHat("avatar-hat-beanie"),
  "hat-wizard": () => buildHat("avatar-hat-wizard"),
  "hat-crown": () => buildHat("avatar-hat-crown"),
  "hat-chef": () => buildHat("avatar-hat-chef"),
  "hat-graduate": () => buildHat("avatar-hat-graduate"),
  "glasses-round": () => buildGlasses("avatar-glasses-round"),
  "glasses-shades": () => buildGlasses("avatar-glasses-shades"),
  "glasses-monocle": () => buildGlasses("avatar-glasses-monocle"),
  "glasses-ski": () => buildGlasses("avatar-glasses-ski"),
  "glasses-3d": () => buildGlasses("avatar-glasses-3d"),
  "back-backpack": () => buildBack("avatar-back-backpack"),
  "back-cape": () => buildBack("avatar-back-cape"),
  "back-wings": () => buildBack("avatar-back-wings"),
  "back-quiver": () => buildBack("avatar-back-quiver"),
  "back-jetpack": () => buildBack("avatar-back-jetpack"),
  "hand-book": () => buildHand("avatar-hand-book"),
  "hand-sword": () => buildHand("avatar-hand-sword"),
  "hand-pet": () => buildHand("avatar-hand-pet"),
  "hand-flower": () => buildHand("avatar-hand-flower"),
  "hand-balloon": () => buildHand("avatar-hand-balloon"),
  "hand-controller": () => buildHand("avatar-hand-controller"),
  "acc-book": () => buildAccessory("avatar-acc-book"),
  "acc-backpack": () => buildAccessory("avatar-acc-backpack"),
  "acc-headphones": () => buildAccessory("avatar-acc-headphones"),
  "acc-cape": () => buildAccessory("avatar-acc-cape"),
  "acc-pet": () => buildAccessory("avatar-acc-pet"),
};

const args = process.argv.slice(2);
const filter = args.find((a) => !a.startsWith("--"));
const verbose = args.includes("--verbose");

let totalViolations = 0;
let dirtyBuilders = 0;
const rows: Array<{ builder: string; violations: number; sample: string }> = [];

for (const [name, builder] of Object.entries(builders)) {
  if (filter && !name.includes(filter)) continue;
  const g = builder();
  const boxes = extractBoxes(g);
  const vs = findViolations(boxes);
  if (vs.length > 0) {
    dirtyBuilders++;
    totalViolations += vs.length;
    vs.sort((x, y) => y.vol - x.vol);
    const top = vs[0];
    const a = top.a;
    const b = top.b;
    const sample = `[${top.i}](${a.minX.toFixed(2)},${a.minY.toFixed(2)},${a.minZ.toFixed(2)})+(${a.w}x${a.h}x${a.d}) ∩ [${top.j}](${b.minX.toFixed(2)},${b.minY.toFixed(2)},${b.minZ.toFixed(2)})+(${b.w}x${b.h}x${b.d}) vol=${top.vol.toFixed(3)}`;
    rows.push({ builder: name, violations: vs.length, sample });
    if (verbose) {
      console.log(`\n=== ${name} (${vs.length} pairs) ===`);
      for (const v of vs) {
        const a = v.a;
        const b = v.b;
        console.log(
          `  [${v.i}](${a.minX.toFixed(2)},${a.minY.toFixed(2)},${a.minZ.toFixed(2)})+(${a.w}x${a.h}x${a.d}) ∩ [${v.j}](${b.minX.toFixed(2)},${b.minY.toFixed(2)},${b.minZ.toFixed(2)})+(${b.w}x${b.h}x${b.d}) ovXYZ=${v.ovX.toFixed(2)},${v.ovY.toFixed(2)},${v.ovZ.toFixed(2)} vol=${v.vol.toFixed(3)}`,
        );
      }
    }
  }
}

if (rows.length === 0) {
  console.log("✓ All builders clean — no voxel-inside-voxel overlaps detected.");
} else {
  console.log(`✗ ${dirtyBuilders} builders contain overlaps. ${totalViolations} pairs total.\n`);
  console.table(rows);
}
