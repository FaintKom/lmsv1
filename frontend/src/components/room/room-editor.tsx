"use client";

/**
 * Freeform My-Room editor: a 3D room you furnish by placing catalog items
 * anywhere (one copy each), plus wall-colour / floor-type settings. Replaces
 * the old slot-based shop + layout d-pad.
 *
 * Flow: click an item in the inventory → it drops into the room and becomes
 * selected → move (x/z), raise (y), rotate, scale or delete it with the buttons
 * below. Click an item in the scene to select it; drag empty space to orbit.
 */
import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Trash2,
} from "lucide-react";

import type { RoomCatalogItem, RoomState } from "@/lib/api/room";
import {
  useAddPlaced,
  useDeletePlaced,
  useEquipItem,
  useUpdatePlaced,
} from "@/hooks/use-room";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

import { ItemPreview } from "./item-preview";
import { RoomCanvas, type RoomCanvasHandle } from "./room-canvas";
import { SceneHud } from "./scene-hud";

type Tab = "furniture" | "walls" | "floor";
const STEP = 0.5;

// Base colour per floor type (mirrors FLOOR_PALETTE in room/voxels.ts) for the
// swatch shown on floor cards (floor items carry floor_type, not color_hex).
const FLOOR_SWATCH: Record<string, string> = {
  wood: "#d9a26a",
  tile: "#e8e1ce",
  carpet: "#ffae9a",
  moss: "#7fb069",
};

