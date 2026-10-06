"use client";

import { Settings } from "lucide-react";

import { OrgSettingsForm } from "@/components/admin/org-settings-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/ui/page-kit";

/**
 * Your own school's settings.
 *
 * The form itself moved to a component the moment a second screen needed it —
 * a super admin editing another school. What stays here is the theme toggle,
 * which is nobody's school setting: it is one person's preference for their
 * own eyes.
 */
export default function SettingsPage() {
  const { t } = useTranslation();
  const orgId = useAuthStore((s) => s.user?.org_id);

  return (
    <div className="space-y-8">
      <PageHeader title={t("admin.settings.title")} description={t("admin.settings.subtitle")} />

      {/* Appearance (theme contract: frontend/design/README.md) */}
      <div className="rounded-lg border border-border-strong bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold text-text">{t("profile.theme")}</h2>
        </div>
        <div className="p-6">
          <ThemeToggle />
        </div>
      </div>

      {orgId && <OrgSettingsForm orgId={orgId} />}
    </div>
  );
}
