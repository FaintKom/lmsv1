"use client";

/**
 * One solid, drawn the way this scene draws solids: a rounded box in flat toon
 * colour, wrapped in a dark shell that shows only where the shape meets the
 * background.
 *
 * The shell is an inverted hull — the same box, slightly larger, with its back
 * faces rendered and its front faces discarded. What survives is a line around
 * the silhouette, which is the strongest single cue that says "cartoon" rather
 * than "engineering render".
 *
 * It is hand-rolled rather than taken from drei. `<Outlines>` drew nothing at
 * any thickness here — inside `RoundedBox` it never sees a geometry to clone —
 * and `<Edges>` draws facet joins, so on a rounded box it outlines the corner
 * bevels and leaves the silhouette bare. Both were tried and photographed
 * before this was written; a dozen lines that work beat a helper that does not.
 */

import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

import { OUTLINE_WIDTH } from "./toon";

interface ToonBoxProps {
  position?: [number, number, number];
  size: [number, number, number];
  radius: number;
  color: string;
  outline: string;
  gradient: THREE.DataTexture;
  castShadow?: boolean;
}

export function ToonBox({
  position = [0, 0, 0],
  size,
  radius,
  color,
  outline,
  gradient,
  castShadow = true,
}: ToonBoxProps) {
  // Grown by a constant amount rather than a percentage, so a small prop and a
  // large one carry the same weight of line.
  const shell: [number, number, number] = [
    size[0] + OUTLINE_WIDTH,
    size[1] + OUTLINE_WIDTH,
    size[2] + OUTLINE_WIDTH,
  ];

  return (
    <group position={position}>
      <RoundedBox args={size} radius={radius} smoothness={6} castShadow={castShadow}>
        <meshToonMaterial color={color} gradientMap={gradient} />
      </RoundedBox>

      <RoundedBox args={shell} radius={radius + OUTLINE_WIDTH * 0.2} smoothness={6}>
        <meshBasicMaterial color={outline} side={THREE.BackSide} />
      </RoundedBox>
    </group>
  );
}
