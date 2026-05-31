"use client";

/**
 * Local-only freeform-room harness (dev, NOT linked in any nav).
 *
 * Drives the production <RoomCanvas> with a MOCK RoomState so the freeform
 * place/select/drag/rotate/scale/delete UX can be verified without a backend or
 * login. The real /achievements room tab wires the same component to the API
 * hooks. No-ops in production.
 *
 * Visit: /room-dev
 */
import { useMemo, useRef, useState } from "react";

import { RoomCanvas, type RoomCanvasHandle } from "@/components/room/room-canvas";
import { ItemPreview } from "@/components/room/item-preview";
import { CATALOG_BUILDERS, VOX_ITEMS } from "@/lib/room/catalog";
import type { PlacedItem, RoomCatalogItem, RoomState } from "@/lib/api/room";

const ALL_ITEM_IDS = [...Object.keys(CATALOG_BUILDERS), ...Object.keys(VOX_ITEMS)];

function mockCatalog(): RoomCatalogItem[] {
  const items: RoomCatalogItem[] = ALL_ITEM_IDS.map((id) => ({
    id,
    slot: id,
    group_name: "Furniture",
    name: id,
    i18n_key: `room.item.${id}`,
    price: 0,
    is_default: false,
    swatch: null,
    color_hex: null,
    floor_type: null,
    item_type: "room",
  }));
  items.push(
    {
      id: "wall-lavender", slot: "wall", group_name: "Walls", name: "Lavender",
      i18n_key: "x", price: 0, is_default: true, swatch: null,
      color_hex: "#a48dc8", floor_type: null, item_type: "room",
    },
    {
      id: "floor-wood", slot: "floor", group_name: "Floor", name: "Wood",
      i18n_key: "x", price: 0, is_default: true, swatch: null,
      color_hex: null, floor_type: "wood", item_type: "room",
    },
  );
  return items;
}

// Mirrors the backend default-room seed (DEFAULT_PLACEMENTS +
// IMPORTED_DEFAULT_PLACEMENTS) so the harness shows the real starter layout.
const INITIAL_PLACED: PlacedItem[] = [
  { id: "p1", item_id: "bed-basic", x: 8.5, y: 0, z: 1, rot: 0, scale: 1 },
  { id: "p2", item_id: "window", x: 8.5, y: 5.2, z: 0.4, rot: 0, scale: 1 },
  { id: "p3", item_id: "desk-wood", x: 1, y: 0, z: 0, rot: 0, scale: 1 },
  { id: "p4", item_id: "vox-bookshelf", x: 1.25, y: 0, z: 11.75, rot: 0, scale: 1 },
  { id: "p5", item_id: "vox-drawers", x: 1.25, y: 0, z: 8.0, rot: 0, scale: 1 },
  { id: "p6", item_id: "vox-plant", x: 12.25, y: 0, z: 11.25, rot: 0, scale: 1 },
  { id: "p7", item_id: "vox-monitor", x: 4.0, y: 3.2, z: 2.3, rot: 0, scale: 1 },
  { id: "p8", item_id: "vox-keyboard", x: 4.0, y: 3.2, z: 1.0, rot: 0, scale: 1 },
];

