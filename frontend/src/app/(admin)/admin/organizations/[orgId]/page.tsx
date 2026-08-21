"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { OrgSettingsForm } from "@/components/admin/org-settings-form";
import { useTranslation } from "@/lib/i18n/context";

/**
 * One school's settings, opened from the list of organisations.
 *
 * A super admin looking after several schools could reach a school's name and
 * nothing else: its menu, logo and colours were only editable from
 * /admin/settings, which reads the signed-in user's own org_id and no other.
 *
 * Whether this particular school is yours to edit is the server's call. It
 * answers 404 for one that is not — the same answer it gives for one that does
 * not exist, so nobody learns which schools are out there by guessing.
 */
export default function OrganizationSettingsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-muted hover:text-text"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("admin.organizations.backToList")}
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-text">{t("admin.organizations.settingsTitle")}</h1>
        <p className="text-sm text-text-muted">{t("admin.organizations.settingsSubtitle")}</p>
      </div>

      <OrgSettingsForm orgId={orgId} />
    </div>
  );
}
