"use client";

/**
 * Local-only avatar fitting room (dev harness, NOT linked in any nav).
 *
 * Renders a contact sheet of the voxel avatar wearing every catalog item so
 * the whole wardrobe can be eyeballed in a single screenshot. One shared
 * WebGLRenderer is reused for every cell (drawn into per-cell 2D canvases) to
 * dodge the browser's ~16 live-WebGL-context cap.
 *
 * Lives at a public top-level path (not under (admin)) so it renders without a
 * backend/login during local art passes. Guarded to not render in production
 * so it never ships as a usable public URL.
 *
 * Query params:
 *   ?cat=bodies|faces|hair|outfits|hats|glasses|back|hand|accessory|all
 *   ?view=front|three|side|back
 *   ?body=boy|girl
 *
 * Visit: /avatar-fitting?cat=hair&view=three
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from "three";

import { type AvatarEquip, buildAvatar } from "@/lib/avatar/voxels";

type View = "front" | "three" | "side" | "back";

interface Cell {
  label: string;
  equip: AvatarEquip;
  /** Per-cell view override (e.g. back items default to the back view). */
  view?: View;
}

const BOY = "avatar-body-boy";
const GIRL = "avatar-body-girl";

const HAIR = ["avatar-hair-short", "avatar-hair-bald", "avatar-hair-long", "avatar-hair-curly", "avatar-hair-bun", "avatar-hair-mohawk"];
const FACE = ["avatar-face-smile", "avatar-face-wink", "avatar-face-blush", "avatar-face-cool", "avatar-face-determined", "avatar-face-glasses"];
const OUTFIT = ["avatar-outfit-tshirt", "avatar-outfit-cozy", "avatar-outfit-hoodie", "avatar-outfit-dress", "avatar-outfit-sport", "avatar-outfit-suit"];
const HAT = ["avatar-hat-cap", "avatar-hat-beanie", "avatar-hat-wizard", "avatar-hat-crown", "avatar-hat-chef", "avatar-hat-graduate"];
const GLASSES = ["avatar-glasses-round", "avatar-glasses-shades", "avatar-glasses-monocle", "avatar-glasses-ski", "avatar-glasses-3d"];
const BACK = ["avatar-back-backpack", "avatar-back-cape", "avatar-back-wings", "avatar-back-quiver", "avatar-back-jetpack"];
const HAND = ["avatar-hand-book", "avatar-hand-pet", "avatar-hand-flower", "avatar-hand-balloon", "avatar-hand-controller"];
const ACC = ["avatar-acc-book", "avatar-acc-backpack", "avatar-acc-headphones", "avatar-acc-cape", "avatar-acc-pet"];

function short(id: string): string {
  return id.replace(/^avatar-/, "");
}

function buildCells(cat: string, body: string): Cell[] {
  const other = body === GIRL ? BOY : GIRL;
  switch (cat) {
    case "bodies":
      return [
        { label: "boy · default", equip: { body: BOY } },
        { label: "girl · default", equip: { body: GIRL } },
        { label: "boy · 3/4", equip: { body: BOY }, view: "three" },
        { label: "girl · 3/4", equip: { body: GIRL }, view: "three" },
        { label: "boy · side", equip: { body: BOY }, view: "side" },
        { label: "girl · side", equip: { body: GIRL }, view: "side" },
        { label: "boy · back", equip: { body: BOY }, view: "back" },
        { label: "girl · back", equip: { body: GIRL }, view: "back" },
      ];
    case "faces":
      return FACE.map((f) => ({ label: short(f), equip: { body, face: f }, view: "front" as View }));
    case "hair":
      return HAIR.flatMap((h) => [
        { label: `${short(h)} · ${body === GIRL ? "girl" : "boy"}`, equip: { body, hair: h } },
        { label: `${short(h)} · ${other === GIRL ? "girl" : "boy"}`, equip: { body: other, hair: h } },
      ]);
    case "outfits":
      return OUTFIT.flatMap((o) => [
        { label: `${short(o)} · boy`, equip: { body: BOY, outfit: o } },
        { label: `${short(o)} · girl`, equip: { body: GIRL, outfit: o } },
      ]);
    case "hats":
      return HAT.map((h) => ({ label: short(h), equip: { body, hat: h } }));
    case "glasses":
      return GLASSES.map((g) => ({ label: short(g), equip: { body, glasses: g }, view: "front" as View }));
    case "back":
      return BACK.map((b) => ({ label: short(b), equip: { body, back: b }, view: "back" as View }));
    case "hand":
      return HAND.map((h) => ({ label: short(h), equip: { body, hand: h } }));
    case "accessory":
      return ACC.map((a) => ({ label: short(a), equip: { body, accessory: a } }));
    default:
      return [
        ...buildCells("bodies", body),
        ...buildCells("faces", body),
        ...buildCells("hair", body),
        ...buildCells("outfits", body),
        ...buildCells("hats", body),
        ...buildCells("glasses", body),
        ...buildCells("back", body),
        ...buildCells("hand", body),
        ...buildCells("accessory", body),
      ];
  }
}

