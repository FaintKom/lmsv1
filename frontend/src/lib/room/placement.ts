/**
 * Where each room slot's group lands in 3D space (voxel coordinates) plus
 * orientation. Values are pinned to the spec
 * (design_handoff_student_room/design_files/room-voxels.jsx:562) -- do not
 * retune; layouts were tuned against the constrained camera arc.
 */

export interface SlotPlacement {
  x: number;
  y: number;
  z: number;
  /** Rotation around the Y axis, in radians. */
  rot: number;
}

const HALF_PI = Math.PI / 2;
const NEG_HALF_PI = -Math.PI / 2;

export const SLOT_PLACEMENT: Record<string, SlotPlacement> = {
  // against the BACK wall (z=0)
  bed: { x: 8.5, y: 0, z: 0, rot: 0 },
  desk: { x: 1, y: 0, z: 0, rot: 0 },
  monitor: { x: 2, y: 3.2, z: 0.4, rot: 0 },
  chair: { x: 2.4, y: 0, z: 4, rot: Math.PI },

  // against the LEFT wall (x=0)
  dresser: { x: 0, y: 0, z: 11.5, rot: HALF_PI },
  shelf: { x: 0, y: 0, z: 13, rot: HALF_PI },
  shelfwall: { x: 0, y: 7.5, z: 6, rot: HALF_PI },
  cabinet: { x: 0, y: 6, z: 4, rot: HALF_PI },

  // back-wall mounted decor
  pictures: { x: 1.6, y: 7.5, z: -0.45, rot: 0 },
  window: { x: 8.5, y: 5.2, z: -0.3, rot: 0 },
  clock: { x: 14, y: 8, z: 3, rot: NEG_HALF_PI },

  // floor / freestanding
  rug: { x: 4.5, y: 0, z: 5.5, rot: 0 },
  plant: { x: 11.5, y: 0, z: 9.5, rot: 0 },
  lamp: { x: 12, y: 0, z: 11.5, rot: 0 },

  // on top of furniture
  plushie: { x: 11.5, y: 3.6, z: 1, rot: -Math.PI / 6 },
  trophy: { x: 0.6, y: 4.25, z: 10, rot: 0 },

  // living-room subset
  sofa: { x: 5.5, y: 0, z: 10, rot: 0 },
  coffee: { x: 7, y: 0, z: 7, rot: 0 },
  arcade: { x: 11, y: 0, z: 3.6, rot: -Math.PI / 8 },
};

/**
 * When a parent slot moves via the Layout d-pad, the listed children's
 * positions follow. Frontend composites these offsets -- backend just stores
 * raw per-slot offsets.
 */
export const TIES: Record<string, readonly string[]> = {
  bed: ["plushie"],
  desk: ["monitor", "chair"],
  dresser: ["trophy"],
};

/** Slots that can be moved via the Layout d-pad. */
export const MOVABLE_SLOTS: readonly string[] = [
  // floor furniture
  "bed",
  "desk",
  "dresser",
  "shelf",
  "rug",
  "plant",
  "lamp",
  "sofa",
  "coffee",
  "arcade",
  // wall-mounted
  "shelfwall",
  "cabinet",
  "pictures",
  "window",
  "clock",
  // previously tied (now independently movable)
  "monitor",
  "chair",
  "plushie",
  "trophy",
  // virtual slot for the avatar character
  "avatar",
];

export type MoveAxis = "x" | "y" | "z";

/**
 * Axis constraints per movable slot. Everything has full freedom now --
 * walls are explicitly allowed to be clipped through (per user request);
 * floor clipping is prevented at render time by clamping y >= 0.
 */
const FULL_AXES: readonly MoveAxis[] = ["x", "y", "z"];
export const MOVE_AXES: Record<string, readonly MoveAxis[]> = Object.fromEntries(
  MOVABLE_SLOTS.map((slot) => [slot, FULL_AXES]),
);

/** Per-click rotation step in degrees. */
export const ROT_STEP_DEG = 10;
