"use client";

import { Server, Clock } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

export function WhereMoneyGoes() {
  const { t } = useTranslation();
  return (
    <section className="rounded-lg border border-border bg-paper-2 p-6">
      <h2 className="mb-4 text-lg font-bold text-text">{t("support.whereTitle")}</h2>
      <ul className="space-y-3 text-sm text-ink-700">
        <li className="flex items-start gap-3">
          <Server className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{t("support.whereBullet1")}</span>
        </li>
        <li className="flex items-start gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>{t("support.whereBullet2")}</span>
        </li>
      </ul>
    </section>
  );
}