export function RoomEditor({ state }: { state: RoomState }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("furniture");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<RoomCanvasHandle | null>(null);

  const add = useAddPlaced();
  const upd = useUpdatePlaced();
  const del = useDeletePlaced();
  const equip = useEquipItem();

  const label = (it: RoomCatalogItem): string => {
    const tr = t(it.i18n_key);
    return tr === it.i18n_key ? it.name : tr;
  };

  const furniture = state.catalog.filter(
    (i) => i.item_type === "room" && i.slot !== "wall" && i.slot !== "floor",
  );
  const furnitureGroups = furniture.reduce<Record<string, RoomCatalogItem[]>>((acc, it) => {
    (acc[it.group_name] ??= []).push(it);
    return acc;
  }, {});
  const wallItems = state.catalog.filter((i) => i.slot === "wall");
  const floorItems = state.catalog.filter((i) => i.slot === "floor");
  const placedByItem = new Map(state.placed.map((p) => [p.item_id, p]));

  const sel = state.placed.find((p) => p.id === selectedId) ?? null;
  const selItem = sel ? state.catalog.find((i) => i.id === sel.item_id) ?? null : null;

  function select(id: string | null): void {
    setSelectedId(id);
    canvasRef.current?.setSelected(id);
  }

  async function place(item: RoomCatalogItem): Promise<void> {
    if (state.wallet < item.price) return; // locked
    const existing = placedByItem.get(item.id);
    if (existing) {
      select(existing.id); // one copy — just select it
      return;
    }
    const res = await add.mutateAsync({ item_id: item.id });
    const inst = res.placed.find((p) => p.item_id === item.id);
    if (inst) select(inst.id);
  }

  function patch(
    p: Partial<{ x: number; y: number; z: number; rot: number; scale: number }>,
  ): void {
    if (!sel) return;
    upd.mutate({
      id: sel.id,
      patch: { x: sel.x, y: sel.y, z: sel.z, rot: sel.rot, scale: sel.scale, ...p },
    });
  }

  function remove(): void {
    if (!sel) return;
    del.mutate(sel.id);
    select(null);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "furniture", label: t("room.tab.furniture") || "Furniture" },
    { id: "walls", label: t("room.tab.walls") || "Walls" },
    { id: "floor", label: t("room.tab.floor") || "Floor" },
  ];

  return (
    <div className="grid h-[calc(100vh-12rem)] grid-cols-1 gap-0 lg:grid-cols-[1fr_380px]">
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden lg:h-full">
        <RoomCanvas ref={canvasRef} state={state} editable onSelect={setSelectedId} />
        <SceneHud
          onReset={() => canvasRef.current?.resetCamera()}
          onZoomIn={() => canvasRef.current?.zoomIn()}
          onZoomOut={() => canvasRef.current?.zoomOut()}
        />
      </div>

      <aside className="flex h-full flex-col gap-3 overflow-y-auto border-t border-ink-100 bg-paper-2 p-4 lg:border-l lg:border-t-0">
        {/* Tabs */}
        <div className="flex gap-0 border-b border-ink-100">
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setTab(tb.id)}
              className={cn(
                "relative flex-1 py-2 text-[12px] font-semibold transition-colors",
                tab === tb.id ? "text-green-700" : "text-text-muted hover:text-ink-700",
              )}
            >
              {tb.label}
              {tab === tb.id && (
                <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-[3px] bg-primary" />
              )}
            </button>
          ))}
        </div>

        {/* Inventory grids */}
        {tab === "furniture" && (
          <div className="flex flex-col gap-3">
            {Object.entries(furnitureGroups).map(([group, items]) => (
              <div key={group}>
                <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  {group}
                </h4>
                <div className="grid grid-cols-3 gap-2">
                  {items.map((item) => {
                    const locked = state.wallet < item.price;
                    const placed = placedByItem.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={locked}
                        onClick={() => void place(item)}
                        className={cn(
                          "flex flex-col gap-1 rounded-[10px] border p-1.5 text-left transition-all",
                          locked
                            ? "cursor-not-allowed border-ink-100 bg-ink-50 opacity-60"
                            : placed
                              ? "border-green-400 bg-success-soft"
                              : "border-ink-100 bg-paper hover:border-green-300",
                        )}
                      >
                        <div className="relative aspect-[10/7] overflow-hidden rounded-md bg-white p-1">
                          <ItemPreview id={item.id} />
                          {placed && (
                            <span className="absolute right-0.5 top-0.5 text-[11px] font-bold leading-none text-success-fg">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="truncate text-[11px] font-medium text-ink-700">
                          {label(item)}
                        </span>
                        {!placed && item.price > 0 && (
                          <span className="text-[10px] text-text-muted">{item.price}★</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "walls" && (
          <SettingGrid
            items={wallItems}
            currentId={state.equipped.wall?.item_id ?? null}
            label={label}
            onPick={(id) => equip.mutate({ slot: "wall", item_id: id })}
          />
        )}
        {tab === "floor" && (
          <SettingGrid
            items={floorItems}
            currentId={state.equipped.floor?.item_id ?? null}
            label={label}
            onPick={(id) => equip.mutate({ slot: "floor", item_id: id })}
          />
        )}

        {/* Selected-item controls */}
        {sel ? (
          <div className="mt-auto rounded-[12px] border border-green-300 bg-paper p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="truncate text-[13px] font-semibold text-ink-700">
                {selItem ? label(selItem) : sel.item_id}
              </span>
              <button
                type="button"
                onClick={remove}
                aria-label="Delete"
                className="rounded-lg p-1.5 text-coral-700 hover:bg-coral-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-4">
              {/* Move pad (x / z) */}
              <div className="grid grid-cols-3 gap-1">
                <span />
                <PadBtn onClick={() => patch({ z: sel.z - STEP })} ariaLabel="Move back"><ArrowUp className="h-4 w-4" /></PadBtn>
                <span />
                <PadBtn onClick={() => patch({ x: sel.x - STEP })} ariaLabel="Move left"><ArrowLeft className="h-4 w-4" /></PadBtn>
                <span />
                <PadBtn onClick={() => patch({ x: sel.x + STEP })} ariaLabel="Move right"><ArrowRight className="h-4 w-4" /></PadBtn>
                <span />
                <PadBtn onClick={() => patch({ z: sel.z + STEP })} ariaLabel="Move forward"><ArrowDown className="h-4 w-4" /></PadBtn>
                <span />
              </div>
              {/* Raise */}
              <div className="flex flex-col gap-1">
                <PadBtn onClick={() => patch({ y: sel.y + STEP })} ariaLabel="Raise"><ChevronsUp className="h-4 w-4" /></PadBtn>
                <PadBtn onClick={() => patch({ y: Math.max(0, sel.y - STEP) })} ariaLabel="Lower"><ChevronsDown className="h-4 w-4" /></PadBtn>
              </div>
              {/* Rotate */}
              <div className="flex flex-col gap-1">
                <PadBtn onClick={() => patch({ rot: (sel.rot - 45 + 360) % 360 })} ariaLabel="Rotate left"><RotateCcw className="h-4 w-4" /></PadBtn>
                <PadBtn onClick={() => patch({ rot: (sel.rot + 45) % 360 })} ariaLabel="Rotate right"><RotateCw className="h-4 w-4" /></PadBtn>
              </div>
              {/* Scale */}
              <div className="flex flex-col gap-1">
                <PadBtn onClick={() => patch({ scale: +(sel.scale + 0.1).toFixed(2) })} ariaLabel="Bigger"><Maximize2 className="h-4 w-4" /></PadBtn>
                <PadBtn onClick={() => patch({ scale: Math.max(0.1, +(sel.scale - 0.1).toFixed(2)) })} ariaLabel="Smaller"><Minimize2 className="h-4 w-4" /></PadBtn>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-auto rounded-[12px] bg-ink-50 p-3 text-[12px] text-text-muted">
            {t("room.editor.hint") ||
              "Click an item to add it, then move/rotate/resize it with the buttons. Tap an item in the room to edit it."}
          </p>
        )}
      </aside>
    </div>
  );
}

function SettingGrid({
  items,
  currentId,
  label,
  onPick,
}: {
  items: RoomCatalogItem[];
  currentId: string | null;
  label: (i: RoomCatalogItem) => string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item.id)}
          className={cn(
            "flex items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left text-[12px] font-medium transition-all",
            currentId === item.id
              ? "border-green-400 bg-success-soft text-success-fg"
              : "border-ink-100 bg-paper hover:border-green-300",
          )}
        >
          {(() => {
            const sw = item.color_hex ?? (item.floor_type ? FLOOR_SWATCH[item.floor_type] : null);
            return sw ? (
              <span
                className="h-4 w-4 shrink-0 rounded-full border border-ink-200"
                style={{ background: sw }}
              />
            ) : null;
          })()}
          <span className="truncate">{label(item)}</span>
        </button>
      ))}
    </div>
  );
}

function PadBtn({
  children,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="grid h-[34px] w-[34px] place-items-center rounded-lg border border-ink-100 bg-paper-2 text-ink-700 transition-colors hover:border-green-400 hover:bg-green-50 hover:text-green-800"
    >
      {children}
    </button>
  );
}
