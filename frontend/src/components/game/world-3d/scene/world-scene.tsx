"use client";

/**
 * The scene: ground, props, character, light, camera.
 *
 * What this replaces looked like a spreadsheet at night — slate greys, metallic
 * shading, fog, and a grid of drawn lines. The audience is children.
 *
 * Three decisions carry the whole look, and they live in the pieces this file
 * assembles: flat bands of colour instead of a gradient (`toon.ts`), a drawn
 * line around every silhouette (`Outlines`, in `props.tsx`), and rounded corners
 * on everything solid. Lighting is deliberately dull — one key, one fill, no
 * shadow maps — because toon shading does the work, and a shadow map would add
 * noise and cost without changing the read.
 *
 * The floor is instanced: a hundred tiles as one draw call rather than a
 * hundred.
 */

import { useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

import type { WorldState } from "../scene-engine";
import { Character } from "./character";
import { WorldProp } from "./props";
import { LEVEL, makeToonGradient, usePalette, useReducedMotion, type Palette } from "./toon";

interface WorldSceneProps {
  state: WorldState;
  /** While a program plays, the camera leads and the viewer does not fight it. */
  isRunning: boolean;
}

export default function WorldScene({ state, isRunning }: WorldSceneProps) {
  const palette = usePalette();
  const reducedMotion = useReducedMotion();
  const gradient = useMemo(() => makeToonGradient(), []);
  const controls = useRef<OrbitControlsImpl>(null);

  useLayoutEffect(() => () => gradient.dispose(), [gradient]);

  const midX = (state.gridWidth - 1) / 2;
  const midZ = (state.gridDepth - 1) / 2;
  const span = Math.max(state.gridWidth, state.gridDepth);

  return (
    <Canvas
      shadows={false}
      dpr={[1, 2]}
      /*
        `flat` turns off tone mapping, which a toon scene has to do.

        The default is ACES filmic — a curve built to make photographic
        highlights roll off pleasantly. Roll-off is the exact opposite of what
        this scene wants: it takes the three flat bands the ramp produces and
        squeezes the bright two into the same output, so a block's top and its
        lit side came out one colour and the block read as a flat hexagon cut
        from paper. Without the curve the bands stay where they were put, and
        the light intensities below are the ordinary ones they look like.
      */
      flat
      camera={{ position: [midX + span, span * 1.1, midZ + span * 1.4], fov: 40 }}
      style={{
        background: `linear-gradient(180deg, ${palette.skyTop} 0%, ${palette.skyBottom} 100%)`,
      }}
    >
      {/*
        Two lights and nothing else. Toon shading reads intensity, not subtlety,
        so a third would cost frames and change no pixels.

        The key light's angle is the whole of whether a block looks like a block.
        The camera sits front and right, so the faces that matter are the top,
        the +x side and the +z front; this direction meets them at 0.80, 0.59
        and 0.11, which the five-band ramp turns into three distinct tones.

        The position is a fixed direction rather than one offset from the board,
        which it was at first. A directional light aims from its position at the
        origin, so offsetting it by the board's centre swung it towards the
        diagonal as the level grew — and on the diagonal all three faces meet the
        light at nearly the same angle and come out one colour.

        Ambient stays low, and the two together must not exceed one. Ambient is
        added outside the ramp, so a generous one lifts every face towards full
        at once and undoes the angle; at 0.55 the scene was flat on that alone.
      */}
      <ambientLight intensity={0.25} />
      <directionalLight position={[22, 30, 4]} intensity={0.75} />

      {/*
        `Bounds` frames the whole board and re-frames when it changes size.
        Hand-placing the camera by grid span looked right at one aspect ratio
        and cut the level in half at another — the lesson player is a short,
        wide box, and the first version of this scene lost a third of the level
        off the right-hand edge.
      */}
      <Bounds fit clip observe margin={1.2}>
        <Ground state={state} palette={palette} gradient={gradient} />

        {state.cells.map((cell, i) => (
          <WorldProp
            key={`${cell.type}-${cell.x}-${cell.z}-${cell.y}-${i}`}
            cell={cell}
            palette={palette}
            gradient={gradient}
            reducedMotion={reducedMotion}
          />
        ))}
      </Bounds>

      <Character
        player={state.player}
        palette={palette}
        gradient={gradient}
        reducedMotion={reducedMotion}
        refused={state.refusal !== null}
      />

      {/* Grounding, without a shadow map: one soft pool under everything. */}
      <ContactShadows
        position={[midX, 0.015, midZ]}
        scale={span * 1.8}
        blur={2.4}
        opacity={0.35}
        far={6}
      />

      <OrbitControls
        ref={controls}
        makeDefault
        enablePan={false}
        enabled={!isRunning}
        maxPolarAngle={Math.PI / 2.4}
        minPolarAngle={Math.PI / 7}
        target={[midX, 0.4, midZ]}
      />

      <CameraRig
        controls={controls}
        state={state}
        home={[midX, 0.4, midZ]}
        reducedMotion={reducedMotion}
      />
    </Canvas>
  );
}

/**
 * The floor: one instanced mesh, chequered so the grid reads without drawing a
 * single line. Lines said "engineering"; two tones of the same green say "board
 * game".
 */
function Ground({
  state,
  palette,
  gradient,
}: {
  state: WorldState;
  palette: Palette;
  gradient: THREE.DataTexture;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const count = state.gridWidth * state.gridDepth;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const light = useMemo(() => new THREE.Color(), []);
  const dark = useMemo(() => new THREE.Color(), []);

  useLayoutEffect(() => {
    const m = mesh.current;
    if (!m) return;

    light.set(palette.floorAlt);
    dark.set(palette.floor);

    let i = 0;
    for (let z = 0; z < state.gridDepth; z++) {
      for (let x = 0; x < state.gridWidth; x++) {
        dummy.position.set(x, -0.06, z);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        m.setColorAt(i, (x + z) % 2 === 0 ? light : dark);
        i++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [state.gridWidth, state.gridDepth, palette, dummy, light, dark]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} receiveShadow>
      <boxGeometry args={[0.98, 0.12, 0.98]} />
      <meshToonMaterial gradientMap={gradient} />
    </instancedMesh>
  );
}

/**
 * A camera that leans towards the character without being driven.
 *
 * It moves the orbit controls' *target*, not the camera. Calling
 * `camera.lookAt` here was the first version, and it fought the controls for
 * ownership of the camera's orientation every frame — the visible result was a
 * board framed off to one side and half out of shot.
 *
 * The lean is partial on purpose: two parts board centre to one part character.
 * Following the character exactly would swing the whole level about every time
 * a child took a step.
 */
function CameraRig({
  controls,
  state,
  home,
  reducedMotion,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  state: WorldState;
  home: [number, number, number];
  reducedMotion: boolean;
}) {
  const want = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    const c = controls.current;
    if (!c) return;

    want.current.set(
      home[0] + (state.player.x - home[0]) * 0.34,
      home[1] + (state.player.y * LEVEL) * 0.34,
      home[2] + (state.player.z - home[2]) * 0.34,
    );

    if (reducedMotion) {
      c.target.copy(want.current);
    } else {
      c.target.lerp(want.current, 1 - Math.exp(-2.5 * delta));
    }
    c.update();
  });

  return null;
}
