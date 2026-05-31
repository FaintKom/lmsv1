"use client";

/**
 * Local-only "student cabinet" tuner (dev harness, NOT linked in any nav).
 *
 * Simulates the My-Room shell (our code-built floor + walls + the blue
 * reference chair) and drops the owner-selected imported .vox furniture/console
 * models in, with LIVE controls for scale / position / rotation per item. Use
 * it to dial in how the downloaded models sit in our room, then hit "Export
 * JSON" — those numbers get promoted into the room catalog.
 *
 * The blue code chair is the SCALE ANCHOR (≈1.72 world units tall): match
 * imported chairs to it and the rest follows.
 *
 * Public top-level path so it renders without a backend/login; no-ops in
 * production. Settings persist in localStorage.
 *
 * Visit: /student-cabinet
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { IMPORTED_MODELS, type ImportedModel } from "@/lib/room/imported-models";
import { COL, buildChair, flooring, vbox, walls } from "@/lib/room/voxels";
import { loadVoxModel } from "@/lib/room/vox-loader";

type Transform = Pick<ImportedModel, "enabled" | "scale" | "x" | "y" | "z" | "rot">;
type Config = Record<string, Transform>;

const STORAGE_KEY = "student-cabinet-cfg-v1";

function defaultConfig(): Config {
  const c: Config = {};
  for (const m of IMPORTED_MODELS) {
    c[m.id] = { enabled: m.enabled, scale: m.scale, x: m.x, y: m.y, z: m.z, rot: m.rot };
  }
  return c;
}

function loadConfig(): Config {
  const base = defaultConfig();
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const saved = JSON.parse(raw) as Config;
      for (const id of Object.keys(base)) {
        if (saved[id]) base[id] = { ...base[id], ...saved[id] };
      }
    }
  } catch {
    /* ignore bad storage */
  }
  return base;
}

