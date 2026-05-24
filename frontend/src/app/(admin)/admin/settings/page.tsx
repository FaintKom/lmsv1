"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

const MENU_ITEM_KEYS = [
 { key: "users", labelKey: "admin.settings.menuUsers", adminOnly: true },
 { key: "groups", labelKey: "admin.settings.menuGroups", adminOnly: false },
 { key: "courses", labelKey: "admin.settings.menuCourses", adminOnly: false },
 { key: "assignments", labelKey: "admin.settings.menuAssignments", adminOnly: false },
 { key: "gradebook", labelKey: "admin.settings.menuGradebook", adminOnly: false },
 { key: "review", labelKey: "admin.settings.menuReview", adminOnly: false },
 { key: "paths", labelKey: "admin.settings.menuPaths", adminOnly: false },
 { key: "calendar", labelKey: "admin.settings.menuCalendar", adminOnly: false },
 { key: "meetings", labelKey: "admin.settings.menuMeetings", adminOnly: false },
 { key: "analytics", labelKey: "admin.settings.menuAnalytics", adminOnly: false },
];

export default function SettingsPage() {
 const { t } = useTranslation();
 const user = useAuthStore((s) => s.user);
 const fetchUser = useAuthStore((s) => s.fetchUser);
 const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 // Branding fields (P2-2)
 const [displayName, setDisplayName] = useState("");
 const [logoUrl, setLogoUrl] = useState("");
 const [primaryColor, setPrimaryColor] = useState("#22c55e");
 const [secondaryColor, setSecondaryColor] = useState("#3b82f6");

 useEffect(() => {
 const fetchSettings = async () => {
 try {
 const { data } = await apiClient.get(`/admin/organizations/${user?.org_id}`);
 const settings = data.settings || {};
 const vis: Record<string, boolean> = {};
 for (const item of MENU_ITEM_KEYS) {
 vis[item.key] = settings.menu_visibility?.[item.key] !== false;
 }
 setMenuVisibility(vis);
 // Branding
 setDisplayName(settings.display_name || data.name || "");
 setLogoUrl(settings.logo_url || "");
 setPrimaryColor(settings.primary_color || "#22c55e");
 setSecondaryColor(settings.secondary_color || "#3b82f6");
 } catch {
 const vis: Record<string, boolean> = {};
 for (const item of MENU_ITEM_KEYS) vis[item.key] = true;
 setMenuVisibility(vis);
 } finally {
 setLoading(false);
 }
 };
 if (user?.org_id) fetchSettings();
 }, [user?.org_id]);

 const toggle = (key: string) => {
 setMenuVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
 };

 const save = async () => {
 setSaving(true);
 try {
 await apiClient.put(`/admin/organizations/${user?.org_id}`, {
 settings: {
 menu_visibility: menuVisibility,
 display_name: displayName.trim() || undefined,
 logo_url: logoUrl.trim() || undefined,
 primary_color: primaryColor || undefined,
 secondary_color: secondaryColor || undefined,
 },
 });
 // Refresh the auth store so sidebar/CSS picks up new branding
 await fetchUser();
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

 return (
 <div className="mx-auto max-w-2xl space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-text flex items-center gap-2">
 <Settings className="h-6 w-6 text-primary" />
 {t("admin.settings.title")}
 </h1>
 <p className="text-sm text-text-muted ">
 {t("admin.settings.subtitle")}
 </p>
 </div>

 {/* P2-2: Branding card */}
 <div className="rounded-lg border border-border-strong bg-paper-2 ">
 <div className="border-b border-border px-6 py-4 ">
 <h2 className="font-semibold text-text ">{t("admin.settings.brandingTitle")}</h2>
 <p className="text-xs text-text-subtle ">
 {t("admin.settings.brandingSubtitle")}
 </p>
 </div>
 <div className="space-y-5 p-6">
 <div>
 <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-ink-700 ">
 {t("admin.settings.displayName")}
 </label>
 <input
 id="displayName"
 type="text"
 value={displayName}
 onChange={(e) => setDisplayName(e.target.value)}
 placeholder={t("admin.settings.displayNamePlaceholder")}
 className="w-full rounded-lg border border-ink-300 bg-paper-2 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
 />
 <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.displayNameHint")}</p>
 </div>

 <div>
 <label htmlFor="logoUrl" className="mb-1 block text-sm font-medium text-ink-700 ">
 {t("admin.settings.logoUrl")}
 </label>
 <div className="flex items-center gap-3">
 <input
 id="logoUrl"
 type="url"
 value={logoUrl}
 onChange={(e) => setLogoUrl(e.target.value)}
 placeholder="https://example.com/logo.png"
 className="flex-1 rounded-lg border border-ink-300 bg-paper-2 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft"
 />
 {logoUrl && (
 <img
 src={logoUrl}
 alt="Logo preview"
 className="h-10 w-10 rounded-lg border border-border-strong object-cover "
 onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
 />
 )}
 </div>
 <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.logoUrlHint")}</p>
 </div>

 <div>
 <label htmlFor="primaryColor" className="mb-1 block text-sm font-medium text-ink-700 ">
 {t("admin.settings.primaryColor")}
 </label>
 <div className="flex items-center gap-3">
 <input
 id="primaryColor"
 type="color"
 value={primaryColor}
 onChange={(e) => setPrimaryColor(e.target.value)}
 className="h-10 w-10 cursor-pointer rounded-lg border border-ink-300 p-0.5 "
 />
 <input
 type="text"
 value={primaryColor}
 onChange={(e) => setPrimaryColor(e.target.value)}
 className="w-28 rounded-lg border border-ink-300 bg-paper-2 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
 placeholder="#6366f1"
 />
 <div
 className="h-10 flex-1 rounded-lg"
 style={{ background: primaryColor }}
 />
 </div>
 <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.primaryColorHint")}</p>
 </div>

 <div>
 <label htmlFor="secondaryColor" className="mb-1 block text-sm font-medium text-ink-700 ">
 {t("admin.settings.secondaryColor")}
 </label>
 <div className="flex items-center gap-3">
 <input
 id="secondaryColor"
 type="color"
 value={secondaryColor}
 onChange={(e) => setSecondaryColor(e.target.value)}
 className="h-10 w-10 cursor-pointer rounded-lg border border-ink-300 p-0.5 "
 />
 <input
 type="text"
 value={secondaryColor}
 onChange={(e) => setSecondaryColor(e.target.value)}
 className="w-28 rounded-lg border border-ink-300 bg-paper-2 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
 placeholder="#3b82f6"
 />
 <div
 className="h-10 flex-1 rounded-lg"
 style={{ background: secondaryColor }}
 />
 </div>
 <p className="mt-1 text-xs text-text-subtle">{t("admin.settings.secondaryColorHint")}</p>
 </div>
 </div>
 </div>

 <div className="rounded-lg border border-border-strong bg-paper-2 ">
 <div className="border-b border-border px-6 py-4 ">
 <h2 className="font-semibold text-text ">{t("admin.settings.menuVisibility")}</h2>
 <p className="text-xs text-text-subtle ">
 {t("admin.settings.menuVisibilityHint")}
 </p>
 </div>
 <div className="divide-y divide-slate-100 ">
 {MENU_ITEM_KEYS.map((item) => (
 <label
 key={item.key}
 className="flex cursor-pointer items-center justify-between px-6 py-3 hover:bg-surface-2 "
 >
 <div>
 <span className="text-sm font-medium text-ink-700 ">
 {t(item.labelKey)}
 </span>
 {item.adminOnly && (
 <span className="ml-2 rounded-pill bg-sun-100 px-2 py-0.5 text-[10px] font-semibold text-warning-fg ">
 {t("admin.settings.adminOnly")}
 </span>
 )}
 </div>
 <div className="relative">
 <input
 type="checkbox"
 checked={menuVisibility[item.key] ?? true}
 onChange={() => toggle(item.key)}
 className="sr-only peer"
 />
 <div className="h-6 w-11 rounded-pill bg-ink-200 peer-checked:bg-primary transition-colors" />
 <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-pill bg-paper-2 shadow transition-transform peer-checked:translate-x-5" />
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
