"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { getDonationStatus, type DonationStatusResponse } from "@/lib/api/donations";

export default function ThanksPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const donationId = searchParams.get("d");
  const [donation, setDonation] = useState<DonationStatusResponse | null>(null);

  useEffect(() => {
    if (!donationId) return;
    getDonationStatus(donationId)
      .then(setDonation)
      .catch(() => setDonation(null));
  }, [donationId]);

  const displayName = donation && !donation.anonymous ? donation.donor_name : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8 text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-text md:text-4xl">
        {t("support.thanksTitle")}
      </h1>
      <p className="text-text-muted">
        {displayName ? `${displayName} — ` : ""}
        {t("support.thanksSubtext")}
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/dashboard">
          <Button>{t("support.thanksBackToDashboard")}</Button>
        </Link>
        <Link href="https://opencollective.com/grasslms" target="_blank" rel="noreferrer noopener">
          <Button variant="outline">{t("support.thanksViewCollective")}</Button>
        </Link>
      </div>
    </div>
  );
}
