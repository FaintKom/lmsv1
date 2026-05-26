/**
 * Per-face shading: top brighter than sides, front lit, back dimmest.
 * Returns an RGB triple scaled by a 0..1 brightness factor.
 */
import type { Rgba } from "../vox/grid.js";

export type FaceKind = "top" | "bottom" | "front" | "back" | "left" | "right";

const SHADES: Record<FaceKind, number> = {
  top: 1.00,
  front: 0.85,
  right: 0.78,
  left: 0.72,
  back: 0.62,
  bottom: 0.55,
};

export function shade(color: Rgba, face: FaceKind): { r: number; g: number; b: number } {
  const k = SHADES[face];
  return {
    r: Math.round(color.r * k),
    g: Math.round(color.g * k),
    b: Math.round(color.b * k),
  };
}
