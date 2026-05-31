/**
 * Registry of third-party .vox models selected for import (owner-chosen on
 * 2026-05-31). Source files live in the git-ignored public/voxel-gallery/.
 *
 * Scale is normalised to the ROOM'S code-built chair (buildChair): its back
 * tops out at y≈4.3 vox × 0.4 = 1.72 world units. Imported chairs are ~3.6–3.8
 * world units tall at scale 1 (VOX_SIZE 0.1), so a base scale of ~0.48 makes an
 * imported chair match the room chair — and that same factor keeps the rest of
 * the furniture in proportion. Consoles are desk-top props, so they start much
 * smaller. These are STARTING values; tune them live in /student-cabinet, then
 * promote the final numbers into VOX_ITEMS / the room catalog.
 */

export type ImportedCategory = "furniture" | "console";

export interface ImportedModel {
  id: string;
  /** File under public/voxel-gallery/. */
  file: string;
  label: string;
  category: ImportedCategory;
  /** Uniform scale applied after load (1 vox = 0.1 × scale world units). */
  scale: number;
  /** Default placement in room world units (floor origin at 0,0). */
  x: number;
  z: number;
  /** Lift off the floor (e.g. props sitting on a desk). */
  y: number;
  /** Y-rotation in degrees. */
  rot: number;
  /** Whether it's part of the default cabinet layout. */
  enabled: boolean;
}

const FURNITURE = 0.48;
const CONSOLE = 0.15;

export const IMPORTED_MODELS: ImportedModel[] = [
  // ── workstation + storage (default layout) ──
  // Owner-tuned final values (2026-05-31). Imported desk+chair dropped — the
  // room's own desk is used; monitor/keyboard sit on it.
  { id: "vlp-shelf-objs", file: "verylowpoly__Shelf-w-objs-vox.vox", label: "Bookshelf (w/ books)", category: "furniture", scale: 0.48, x: 0.5, z: 4.7, y: 0, rot: 0, enabled: true },
  { id: "vlp-drawers", file: "verylowpoly__Simple-Drawers-vox.vox", label: "Drawers", category: "furniture", scale: 0.48, x: 0.5, z: 3.2, y: 0, rot: 0, enabled: true },
  { id: "office-plant", file: "office__Plant.vox", label: "Plant", category: "furniture", scale: 0.48, x: 4.9, z: 4.5, y: 0, rot: 0, enabled: true },
  { id: "office-monitor", file: "office__Monitor.vox", label: "Monitor", category: "furniture", scale: 0.4, x: 1.6, z: 1.1, y: 0.9, rot: 90, enabled: true },
  { id: "office-keyboard", file: "office__keyboard.vox", label: "Keyboard", category: "furniture", scale: 0.48, x: 1.6, z: 1.5, y: 0.9, rot: 0, enabled: true },
  { id: "vlp-desk-chair", file: "verylowpoly__Basic-Stand-w-Chair-vox.vox", label: "Desk + chair", category: "furniture", scale: FURNITURE, x: 1.6, z: 1.1, y: 0, rot: 0, enabled: false },
  { id: "console-gameboy", file: "consoles__GameBoy1.vox", label: "GameBoy", category: "console", scale: CONSOLE, x: 2.3, z: 1.3, y: 0.92, rot: 20, enabled: false },

  // ── available, off by default (toggle in the tuner) ──
  { id: "vlp-chair", file: "verylowpoly__Basic-Chair-vox.vox", label: "Chair", category: "furniture", scale: FURNITURE, x: 3.0, z: 1.0, y: 0, rot: 0, enabled: false },
  { id: "vlp-stand", file: "verylowpoly__Basic-Stand-vox.vox", label: "Side table", category: "furniture", scale: FURNITURE, x: 3.0, z: 2.0, y: 0, rot: 0, enabled: false },
  { id: "vlp-shelf-empty", file: "verylowpoly__Basic-Empty-Shelf-vox.vox", label: "Empty shelf", category: "furniture", scale: FURNITURE, x: 0.7, z: 2.0, y: 0, rot: 90, enabled: false },
  { id: "vlp-fridge", file: "verylowpoly__Basic-Fridge-vox.vox", label: "Fridge", category: "furniture", scale: FURNITURE, x: 4.9, z: 1.0, y: 0, rot: 0, enabled: false },
  { id: "office-chair1", file: "office__Chair1.vox", label: "Office chair (tall)", category: "furniture", scale: FURNITURE, x: 3.5, z: 1.0, y: 0, rot: 0, enabled: false },
  { id: "office-chair2", file: "office__Chair2.vox", label: "Office chair 2", category: "furniture", scale: FURNITURE, x: 3.5, z: 2.0, y: 0, rot: 0, enabled: false },
  { id: "office-chair3", file: "office__Chair3.vox", label: "Office chair 3", category: "furniture", scale: FURNITURE, x: 3.5, z: 3.0, y: 0, rot: 0, enabled: false },
  { id: "office-officechair", file: "office__OfficeChair.vox", label: "Swivel chair", category: "furniture", scale: FURNITURE, x: 2.0, z: 2.5, y: 0, rot: 0, enabled: false },
  { id: "office-table1", file: "office__Table1.vox", label: "Table 1", category: "furniture", scale: FURNITURE, x: 2.5, z: 3.5, y: 0, rot: 0, enabled: false },
  { id: "office-table2", file: "office__Table2.vox", label: "Table 2 (low)", category: "furniture", scale: FURNITURE, x: 2.5, z: 4.5, y: 0, rot: 0, enabled: false },
  { id: "office-drawer", file: "office__Drawer.vox", label: "Office drawer", category: "furniture", scale: FURNITURE, x: 1.5, z: 4.6, y: 0, rot: 0, enabled: false },
  { id: "office-cupboard1", file: "office__Cupboard1.vox", label: "Cupboard 1 (tall)", category: "furniture", scale: FURNITURE, x: 4.9, z: 3.0, y: 0, rot: 0, enabled: false },
  { id: "office-cupboard2", file: "office__Cupboard2.vox", label: "Cupboard 2 (tall)", category: "furniture", scale: FURNITURE, x: 4.9, z: 2.0, y: 0, rot: 0, enabled: false },
  { id: "office-sofa", file: "office__Sofa.vox", label: "Sofa", category: "furniture", scale: FURNITURE, x: 3.5, z: 5.0, y: 0, rot: 0, enabled: false },
  { id: "office-divider", file: "office__DeskDivider.vox", label: "Desk divider", category: "furniture", scale: FURNITURE, x: 2.0, z: 1.5, y: 0, rot: 0, enabled: false },
  { id: "console-gameboysp", file: "consoles__GameBoySP1.vox", label: "GameBoy SP", category: "console", scale: CONSOLE, x: 2.0, z: 1.4, y: 0.92, rot: -10, enabled: false },
  { id: "console-switch", file: "consoles__Nintendo1.vox", label: "Switch + Joy-Cons", category: "console", scale: CONSOLE, x: 2.6, z: 1.5, y: 0.92, rot: 0, enabled: false },
  { id: "console-gw", file: "consoles__NintendoGame-Watch1.vox", label: "Game & Watch", category: "console", scale: CONSOLE, x: 2.3, z: 1.7, y: 0.92, rot: 0, enabled: false },
];
