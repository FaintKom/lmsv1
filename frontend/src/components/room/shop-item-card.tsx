"use client";

import { Check, Lock, Zap } from "lucide-react";

import type { RoomCatalogItem } from "@/lib/api/room";
import { useTranslation } from "@/lib/i18n/context";
import { cn } from "@/lib/utils";

import { ItemPreview } from "./item-preview";

export type CardStatus = "equipped" | "owned" | "buy" | "free" | "locked";

interface ShopItemCardProps {
  item: RoomCatalogItem;
  status: CardStatus;
  onClick: () => void;
}

export function ShopItemCard({ item, status, onClick }: ShopItemCardProps) {
  const { t } = useTranslation();
  const isLocked = status === "locked";
  const isEquipped = status === "equipped";
  const isSwatch = item.group_name === "Walls" || item.group_name === "Floor";

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
      {/* Thumb */}
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-[10px]",
          isSwatch ? "aspect-[16/9]" : "aspect-[10/7] bg-white",
        )}
        style={isSwatch && item.swatch ? { background: item.swatch } : undefined}
      >
        {!isSwatch && (
          <div className="absolute inset-0 grid place-items-center p-3">
            <ItemPreview id={item.id} />
          </div>
        )}
      </div>

      {/* Name */}
      <p className="text-[12.5px] font-bold leading-tight text-ink-700">
        {t(item.i18n_key) || item.name}
      </p>

      {/* Status pill + price */}
      <div className="mt-auto flex items-center justify-between gap-1">
        <StatusPill status={status} t={t} />
        {item.price > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-bold tabular-nums text-yellow-800">
            <Zap className="h-2.5 w-2.5 fill-current" />
            {item.price}
          </span>
        )}
      </div>

      {/* Corner check when equipped */}
      {isEquipped && (
        <span
          className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full border-2 bg-primary text-white shadow"
          style={{ borderColor: "#fdfcf7" }}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

function StatusPill({ status, t }: { status: CardStatus; t: (k: string) => string }) {
  const styles: Record<CardStatus, string> = {
    equipped: "bg-primary text-white",
    owned: "bg-green-50 text-green-800",
    buy: "bg-coral-50 text-coral-700",
    free: "bg-green-50 text-green-800",
    locked: "bg-ink-100 text-ink-500",
  };
  const key = `room.status.${status}`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        styles[status],
      )}
    >
      {status === "locked" && <Lock className="h-2.5 w-2.5" />}
      {t(key)}
    </span>
  );
}
