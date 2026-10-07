"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { buttonClass } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-kit";
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
    <div className="grid max-w-2xl gap-8">
      <PageHeader
        title={t("support.thanksTitle")}
        description={
          <>
            {displayName ? `${displayName} — ` : ""}
            {t("support.thanksSubtext")}
          </>
        }
      />
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard" className={buttonClass()}>
          {t("support.thanksBackToDashboard")}
        </Link>
        <Link href="https://opencollective.com/grasslms" target="_blank" rel="noreferrer noopener" className={buttonClass({ variant: "outline" })}>
          {t("support.thanksViewCollective")}
        </Link>
      </div>
    </div>
  );
}
