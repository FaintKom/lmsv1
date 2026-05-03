"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import type { WorldState, GridCell3D, Direction3D } from "./scene-engine";
import { DIRECTION_ANGLE } from "./scene-engine";

interface SceneRendererProps {
  state: WorldState;
  isRunning: boolean;
}

const CELL_COLORS: Record<string, string> = {
  empty: "#1a2a1f",
  wall: "#4d5a51",
  collectible: "#f5b800",
  button: "#ff7a5c",
  door: "#8b5cf6",
  platform: "#4d5a51",
  goal: "#3fb04b",
};

export default function SceneRenderer({ state, isRunning }: SceneRendererProps) {
  const centerX = (state.gridWidth - 1) / 2;
  const centerZ = (state.gridDepth - 1) / 2;

  return (
    <Canvas
      camera={{ position: [centerX + 5, 8, centerZ + 5], fov: 50 }}
      shadows
      style={{ background: "linear-gradient(180deg, #0a1a10 0%, #1a2a1f 100%)" }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[8, 15, 5]} intensity={1.5} castShadow
        shadow-mapSize-width={1024} shadow-mapSize-height={1024}
        shadow-camera-left={-10} shadow-camera-right={10}
        shadow-camera-top={10} shadow-camera-bottom={-10}
      />
      <pointLight position={[centerX, 5, centerZ]} intensity={0.3} color="#818cf8" />

      {/* Ground grid */}
      <GridFloor width={state.gridWidth} depth={state.gridDepth} />

      {/* Grid cells */}
      {state.cells.map((cell, i) => (
        <CellMesh key={`${cell.x}-${cell.z}-${cell.type}-${i}`} cell={cell} />
      ))}

      {/* Player */}
      <PlayerMesh player={state.player} />

      <OrbitControls
        enablePan={false}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={4}
        maxDistance={20}
        enabled={!isRunning}
        target={[state.player.x, state.player.y * 0.5 + 0.5, state.player.z]}
      />

      <fog attach="fog" args={["#0a1a10", 15, 30]} />
    </Canvas>
  );
}

/** Flat grid floor showing cell boundaries */
function GridFloor({ width, depth }: { width: number; depth: number }) {
  return (
    <group>
      {/* Base plane */}
      <mesh rotation-x={-Math.PI / 2} position={[(width - 1) / 2, -0.01, (depth - 1) / 2]} receiveShadow>
        <planeGeometry args={[width + 0.5, depth + 0.5]} />
        <meshStandardMaterial color="#1a2a1f" />
      </mesh>

      {/* Individual grid cells */}
      {Array.from({ length: depth }, (_, z) =>
        Array.from({ length: width }, (_, x) => (
          <mesh key={`floor-${x}-${z}`} rotation-x={-Math.PI / 2} position={[x, 0, z]} receiveShadow>
            <planeGeometry args={[0.95, 0.95]} />
            <meshStandardMaterial color="#243044" transparent opacity={0.8} />
          </mesh>
        ))
      )}

      {/* Grid lines */}
      {Array.from({ length: width + 1 }, (_, i) => (
        <mesh key={`gx-${i}`} position={[i - 0.5, 0.001, (depth - 1) / 2]}>
          <boxGeometry args={[0.02, 0.001, depth]} />
          <meshBasicMaterial color="#1a2a1f" />
        </mesh>
      ))}
      {Array.from({ length: depth + 1 }, (_, i) => (
        <mesh key={`gz-${i}`} position={[(width - 1) / 2, 0.001, i - 0.5]}>
          <boxGeometry args={[width, 0.001, 0.02]} />
          <meshBasicMaterial color="#1a2a1f" />
        </mesh>
      ))}
    </group>
  );
}

