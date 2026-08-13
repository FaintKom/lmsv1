"use client";

/**
 * The solid, drawn and turnable.
 *
 * This is the whole reason stereometry is not a numeric-input exercise with a
 * longer question: a student who can turn the shape sees which edge is the
 * height and which is the slant, and that distinction is most of what the
 * topic is about.
 *
 * Loaded through `next/dynamic` from StereometryV2 — three.js is heavy and has
 * no business in a lesson that never reaches this task.
 *
 * Scaled, not measured: the mesh is normalised so any set of measurements
 * fits the frame at a readable size. What a student computes with is the
 * numbers in the question, never pixels.
 */

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useCallback, useSyncExternalStore } from "react";

import { SOLIDS, type Solid } from "@/lib/math/solids";
import { useTranslation } from "@/lib/i18n/context";

export interface SolidViewProps {
  solid: Solid;
  dimensions: Record<string, number>;
  /** Turns slowly on its own until the student grabs it. */
  autoRotate?: boolean;
  height?: number;
}

/**
 * three.js takes a colour, not a CSS variable, so the token has to be read
 * off the document rather than written into the material. Reading it keeps
 * the solid on the design system's primary and lets it follow a theme
 * switch, which a hex literal here would not.
 */
function useToken(name: string, fallback: string): string {
  // The theme toggle swaps a class on <html> (theme-toggle.tsx), so that is
  // what the subscription watches.
  const subscribe = useCallback((onChange: () => void) => {
    const observer = new MutationObserver(onChange);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const read = useCallback(
    () => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback,
    [name, fallback],
  );
  const serverRead = useCallback(() => fallback, [fallback]);
  return useSyncExternalStore(subscribe, read, serverRead);
}

/** Longest measurement, so the shape fills the frame whatever the units. */
function scaleOf(solid: Solid, d: Record<string, number>): number {
  const values = SOLIDS[solid].map((name) => d[name]).filter((v) => Number.isFinite(v) && v > 0);
  const longest = values.length ? Math.max(...values) : 1;
  return 2.2 / longest;
}

function Mesh({
  solid,
  dimensions,
  color,
}: {
  solid: Solid;
  dimensions: Record<string, number>;
  color: string;
}) {
  const s = scaleOf(solid, dimensions);
  const d = dimensions;
  const material = (
    <meshStandardMaterial color={color} roughness={0.45} metalness={0.05} flatShading />
  );

  if (solid === "box") {
    const args: [number, number, number] = [d.a * s, d.c * s, d.b * s];
    return (
      <mesh castShadow>
        <boxGeometry args={args} />
        {material}
      </mesh>
    );
  }

  if (solid === "pyramid") {
    // A four-sided cone is a square pyramid. Its radius is measured to a
    // corner, so a base edge of a means a circumradius of a/sqrt(2) — using a
    // directly would draw a base wider than the one in the question.
    const radius = (d.a / Math.SQRT2) * s;
    return (
      <mesh castShadow rotation-y={Math.PI / 4}>
        <coneGeometry args={[radius, d.h * s, 4]} />
        {material}
      </mesh>
    );
  }

  if (solid === "cylinder") {
    return (
      <mesh castShadow>
        <cylinderGeometry args={[d.r * s, d.r * s, d.h * s, 48]} />
        {material}
      </mesh>
    );
  }

  if (solid === "cone") {
    return (
      <mesh castShadow>
        <coneGeometry args={[d.r * s, d.h * s, 48]} />
        {material}
      </mesh>
    );
  }

  return (
    <mesh castShadow>
      <sphereGeometry args={[d.r * s, 48, 32]} />
      {material}
    </mesh>
  );
}

export function SolidView({ solid, dimensions, autoRotate = true, height = 260 }: SolidViewProps) {
  const { t } = useTranslation();
  // --primary is the design system's green and flips with the theme.
  const color = useToken("--color-primary", "#3f9e6a");
  const label = t("exercise.stereometry.viewAlt").replace(
    "{solid}",
    t(`exercise.stereometry.solid.${solid}`),
  );

  return (
    <div
      style={{
        height,
        borderRadius: 12,
        overflow: "hidden",
        background: "var(--color-surface-2)",
        border: "1px solid var(--color-border)",
      }}
      role="img"
      aria-label={label}
    >
      <Canvas camera={{ position: [3.6, 2.6, 3.6], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.75} />
          <directionalLight position={[4, 6, 3]} intensity={1.1} />
          <directionalLight position={[-4, -2, -3]} intensity={0.3} />
          <Mesh solid={solid} dimensions={dimensions} color={color} />
          <OrbitControls
            enablePan={false}
            enableZoom={false}
            autoRotate={autoRotate}
            autoRotateSpeed={0.8}
            minPolarAngle={Math.PI / 6}
            maxPolarAngle={(Math.PI * 5) / 6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default SolidView;
