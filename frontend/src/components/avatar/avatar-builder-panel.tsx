"use client";

import { useMemo, useState } from "react";
import { Check, Lock, Zap } from "lucide-react";

import type { RoomCatalogItem, RoomState } from "@/lib/api/room";
import { useEquipItem } from "@/hooks/use-room";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";
import { WalletPill } from "@/components/room/wallet-pill";

import { AvatarItemPreview } from "./avatar-item-preview";

type TabId = "Hair" | "Face" | "Outfit" | "Accessory";

const TABS: { id: TabId; key: string; slot: string }[] = [
  { id: "Hair", key: "room.tab.hair", slot: "avatar_hair" },
  { id: "Face", key: "room.tab.face", slot: "avatar_face" },
  { id: "Outfit", key: "room.tab.outfit", slot: "avatar_outfit" },
  { id: "Accessory", key: "room.tab.accessory", slot: "avatar_accessory" },
];

interface AvatarBuilderPanelProps {
  state: RoomState;
}

export function AvatarBuilderPanel({ state }: AvatarBuilderPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>("Hair");
  const equip = useEquipItem();

  const itemsBySlot = useMemo(() => {
    const map: Record<string, RoomCatalogItem[]> = {};
    for (const item of state.catalog) {
      if (item.item_type !== "avatar") continue;
      (map[item.slot] ??= []).push(item);
    }
    return map;
  }, [state.catalog]);

  const activeTab = TABS.find((tabDef) => tabDef.id === tab) ?? TABS[0];
  const items = itemsBySlot[activeTab.slot] ?? [];

  function statusOf(itemId: string, slot: string, price: number): Status {
    const equippedHere = state.equipped[slot]?.item_id;
    if (equippedHere === itemId) return "equipped";
    if (state.wallet < price) return "locked";
    return price === 0 ? "free" : "owned";
  }

  function onClick(item: RoomCatalogItem, status: Status): void {
    if (status === "locked") return;
    if (status === "equipped") {
      // Allow toggle-off only for accessory (other slots always need something equipped).
      if (item.slot === "avatar_accessory") {
        equip.mutate({ slot: item.slot, item_id: null });
      }
      return;
    }
    equip.mutate({ slot: item.slot, item_id: item.id });
  }

  return (
    <div className="flex h-full flex-col gap-4 p-5">
      <WalletPill wallet={state.wallet} />

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

      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2.5">
          {items.map((item) => {
            const status = statusOf(item.id, item.slot, item.price);
            return (
              <AvatarCard
                key={item.id}
                item={item}
                status={status}
                onClick={() => onClick(item, status)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type Status = "equipped" | "owned" | "free" | "locked";

function AvatarCard({
  item,
  status,
  onClick,
}: {
  item: RoomCatalogItem;
  status: Status;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const isEquipped = status === "equipped";
  const isLocked = status === "locked";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLocked}
      className={cn(
        "group relative flex w-full flex-col gap-2 rounded-[14px] border bg-paper-2 p-2.5 text-left transition-all",
        "border-ink-100 hover:-translate-y-px hover:border-green-300 hover:shadow-sm",
        isEquipped &&
          "border-green-500 shadow-[0_0_0_2px_var(--green-100,#d4f0db),0_1px_2px_rgba(20,30,15,0.06)]",
        isLocked && "cursor-not-allowed opacity-85",
      )}
    >
      <div className="relative aspect-[10/7] w-full overflow-hidden rounded-[10px] bg-white">
        <div className="absolute inset-0 grid place-items-center p-3">
          <AvatarItemPreview id={item.id} />
        </div>
      </div>

      <p className="text-[12.5px] font-bold leading-tight text-ink-700">
        {t(item.i18n_key) || item.name}
      </p>

      <div className="mt-auto flex items-center justify-between gap-1">
        <StatusPill status={status} t={t} />
        {item.price > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums text-yellow-800">
            <Zap className="h-2.5 w-2.5 fill-current" />
            {item.price}
          </span>
        )}
      </div>

      {isEquipped && (
        <span
          className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 bg-green-600 text-white shadow"
          style={{ borderColor: "#fdfcf7" }}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function StatusPill({ status, t }: { status: Status; t: (k: string) => string }) {
  const styles: Record<Status, string> = {
    equipped: "bg-green-600 text-white",
    owned: "bg-green-50 text-green-800",
    free: "bg-green-50 text-green-800",
    locked: "bg-ink-100 text-ink-500",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        styles[status],
      )}
    >
      {status === "locked" && <Lock className="h-2.5 w-2.5" />}
      {t(`room.status.${status}`)}
    </span>
  );
}