const VIEW_ANGLE: Record<View, { theta: number; phi: number }> = {
  // theta orbits around Y; phi is elevation. Avatar is rotated y=PI so its
  // face points +Z (toward theta=0).
  front: { theta: 0, phi: 0.12 },
  three: { theta: Math.PI / 5, phi: 0.18 },
  side: { theta: Math.PI / 2, phi: 0.12 },
  back: { theta: Math.PI, phi: 0.16 },
};

const CELL_W = 240;
const CELL_H = 300;

function AvatarFittingInner() {
  const params = useSearchParams();
  const cat = params?.get("cat") ?? "bodies";
  const view = (params?.get("view") as View) ?? "three";
  const body = params?.get("body") === "girl" ? GIRL : BOY;

  const cells = useMemo(() => buildCells(cat, body), [cat, body]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const off = document.createElement("canvas");
    off.width = CELL_W;
    off.height = CELL_H;
    const renderer = new THREE.WebGLRenderer({
      canvas: off,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setPixelRatio(2);
    renderer.setSize(CELL_W, CELL_H, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xfff2cc, 0.95);
    key.position.set(4, 9, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd6e2ff, 0.45);
    fill.position.set(-5, 4, -3);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(30, CELL_W / CELL_H, 0.1, 100);

    cells.forEach((cell, i) => {
      const out = canvasRefs.current[i];
      if (!out) return;

      const group = buildAvatar(cell.equip);
      group.rotation.y = Math.PI; // face toward +Z
      scene.add(group);

      // Fit camera to the avatar's bounding box (handles tall hats/balloons).
      const bbox = new THREE.Box3().setFromObject(group);
      const center = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const fitDist = (maxDim / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.55;

      const { theta, phi } = VIEW_ANGLE[cell.view ?? view];
      camera.position.set(
        center.x + fitDist * Math.sin(theta) * Math.cos(phi),
        center.y + fitDist * Math.sin(phi) + size.y * 0.05,
        center.z + fitDist * Math.cos(theta) * Math.cos(phi),
      );
      camera.lookAt(center);

      renderer.render(scene, camera);

      const ctx = out.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, CELL_W, CELL_H);
        ctx.drawImage(renderer.domElement, 0, 0, CELL_W, CELL_H);
      }

      scene.remove(group);
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
    });

    return () => {
      renderer.dispose();
    };
  }, [cells, view]);

  return (
    <div style={{ padding: 16, background: "#cdbfa6", minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "monospace", fontSize: 14, marginBottom: 4 }}>
        avatar fitting · cat={cat} · view={view} · body={body === GIRL ? "girl" : "boy"}
      </h1>
      <p style={{ fontFamily: "monospace", fontSize: 11, marginBottom: 12, color: "#5a4d36" }}>
        cats: bodies faces hair outfits hats glasses back hand accessory all · views: front three side back
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {cells.map((cell, i) => (
          <div
            key={`${cell.label}-${i}`}
            style={{
              width: CELL_W,
              background: "radial-gradient(ellipse at 50% 62%, #f0e8d6 0%, #d7c8b0 100%)",
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            <canvas
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              width={CELL_W}
              height={CELL_H}
              style={{ width: CELL_W, height: CELL_H, display: "block" }}
            />
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 11,
                padding: "4px 8px",
                background: "rgba(255,255,255,0.65)",
                color: "#2a2a2a",
              }}
            >
              {cell.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AvatarFittingPage() {
  return (
    <Suspense fallback={null}>
      <AvatarFittingInner />
    </Suspense>
  );
}
