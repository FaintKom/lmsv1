"use client";

import { useMemo, useState } from "react";

import type { RoomState } from "@/lib/api/room";
import { useEquipItem } from "@/hooks/use-room";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

import { LayoutDPad } from "./layout-dpad";
import { ShopItemCard, type CardStatus } from "./shop-item-card";
import { WalletPill } from "./wallet-pill";

type TabId = "Walls" | "Floor" | "Furniture" | "Decor" | "Layout";

const TABS: { id: TabId; key: string }[] = [
  { id: "Walls", key: "room.tab.walls" },
  { id: "Floor", key: "room.tab.floor" },
  { id: "Furniture", key: "room.tab.furniture" },
  { id: "Decor", key: "room.tab.decor" },
  { id: "Layout", key: "room.tab.layout" },
];

interface ShopPanelProps {
  state: RoomState;
}

export function ShopPanel({ state }: ShopPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>("Walls");
  const equip = useEquipItem();

  const itemsByGroup = useMemo(() => {
    const groups: Record<string, RoomState["catalog"]> = {};
    for (const item of state.catalog) {
      (groups[item.group_name] ??= []).push(item);
    }
    return groups;
  }, [state.catalog]);

  function statusOf(itemId: string, slot: string, price: number): CardStatus {
    const equippedHere = state.equipped[slot]?.item_id;
    if (equippedHere === itemId) return "equipped";
    const unlocked = state.wallet >= price;
    if (!unlocked) return "locked";
    return price === 0 ? "free" : "owned";
  }

  function onCardClick(itemId: string, slot: string, status: CardStatus): void {
    if (status === "locked") return;
    if (status === "equipped") {
      // Toggle off when re-clicking an equipped item in a togglable slot.
      if (TOGGLABLE_SLOTS.has(slot)) {
        equip.mutate({ slot, item_id: null });
      }
      return;
    }
    equip.mutate({ slot, item_id: itemId });
  }

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <WalletPill wallet={state.wallet} />

      {/* Tabs */}
      <div className="flex gap-0 border-b border-ink-100">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.id}
            type="button"
            onClick={() => setTab(tabDef.id)}
            className={cn(
              "relative flex-1 py-2 text-[12px] font-semibold transition-colors",
              tab === tabDef.id ? "text-green-700" : "text-text-muted hover:text-ink-700",
            )}
          >
            {t(tabDef.key)}
            {tab === tabDef.id && (
              <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-t-[3px] bg-green-600" />
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {tab === "Layout" ? (
          <LayoutDPad state={state} />
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {(itemsByGroup[tab] ?? []).map((item) => {
              const status = statusOf(item.id, item.slot, item.price);
              return (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  status={status}
                  onClick={() => onCardClick(item.id, item.slot, status)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const TOGGLABLE_SLOTS = new Set([
  "lamp",
  "plant",
  "rug",
  "pictures",
  "plushie",
  "trophy",
  "clock",
  "cabinet",
  "sofa",
  "coffee",
  "arcade",
  "shelfwall",
  "monitor",
  "chair",
]);
