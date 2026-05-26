/**
 * Imperative Three.js scene mount for the My Room feature.
 *
 * Spec reference: design_handoff_student_room/design_files/room-app.jsx
 * lines 40-215. Camera arc is intentionally narrow so both visible walls
 * stay in frame -- do not widen the clamp ranges without re-tuning placement.
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { CATALOG_BUILDERS } from "@/lib/room/catalog";
import { MOVE_AXES, SLOT_PLACEMENT } from "@/lib/room/placement";
import {
  COL,
  type FloorType,
  VOX,
  flooring,
  vbox,
  walls,
} from "@/lib/room/voxels";
import { type AvatarEquip, buildAvatar } from "@/lib/avatar/voxels";

const THETA_BASE = Math.PI / 4;
const THETA_RANGE = Math.PI / 4.5;
const THETA_MIN = THETA_BASE - THETA_RANGE;
const THETA_MAX = THETA_BASE + THETA_RANGE;
const PHI_MIN = Math.PI / 18;
const PHI_MAX = Math.PI / 3.2;
const DIST_MIN = 10;
const DIST_MAX = 26;

const TARGET = new THREE.Vector3(2.8, 1.4, 2.8);

const INITIAL_CAMERA = {
  theta: THETA_BASE,
  phi: Math.PI / 7,
  dist: 16,
};

/** Imperative handle the parent can use to drive the scene from React. */
export interface RoomSceneApi {
  setWall: (colorHex: string | null | undefined) => void;
  setFloor: (type: FloorType) => void;
  setSlot: (slot: string, itemId: string | null, dx: number, dz: number) => void;
  setAvatar: (equip: AvatarEquip) => void;
  resetCamera: () => void;
  zoom: (delta: number) => void;
}

/**
 * Mount a Three.js renderer into the canvas referenced by `canvasRef`.
 * Returns an imperative API + a ready flag so the caller can wait for
 * the scene before driving it.
 */
