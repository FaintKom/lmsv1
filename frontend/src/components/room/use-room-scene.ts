/**
 * Imperative Three.js scene for the My Room feature — FREEFORM placement.
 *
 * The room is no longer a fixed set of slots. Furniture/decor are free
 * instances (any count, anywhere) supplied via setPlaced(). Wall colour, floor
 * type and the avatar stay singletons. Click an instance to select it (raycast)
 * and drag it across the floor; rotate/scale/raise/delete are driven from React
 * via setPlaced() re-renders. Selection + drag-commit are reported through the
 * callbacks ref.
 *
 * Coordinates: instance x/y/z are in the room voxel grid (0..14), rendered ×VOX
 * (0.4) to world units — the same space the old SLOT_PLACEMENT used. `scale` is
 * a uniform multiplier (1 for code-built items; tuned values for .vox imports).
 */
import { useEffect, useState } from "react";
import * as THREE from "three";

import { CATALOG_BUILDERS, VOX_ITEMS } from "@/lib/room/catalog";
import { loadVoxModel } from "@/lib/room/vox-loader";
import { COL, type FloorType, VOX, flooring, vbox, walls } from "@/lib/room/voxels";
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
const INITIAL_CAMERA = { theta: THETA_BASE, phi: Math.PI / 7, dist: 16 };

export interface PlacedInstance {
  id: string;
  itemId: string;
  x: number;
  y: number;
  z: number;
  rot: number;
  scale: number;
}

export interface RoomSceneCallbacks {
  /** Fired when the user clicks an instance (id) or empty floor (null).
   * Movement/rotation/scale are driven by buttons (React → setPlaced), so the
   * scene only reports selection — dragging always orbits the camera. */
  onSelect?: (id: string | null) => void;
}

export interface RoomSceneApi {
  setWall: (colorHex: string | null | undefined) => void;
  setFloor: (type: FloorType) => void;
  setAvatar: (equip: AvatarEquip, dx: number, dy: number, dz: number, rotDeg: number) => void;
  /** Reconcile the rendered instances with the given list (add/update/remove). */
  setPlaced: (list: PlacedInstance[]) => void;
  /** Highlight an instance (or clear with null). */
  setSelected: (id: string | null) => void;
  /** Toggle whether clicks select/drag instances (edit) or just orbit. */
  setEditable: (editable: boolean) => void;
  resetCamera: () => void;
  zoom: (delta: number) => void;
}

interface Slot {
  group: THREE.Group;
  inst: PlacedInstance;
  seq: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function useRoomScene(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  callbacksRef?: React.RefObject<RoomSceneCallbacks>,
): { api: RoomSceneApi | null; ready: boolean } {
  const [api, setApi] = useState<RoomSceneApi | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.5, 50);
    const cam = { ...INITIAL_CAMERA };

