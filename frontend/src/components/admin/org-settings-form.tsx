"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { getOrganization, updateOrganization } from "@/lib/api/organizations";
import { useTranslation } from "@/lib/i18n/context";
import { useAuthStore } from "@/stores/auth-store";

/**
 * One school's settings: what it is called, how it looks, which menu entries
 * it hides.
 *
 * `orgId` is required and has no default. That is the whole point: this form
 * used to live inside /admin/settings and quietly read `user.org_id`, so a
 * super admin looking after several schools could only ever edit their own.
 * Making the target explicit is what lets one form serve both screens.
 */

export const MENU_ITEM_KEYS = [
  { key: "users", labelKey: "admin.settings.menuUsers", adminOnly: true },
  { key: "groups", labelKey: "admin.settings.menuGroups", adminOnly: false },
  { key: "courses", labelKey: "admin.settings.menuCourses", adminOnly: false },
  { key: "assignments", labelKey: "admin.settings.menuAssignments", adminOnly: false },
  { key: "gradebook", labelKey: "admin.settings.menuGradebook", adminOnly: false },
  { key: "review", labelKey: "admin.settings.menuReview", adminOnly: false },
  { key: "paths", labelKey: "admin.settings.menuPaths", adminOnly: true },
  { key: "calendar", labelKey: "admin.settings.menuCalendar", adminOnly: false },
  { key: "live", labelKey: "admin.settings.menuLiveLessons", adminOnly: false },
  { key: "analytics", labelKey: "admin.settings.menuAnalytics", adminOnly: false },
];

export function OrgSettingsForm({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const myOrgId = useAuthStore((s) => s.user?.org_id);

  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22c55e");
  const [secondaryColor, setSecondaryColor] = useState("#3b82f6");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    getOrganization(orgId)
      .then((org) => {
        if (cancelled) return;
        const settings = org.settings || {};
        const vis: Record<string, boolean> = {};
        for (const item of MENU_ITEM_KEYS) {
          vis[item.key] = settings.menu_visibility?.[item.key] !== false;
        }
        setMenuVisibility(vis);
        setDisplayName(settings.display_name || org.name || "");
        setLogoUrl(settings.logo_url || "");
        setPrimaryColor(settings.primary_color || "#22c55e");
        setSecondaryColor(settings.secondary_color || "#3b82f6");
      })
      // A school that is not yours reads as 404, and so does one that does not
      // exist. Both say the same thing here, on purpose.
      .catch(() => !cancelled && setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const toggle = (key: string) => setMenuVisibility((prev) => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await updateOrganization(orgId, {
        settings: {
          menu_visibility: menuVisibility,
          display_name: displayName.trim() || undefined,
          logo_url: logoUrl.trim() || undefined,
          primary_color: primaryColor || undefined,
          secondary_color: secondaryColor || undefined,
        },
      });
      // Only when it is your own school: the auth store holds the branding the
      // sidebar and the CSS variables read, and refreshing it after editing
      // somebody else's would repaint your interface in their colours.
      if (orgId === myOrgId) await fetchUser();
      toast.success(t("admin.settings.saved"));
    } catch {
      toast.error(t("admin.settings.failedSave"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-pill border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="rounded-lg border border-border-strong bg-surface p-10 text-center">
        <p className="text-sm font-bold text-text">{t("admin.organizations.notFound")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border-strong bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold text-text">{t("admin.settings.brandingTitle")}</h2>
          <p className="text-xs text-text-subtle">{t("admin.settings.brandingSubtitle")}</p>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-text">
              {t("admin.settings.displayName")}
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("admin.settings.displayNamePlaceholder")}
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
            />
            <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.displayNameHint")}</p>
          </div>

          <div>
            <label htmlFor="logoUrl" className="mb-1 block text-sm font-medium text-text">
              {t("admin.settings.logoUrl")}
            </label>
            <div className="flex items-center gap-3">
              <input
                id="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1 rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
              />
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt={t("admin.settings.logoPreview")}
                  className="h-10 w-10 rounded-lg border border-border-strong object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
            </div>
            <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.logoUrlHint")}</p>
          </div>

          <div>
            <label htmlFor="primaryColor" className="mb-1 block text-sm font-medium text-text">
              {t("admin.settings.primaryColor")}
            </label>
            <div className="flex items-center gap-3">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-border-strong p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 rounded-lg border border-border-strong bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
                placeholder="#6366f1"
              />
              <div className="h-10 flex-1 rounded-lg" style={{ background: primaryColor }} />
            </div>
            <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.primaryColorHint")}</p>
          </div>

          <div>
            <label htmlFor="secondaryColor" className="mb-1 block text-sm font-medium text-text">
              {t("admin.settings.secondaryColor")}
            </label>
            <div className="flex items-center gap-3">
              <input
                id="secondaryColor"
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-border-strong p-0.5"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-28 rounded-lg border border-border-strong bg-surface px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none"
                placeholder="#3b82f6"
              />
              <div className="h-10 flex-1 rounded-lg" style={{ background: secondaryColor }} />
            </div>
            <p className="mt-1 text-xs text-text-subtle">
              {t("admin.settings.secondaryColorHint")}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border-strong bg-surface">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-semibold text-text">{t("admin.settings.menuVisibility")}</h2>
          <p className="text-xs text-text-subtle">{t("admin.settings.menuVisibilityHint")}</p>
        </div>
        <div className="divide-y divide-border">
          {MENU_ITEM_KEYS.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center justify-between px-6 py-3 hover:bg-surface-2"
            >
              <div>
                <span className="text-sm font-medium text-text">{t(item.labelKey)}</span>
                {item.adminOnly && (
                  <span className="ml-2 rounded-pill bg-warning-soft px-2 py-0.5 text-3xs font-semibold text-warning-fg">
                    {t("admin.settings.adminOnly")}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={menuVisibility[item.key] ?? true}
                  onChange={() => toggle(item.key)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-pill bg-ink-200 transition-colors peer-checked:bg-primary" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-pill bg-surface shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? t("common.saving") : t("admin.settings.saveSettings")}
        </Button>
      </div>
    </div>
  );
}
