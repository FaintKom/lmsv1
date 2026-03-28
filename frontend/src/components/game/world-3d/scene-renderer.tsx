"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, Text } from "@react-three/drei";
import * as THREE from "three";
import type { WorldState, SceneObject, Direction3D } from "./scene-engine";
import { DIRECTION_ANGLE } from "./scene-engine";

interface SceneRendererProps {
  state: WorldState;
  isRunning: boolean;
}

const OBJECT_COLORS: Record<string, string> = {
  wall: "#475569",
  collectible: "#f59e0b",
  button: "#ef4444",
  door: "#8b5cf6",
  platform: "#64748b",
  goal: "#22c55e",
};

export default function SceneRenderer({ state, isRunning }: SceneRendererProps) {
  return (
    <Canvas
      camera={{ position: [5, 6, 5], fov: 50 }}
      shadows
      style={{ background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      {/* Ground */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#475569"
        position={[0, 0, 0]}
        fadeDistance={20}
      />

      {/* Scene objects */}
      {state.objects.map((obj) => (
        <SceneObjectMesh key={obj.id} object={obj} />
      ))}

      {/* Player */}
      <PlayerMesh
        x={state.player.x}
        z={state.player.z}
        direction={state.player.direction}
      />

      {/* Camera controls */}
      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={3}
        maxDistance={15}
        enabled={!isRunning}
        target={[state.player.x, 0.5, state.player.z]}
      />

      <Environment preset="night" />
    </Canvas>
  );
}

function PlayerMesh({
  x,
  z,
  direction,
}: {
  x: number;
  z: number;
  direction: Direction3D;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useMemo(() => new THREE.Vector3(x, 0, z), [x, z]);
  const targetAngle = DIRECTION_ANGLE[direction];

  useFrame(() => {
    if (!groupRef.current) return;
    // Smooth movement
    groupRef.current.position.lerp(targetPos, 0.15);
    // Smooth rotation
    const current = groupRef.current.rotation.y;
    const diff = targetAngle - current;
    const wrapped = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
    groupRef.current.rotation.y += wrapped * 0.15;
  });

  return (
    <group ref={groupRef} position={[x, 0, z]}>
      {/* Body (capsule) */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.4, 8, 16]} />
        <meshStandardMaterial color="#6366f1" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#818cf8" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Direction indicator (nose) */}
      <mesh position={[0, 0.95, -0.2]} castShadow>
        <coneGeometry args={[0.06, 0.12, 8]} />
        <meshStandardMaterial color="#c7d2fe" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 1.0, -0.15]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.08, 1.0, -0.15]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function SceneObjectMesh({ object }: { object: SceneObject }) {
  const color = object.color || OBJECT_COLORS[object.type] || "#94a3b8";
  const sx = object.scale?.x ?? 1;
  const sy = object.scale?.y ?? 1;
  const sz = object.scale?.z ?? 1;

  if (object.collected) return null;

  switch (object.type) {
    case "wall":
      return (
        <mesh position={[object.position.x, sy / 2, object.position.z]} castShadow receiveShadow>
          <boxGeometry args={[sx, sy, sz]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      );

    case "collectible":
      return (
        <CollectibleMesh position={[object.position.x, 0.5, object.position.z]} color={color} />
      );

    case "goal":
      return (
        <group position={[object.position.x, 0, object.position.z]}>
          <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.3, 0.45, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} side={THREE.DoubleSide} />
          </mesh>
          <GoalBeam color={color} />
        </group>
      );

    case "button":
      return (
        <group position={[object.position.x, 0, object.position.z]}>
          <mesh position={[0, 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.25, 0.3, 0.1, 16]} />
            <meshStandardMaterial
              color={object.activated ? "#22c55e" : color}
              emissive={object.activated ? "#22c55e" : color}
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      );

    case "door":
      if (object.activated) return null; // Door open = invisible
      return (
        <mesh position={[object.position.x, 0.75, object.position.z]} castShadow>
          <boxGeometry args={[0.9, 1.5, 0.15]} />
          <meshStandardMaterial color={color} transparent opacity={0.8} roughness={0.3} />
        </mesh>
      );

    case "platform":
      return (
        <mesh position={[object.position.x, 0.05, object.position.z]} receiveShadow>
          <boxGeometry args={[sx, 0.1, sz]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      );

    default:
      return null;
  }
}

/** Rotating, floating collectible sphere */
function CollectibleMesh({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 2;
    ref.current.position.y = position[1] + Math.sin(Date.now() * 0.003) * 0.1;
  });

  return (
    <mesh ref={ref} position={position} castShadow>
      <octahedronGeometry args={[0.15, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

/** Glowing goal beam */
function GoalBeam({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.3 + Math.sin(Date.now() * 0.004) * 0.15;
  });

  return (
    <mesh ref={ref} position={[0, 1, 0]}>
      <cylinderGeometry args={[0.1, 0.3, 2, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1}
        transparent
        opacity={0.4}
      />
    </mesh>
  );
}