    function placeCamera(): void {
      camera.position.set(
        TARGET.x + cam.dist * Math.sin(cam.theta) * Math.cos(cam.phi),
        TARGET.y + cam.dist * Math.sin(cam.phi),
        TARGET.z + cam.dist * Math.cos(cam.theta) * Math.cos(cam.phi),
      );
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

    // Lights (match the old room).
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

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.21;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const baseGroup = new THREE.Group();
    vbox(baseGroup, 0, -1.0, 0, 14, 0.3, 14, 0xe8c89e);
    scene.add(baseGroup);

    // ── mutable scene state ──────────────────────────────────────────
    let wallsGroup: THREE.Group | null = null;
    let floorGroup: THREE.Group | null = null;
    let avatarGroup: THREE.Group | null = null;
    const slots = new Map<string, Slot>();
    const seqOf = new Map<string, number>();
    let selectedId: string | null = null;
    let editable = true;

    const AVATAR_POS = { x: 7, z: 7 };

    // Selection ring (flat torus on the floor under the selected item).
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.06, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x4caf50 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    scene.add(ring);

    function disposeGroup(g: THREE.Group): void {
      g.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
      g.parent?.remove(g);
    }

    function applyTransform(group: THREE.Group, inst: PlacedInstance): void {
      group.position.set(inst.x * VOX, Math.max(0, inst.y) * VOX, inst.z * VOX);
      group.rotation.set(0, (inst.rot * Math.PI) / 180, 0);
      group.scale.setScalar(inst.scale || 1);
    }

    function updateRing(): void {
      const slot = selectedId ? slots.get(selectedId) : null;
      if (!slot) {
        ring.visible = false;
        return;
      }
      const box = new THREE.Box3().setFromObject(slot.group);
      const size = box.getSize(new THREE.Vector3());
      const r = Math.max(0.4, Math.max(size.x, size.z) / 2 + 0.15);
      ring.scale.set(r, r, 1);
      ring.position.set(slot.group.position.x, 0.02, slot.group.position.z);
      ring.visible = true;
    }

    function buildInstance(id: string, inst: PlacedInstance): void {
      const voxDef = VOX_ITEMS[inst.itemId];
      if (voxDef) {
        const seq = (seqOf.get(id) ?? 0) + 1;
        seqOf.set(id, seq);
        loadVoxModel(voxDef.url)
          .then((group) => {
            if (seqOf.get(id) !== seq) {
              disposeGroup(group);
              return;
            }
            applyTransform(group, inst);
            group.scale.multiplyScalar(voxDef.scale ?? 1);
            group.userData.placedId = id;
            scene.add(group);
            slots.set(id, { group, inst, seq });
            if (selectedId === id) updateRing();
          })
          .catch((err) => console.error(`vox load failed for ${inst.itemId}:`, err));
        return;
      }
      const builder = CATALOG_BUILDERS[inst.itemId];
      if (!builder) return; // unknown id — skip
      const group = builder();
      applyTransform(group, inst);
      group.userData.placedId = id;
      scene.add(group);
      slots.set(id, { group, inst, seq: 0 });
    }

    const api: RoomSceneApi = {
      setWall: (colorHex) => {
        if (wallsGroup) disposeGroup(wallsGroup);
        const color =
          typeof colorHex === "string" && colorHex.length >= 6
            ? parseInt(colorHex.slice(-6), 16)
            : COL.lavender;
        wallsGroup = walls(color);
        scene.add(wallsGroup);
      },
      setFloor: (type) => {
        if (floorGroup) disposeGroup(floorGroup);
        floorGroup = flooring(type);
        scene.add(floorGroup);
      },
      setAvatar: (equip, dx, dy, dz, rotDeg) => {
        if (avatarGroup) disposeGroup(avatarGroup);
        const g = buildAvatar(equip);
        const finalY = Math.max(0, dy * VOX);
        g.position.set((AVATAR_POS.x + dx) * VOX, finalY, (AVATAR_POS.z + dz) * VOX);
        g.rotation.y = Math.PI + (rotDeg * Math.PI) / 180;
        scene.add(g);
        avatarGroup = g;
      },
      setPlaced: (list) => {
        const wanted = new Set(list.map((i) => i.id));
        for (const [id, slot] of [...slots.entries()]) {
          if (!wanted.has(id)) {
            disposeGroup(slot.group);
            slots.delete(id);
            seqOf.delete(id);
          }
        }
        for (const inst of list) {
          const existing = slots.get(inst.id);
          if (!existing) {
            buildInstance(inst.id, inst);
          } else if (existing.inst.itemId !== inst.itemId) {
            disposeGroup(existing.group);
            slots.delete(inst.id);
            buildInstance(inst.id, inst);
          } else {
            existing.inst = inst;
            applyTransform(existing.group, inst);
          }
        }
        if (selectedId && !wanted.has(selectedId)) selectedId = null;
        updateRing();
      },
      setSelected: (id) => {
        selectedId = id;
        updateRing();
      },
      setEditable: (v) => {
        editable = v;
        if (!editable) {
          selectedId = null;
          updateRing();
        }
      },
      resetCamera: () => {
        Object.assign(cam, INITIAL_CAMERA);
        placeCamera();
      },
      zoom: (delta) => {
        cam.dist = clamp(cam.dist + delta, DIST_MIN, DIST_MAX);
        placeCamera();
      },
    };
    // Publish the imperative handle once the scene exists (init, runs once).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApi(api);

    // ── pointer handling: drag = orbit; click = select instance / deselect ──
    // Movement etc. is button-driven (React → setPlaced), so we never drag
    // items here — a plain click picks what the button panel acts on.
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let dragging = false;
    let candidateId: string | null = null;
    let lastX = 0;
    let lastY = 0;
    let moved = false;

    function pickId(e: PointerEvent): string | null {
      const rect = canvas.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const groups = [...slots.values()].map((s) => s.group);
      const hits = raycaster.intersectObjects(groups, true);
      if (hits.length === 0) return null;
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData.placedId) obj = obj.parent;
      return (obj?.userData.placedId as string) ?? null;
    }

    function onPointerDown(e: PointerEvent): void {
      canvas.setPointerCapture(e.pointerId);
      lastX = e.clientX;
      lastY = e.clientY;
      moved = false;
      dragging = true;
      candidateId = editable ? pickId(e) : null;
    }

    function onPointerMove(e: PointerEvent): void {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      lastX = e.clientX;
      lastY = e.clientY;
      cam.theta = clamp(cam.theta - dx * 0.005, THETA_MIN, THETA_MAX);
      cam.phi = clamp(cam.phi + dy * 0.003, PHI_MIN, PHI_MAX);
      placeCamera();
    }

    function endDrag(e: PointerEvent): void {
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      const wasDragging = dragging;
      dragging = false;
      // A click (no real movement) in edit mode selects what's under it.
      if (wasDragging && !moved && editable) {
        selectedId = candidateId;
        updateRing();
        callbacksRef?.current?.onSelect?.(candidateId);
      }
      candidateId = null;
    }

    function onWheel(e: WheelEvent): void {
      e.preventDefault();
      cam.dist = clamp(cam.dist + e.deltaY * 0.018, DIST_MIN, DIST_MAX);
      placeCamera();
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    resize();
    placeCamera();
    const resizeObs = new ResizeObserver(() => {
      resize();
      placeCamera();
    });
    resizeObs.observe(canvas);

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
      canvas.removeEventListener("pointerup", endDrag);
      canvas.removeEventListener("pointercancel", endDrag);
      canvas.removeEventListener("wheel", onWheel);
      if (wallsGroup) disposeGroup(wallsGroup);
      if (floorGroup) disposeGroup(floorGroup);
      if (avatarGroup) disposeGroup(avatarGroup);
      slots.forEach((s) => disposeGroup(s.group));
      slots.clear();
      disposeGroup(baseGroup);
      renderer.dispose();
      setApi(null);
      setReady(false);
    };
  }, [canvasRef, callbacksRef]);

  return { api, ready };
}
