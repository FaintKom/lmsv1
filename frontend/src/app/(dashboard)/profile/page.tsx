"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/translations";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LangCode } from "@/components/gamification/lang-code";
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
 Download,
 Key,
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
 const [exportingData, setExportingData] = useState(false);

 // Password change form
 const [currentPassword, setCurrentPassword] = useState("");
 const [newPassword, setNewPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [changingPassword, setChangingPassword] = useState(false);

 // Email verification
 const [resendingVerification, setResendingVerification] = useState(false);
 const emailVerified = Boolean(user?.email_verified_at);

 // System feature flags — drives the "email disabled" disclaimer banner
 const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);

 useEffect(() => {
 apiClient
 .get("/system/features")
 .then(({ data }) => setEmailEnabled(Boolean(data?.email_enabled)))
 .catch(() => setEmailEnabled(null));
 }, []);

 const handleResendVerification = async () => {
 if (!user?.email) return;
 setResendingVerification(true);
 try {
 await apiClient.post("/auth/resend-verification", { email: user.email });
 toast.success("Verification email sent. Check your inbox.");
 } catch {
 toast.error("Failed to send verification email");
 } finally {
 setResendingVerification(false);
 }
 };

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

 const handleExportData = async () => {
 setExportingData(true);
 try {
 const { data } = await apiClient.get("/auth/me/data-export");
 const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");
 a.href = url;
 a.download = "my-data-export.json";
 document.body.appendChild(a);
 a.click();
 document.body.removeChild(a);
 URL.revokeObjectURL(url);
 toast.success("Data exported successfully");
 } catch {
 toast.error("Failed to export data");
 } finally {
 setExportingData(false);
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

 const handleChangePassword = async (e: React.FormEvent) => {
 e.preventDefault();
 if (newPassword.length < 8) {
 toast.error("New password must be at least 8 characters");
 return;
 }
 if (newPassword !== confirmPassword) {
 toast.error("New password and confirmation do not match");
 return;
 }
 if (newPassword === currentPassword) {
 toast.error("New password must differ from the current one");
 return;
 }
 setChangingPassword(true);
 try {
 await apiClient.post("/auth/me/password", {
 current_password: currentPassword,
 new_password: newPassword,
 });
 toast.success("Password changed successfully");
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 } catch (err: unknown) {
 const e = err as { response?: { data?: { detail?: string } } };
 toast.error(e?.response?.data?.detail || "Failed to change password");
 } finally {
 setChangingPassword(false);
 }
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
 <h1 className="text-2xl font-bold text-text ">
 {t("nav.profile") === "nav.profile" ? "Profile" : t("nav.profile")}
 </h1>
 <p className="mt-1 text-sm text-text-muted ">
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

 {/* Email verification banner */}
 {!emailVerified && (
 <div className="mb-6 flex flex-col gap-3 rounded-lg border border-warning bg-sun-50 p-4 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-start gap-3">
 <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-sun-100 ">
 <Mail className="h-4 w-4 text-warning-fg " />
 </div>
 <div>
 <p className="text-sm font-semibold text-warning-fg ">
 Email not verified
 </p>
 <p className="text-xs text-warning-fg ">
 We sent a verification link to <span className="font-medium">{user?.email}</span>. Click it to confirm your address.
 </p>
 </div>
 </div>
 <Button
 variant="outline"
 onClick={handleResendVerification}
 disabled={resendingVerification}
 className="shrink-0"
 >
 {resendingVerification ? "Sending..." : "Resend email"}
 </Button>
 </div>
 )}

 {/* Avatar & info */}
 <Card className="mb-6">
 <CardContent className="flex items-center gap-6 p-6">
 {user?.avatar_url ? (
 <img
 src={user.avatar_url}
 alt={user.full_name}
 className="h-20 w-20 rounded-pill object-cover shadow-lg"
 />
 ) : (
 <div className="flex h-20 w-20 items-center justify-center rounded-pill bg-gradient-to-br from-green-500 to-emerald-500 text-2xl font-bold text-white shadow-lg">
 {initials}
 </div>
 )}
 <div className="min-w-0 flex-1">
 <h2 className="text-xl font-bold text-text ">
 {user?.full_name}
 </h2>
 <p className="text-sm text-text-muted ">{user?.email}</p>
 <div className="mt-1.5 flex items-center gap-2">
 <span className="inline-flex items-center gap-1 rounded-pill bg-success-soft px-2.5 py-0.5 text-xs font-medium capitalize text-primary ">
 <Shield className="h-3 w-3" />
 {user?.role}
 </span>
 </div>
 {user?.bio && !editing && (
 <p className="mt-3 text-sm leading-relaxed text-text-muted ">
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
 className="rounded-lg p-1 text-text-subtle transition-colors hover:bg-ink-100 hover:text-text-muted "
 >
 <X className="h-5 w-5" />
 </button>
 </div>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSave} className="space-y-4">
 <div>
 <label className="mb-1 flex items-center gap-1 text-sm font-medium text-ink-700 ">
 <User className="h-3.5 w-3.5" />
 Full Name
 </label>
 <input
 type="text"
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary "
 required
 />
 </div>

 <div>
 <label className="mb-1 flex items-center gap-1 text-sm font-medium text-ink-700 ">
 <Mail className="h-3.5 w-3.5" />
 Email
 </label>
 <input
 type="email"
 value={user?.email || ""}
 disabled
 className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text-subtle "
 />
 <p className="mt-1 text-xs text-text-subtle">
 Email cannot be changed
 </p>
 </div>

 <div>
 <label className="mb-1 block text-sm font-medium text-ink-700 ">
 Avatar URL
 </label>
 <input
 type="url"
 value={avatarUrl}
 onChange={(e) => setAvatarUrl(e.target.value)}
 placeholder="https://example.com/avatar.jpg"
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary "
 />
 </div>

 <div>
 <label className="mb-1 flex items-center gap-1 text-sm font-medium text-ink-700 ">
 <FileText className="h-3.5 w-3.5" />
 Bio
 </label>
 <textarea
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 placeholder="Tell us about yourself..."
 rows={3}
 className="w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary "
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
 <span className="text-sm font-medium text-primary">
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
 <User className="mt-0.5 h-4 w-4 text-text-subtle " />
 <div>
 <p className="text-xs font-medium text-text-subtle ">Full Name</p>
 <p className="text-sm text-ink-700 ">{user?.full_name}</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <Mail className="mt-0.5 h-4 w-4 text-text-subtle " />
 <div>
 <p className="text-xs font-medium text-text-subtle ">Email</p>
 <p className="text-sm text-ink-700 ">{user?.email}</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <Shield className="mt-0.5 h-4 w-4 text-text-subtle " />
 <div>
 <p className="text-xs font-medium text-text-subtle ">Role</p>
 <p className="text-sm capitalize text-ink-700 ">{user?.role}</p>
 </div>
 </div>
 {user?.bio && (
 <div className="flex items-start gap-3">
 <FileText className="mt-0.5 h-4 w-4 text-text-subtle " />
 <div>
 <p className="text-xs font-medium text-text-subtle ">Bio</p>
 <p className="text-sm text-ink-700 ">{user.bio}</p>
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
 {emailEnabled === false && (
 <div className="mb-2 rounded-lg border border-warning bg-sun-50 p-3 text-xs text-warning-fg ">
 Email delivery is not configured on this server yet. Your
 preferences are saved, but no messages will be sent until an
 administrator enables SMTP.
 </div>
 )}
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
 className="mt-1 rounded border-ink-300 text-primary focus:ring-primary"
 />
 <div>
 <p className="text-sm font-medium text-ink-700 ">{item.label}</p>
 <p className="text-xs text-text-subtle ">{item.desc}</p>
 </div>
 </label>
 ))}
 <Button onClick={handleSavePrefs} disabled={savingPrefs} className="mt-2">
 <Save className="mr-1 h-4 w-4" />
 {savingPrefs ? "Saving..." : "Save Preferences"}
 </Button>
 </CardContent>
 </Card>

 {/* Change Password */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Key className="h-4 w-4" />
 Change Password
 </CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleChangePassword} className="space-y-4">
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">
 Current password
 </label>
 <input
 type="password"
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 required
 autoComplete="current-password"
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text placeholder-ink-300 $1:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft "
 />
 </div>
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">
 New password
 </label>
 <input
 type="password"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 required
 minLength={8}
 autoComplete="new-password"
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text placeholder-ink-300 $1:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft "
 />
 <p className="mt-1 text-xs text-text-subtle ">
 Minimum 8 characters. Use a password manager.
 </p>
 </div>
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">
 Confirm new password
 </label>
 <input
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 required
 minLength={8}
 autoComplete="new-password"
 className="w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-text placeholder-ink-300 $1:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft "
 />
 </div>
 <Button type="submit" disabled={changingPassword}>
 <Key className="mr-1.5 h-4 w-4" />
 {changingPassword ? "Changing..." : "Change Password"}
 </Button>
 </form>
 </CardContent>
 </Card>

 {/* Privacy & Data */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Shield className="h-4 w-4" />
 Privacy &amp; Data
 </CardTitle>
 </CardHeader>
 <CardContent>
 <p className="mb-3 text-sm text-text-muted ">
 Export all your personal data as a JSON file
 </p>
 <Button onClick={handleExportData} disabled={exportingData} variant="outline">
 <Download className="mr-1.5 h-4 w-4" />
 {exportingData ? "Exporting..." : "Download My Data"}
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
 <LangCode
 key={l.code}
 code={l.code}
 label={l.name}
 active={locale === l.code}
 onClick={() => setLocale(l.code as Locale)}
 />
 ))}
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
