"use client";

import Link from "next/link";

import { DonationForm } from "@/components/support/donation-form";
import { WhereMoneyGoes } from "@/components/support/where-money-goes";
import { DirectCrypto } from "@/components/support/direct-crypto";
import { PageHeader } from "@/components/ui/page-kit";
import { useTranslation } from "@/lib/i18n/context";

export default function SupportPage() {
  const { t } = useTranslation();
  return (
    <div className="grid max-w-3xl gap-8">
      <PageHeader title={t("support.heroTitle")} description={t("support.heroSubtitle")} />

      <DonationForm />
      <WhereMoneyGoes />
      <DirectCrypto />

      <p className="text-sm">
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
