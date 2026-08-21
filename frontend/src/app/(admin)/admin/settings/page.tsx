"use client";

import { Settings } from "lucide-react";

import { OrgSettingsForm } from "@/components/admin/org-settings-form";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTranslation } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text">
          <Settings className="h-6 w-6 text-primary" />
          {t("admin.settings.title")}
        </h1>
        <p className="text-sm text-text-muted">{t("admin.settings.subtitle")}</p>
      </div>

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
