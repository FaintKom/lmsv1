"use client";

/**
 * Local-only voxel asset gallery (dev harness, NOT linked in any nav).
 *
 * Renders the downloaded third-party .vox models (copied into the git-ignored
 * public/voxel-gallery/ — see README in F:\lms-assets\voxels) so we can eyeball
 * which ones are usable, and at what scale. Each cell shows the model plus its
 * voxel dimensions (W×H×D) and world height, since "small rework" mostly means
 * rescaling to our room/avatar scale.
 *
 * Reference scale: our avatar is ~6.5 voxels tall in its own grid (≈2.6 world
 * units); the room is ~14 wide (≈5.6 world). A loaded model's world size is
 * voxelCount × 0.1 (VOX_SIZE), so a ~26-vox-tall model ≈ avatar height.
 *
 * Public top-level path so it renders without a backend/login; no-ops in
 * production so it never ships.
 *
 * Visit: /voxel-gallery            (all)
 *        /voxel-gallery?pack=consoles
 */
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from "three";

import { VOX_SIZE, loadVoxModel } from "@/lib/room/vox-loader";

interface ManifestItem {
  file: string;
  pack: string;
  label: string;
}

const CELL_W = 220;
const CELL_H = 240;

function VoxelGalleryInner() {
  const params = useSearchParams();
  const packFilter = params?.get("pack") ?? null;

  const [manifest, setManifest] = useState<ManifestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const dimRefs = useRef<Map<string, HTMLSpanElement>>(new Map());

  useEffect(() => {
    fetch("/voxel-gallery/manifest.json")
      .then((r) => {
        if (!r.ok) throw new Error(`manifest ${r.status}`);
        return r.json();
      })
      .then((m: ManifestItem[]) => setManifest(m))
      .catch((e) => setError(String(e)));
  }, []);

  const items = useMemo(
    () => (manifest ?? []).filter((m) => !packFilter || m.pack === packFilter),
    [manifest, packFilter],
  );
  const packs = useMemo(
    () => [...new Set((manifest ?? []).map((m) => m.pack))].sort(),
    [manifest],
  );

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    if (items.length === 0) return;
    let cancelled = false;

    const off = document.createElement("canvas");
    off.width = CELL_W;
    off.height = CELL_H;
    const renderer = new THREE.WebGLRenderer({
      canvas: off,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(2);
    renderer.setSize(CELL_W, CELL_H, false);
    renderer.shadowMap.enabled = true;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xfff2cc, 0.95);
    key.position.set(5, 10, 7);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd6e2ff, 0.4);
    fill.position.set(-5, 4, -3);
    scene.add(fill);
    const camera = new THREE.PerspectiveCamera(30, CELL_W / CELL_H, 0.01, 1000);

    (async () => {
      for (const item of items) {
        if (cancelled) break;
        const out = canvasRefs.current.get(item.file);
        if (!out) continue;
        let group: THREE.Group;
        try {
          group = await loadVoxModel(`/voxel-gallery/${item.file}`);
        } catch (e) {
          const dimEl = dimRefs.current.get(item.file);
          if (dimEl) dimEl.textContent = `✗ parse failed — re-save in MagicaVoxel (${String(e).slice(0, 40)})`;
          continue;
        }
        if (cancelled) break;
        scene.add(group);

        const bbox = new THREE.Box3().setFromObject(group);
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const dist = (maxDim / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.6;
        camera.position.set(center.x + dist * 0.8, center.y + dist * 0.55, center.z + dist * 0.9);
        camera.lookAt(center);
        renderer.render(scene, camera);

        const ctx = out.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, CELL_W, CELL_H);
          ctx.drawImage(renderer.domElement, 0, 0, CELL_W, CELL_H);
        }

        const vx = Math.round(size.x / VOX_SIZE);
        const vy = Math.round(size.y / VOX_SIZE);
        const vz = Math.round(size.z / VOX_SIZE);
        const dimEl = dimRefs.current.get(item.file);
        if (dimEl) {
          dimEl.textContent =
            vx > 0 && vy > 0 && vz > 0
              ? `${vx}×${vy}×${vz} vox · h≈${size.y.toFixed(1)}u`
              : "✗ empty / multi-model scene — split in MagicaVoxel first";
        }

        scene.remove(group);
        group.traverse((o) => {
          if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
            o.geometry.dispose();
            const m = o.material;
            if (Array.isArray(m)) m.forEach((x) => x.dispose());
            else m.dispose();
          }
        });
      }
    })();

    return () => {
      cancelled = true;
      renderer.dispose();
    };
  }, [items]);

  return (
    <div style={{ padding: 16, background: "#cdbfa6", minHeight: "100vh" }}>
      <h1 style={{ fontFamily: "monospace", fontSize: 14, marginBottom: 4 }}>
        voxel gallery {packFilter ? `· pack=${packFilter}` : "· all"} · {items.length} models
      </h1>
      <p style={{ fontFamily: "monospace", fontSize: 11, marginBottom: 4, color: "#5a4d36" }}>
        packs: {packs.join(" · ") || "—"} (append ?pack=NAME). Reference: avatar ≈26 vox tall, room ≈56 wide.
      </p>
      {error && (
        <p style={{ fontFamily: "monospace", fontSize: 12, color: "#a11" }}>
          manifest error: {error} — did you copy .vox into public/voxel-gallery/?
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((item) => (
          <div
            key={item.file}
            style={{
              width: CELL_W,
              background: "radial-gradient(ellipse at 50% 62%, #f3ecdd 0%, #d7c8b0 100%)",
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(item.file, el);
              }}
              width={CELL_W}
              height={CELL_H}
              style={{ width: CELL_W, height: CELL_H, display: "block" }}
            />
            <div style={{ padding: "4px 8px", background: "rgba(255,255,255,0.7)" }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#2a2a2a" }}>
                <b>{item.pack}</b> · {item.label}
              </div>
              <span
                ref={(el) => {
                  if (el) dimRefs.current.set(item.file, el);
                }}
                style={{ fontFamily: "monospace", fontSize: 10, color: "#6a5d44" }}
              >
                loading…
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VoxelGalleryPage() {
  return (
    <Suspense fallback={null}>
      <VoxelGalleryInner />
    </Suspense>
  );
}
