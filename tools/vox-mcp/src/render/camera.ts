/**
 * Ortho camera presets. Each preset defines a view-space basis
 * (right, up, forward) used to project voxel world-coordinates into 2D
 * screen-coordinates.
 *
 * MV grid axes: x→right, y→forward (depth), z→up. We build cameras around
 * those axes; "forward" of the camera always points AWAY from the camera
 * into the scene.
 */

export type View = "iso" | "front" | "side" | "top" | "back";

/** Vec3 helpers — minimal, inlined to avoid pulling a math lib. */
export interface V3 {
  x: number;
  y: number;
  z: number;
}

export interface Camera {
  /** Screen X axis in world space. */
  right: V3;
  /** Screen Y axis in world space. */
  up: V3;
  /** Camera-to-scene direction (depth axis). */
  forward: V3;
}

export function getCamera(view: View): Camera {
  switch (view) {
    case "front": {
      // Look along +y (forward in MV) toward -y. Right=+x, Up=+z.
      return {
        right: { x: 1, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 },
        forward: { x: 0, y: 1, z: 0 },
      };
    }
    case "back": {
      return {
        right: { x: -1, y: 0, z: 0 },
        up: { x: 0, y: 0, z: 1 },
        forward: { x: 0, y: -1, z: 0 },
      };
    }
    case "side": {
      // Look from +x toward -x. Right=-y, Up=+z.
      return {
        right: { x: 0, y: -1, z: 0 },
        up: { x: 0, y: 0, z: 1 },
        forward: { x: 1, y: 0, z: 0 },
      };
    }
    case "top": {
      // Look from +z down. Right=+x, Up=+y (screen up = away from camera).
      return {
        right: { x: 1, y: 0, z: 0 },
        up: { x: 0, y: 1, z: 0 },
        forward: { x: 0, y: 0, z: 1 },
      };
    }
    case "iso":
    default: {
      // 30°/30° tilt — front-right elevated view.
      const s = Math.sin(Math.PI / 4);
      return {
        right: { x: s, y: s, z: 0 },
        up: { x: -0.4, y: 0.4, z: 1.2 },
        forward: { x: -s, y: s, z: 0.5 },
      };
    }
  }
}

export function dot(a: V3, b: V3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
