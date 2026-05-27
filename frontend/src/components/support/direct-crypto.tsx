"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, AlertTriangle } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

export function DirectCrypto() {
  const { t } = useTranslation();
  const address = process.env.NEXT_PUBLIC_BYBIT_USDT_ADDRESS ?? "";
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="rounded-lg border border-border bg-paper-2 p-6">
      <h2 className="mb-3 text-lg font-bold text-text">{t("support.cryptoSectionTitle")}</h2>
      <div className="mb-4 flex items-start gap-2 rounded-md border border-warning bg-sun-50 p-3 text-xs text-ink-700">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg" aria-hidden />
        <p>{t("support.cryptoDisclaimer")}</p>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <div className="rounded-md bg-white p-3">
          <QRCodeSVG value={address} size={140} />
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-text-muted">USDT TRC-20</p>
          <p className="break-all rounded-md border border-border bg-paper-1 p-2 font-mono text-xs">
            {address}
          </p>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-paper-2 px-3 py-1.5 text-xs font-semibold"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? t("support.cryptoCopied") : t("support.cryptoCopyAddress")}
          </button>
        </div>
      </div>
    </section>
  );
}
