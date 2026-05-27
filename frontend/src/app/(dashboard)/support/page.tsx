"use client";

import Link from "next/link";

import { DonationForm } from "@/components/support/donation-form";
import { WhereMoneyGoes } from "@/components/support/where-money-goes";
import { DirectCrypto } from "@/components/support/direct-crypto";
import { useTranslation } from "@/lib/i18n/context";

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="text-center">
        <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-text md:text-4xl">
          {t("support.heroTitle")}
        </h1>
        <p className="text-text-muted">{t("support.heroSubtitle")}</p>
      </header>

      <DonationForm />
      <WhereMoneyGoes />
      <DirectCrypto />

      <p className="text-center text-sm">
        <Link
          href="https://opencollective.com/grasslms"
          target="_blank"
          rel="noreferrer noopener"
          className="text-primary underline"
        >
          {t("support.transparencyLink")}
        </Link>
      </p>
    </div>
  );
}
