"use client";

/**
 * The character, and the weight it moves with.
 *
 * The old one was a capsule that slid between squares at a constant rate. What
 * makes a figure read as alive is not detail — it is timing:
 *
 * - **Anticipation and arc.** It rises through a jump rather than sliding up.
 * - **Squash and stretch.** It stretches leaving the ground and squashes on
 *   landing, then settles.
 * - **Follow-through.** Arrival compresses once and recovers, rather than
 *   stopping dead.
 * - **Idle.** It breathes while it waits, so a still level is not a dead one.
 *
 * Which of those to play is read off `motion` in the frame, recorded by the
 * server. Working it out by comparing coordinates is possible and fragile: a
 * jump, a climb and a fall all move the character exactly one square.
 *
 * Nothing here calls setState. Every frame mutates refs — the rule that keeps a
 * 60fps loop from re-rendering React sixty times a second.
 */

import { useRef } from "react";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { DIRECTION_ANGLE, type PlayerState } from "../scene-engine";
import { LEVEL, type Palette } from "./toon";
import { ToonBox } from "./shapes";

interface CharacterProps {
  player: PlayerState;
  palette: Palette;
  gradient: THREE.DataTexture;
  reducedMotion: boolean;
  /** True when the world refused the last command — the character bumps. */
  refused: boolean;
}

/** How fast the body catches up with where the level says it is. */
const CHASE = 9;
const TURN_CHASE = 10;

export function Character({ player, palette, gradient, reducedMotion, refused }: CharacterProps) {
  const group = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);

  // Allocated once. `new Vector3()` inside the loop is a GC spike every frame.
  const target = useRef(new THREE.Vector3(player.x, player.y * LEVEL, player.z));
  const arrival = useRef(0);

  useFrame((state, delta) => {
    const g = group.current;
    const b = body.current;
    if (!g || !b) return;

    target.current.set(player.x, player.y * LEVEL, player.z);
    const angle = DIRECTION_ANGLE[player.direction];

    if (reducedMotion) {
      g.position.copy(target.current);
      g.rotation.y = angle;
      b.scale.set(1, 1, 1);
      b.position.y = 0;
      return;
    }

    // Position: exponential chase, which eases out on its own and never
    // overshoots into a wall.
    const k = 1 - Math.exp(-CHASE * delta);
    const before = g.position.distanceTo(target.current);
    g.position.lerp(target.current, k);
    const after = g.position.distanceTo(target.current);
    if (before > 0.02 && after <= 0.02) arrival.current = 1;

    // Facing: the shortest way round, so turning left from north does not spin
    // three-quarters of a circle.
    const diff = ((angle - g.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
    g.rotation.y += diff * (1 - Math.exp(-TURN_CHASE * delta));

    const t = state.clock.elapsedTime;
    const travelling = after > 0.02;

    // Idle: a slow breath. Small enough to read as alive, not as bobbing.
    const breath = travelling ? 0 : Math.sin(t * 2.4) * 0.02;

    let squash = 0;
    let lift = 0;

    if (player.motion === "jump" || player.motion === "climb") {
      // Stretch on the way up, and an arc so it leaves the ground at all.
      squash = -0.14 * Math.min(1, after);
      lift = Math.sin(Math.min(1, Math.max(0, 1 - after)) * Math.PI) * 0.35;
    } else if (player.motion === "fall") {
      squash = -0.1 * Math.min(1, after);
    }

    // Landing: one compress-and-recover, driven by the arrival impulse.
    if (arrival.current > 0) {
      arrival.current = Math.max(0, arrival.current - delta * 4);
      squash += Math.sin(arrival.current * Math.PI) * 0.22;
    }

    if (refused) {
      // A bump, not a stop: the character shudders where it stands, which is
      // how a child sees that the world said no.
      g.position.x += Math.sin(t * 40) * 0.03;
    }

    // Volume is preserved: what is lost in height is gained around the middle.
    b.scale.set(1 + squash * 0.6, 1 - squash, 1 + squash * 0.6);
    b.position.y = lift + breath;
  });

  return (
    <group ref={group} position={[player.x, player.y * LEVEL, player.z]}>
      <group ref={body} scale={1.2}>
        {/* Chibi proportions: a big head on a small body is the whole trick. */}
        <ToonBox
          position={[0, 0.28, 0]}
          size={[0.42, 0.4, 0.36]}
          radius={0.12}
          color={palette.body}
          outline={palette.outline}
          gradient={gradient}
        />

        <ToonBox
          position={[0, 0.72, 0]}
          size={[0.56, 0.48, 0.5]}
          radius={0.17}
          color={palette.face}
          outline={palette.outline}
          gradient={gradient}
        />

        {/* The visor faces forward, so which way it is looking is unmistakable
            even in a still screenshot. */}
        <ToonBox
          position={[0, 0.74, -0.24]}
          size={[0.4, 0.19, 0.08]}
          radius={0.05}
          color={palette.visor}
          outline={palette.outline}
          gradient={gradient}
        />

        {/* Two feet, which is what makes the squash read as a squash. */}
        <ToonBox
          position={[-0.13, 0.07, 0]}
          size={[0.16, 0.14, 0.24]}
          radius={0.06}
          color={palette.visor}
          outline={palette.outline}
          gradient={gradient}
        />
        <ToonBox
          position={[0.13, 0.07, 0]}
          size={[0.16, 0.14, 0.24]}
          radius={0.06}
          color={palette.visor}
          outline={palette.outline}
          gradient={gradient}
        />
      </group>
    </group>
  );
}