export function useRoomScene(canvasRef: React.RefObject<HTMLCanvasElement | null>): {
  api: RoomSceneApi | null;
  ready: boolean;
} {
  const apiRef = useRef<RoomSceneApi | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    // Local alias retains narrowing inside nested closures (Three.js callbacks).
    const canvas: HTMLCanvasElement = canvasEl;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    // r183 deprecated PCFSoftShadowMap; PCFShadowMap looks nearly identical.
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    const cam = { ...INITIAL_CAMERA };

    function placeCamera(): void {
      const x = TARGET.x + cam.dist * Math.sin(cam.theta) * Math.cos(cam.phi);
      const y = TARGET.y + cam.dist * Math.sin(cam.phi);
      const z = TARGET.z + cam.dist * Math.cos(cam.theta) * Math.cos(cam.phi);
      camera.position.set(x, y, z);
      camera.lookAt(TARGET);
    }

    function resize(): void {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2cc, 1.05);
    sun.position.set(8, 14, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -10;
    sun.shadow.camera.right = 10;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -2;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc0d6ff, 0.35);
    fill.position.set(-6, 8, -4);
    scene.add(fill);

    // Ground shadow plane (catches shadow past room footprint)
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.21;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // Wooden base plinth under the room (14 × 0.3 × 14 voxel box, color 0xe8c89e)
    const baseGroup = new THREE.Group();
    vbox(baseGroup, 0, -1.0, 0, 14, 0.3, 14, 0xe8c89e);
    scene.add(baseGroup);

    // ── room shell + slot groups (mutable across updates) ────────────
    let wallsGroup: THREE.Group | null = null;
    let floorGroup: THREE.Group | null = null;
    let avatarGroup: THREE.Group | null = null;
    const slotGroups = new Map<string, THREE.Group>();

    // Where the avatar stands inside the room (centre-front, on the rug).
    // Voxel coords; converted to world via VOX in the place-call below.
    const AVATAR_POS = { x: 7, z: 7 };

    function disposeGroup(g: THREE.Group): void {
      g.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
      g.parent?.remove(g);
    }

    function placeSlot(slot: string, group: THREE.Group, dx: number, dz: number): void {
      const pos = SLOT_PLACEMENT[slot];
      if (!pos) return;
      const axes = MOVE_AXES[slot] ?? [];
      const useDx = axes.includes("x") ? dx : 0;
      const useDz = axes.includes("z") ? dz : 0;
      group.position.set((pos.x + useDx) * VOX, pos.y * VOX, (pos.z + useDz) * VOX);
      group.rotation.set(0, pos.rot, 0);
    }

    const api: RoomSceneApi = {
      setWall: (colorHex) => {
        if (wallsGroup) {
          disposeGroup(wallsGroup);
        }
        const color =
          typeof colorHex === "string" && colorHex.length >= 6
            ? parseInt(colorHex.slice(-6), 16)
            : COL.lavender;
        wallsGroup = walls(color);
        scene.add(wallsGroup);
      },
      setFloor: (type) => {
        if (floorGroup) {
          disposeGroup(floorGroup);
        }
        floorGroup = flooring(type);
        scene.add(floorGroup);
      },
      setSlot: (slot, itemId, dx, dz) => {
        const existing = slotGroups.get(slot);
        if (existing) {
          disposeGroup(existing);
          slotGroups.delete(slot);
        }
        if (!itemId) return; // slot toggled off
        const builder = CATALOG_BUILDERS[itemId];
        if (!builder) {
          // Wall, floor, and avatar item ids end up here -- they're handled
          // by setWall/setFloor/setAvatar separately. Unknown items just no-op.
          return;
        }
        const group = builder();
        placeSlot(slot, group, dx, dz);
        scene.add(group);
        slotGroups.set(slot, group);
      },
      setAvatar: (equip) => {
        if (avatarGroup) {
          disposeGroup(avatarGroup);
        }
        const g = buildAvatar(equip);
        g.position.set(AVATAR_POS.x * VOX, 0, AVATAR_POS.z * VOX);
        g.rotation.y = -Math.PI / 4; // face camera
        scene.add(g);
        avatarGroup = g;
      },
      resetCamera: () => {
        cam.theta = INITIAL_CAMERA.theta;
        cam.phi = INITIAL_CAMERA.phi;
        cam.dist = INITIAL_CAMERA.dist;
        placeCamera();
      },
      zoom: (delta) => {
        cam.dist = clamp(cam.dist + delta, DIST_MIN, DIST_MAX);
        placeCamera();
      },
    };
    apiRef.current = api;

    // ── pointer + wheel handlers ─────────────────────────────────────
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    function onPointerDown(e: PointerEvent): void {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent): void {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      cam.theta = clamp(cam.theta - dx * 0.005, THETA_MIN, THETA_MAX);
      cam.phi = clamp(cam.phi + dy * 0.003, PHI_MIN, PHI_MAX);
      placeCamera();
    }

    function onPointerUp(e: PointerEvent): void {
      dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // pointer wasn't captured (lost on tab blur etc.) -- ignore
      }
    }

    function onWheel(e: WheelEvent): void {
      e.preventDefault();
      cam.dist = clamp(cam.dist + e.deltaY * 0.018, DIST_MIN, DIST_MAX);
      placeCamera();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    // ── resize observer + initial layout ─────────────────────────────
    resize();
    placeCamera();
    const resizeObs = new ResizeObserver(() => {
      resize();
      placeCamera();
    });
    resizeObs.observe(canvas);

    // ── render loop ──────────────────────────────────────────────────
    let raf = 0;
    function loop(): void {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    loop();

    setReady(true);

    return () => {
      cancelAnimationFrame(raf);
      resizeObs.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("wheel", onWheel);
      if (wallsGroup) disposeGroup(wallsGroup);
      if (floorGroup) disposeGroup(floorGroup);
      if (avatarGroup) disposeGroup(avatarGroup);
      slotGroups.forEach(disposeGroup);
      slotGroups.clear();
      disposeGroup(baseGroup);
      renderer.dispose();
      apiRef.current = null;
      setReady(false);
    };
  }, [canvasRef]);

  return { api: apiRef.current, ready };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
