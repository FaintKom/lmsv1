"use client";

/**
 * Everything that stands on a square.
 *
 * One rule runs through all of them: a thing must be recognisable by its shape
 * alone, before colour and before any label. A wall is a course of bricks, a
 * platform is a slab, an item spins, a button is a disc you can see is up or
 * down, a door is tall and thin with a handle, the goal is a flag. Someone who
 * has not been told what they are looking at should be able to name each one
 * (SC-011).
 *
 * Every solid is a rounded box with a drawn outline. Rounded corners and a line
 * around the silhouette are what separate "cartoon" from "engineering render",
 * and drei implements both — so this file is shapes, and nothing clever.
 */

import { useRef } from "react";
import { Edges, Float } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import type { GridCell3D } from "../scene-engine";
import { LEVEL, type Palette } from "./toon";
import { ToonBox } from "./shapes";

interface PropProps {
  cell: GridCell3D;
  palette: Palette;
  gradient: THREE.DataTexture;
  reducedMotion: boolean;
}

/** Shared by every solid: toon shading, a drawn silhouette, rounded corners. */
function Solid({
  position,
  size,
  radius,
  color,
  palette,
  gradient,
}: {
  position: [number, number, number];
  size: [number, number, number];
  radius: number;
  color: string;
  palette: Palette;
  gradient: THREE.DataTexture;
}) {
  return (
    <ToonBox
      position={position}
      size={size}
      radius={radius}
      color={color}
      outline={palette.outline}
      gradient={gradient}
    />
  );
}

export function WorldProp({ cell, palette, gradient, reducedMotion }: PropProps) {
  const base = cell.y * LEVEL;

  switch (cell.type) {
    case "wall":
      return (
        <group position={[cell.x, base, cell.z]}>
          <Solid
            position={[0, LEVEL * 0.5 + 0.2, 0]}
            size={[0.92, LEVEL + 0.4, 0.92]}
            radius={0.05}
            color={palette.wall}
            palette={palette}
            gradient={gradient}
          />
          {/* A top course, so a wall reads as built rather than extruded. */}
          <Solid
            position={[0, LEVEL + 0.42, 0]}
            size={[0.78, 0.16, 0.78]}
            radius={0.06}
            color={palette.wall}
            palette={palette}
            gradient={gradient}
          />
        </group>
      );

    case "platform":
      // A platform occupies the floor it is recorded at and stands on it — the
      // same as a wall, one floor tall. It used to be drawn hanging *below* its
      // own number, because that number meant the height a character stood at
      // rather than the floor the block sat on. The visible result: a platform
      // on floor 0 lay entirely under the ground, so the first one a teacher
      // placed could not be seen at all.
      return (
        <Solid
          position={[cell.x, base + LEVEL * 0.5, cell.z]}
          size={[0.96, LEVEL, 0.96]}
          radius={0.06}
          color={palette.platform}
          palette={palette}
          gradient={gradient}
        />
      );

    case "item":
      return (
        <Star
          position={[cell.x, base + 0.42, cell.z]}
          palette={palette}
          gradient={gradient}
          reducedMotion={reducedMotion}
        />
      );

    case "button":
      return (
        <group position={[cell.x, base, cell.z]}>
          {/* The plinth stays put; the cap sinks when pressed, so the state is
              legible from the shape and not only from the colour. */}
          <Solid
            position={[0, 0.05, 0]}
            size={[0.62, 0.1, 0.62]}
            radius={0.04}
            color={palette.door}
            palette={palette}
            gradient={gradient}
          />
          <Solid
            position={[0, cell.pressed ? 0.11 : 0.19, 0]}
            size={[0.44, cell.pressed ? 0.08 : 0.18, 0.44]}
            radius={0.04}
            color={cell.pressed ? palette.buttonPressed : palette.button}
            palette={palette}
            gradient={gradient}
          />
        </group>
      );

    case "door":
      return cell.open ? null : (
        <group position={[cell.x, base, cell.z]}>
          <Solid
            position={[0, 0.55, 0]}
            size={[0.86, 1.1, 0.18]}
            radius={0.05}
            color={palette.door}
            palette={palette}
            gradient={gradient}
          />
          {/* A handle. Small, and the thing that says "door" rather than "slab". */}
          <mesh position={[0.26, 0.55, 0.12]}>
            <sphereGeometry args={[0.07, 12, 12]} />
            <meshToonMaterial color={palette.item} gradientMap={gradient} />
            <Edges linewidth={2} threshold={20} color={palette.outline} />
          </mesh>
        </group>
      );

    case "goal":
      return (
        <Flag
          position={[cell.x, base, cell.z]}
          palette={palette}
          gradient={gradient}
          reducedMotion={reducedMotion}
        />
      );

    default:
      return null;
  }
}

/** An item: a chunky gem that turns, so the eye finds it before anything else. */
function Star({
  position,
  palette,
  gradient,
  reducedMotion,
}: {
  position: [number, number, number];
  palette: Palette;
  gradient: THREE.DataTexture;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current || reducedMotion) return;
    ref.current.rotation.y += delta * 1.4;
  });

  const body = (
    <mesh ref={ref} position={position} castShadow>
      <octahedronGeometry args={[0.22, 0]} />
      <meshToonMaterial color={palette.item} gradientMap={gradient} />
      <Edges linewidth={2} threshold={20} color={palette.outline} />
    </mesh>
  );

  // Still for a viewer who asked for less movement, and still legible.
  if (reducedMotion) return body;
  return (
    <Float speed={2} floatIntensity={0.4} rotationIntensity={0}>
      {body}
    </Float>
  );
}

/** The goal: a flag on a pole, which is what a child already reads as "finish". */
function Flag({
  position,
  palette,
  gradient,
  reducedMotion,
}: {
  position: [number, number, number];
  palette: Palette;
  gradient: THREE.DataTexture;
  reducedMotion: boolean;
}) {
  const cloth = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!cloth.current || reducedMotion) return;
    // A slow wave, not a flap: movement that says "alive" without pulling the
    // eye away from the character.
    cloth.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.6) * 0.18;
  });

  return (
    <group position={position}>
      {/* The ring marks the square itself, which is what the win condition
          actually tests. */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.3, 0.42, 24]} />
        <meshBasicMaterial color={palette.goal} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[-0.12, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1, 8]} />
        <meshToonMaterial color={palette.face} gradientMap={gradient} />
        <Edges linewidth={2} threshold={20} color={palette.outline} />
      </mesh>

      <mesh ref={cloth} position={[0.1, 0.82, 0]} castShadow>
        <boxGeometry args={[0.44, 0.28, 0.05]} />
        <meshToonMaterial color={palette.goal} gradientMap={gradient} />
        <Edges linewidth={2} threshold={20} color={palette.outline} />
      </mesh>
    </group>
  );
}
