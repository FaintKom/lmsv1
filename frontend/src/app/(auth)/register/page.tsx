"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";
import { UserPlus } from "lucide-react";
import apiClient from "@/lib/api-client";

interface OrgOption {
 id: string;
 name: string;
 slug: string;
}

export default function RegisterPage() {
 return (
 <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-pill border-2 border-primary border-t-transparent" /></div>}>
 <RegisterForm />
 </Suspense>
 );
}

function RegisterForm() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const { t } = useTranslation();
 const register = useAuthStore((s) => s.register);
 const [form, setForm] = useState({
 org_name: "",
 org_id: "",
 full_name: "",
 email: "",
 password: "",
 role: "teacher" as "teacher" | "student",
 consent: false,
 parentalConsent: false,
 date_of_birth: "",
 parent_email: "",
 });
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);
 const [inviteOrg, setInviteOrg] = useState<OrgOption | null>(null);
 // Age gate (GDPR Art. 8 / German digital-consent age, default 16). Mirrors the
 // backend settings.digital_consent_age. When the entered DOB makes the student
 // a minor we reveal a parent-email field and route through verifiable consent.
 const CONSENT_AGE = 16;
 // Set once the parent-consent email has been queued so we can show the
 // "awaiting parental consent" screen instead of redirecting into a session.
 const [pendingParentEmail, setPendingParentEmail] = useState<string | null>(null);

 const ageFromDob = (iso: string): number | null => {
 if (!iso) return null;
 const dob = new Date(iso);
 if (Number.isNaN(dob.getTime())) return null;
 const now = new Date();
 let age = now.getFullYear() - dob.getFullYear();
 const m = now.getMonth() - dob.getMonth();
 if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
 return age;
 };

 const enteredAge = ageFromDob(form.date_of_birth);
 const isMinor =
 form.role === "student" && enteredAge !== null && enteredAge < CONSENT_AGE;

 // Org search state (for invite links)
 const [orgSearch, setOrgSearch] = useState("");
 const [selectedOrgName, setSelectedOrgName] = useState("");

 // Handle invite link: ?org=<org_id>
 useEffect(() => {
 const orgParam = searchParams.get("org");
 if (orgParam) {
 // Fetch org name by ID
 apiClient
 .get("/auth/organizations", { params: { q: "" } })
 .then(({ data }) => {
 const found = data.find((o: OrgOption) => o.id === orgParam);
 if (found) {
 setInviteOrg(found);
 setForm((prev) => ({
 ...prev,
 role: "student",
 org_id: found.id,
 org_name: found.name,
 }));
 setSelectedOrgName(found.name);
 setOrgSearch(found.name);
 }
 })
 .catch(() => {});
 }
 }, [searchParams]);


 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (form.role === "student" && !form.org_id) {
 setError(t("auth.studentRequiresInvite"));
 return;
 }
 if (form.role === "teacher" && !form.org_name.trim()) {
 setError(t("auth.pleaseEnterOrg"));
 return;
 }
 if (!form.consent) {
 setError(t("consent.required"));
 return;
 }
 // Minors route through verifiable parental consent: require a parent email
 // and skip the self-attestation checkbox requirement (the parent confirms
 // by email instead). Adult/unknown-age students keep the checkbox path.
 if (isMinor && !form.parent_email.trim()) {
 setError(t("consent.parentEmailRequired"));
 return;
 }
 if (form.role === "student" && !isMinor && !form.parentalConsent) {
 setError(t("consent.parentalRequired"));
 return;
 }
 setError("");
 setLoading(true);

 try {
 const result = await register({
 ...form,
 consent_accepted: form.consent,
 parental_consent_accepted: form.parentalConsent,
 date_of_birth: form.date_of_birth || undefined,
 parent_email: isMinor ? form.parent_email : undefined,
 });
 // Minor account is consent-pending: no session was issued. Show the
 // "awaiting parental consent" screen instead of redirecting.
 if (result?.parental_consent_pending) {
 setPendingParentEmail(result.parent_email || form.parent_email);
 return;
 }
 if (form.role === "student") {
 router.push("/dashboard");
 } else {
 router.push("/admin");
 }
 } catch (err: unknown) {
 const message =
 err instanceof Error ? err.message : t("auth.registrationFailed");
 setError(message);
 } finally {
 setLoading(false);
 }
 };

 const update = (field: string, value: string) =>
 setForm((prev) => ({ ...prev, [field]: value }));

 // Awaiting-parental-consent screen: shown after a minor signs up. The account
 // exists but is inactive until the parent clicks the emailed link.
 if (pendingParentEmail) {
 return (
 <div className="text-center">
 <h1 className="mb-3 text-2xl font-bold text-text">
 {t("consent.pendingTitle")}
 </h1>
 <p className="mb-4 text-sm text-text-muted">
 {t("consent.pendingBody")}{" "}
 <strong className="text-text">{pendingParentEmail}</strong>
 </p>
 <p className="mb-6 text-sm text-text-muted">
 {t("consent.pendingHint")}
 </p>
 <Link
 href="/login"
 className="font-medium text-primary hover:text-success-fg"
 >
 {t("auth.signInLink")}
 </Link>
 </div>
 );
 }

 return (
 <div>
 <h1 className="mb-2 text-center text-2xl font-bold text-text ">
 {inviteOrg ? `${t("auth.joinPrefix")} ${inviteOrg.name}` : t("auth.signUp")}
 </h1>
 <p className="mb-6 text-center text-sm text-text-muted ">
 {inviteOrg
 ? t("auth.studentCreateAccount")
 : t("auth.teacherCreateAccount")}
 </p>

 <form onSubmit={handleSubmit} className="space-y-5">
 {error && (
 <div role="alert" aria-live="polite" className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
 {error}
 </div>
 )}

 {/* Invite banner */}
 {inviteOrg && (
 <div className="rounded-lg border border-primary-soft bg-success-soft px-4 py-3 text-sm text-success-fg ">
 {t("auth.joiningAsPrefix")} <strong>{inviteOrg.name}</strong> {t("auth.joiningAsSuffix")}
 </div>
 )}

 {/* Role — auto-set to teacher for public registration, student only via invite */}
 {!inviteOrg && (
 <input type="hidden" value="teacher" />
 )}

 {/* Organization name — for teacher registration only, hidden if invited student */}
 {!inviteOrg && form.role === "teacher" && (
 <div>
 <label htmlFor="reg-org" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 {t("auth.schoolOrgName")}
 </label>
 <Input
 id="reg-org"
 value={form.org_name}
 onChange={(e) => update("org_name", e.target.value)}
 placeholder="My School"
 required
 />
 </div>
 )}

 <div>
 <label htmlFor="reg-fullname" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 {t("auth.fullName")}
 </label>
 <Input
 id="reg-fullname"
 value={form.full_name}
 onChange={(e) => update("full_name", e.target.value)}
 placeholder="John Doe"
 required
 aria-required="true"
 />
 </div>
 <div>
 <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 {t("auth.email")}
 </label>
 <Input
 id="reg-email"
 type="email"
 value={form.email}
 onChange={(e) => update("email", e.target.value)}
 placeholder="you@example.com"
 required
 aria-required="true"
 />
 </div>
 <div>
 <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 {t("auth.password")}
 </label>
 <Input
 id="reg-password"
 type="password"
 value={form.password}
 onChange={(e) => update("password", e.target.value)}
 placeholder="Min 8 characters"
 minLength={8}
 required
 aria-required="true"
 />
 </div>
 <div className="flex items-start gap-2">
 <input
 id="reg-consent"
 type="checkbox"
 checked={form.consent}
 onChange={(e) => setForm((prev) => ({ ...prev, consent: e.target.checked }))}
 className="mt-1 rounded border-ink-300 text-primary focus:ring-green-500"
 />
 <label htmlFor="reg-consent" className="text-sm text-text-muted ">
 {t("auth.iAgreeTo")}{" "}
 <Link href="/privacy" className="font-medium text-primary hover:text-success-fg">{t("consent.privacy")}</Link>
 {" "}{t("auth.andLower")}{" "}
 <Link href="/terms" className="font-medium text-primary hover:text-success-fg">{t("consent.terms")}</Link>
 </label>
 </div>

 {form.role === "student" && (
 <div>
 <label htmlFor="reg-dob" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 {t("auth.dateOfBirth")}
 </label>
 <Input
 id="reg-dob"
 type="date"
 value={form.date_of_birth}
 onChange={(e) => update("date_of_birth", e.target.value)}
 max={new Date().toISOString().split("T")[0]}
 />
 <p className="mt-1 text-xs text-text-muted">
 {t("auth.dateOfBirthHelp")}
 </p>
 </div>
 )}

 {/* Minor: collect a parent/guardian email for verifiable consent. */}
 {isMinor && (
 <div className="rounded-lg border border-primary-soft bg-primary-soft/40 p-4">
 <p className="mb-3 text-sm text-text-muted">
 {t("consent.minorNotice")}
 </p>
 <label htmlFor="reg-parent-email" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 {t("auth.parentEmail")}
 </label>
 <Input
 id="reg-parent-email"
 type="email"
 value={form.parent_email}
 onChange={(e) => update("parent_email", e.target.value)}
 placeholder="parent@example.com"
 required
 aria-required="true"
 />
 </div>
 )}

 {/* Self-attestation checkbox only for adult/unknown-age students;
 minors are consented by their parent via the email link instead. */}
 {form.role === "student" && !isMinor && (
 <div className="flex items-start gap-2">
 <input
 id="reg-parental-consent"
 type="checkbox"
 checked={form.parentalConsent}
 onChange={(e) => setForm((prev) => ({ ...prev, parentalConsent: e.target.checked }))}
 className="mt-1 rounded border-ink-300 text-primary focus:ring-green-500"
 />
 <label htmlFor="reg-parental-consent" className="text-sm text-text-muted ">
 {t("consent.parentalConfirm")}
 </label>
 </div>
 )}

 <Button type="submit" className="w-full" disabled={loading}>
 <UserPlus className="h-4 w-4" />
 {loading ? t("auth.creatingAccount") : t("auth.register")}
 </Button>
 </form>

 <p className="mt-6 text-center text-sm text-text-muted ">
 {t("auth.hasAccount")}{" "}
 <Link
 href="/login"
 className="font-medium text-primary hover:text-success-fg"
 >
 {t("auth.signInLink")}
 </Link>
 </p>
 </div>
 );
}
