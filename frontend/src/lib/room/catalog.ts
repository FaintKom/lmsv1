/**
 * Maps each backend room_items.id to the voxel builder that renders it.
 * Walls and floors are handled separately (they take a colour/type from the
 * RoomItem row, not a build function), so they're absent from this map.
 */
import type * as THREE from "three";

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
} from "@/lib/room/voxels";

export type ItemBuilder = () => THREE.Group;

export const CATALOG_BUILDERS: Record<string, ItemBuilder> = {
  // bed variants
  "bed-basic": () => buildBed("basic"),
  "bed-kids": () => buildBed("kids"),
  "bed-double": () => buildBed("double"),

  // desk variants
  "desk-wood": () => buildDesk("wood"),
  "desk-white": () => buildDesk("white"),

  // dresser variants
  "dresser-blue": () => buildDresser("blue"),
  "dresser-cream": () => buildDresser("cream"),

  // shelving + cabinet
  "shelf-tall": () => buildBookshelfTall(),
  "shelf-wall": () => buildBookshelfWall(),
  cabinet: () => buildCabinetTop(),

  // living-room
  sofa: () => buildSofa(),
  "coffee-table": () => buildCoffeeTable(),
  arcade: () => buildArcade(),

  // decor
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
};

/** Item ids that render via {@link CATALOG_BUILDERS}. */
export type BuildableItemId = keyof typeof CATALOG_BUILDERS;