export default function RoomDevPage() {
  const catalog = useMemo(() => mockCatalog(), []);
  const [placed, setPlaced] = useState<PlacedItem[]>(INITIAL_PLACED);
  const [selected, setSelected] = useState<string | null>(null);
  const canvasRef = useRef<RoomCanvasHandle | null>(null);
  const nextId = useRef(100);

  const state: RoomState = useMemo(
    () => ({
      wallet: 99999,
      equipped: {
        wall: { item_id: "wall-lavender", offset_dx: 0, offset_dy: 0, offset_dz: 0, offset_rot: 0 },
        floor: { item_id: "floor-wood", offset_dx: 0, offset_dy: 0, offset_dz: 0, offset_rot: 0 },
      },
      catalog,
      placed,
    }),
    [catalog, placed],
  );

  const sel = placed.find((p) => p.id === selected) ?? null;

  function patch(id: string, p: Partial<PlacedItem>): void {
    setPlaced((list) => list.map((it) => (it.id === id ? { ...it, ...p } : it)));
  }
  function add(itemId: string): void {
    // One copy per item: re-clicking a placed item just selects it.
    const existing = placed.find((p) => p.item_id === itemId);
    if (existing) {
      setSelected(existing.id);
      canvasRef.current?.setSelected(existing.id);
      return;
    }
    const id = `p${nextId.current++}`;
    setPlaced((list) => [...list, { id, item_id: itemId, x: 7, y: 0, z: 7, rot: 0, scale: 1 }]);
    setSelected(id);
    canvasRef.current?.setSelected(id);
  }
  function del(): void {
    if (!selected) return;
    setPlaced((list) => list.filter((it) => it.id !== selected));
    setSelected(null);
    canvasRef.current?.setSelected(null);
  }

  const STEP = 0.5; // voxel move step
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#cdbfa6" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <RoomCanvas ref={canvasRef} state={state} editable onSelect={setSelected} />
      </div>
      <aside
        style={{
          width: 280, flexShrink: 0, height: "100%", overflowY: "auto",
          background: "#f3ecdd", borderLeft: "1px solid #b9a77f",
          fontFamily: "monospace", fontSize: 12, padding: 10,
        }}
      >
        <h3 style={{ margin: "0 0 6px" }}>room-dev · {placed.length} placed</h3>
        <p style={{ color: "#6a5d44", margin: "0 0 10px" }}>
          клик предмета на сцене = выбрать · drag = камера · wheel = zoom.
        </p>

        <h4 style={{ margin: "8px 0 4px" }}>Добавить</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4 }}>
          {ALL_ITEM_IDS.map((id) => {
            const isPlaced = placed.some((p) => p.item_id === id);
            return (
              <button
                key={id}
                style={{ ...ibtn, background: isPlaced ? "#bfe0b0" : "#fff", display: "flex", flexDirection: "column", gap: 2 }}
                onClick={() => add(id)}
              >
                <div style={{ width: "100%", aspectRatio: "10/7", background: "#fff", borderRadius: 3 }}>
                  <ItemPreview id={id} />
                </div>
                <span style={{ fontSize: 9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                  {isPlaced ? "✓ " : ""}{id}
                </span>
              </button>
            );
          })}
        </div>

        <h4 style={{ margin: "14px 0 4px" }}>Управление {sel ? `· ${sel.item_id}` : ""}</h4>
        {!sel ? (
          <p style={{ color: "#6a5d44" }}>выбери предмет (клик на сцене или «добавить»).</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 38px)", gap: 3, justifyContent: "center" }}>
              <span />
              <button style={tbtn} onClick={() => patch(sel.id, { z: +(sel.z - STEP).toFixed(2) })}>↑</button>
              <span />
              <button style={tbtn} onClick={() => patch(sel.id, { x: +(sel.x - STEP).toFixed(2) })}>←</button>
              <span style={{ fontSize: 9, alignSelf: "center", textAlign: "center", color: "#6a5d44" }}>x/z</span>
              <button style={tbtn} onClick={() => patch(sel.id, { x: +(sel.x + STEP).toFixed(2) })}>→</button>
              <span />
              <button style={tbtn} onClick={() => patch(sel.id, { z: +(sel.z + STEP).toFixed(2) })}>↓</button>
              <span />
            </div>
            <Row>
              <button style={tbtn} onClick={() => patch(sel.id, { y: +(sel.y + STEP).toFixed(2) })}>↑ выше</button>
              <button style={tbtn} onClick={() => patch(sel.id, { y: Math.max(0, +(sel.y - STEP).toFixed(2)) })}>↓ ниже</button>
            </Row>
            <Row>
              <button style={tbtn} onClick={() => patch(sel.id, { rot: (sel.rot - 45 + 360) % 360 })}>⟲ 45°</button>
              <button style={tbtn} onClick={() => patch(sel.id, { rot: (sel.rot + 45) % 360 })}>45° ⟳</button>
            </Row>
            <Row>
              <button style={tbtn} onClick={() => patch(sel.id, { scale: Math.max(0.1, +(sel.scale - 0.1).toFixed(2)) })}>− размер</button>
              <button style={tbtn} onClick={() => patch(sel.id, { scale: +(sel.scale + 0.1).toFixed(2) })}>+ размер</button>
            </Row>
            <button style={{ ...tbtn, background: "#e6796b", color: "#fff" }} onClick={del}>🗑 удалить</button>
            <code style={{ fontSize: 10, color: "#6a5d44" }}>
              x{sel.x.toFixed(1)} y{sel.y.toFixed(1)} z{sel.z.toFixed(1)} · {sel.rot}° · ×{sel.scale.toFixed(2)}
            </code>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", gap: 4 }}>{children}</div>;
}

const tbtn: React.CSSProperties = {
  padding: "4px 8px", fontFamily: "monospace", fontSize: 12, border: "1px solid #b9a77f",
  borderRadius: 6, background: "#bfe0b0", cursor: "pointer",
};
const ibtn: React.CSSProperties = {
  padding: "3px 6px", fontFamily: "monospace", fontSize: 10, border: "1px solid #d2c4a2",
  borderRadius: 5, background: "#fff", cursor: "pointer",
};