export default function StudentCabinetPage() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rebuildRef = useRef<((cfg: Config) => void) | null>(null);

  // Hydrate config from localStorage on the client only (avoids SSR mismatch).
  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  // Persist on change.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      /* ignore */
    }
  }, [config]);

  // ── three scene (mount once) ──
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    // Explicit typed alias keeps non-null narrowing inside nested closures.
    const canvas: HTMLCanvasElement = canvasEl;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, logarithmicDepthBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const sun = new THREE.DirectionalLight(0xfff2cc, 1.0);
    sun.position.set(8, 16, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xc0d6ff, 0.35);
    fill.position.set(-6, 8, -4);
    scene.add(fill);

    // Shell: our code-built floor + walls (VOX 0.4).
    scene.add(flooring("wood"));
    scene.add(walls(COL.lavender));
    // Base plinth (matches My Room).
    const baseGroup = new THREE.Group();
    vbox(baseGroup, 0, -1.0, 0, 14, 0.3, 14, 0xe8c89e);
    scene.add(baseGroup);

    // Scale-anchor reference chair (blue), placed near the front-right.
    const refChair = buildChair();
    refChair.position.set(4.2, 0, 0.6);
    scene.add(refChair);

    // Container we rebuild whenever the config changes.
    const importedGroup = new THREE.Group();
    scene.add(importedGroup);
    let buildToken = 0;

    function clearImported(): void {
      for (const child of [...importedGroup.children]) {
        child.traverse((o) => {
          if (o instanceof THREE.Mesh || o instanceof THREE.InstancedMesh) {
            o.geometry.dispose();
            const m = o.material;
            if (Array.isArray(m)) m.forEach((x) => x.dispose());
            else m.dispose();
          }
        });
        importedGroup.remove(child);
      }
    }

    rebuildRef.current = (cfg: Config) => {
      const token = ++buildToken;
      clearImported();
      for (const m of IMPORTED_MODELS) {
        const t = cfg[m.id];
        if (!t || !t.enabled) continue;
        loadVoxModel(`/voxel-gallery/${m.file}`)
          .then((g) => {
            if (token !== buildToken) return; // superseded by a newer rebuild
            g.scale.setScalar(t.scale);
            g.position.set(t.x, t.y, t.z);
            g.rotation.y = (t.rot * Math.PI) / 180;
            g.userData.modelId = m.id;
            importedGroup.add(g);
          })
          .catch((e) => console.error("cabinet load", m.file, e));
      }
    };
    rebuildRef.current(loadConfig());

    // ── orbit camera (same arc style as My Room) ──
    const TARGET = new THREE.Vector3(2.8, 1.3, 2.8);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const cam = { theta: Math.PI / 4, phi: Math.PI / 6, dist: 14 };
    function place(): void {
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
    let dragging = false;
    let lx = 0;
    let ly = 0;
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lx = e.clientX;
      ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      cam.theta -= (e.clientX - lx) * 0.006;
      cam.phi = clamp(cam.phi + (e.clientY - ly) * 0.004, 0.05, Math.PI / 2.4);
      lx = e.clientX;
      ly = e.clientY;
      place();
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cam.dist = clamp(cam.dist + e.deltaY * 0.02, 5, 30);
      place();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    resize();
    place();
    const ro = new ResizeObserver(() => {
      resize();
      place();
    });
    ro.observe(canvas);

    let raf = 0;
    const loop = () => {
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      rebuildRef.current = null;
      renderer.dispose();
    };
  }, []);

  // Re-place imported models whenever the config changes.
  useEffect(() => {
    rebuildRef.current?.(config);
  }, [config]);

  function update(id: string, patch: Partial<Transform>): void {
    setConfig((c) => ({ ...c, [id]: { ...c[id], ...patch } }));
  }

  function exportJson(): void {
    const out: Record<string, Transform> = {};
    for (const m of IMPORTED_MODELS) {
      if (config[m.id]?.enabled) out[m.id] = config[m.id];
    }
    const json = JSON.stringify(out, null, 2);
    navigator.clipboard?.writeText(json).catch(() => {});
    console.log("STUDENT CABINET CONFIG:\n" + json);
  }

  const grouped = useMemo(
    () => ({
      furniture: IMPORTED_MODELS.filter((m) => m.category === "furniture"),
      console: IMPORTED_MODELS.filter((m) => m.category === "console"),
    }),
    [],
  );

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#cdbfa6" }}>
      <canvas ref={canvasRef} style={{ flex: 1, minWidth: 0, height: "100%", touchAction: "none" }} />
      <aside
        style={{
          width: 320,
          flexShrink: 0,
          height: "100%",
          overflowY: "auto",
          background: "#f3ecdd",
          borderLeft: "1px solid #b9a77f",
          fontFamily: "monospace",
          fontSize: 12,
          padding: 10,
        }}
      >
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <button onClick={exportJson} style={btn}>
            Export JSON → clipboard
          </button>
          <button onClick={() => setConfig(defaultConfig())} style={{ ...btn, background: "#d9cdb0" }}>
            Reset
          </button>
        </div>
        <p style={{ color: "#6a5d44", margin: "0 0 10px" }}>
          drag = orbit · wheel = zoom · blue chair = scale anchor (≈1.72u). units = room world (floor 0..5.6).
        </p>
        {(["furniture", "console"] as const).map((cat) => (
          <div key={cat}>
            <h3 style={{ margin: "10px 0 4px", textTransform: "uppercase", color: "#3a3120" }}>{cat}</h3>
            {grouped[cat].map((m) => {
              const t = config[m.id];
              if (!t) return null;
              return (
                <div
                  key={m.id}
                  style={{
                    border: "1px solid #d2c4a2",
                    borderRadius: 6,
                    padding: "5px 6px",
                    marginBottom: 5,
                    background: t.enabled ? "#fffdf6" : "#ece3cf",
                  }}
                >
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={t.enabled}
                      onChange={(e) => update(m.id, { enabled: e.target.checked })}
                    />
                    {m.label}
                  </label>
                  {t.enabled && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 3, marginTop: 4 }}>
                      {(["scale", "x", "y", "z", "rot"] as const).map((k) => (
                        <label key={k} style={{ display: "flex", flexDirection: "column", fontSize: 10, color: "#6a5d44" }}>
                          {k}
                          <input
                            type="number"
                            step={k === "scale" ? 0.01 : k === "rot" ? 5 : 0.1}
                            value={t[k]}
                            onChange={(e) => update(m.id, { [k]: parseFloat(e.target.value) || 0 })}
                            style={inp}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </aside>
    </div>
  );
}

const btn: React.CSSProperties = {
  flex: 1,
  padding: "6px 8px",
  fontFamily: "monospace",
  fontSize: 11,
  fontWeight: 700,
  border: "1px solid #b9a77f",
  borderRadius: 6,
  background: "#bfe0b0",
  cursor: "pointer",
};

const inp: React.CSSProperties = {
  width: "100%",
  fontFamily: "monospace",
  fontSize: 11,
  padding: "2px 3px",
  border: "1px solid #d2c4a2",
  borderRadius: 4,
  background: "#fff",
};