/** Render a single grid cell */
function CellMesh({ cell }: { cell: GridCell3D }) {
  const color = cell.color || CELL_COLORS[cell.type] || "#9aa39d";
  const baseY = cell.y * 0.5; // Each elevation level is 0.5 units

  if (cell.collected || (cell.type === "door" && cell.activated)) return null;

  switch (cell.type) {
    case "wall":
      return (
        <mesh position={[cell.x, baseY + 0.5, cell.z]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 1, 0.9]} />
          <meshStandardMaterial color={color} roughness={0.7} />
        </mesh>
      );

    case "platform":
      return (
        <mesh position={[cell.x, baseY + 0.25, cell.z]} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.5, 0.95]} />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.2} />
        </mesh>
      );

    case "collectible":
      return <FloatingGem position={[cell.x, baseY + 0.6, cell.z]} color={color} />;

    case "goal":
      return (
        <group position={[cell.x, baseY, cell.z]}>
          {/* Glowing ring on ground */}
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.25, 0.4, 32]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} side={THREE.DoubleSide} />
          </mesh>
          {/* Beacon */}
          <GoalBeam color={color} />
          {/* Flag */}
          <mesh position={[0.3, 0.5, 0]}>
            <boxGeometry args={[0.3, 0.2, 0.02]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[0.15, 0.25, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.7, 8]} />
            <meshStandardMaterial color="#fafbf6" />
          </mesh>
        </group>
      );

    case "button":
      return (
        <group position={[cell.x, baseY, cell.z]}>
          <mesh position={[0, 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.2, 0.25, 0.16, 16]} />
            <meshStandardMaterial
              color={cell.activated ? "#3fb04b" : color}
              emissive={cell.activated ? "#3fb04b" : color}
              emissiveIntensity={0.4}
            />
          </mesh>
          {/* Base plate */}
          <mesh position={[0, 0.01, 0]}>
            <cylinderGeometry args={[0.35, 0.35, 0.02, 16]} />
            <meshStandardMaterial color="#1a2a1f" />
          </mesh>
        </group>
      );

    case "door":
      return (
        <mesh position={[cell.x, baseY + 0.6, cell.z]} castShadow>
          <boxGeometry args={[0.85, 1.2, 0.12]} />
          <meshStandardMaterial color={color} transparent opacity={0.85} roughness={0.2} metalness={0.5} />
        </mesh>
      );

    default:
      return null;
  }
}

/** Player character on the grid */
function PlayerMesh({ player }: { player: WorldState["player"] }) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useMemo(
    () => new THREE.Vector3(player.x, player.y * 0.5, player.z),
    [player.x, player.y, player.z]
  );
  const targetAngle = DIRECTION_ANGLE[player.direction];

  useFrame(() => {
    if (!groupRef.current) return;
    // Smooth position interpolation
    const current = groupRef.current.position;
    current.x += (targetPos.x - current.x) * 0.15;
    current.z += (targetPos.z - current.z) * 0.15;

    // Jump arc for Y
    if (player.isJumping) {
      const midY = targetPos.y + 0.6; // Jump arc peak
      const t = 1 - Math.abs(current.y - midY) / 0.6;
      current.y += (midY - current.y) * 0.1;
      if (Math.abs(current.y - targetPos.y) > 0.3) {
        // Going up
      } else {
        current.y += (targetPos.y - current.y) * 0.15;
      }
    } else {
      current.y += (targetPos.y - current.y) * 0.15;
    }

    // Smooth rotation
    const curAngle = groupRef.current.rotation.y;
    const diff = targetAngle - curAngle;
    const wrapped = ((diff + Math.PI) % (2 * Math.PI)) - Math.PI;
    groupRef.current.rotation.y += wrapped * 0.15;
  });

  return (
    <group ref={groupRef} position={[player.x, player.y * 0.5, player.z]}>
      {/* Body */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.35, 8, 16]} />
        <meshStandardMaterial color="#0a8754" metalness={0.3} roughness={0.4} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#818cf8" metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Direction nose */}
      <mesh position={[0, 0.85, -0.18]} castShadow>
        <coneGeometry args={[0.05, 0.1, 8]} />
        <meshStandardMaterial color="#c7d2fe" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.07, 0.9, -0.13]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.07, 0.9, -0.13]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
      </mesh>
      {/* Shadow below feet */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.2, 16]} />
        <meshBasicMaterial color="black" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/** Floating rotating gem for collectibles */
function FloatingGem({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 2;
    ref.current.position.y = position[1] + Math.sin(Date.now() * 0.003) * 0.08;
  });

  return (
    <mesh ref={ref} position={position} castShadow>
      <octahedronGeometry args={[0.14, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} metalness={0.8} roughness={0.1} />
    </mesh>
  );
}

/** Pulsing goal beam */
function GoalBeam({ color }: { color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    (ref.current.material as THREE.MeshStandardMaterial).opacity =
      0.25 + Math.sin(Date.now() * 0.004) * 0.15;
  });

  return (
    <mesh ref={ref} position={[0, 0.8, 0]}>
      <cylinderGeometry args={[0.08, 0.25, 1.6, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} transparent opacity={0.35} />
    </mesh>
  );
}
