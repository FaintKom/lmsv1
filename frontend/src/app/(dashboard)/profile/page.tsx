"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/meta";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LangCode } from "@/components/gamification/lang-code";
import { PageHeader } from "@/components/ui/page-kit";
import {
 Save,
 User,
 Mail,
 Shield,
 Pencil,
 X,
 Globe,
 FileText,
 Palette,
 Bell,
 Download,
 Key,
 Trash2,
 AlertTriangle,
} from "lucide-react";

export default function ProfilePage() {
 const user = useAuthStore((s) => s.user);
 const fetchUser = useAuthStore((s) => s.fetchUser);
 const logout = useAuthStore((s) => s.logout);
 const router = useRouter();
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

 // Account deletion (GDPR self-service erasure)
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [deletePassword, setDeletePassword] = useState("");
 const [deleting, setDeleting] = useState(false);

 const handleDeleteAccount = async (e: React.FormEvent) => {
 e.preventDefault();
 setDeleting(true);
 try {
 await apiClient.delete("/auth/me", { data: { password: deletePassword } });
 toast.success(t("prof.deleted"));
 logout();
 router.push("/");
 } catch (err: unknown) {
 const e = err as { response?: { data?: { detail?: string } } };
 toast.error(e?.response?.data?.detail || t("prof.deleteFailed"));
 } finally {
 setDeleting(false);
 setDeletePassword("");
 }
 };

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
 toast.success(t("prof.verifySent"));
 } catch {
 toast.error(t("prof.verifyFailed"));
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
 toast.success(t("prof.prefsSaved"));
 } catch {
 toast.error(t("prof.prefsFailed"));
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
 toast.success(t("prof.exported"));
 } catch {
 toast.error(t("prof.exportFailed"));
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
 toast.error(t("prof.pwTooShort"));
 return;
 }
 if (newPassword !== confirmPassword) {
 toast.error(t("prof.pwMismatch"));
 return;
 }
 if (newPassword === currentPassword) {
 toast.error(t("prof.pwSame"));
 return;
 }
 setChangingPassword(true);
 try {
 await apiClient.post("/auth/me/password", {
 current_password: currentPassword,
 new_password: newPassword,
 });
 toast.success(t("prof.pwChanged"));
 setCurrentPassword("");
 setNewPassword("");
 setConfirmPassword("");
 } catch (err: unknown) {
 const e = err as { response?: { data?: { detail?: string } } };
 toast.error(e?.response?.data?.detail || t("prof.pwFailed"));
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
 toast.success(t("prof.updated"));
 setTimeout(() => setSaved(false), 3000);
 } catch {
 toast.error(t("prof.updateFailed"));
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
 <div className="space-y-8">
 <PageHeader
 title={t("nav.profile")}
 actions={
 !editing && (
 <Button variant="outline" onClick={handleEdit}>
 <Pencil className="mr-1.5 h-4 w-4" />
 {t("prof.edit")}
 </Button>
 )
 }
 />

 {/* Email verification banner */}
 {!emailVerified && (
 <div className="mb-6 flex flex-col gap-3 rounded-lg border border-warning bg-warning-soft p-4 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex items-start gap-3">
 <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-warning-soft ">
 <Mail className="h-4 w-4 text-warning-fg " />
 </div>
 <div>
 <p className="text-sm font-semibold text-warning-fg ">
 {t("prof.notVerified")}
 </p>
 <p className="text-xs text-warning-fg ">
 {t("prof.verifyBody").replace("{email}", user?.email ?? "")}
 </p>
 </div>
 </div>
 <Button
 variant="outline"
 onClick={handleResendVerification}
 disabled={resendingVerification}
 className="shrink-0"
 >
 {resendingVerification ? t("prof.sending") : t("prof.resend")}
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
 <div className="flex h-20 w-20 items-center justify-center rounded-pill bg-primary text-2xl font-bold text-primary-fg shadow-lg">
 {initials}
 </div>
 )}
 <div className="min-w-0 flex-1">
 <h2 className="text-xl font-bold text-text ">
 {user?.full_name}
 </h2>
 <p className="break-all text-sm text-text-muted">{user?.email}</p>
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
 <CardTitle className="text-base">{t("prof.edit")}</CardTitle>
 <button
 onClick={handleCancel}
 className="rounded-lg p-1 text-text-subtle transition-colors hover:bg-surface-2 hover:text-text-muted "
 >
 <X className="h-5 w-5" />
 </button>
 </div>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSave} className="space-y-4">
 <div>
 <label className="mb-1 flex items-center gap-1 text-sm font-medium text-text ">
 <User className="h-3.5 w-3.5" />
 {t("prof.fullName")}
 </label>
 <input
 type="text"
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary "
 required
 />
 </div>

 <div>
 <label className="mb-1 flex items-center gap-1 text-sm font-medium text-text ">
 <Mail className="h-3.5 w-3.5" />
 {t("prof.email")}
 </label>
 <input
 type="email"
 value={user?.email || ""}
 disabled
 className="w-full rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm text-text-subtle "
 />
 <p className="mt-1 text-xs text-text-subtle">
 {t("prof.emailFixed")}
 </p>
 </div>

 <div>
 <label className="mb-1 block text-sm font-medium text-text ">
 {t("prof.avatarUrl")}
 </label>
 <input
 type="url"
 value={avatarUrl}
 onChange={(e) => setAvatarUrl(e.target.value)}
 placeholder="https://example.com/avatar.jpg"
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary "
 />
 </div>

 <div>
 <label className="mb-1 flex items-center gap-1 text-sm font-medium text-text ">
 <FileText className="h-3.5 w-3.5" />
 {t("prof.bio")}
 </label>
 <textarea
 value={bio}
 onChange={(e) => setBio(e.target.value)}
 placeholder={t("prof.bioPlaceholder")}
 rows={3}
 className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary "
 />
 </div>

 <div className="flex items-center gap-3">
 <Button type="submit" disabled={saving}>
 <Save className="mr-1 h-4 w-4" />
 {saving ? t("prof.saving") : t("prof.save")}
 </Button>
 <Button type="button" variant="outline" onClick={handleCancel}>
 {t("prof.cancel")}
 </Button>
 {saved && (
 <span className="text-sm font-medium text-primary">
 {t("prof.updated")}
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
 <CardTitle className="text-base">{t("prof.account")}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 <div className="flex items-start gap-3">
 <User className="mt-0.5 h-4 w-4 text-text-subtle " />
 <div>
 <p className="text-xs font-medium text-text-subtle ">{t("prof.fullName")}</p>
 <p className="text-sm text-text ">{user?.full_name}</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <Mail className="mt-0.5 h-4 w-4 text-text-subtle " />
 <div>
 <p className="text-xs font-medium text-text-subtle ">{t("prof.email")}</p>
 <p className="break-all text-sm text-text">{user?.email}</p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <Shield className="mt-0.5 h-4 w-4 text-text-subtle " />
 <div>
 <p className="text-xs font-medium text-text-subtle ">{t("prof.role")}</p>
 <p className="text-sm capitalize text-text ">{user?.role}</p>
 </div>
 </div>
 {user?.bio && (
 <div className="flex items-start gap-3">
 <FileText className="mt-0.5 h-4 w-4 text-text-subtle " />
 <div>
 <p className="text-xs font-medium text-text-subtle ">{t("prof.bio")}</p>
 <p className="text-sm text-text ">{user.bio}</p>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 )}

 {/* Appearance */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Palette className="h-4 w-4" />
 {t("profile.theme")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <ThemeToggle />
 </CardContent>
 </Card>

 {/* Email Notifications */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Bell className="h-4 w-4" />
 {t("prof.emailNotifications")}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3">
 {emailEnabled === false && (
 <div className="mb-2 rounded-lg border border-warning bg-warning-soft p-3 text-xs text-warning-fg ">
 {t("prof.emailOff")}
 </div>
 )}
 {[
 { key: "assignments" as const, label: t("prof.nAssignments"), desc: t("prof.nAssignmentsDesc") },
 { key: "grades" as const, label: t("prof.nGrades"), desc: t("prof.nGradesDesc") },
 { key: "deadlines" as const, label: t("prof.nDeadlines"), desc: t("prof.nDeadlinesDesc") },
 { key: "courses" as const, label: t("prof.nCourses"), desc: t("prof.nCoursesDesc") },
 ].map((item) => (
 <label key={item.key} className="flex items-start gap-3 cursor-pointer">
 <input
 type="checkbox"
 checked={emailPrefs[item.key]}
 onChange={(e) => setEmailPrefs({ ...emailPrefs, [item.key]: e.target.checked })}
 className="mt-1 rounded border-border-strong text-primary focus:ring-primary"
 />
 <div>
 <p className="text-sm font-medium text-text ">{item.label}</p>
 <p className="text-xs text-text-subtle ">{item.desc}</p>
 </div>
 </label>
 ))}
 <Button onClick={handleSavePrefs} disabled={savingPrefs} className="mt-2">
 <Save className="mr-1 h-4 w-4" />
 {savingPrefs ? t("prof.saving") : t("prof.savePrefs")}
 </Button>
 </CardContent>
 </Card>

 {/* Change Password */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Key className="h-4 w-4" />
 {t("prof.changePassword")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleChangePassword} className="space-y-4">
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">
 {t("prof.currentPassword")}
 </label>
 <input
 type="password"
 value={currentPassword}
 onChange={(e) => setCurrentPassword(e.target.value)}
 required
 autoComplete="current-password"
 className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder-ink-300 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft "
 />
 </div>
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">
 {t("prof.newPassword")}
 </label>
 <input
 type="password"
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 required
 minLength={8}
 autoComplete="new-password"
 className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder-ink-300 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft "
 />
 <p className="mt-1 text-xs text-text-subtle ">
 {t("prof.pwHint")}
 </p>
 </div>
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted ">
 {t("prof.confirmPassword")}
 </label>
 <input
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 required
 minLength={8}
 autoComplete="new-password"
 className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder-ink-300 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary-soft "
 />
 </div>
 <Button type="submit" disabled={changingPassword}>
 <Key className="mr-1.5 h-4 w-4" />
 {changingPassword ? t("prof.changing") : t("prof.changePassword")}
 </Button>
 </form>
 </CardContent>
 </Card>

 {/* Privacy & Data */}
 <Card className="mb-6">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Shield className="h-4 w-4" />
 {t("prof.privacy")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <p className="mb-3 text-sm text-text-muted ">
 {t("prof.exportBody")}
 </p>
 <Button onClick={handleExportData} disabled={exportingData} variant="outline">
 <Download className="mr-1.5 h-4 w-4" />
 {exportingData ? t("prof.exporting") : t("prof.download")}
 </Button>
 </CardContent>
 </Card>

 {/* Danger Zone — account deletion */}
 <Card className="mb-6 border-danger">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base text-danger-fg">
 <AlertTriangle className="h-4 w-4" />
 {t("prof.deleteTitle")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 {!showDeleteConfirm ? (
 <>
 <p className="mb-3 text-sm text-text-muted">
 {t("prof.deleteBody")}
 </p>
 <Button
 variant="outline"
 onClick={() => setShowDeleteConfirm(true)}
 className="border-danger text-danger-fg hover:bg-danger-soft"
 >
 <Trash2 className="mr-1.5 h-4 w-4" />
 {t("prof.deleteButton")}
 </Button>
 </>
 ) : (
 <form onSubmit={handleDeleteAccount} className="space-y-4">
 <div className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
 {t("prof.deleteConfirmBody")}
 </div>
 <div>
 <label className="mb-1.5 block text-xs font-medium text-text-muted">
 {t("prof.password")}
 </label>
 <input
 type="password"
 value={deletePassword}
 onChange={(e) => setDeletePassword(e.target.value)}
 required
 autoComplete="current-password"
 className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-sm text-text placeholder-ink-300 focus:border-danger focus:outline-none focus:ring-2 focus:ring-danger-soft"
 />
 </div>
 <div className="flex items-center gap-3">
 <Button
 type="submit"
 disabled={deleting || !deletePassword}
 className="bg-danger text-ink-900 hover:bg-danger-fg"
 >
 <Trash2 className="mr-1.5 h-4 w-4" />
 {deleting ? t("prof.deleting") : t("prof.deleteForever")}
 </Button>
 <Button
 type="button"
 variant="outline"
 onClick={() => {
 setShowDeleteConfirm(false);
 setDeletePassword("");
 }}
 >
 {t("prof.cancel")}
 </Button>
 </div>
 </form>
 )}
 </CardContent>
 </Card>

 {/* Language selector */}
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-base">
 <Globe className="h-4 w-4" />
 {t("prof.language")}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-2 sm:grid-cols-4">
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
