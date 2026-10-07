"use client";

import Link from "next/link";

import { buttonClass } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

/**
 * 404. Built on DS v3 tokens (specs/087): the old page used
 * `bg-surface-primary` / `text-text-primary`, names v3 never defined, so it
 * rendered on the browser's default white with default black text.
 */
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 text-center">
      <Link href="/" className="mb-10 flex items-center gap-2.5">
        <span className="relative flex h-10 w-10 items-center justify-center rounded-sm bg-logo text-xl font-extrabold text-logo-fg">
          g
          <span className="absolute bottom-[5px] right-[6px] h-[6px] w-[6px] rounded-full bg-sun-400" />
        </span>
        <span className="font-display text-lg font-bold tracking-tight text-text">GrassLMS</span>
      </Link>
      <h1 className="font-display text-6xl font-bold tabular-nums text-text">404</h1>
      <p className="mt-3 max-w-sm text-base text-text-muted">{t("nf.message")}</p>
      <Link href="/dashboard" className={buttonClass({ className: "mt-8" })}>
        {t("courses.backToDashboard")}
      </Link>
    </main>
  );
}
