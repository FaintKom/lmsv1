"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Settings, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

const MENU_ITEMS = [
  { key: "users", label: "Users", adminOnly: true },
  { key: "groups", label: "Groups", adminOnly: false },
  { key: "courses", label: "Courses", adminOnly: false },
  { key: "assignments", label: "Assignments", adminOnly: false },
  { key: "gradebook", label: "Gradebook", adminOnly: false },
  { key: "review", label: "Review Queue", adminOnly: false },
  { key: "paths", label: "Learning Paths", adminOnly: false },
  { key: "calendar", label: "Calendar", adminOnly: false },
  { key: "meetings", label: "Meetings", adminOnly: false },
  { key: "analytics", label: "Analytics", adminOnly: false },
  { key: "billing", label: "Billing", adminOnly: true },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Branding fields (P2-2)
  const [displayName, setDisplayName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await apiClient.get(`/admin/organizations/${user?.org_id}`);
        const settings = data.settings || {};
        const vis: Record<string, boolean> = {};
        for (const item of MENU_ITEMS) {
          vis[item.key] = settings.menu_visibility?.[item.key] !== false;
        }
        setMenuVisibility(vis);
        // Branding
        setDisplayName(settings.display_name || data.name || "");
        setLogoUrl(settings.logo_url || "");
        setPrimaryColor(settings.primary_color || "#6366f1");
      } catch {
        const vis: Record<string, boolean> = {};
        for (const item of MENU_ITEMS) vis[item.key] = true;
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
        },
      });
      // Refresh the auth store so sidebar/CSS picks up new branding
      await fetchUser();
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Settings className="h-6 w-6 text-indigo-600" />
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure which menu items are visible in the admin sidebar
        </p>
      </div>

      {/* P2-2: Branding card */}
      <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#2C2C2C]">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-white/10">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Branding</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Customize how your organization appears to staff and students
          </p>
        </div>
        <div className="space-y-5 p-6">
          <div>
            <label htmlFor="displayName" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Organization display name
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My School"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-xs text-slate-400">Shown in the sidebar header instead of &ldquo;GrassLMS&rdquo;</p>
          </div>

          <div>
            <label htmlFor="logoUrl" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Logo URL
            </label>
            <div className="flex items-center gap-3">
              <input
                id="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              />
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-10 w-10 rounded-lg border border-slate-200 object-cover dark:border-white/10"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
            </div>
            <p className="mt-1 text-xs text-slate-400">Square image recommended (e.g. 128×128 px). Leave blank for the default icon.</p>
          </div>

          <div>
            <label htmlFor="primaryColor" className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Primary color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="primaryColor"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-slate-300 p-0.5 dark:border-white/10"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                placeholder="#6366f1"
              />
              <div
                className="h-10 flex-1 rounded-lg"
                style={{ background: primaryColor }}
              />
            </div>
            <p className="mt-1 text-xs text-slate-400">Used as the accent color across buttons, links, and the sidebar icon.</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#2C2C2C]">
        <div className="border-b border-slate-100 px-6 py-4 dark:border-white/10">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">Menu Visibility</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Toggle which sections appear in the navigation sidebar
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/10">
          {MENU_ITEMS.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center justify-between px-6 py-3 hover:bg-slate-50 dark:hover:bg-white/5"
            >
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {item.label}
                </span>
                {item.adminOnly && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                    Admin only
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
                <div className="h-6 w-11 rounded-full bg-slate-200 peer-checked:bg-indigo-600 dark:bg-slate-600 transition-colors" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
