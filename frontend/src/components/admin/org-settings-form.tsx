"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { BrandSection } from "@/components/admin/brand-section";
import { MenuVisibilitySection } from "@/components/admin/menu-visibility-section";
import { SchoolContactsSection } from "@/components/admin/school-contacts-section";
import { HIDEABLE_ITEMS } from "@/components/layout/menu-items";
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

export function OrgSettingsForm({ orgId }: { orgId: string }) {
  const { t } = useTranslation();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const myOrgId = useAuthStore((s) => s.user?.org_id);

  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22c55e");
  const [secondaryColor, setSecondaryColor] = useState("#3b82f6");
  // Stored, not inferred: a school may deliberately pick the very colour we
  // suggested, and that is still a choice we must stop overwriting.
  const [secondaryIsCustom, setSecondaryIsCustom] = useState(false);
  const [faviconUrl, setFaviconUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
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
        // Read from what the school saved, never from the list's defaults. A
        // form that starts every key at "on" would switch back on whatever the
        // school had switched off, the first time anyone saved anything else.
        const vis: Record<string, boolean> = {};
        for (const item of HIDEABLE_ITEMS) {
          vis[item.key] = settings.menu_visibility?.[item.key] !== false;
        }
        setMenuVisibility(vis);
        setDisplayName(settings.display_name || org.name || "");
        setLogoUrl(settings.logo_url || "");
        setPrimaryColor(settings.primary_color || "#22c55e");
        setSecondaryColor(settings.secondary_color || "#3b82f6");
        setSecondaryIsCustom(settings.secondary_is_custom === true);
        setFaviconUrl(settings.favicon_url || "");
        setSupportEmail(settings.support_email || "");
        setSupportUrl(settings.support_url || "");
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
          secondary_is_custom: secondaryIsCustom,
          favicon_url: faviconUrl.trim() || undefined,
          support_email: supportEmail.trim() || undefined,
          support_url: supportUrl.trim() || undefined,
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
      <BrandSection
        displayName={displayName}
        onDisplayName={setDisplayName}
        logoUrl={logoUrl}
        onLogoUrl={setLogoUrl}
        primary={primaryColor}
        secondary={secondaryColor}
        secondaryIsCustom={secondaryIsCustom}
        onColors={({ primary, secondary, secondaryIsCustom: custom }) => {
          setPrimaryColor(primary);
          setSecondaryColor(secondary);
          setSecondaryIsCustom(custom);
        }}
      />

      <SchoolContactsSection
        faviconUrl={faviconUrl}
        onFaviconUrl={setFaviconUrl}
        supportEmail={supportEmail}
        onSupportEmail={setSupportEmail}
        supportUrl={supportUrl}
        onSupportUrl={setSupportUrl}
      />

      <MenuVisibilitySection value={menuVisibility} onToggle={toggle} />

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? t("common.saving") : t("admin.settings.saveSettings")}
        </Button>
      </div>
    </div>
  );
}
