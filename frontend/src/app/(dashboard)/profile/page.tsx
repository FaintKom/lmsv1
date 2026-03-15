"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/translations";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Save,
  User,
  Mail,
  Shield,
  Pencil,
  X,
  Globe,
  FileText,
  Bell,
} from "lucide-react";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const { locale, setLocale, t } = useTranslation();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailPrefs, setEmailPrefs] = useState({
    assignments: true,
    grades: true,
    deadlines: true,
    courses: true,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    apiClient.get("/auth/me/email-preferences").then(({ data }) => {
      setEmailPrefs(data);
    }).catch(() => {});
  }, []);

  const handleSavePrefs = async () => {
    setSavingPrefs(true);
    try {
      await apiClient.put("/auth/me/email-preferences", emailPrefs);
      toast.success("Notification preferences saved");
    } catch {
      toast.error("Failed to save preferences");
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleEdit = () => {
    setFullName(user?.full_name || "");
    setAvatarUrl(user?.avatar_url || "");
    setBio(user?.bio || "");
    setEditing(true);
    setSaved(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await apiClient.put("/auth/me/profile/", {
        full_name: fullName,
        avatar_url: avatarUrl || null,
        bio: bio || null,
      });
      await fetchUser();
      setSaved(true);
      setEditing(false);
      toast.success("Profile updated");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const initials = user?.full_name
    ?.split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {t("nav.profile") === "nav.profile" ? "Profile" : t("nav.profile")}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Manage your account settings
          </p>
        </div>
        {!editing && (
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit Profile
          </Button>
        )}
      </div>

      {/* Avatar & info */}
      <Card className="mb-6">
        <CardContent className="flex items-center gap-6 p-6">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="h-20 w-20 rounded-full object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-2xl font-bold text-white shadow-lg">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {user?.full_name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <Shield className="h-3 w-3" />
                {user?.role}
              </span>
            </div>
            {user?.bio && !editing && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {user.bio}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      {editing ? (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Edit Profile</CardTitle>
              <button
                onClick={handleCancel}
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <User className="h-3.5 w-3.5" />
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200"
                  required
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 dark:bg-white/5 dark:text-slate-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Avatar URL
                </label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200"
                />
              </div>

              <div>
                <label className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <FileText className="h-3.5 w-3.5" />
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-white/20 dark:bg-[#2C2C2C] dark:text-slate-200"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={saving}>
                  <Save className="mr-1 h-4 w-4" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                {saved && (
                  <span className="text-sm font-medium text-emerald-600">
                    Profile updated!
                  </span>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Read-only info cards */
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="mt-0.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Full Name</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user?.full_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Email</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <div>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Role</p>
                <p className="text-sm capitalize text-slate-700 dark:text-slate-300">{user?.role}</p>
              </div>
            </div>
            {user?.bio && (
              <div className="flex items-start gap-3">
                <FileText className="mt-0.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                <div>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Bio</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{user.bio}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email Notifications */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { key: "assignments" as const, label: "New assignments", desc: "When a new assignment is posted" },
            { key: "grades" as const, label: "Grades & feedback", desc: "When your work is graded" },
            { key: "deadlines" as const, label: "Deadline reminders", desc: "24 hours before a deadline" },
            { key: "courses" as const, label: "New courses", desc: "When you're enrolled in a new course" },
          ].map((item) => (
            <label key={item.key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={emailPrefs[item.key]}
                onChange={(e) => setEmailPrefs({ ...emailPrefs, [item.key]: e.target.checked })}
                className="mt-1 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500">{item.desc}</p>
              </div>
            </label>
          ))}
          <Button onClick={handleSavePrefs} disabled={savingPrefs} className="mt-2">
            <Save className="mr-1 h-4 w-4" />
            {savingPrefs ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      {/* Language selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            Language
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLocale(l.code as Locale)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                  locale === l.code
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100 dark:border-indigo-500/50 dark:bg-indigo-500/20 dark:text-indigo-400"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-white/5"
                }`}
              >
                <span className="text-base">{l.flag}</span>
                <span>{l.name}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
