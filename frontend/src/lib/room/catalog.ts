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

/**
 * Items that should render from a MagicaVoxel .vox file instead of the inline
 * build* function. Scene's setSlot checks this first; if a path is present, it
 * async-loads via vox-loader and substitutes the resulting group for the
 * hand-coded geometry.
 *
 * .vox files live in `frontend/public/voxels/` and are served as static assets.
 *
 * `scale` is an optional uniform multiplier applied to the loaded group AFTER
 * placement. Use it when a source model is bigger/smaller than our room scale.
 * Default 1.0.
 */
export interface VoxItemDef {
  url: string;
  scale?: number;
}

export const VOX_ITEMS: Record<string, VoxItemDef> = {
  // No items wired yet — the POC office-pack models were 50–76 voxels per
  // side (5–8 world units) and intentionally monochrome gray, which didn't
  // fit a 5.6-wide room. Loader infrastructure stays in place; add entries
  // here once we have correctly-sized colourful source models.
};
