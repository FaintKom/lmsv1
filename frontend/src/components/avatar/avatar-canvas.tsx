"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { RoomState } from "@/lib/api/room";
import { AVATAR_EQUIP_KEY, AVATAR_SLOTS, type AvatarSlot } from "@/lib/avatar/catalog";
import { type AvatarEquip, buildAvatar } from "@/lib/avatar/voxels";

interface AvatarCanvasProps {
  state: RoomState;
}

/**
 * Standalone Three.js scene that shows the student's avatar on a turntable.
 * The figure rotates slowly when idle so all sides are visible without drag.
 */
export function AvatarCanvas({ state }: AvatarCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const equip = useMemo<AvatarEquip>(() => extractAvatarEquip(state), [state]);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvas: HTMLCanvasElement = canvasEl;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const key = new THREE.DirectionalLight(0xfff2cc, 0.95);
    key.position.set(4, 8, 6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd6e2ff, 0.45);
    fill.position.set(-5, 4, -2);
    scene.add(fill);

    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.5, 48),
      new THREE.ShadowMaterial({ opacity: 0.22 }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.receiveShadow = true;
    scene.add(disc);

    let avatarGroup: THREE.Group | null = null;

    function disposeAvatar(): void {
      if (!avatarGroup) return;
      avatarGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      scene.remove(avatarGroup);
      avatarGroup = null;
    }

    function mountAvatar(eq: AvatarEquip): void {
      disposeAvatar();
      const g = buildAvatar(eq);
      g.position.set(0, 0, 0);
      scene.add(g);
      avatarGroup = g;
    }

    mountAvatar(equip);
    (canvas as unknown as { __remountAvatar?: (eq: AvatarEquip) => void }).__remountAvatar =
      mountAvatar;

    function placeCamera(theta: number): void {
      const dist = 9;
      const targetY = 1.5;
      camera.position.set(
        Math.sin(theta) * dist,
        targetY + 2.2,
        Math.cos(theta) * dist,
      );
      camera.lookAt(0, targetY, 0);
    }

    function resize(): void {
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    let theta = Math.PI / 4;
    let dragging = false;
    let lastX = 0;

    function onPointerDown(e: PointerEvent): void {
      dragging = true;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent): void {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      theta -= dx * 0.008;
      placeCamera(theta);
    }

    function onPointerUp(e: PointerEvent): void {
      dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        // pointer not captured -- ignore
      }
    }

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    resize();
    placeCamera(theta);
    const resizeObs = new ResizeObserver(() => {
      resize();
      placeCamera(theta);
    });
    resizeObs.observe(canvas);

    let raf = 0;
    let last = performance.now();
    function loop(now: number): void {
      const dt = (now - last) / 1000;
      last = now;
      if (!dragging) {
        theta += dt * 0.4;
        placeCamera(theta);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      resizeObs.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      disposeAvatar();
      renderer.dispose();
      delete (canvas as unknown as { __remountAvatar?: unknown }).__remountAvatar;
    };
    // mountAvatar uses initial `equip`; subsequent changes go via second effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remount the avatar whenever equip changes.
  useEffect(() => {
    const canvas = canvasRef.current as unknown as
      | { __remountAvatar?: (eq: AvatarEquip) => void }
      | null;
    canvas?.__remountAvatar?.(equip);
  }, [equip]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none select-none"
      style={{
        background:
          "radial-gradient(ellipse at 50% 60%, #f0e8d6 0%, #d7c8b0 100%)",
      }}
    />
  );
}

function extractAvatarEquip(state: RoomState): AvatarEquip {
  const out: AvatarEquip = {};
  for (const slot of AVATAR_SLOTS) {
    const equipped = state.equipped[slot];
    const key = AVATAR_EQUIP_KEY[slot as AvatarSlot];
    out[key] = equipped?.item_id ?? null;
  }
  return out;
}
