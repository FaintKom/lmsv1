"use client";

import { Zap } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

interface WalletPillProps {
  wallet: number;
}

export function WalletPill({ wallet }: WalletPillProps) {
  const { t } = useTranslation();
  return (
    <div
      className="flex items-center gap-3 rounded-[14px] border px-3 py-2.5"
      style={{
        background: "linear-gradient(135deg, #fff7d4, #ffe9a3)",
        borderColor: "#ffe9a3",
      }}
    >
      <div
        className="grid h-9 w-9 place-items-center rounded-[10px]"
        style={{
          background: "#ffd84d",
          boxShadow: "0 3px 0 0 #f5b800",
        }}
      >
        <Zap className="h-[18px] w-[18px] fill-current text-yellow-900" />
      </div>
      <div className="flex-1">
        <p className="text-[22px] font-extrabold leading-none tabular-nums text-yellow-900">
          {wallet.toLocaleString()}
        </p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-yellow-800/80">
          {t("room.wallet.label")}
        </p>
      </div>
      <span className="rounded-full bg-yellow-200/80 px-2 py-1 text-[10px] font-semibold text-yellow-900">
        {t("room.wallet.perLesson")}
      </span>
    </div>
  );
}
