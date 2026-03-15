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
  const [menuVisibility, setMenuVisibility] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await apiClient.get(`/admin/organizations/${user?.org_id}`);
        const settings = data.settings || {};
        const vis: Record<string, boolean> = {};
        for (const item of MENU_ITEMS) {
          vis[item.key] = settings.menu_visibility?.[item.key] !== false; // default true
        }
        setMenuVisibility(vis);
      } catch {
        // Default all to visible
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
        settings: { menu_visibility: menuVisibility },
      });
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
