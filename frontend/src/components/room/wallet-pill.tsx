"use client";

import { Zap } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

interface WalletPillProps {
  wallet: number;
}

export function WalletPill({ wallet }: WalletPillProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 rounded-md border border-reward/40 bg-reward-soft px-3 py-2.5">
      {/* The chip stays solid --color-reward in both themes, so its glyph is
          ink-900 in both — never white on yellow. */}
      <div className="grid h-9 w-9 place-items-center rounded-sm bg-reward shadow-pop-sun">
        <Zap className="h-[18px] w-[18px] fill-current text-ink-900" />
      </div>
      <div className="flex-1">
        <p className="text-2xl font-extrabold leading-none tabular-nums text-reward-fg">
          {wallet.toLocaleString()}
        </p>
        <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.12em] text-reward-fg/80">
          {t("room.wallet.label")}
        </p>
      </div>
      <span className="rounded-pill bg-reward/40 px-2 py-1 text-xs font-semibold text-reward-fg">
        {t("room.wallet.perLesson")}
      </span>
    </div>
  );
}
