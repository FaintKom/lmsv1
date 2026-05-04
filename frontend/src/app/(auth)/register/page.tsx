"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
 const register = useAuthStore((s) => s.register);
 const [form, setForm] = useState({
 org_name: "",
 org_id: "",
 full_name: "",
 email: "",
 password: "",
 role: "teacher" as "teacher" | "student",
 consent: false,
 });
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);
 const [inviteOrg, setInviteOrg] = useState<OrgOption | null>(null);

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
 setError("Student accounts require an invitation link");
 return;
 }
 if (form.role === "teacher" && !form.org_name.trim()) {
 setError("Please enter your organization name");
 return;
 }
 if (!form.consent) {
 setError("You must accept the Privacy Policy and Terms of Service");
 return;
 }
 setError("");
 setLoading(true);

 try {
 await register({ ...form, consent_accepted: form.consent });
 if (form.role === "student") {
 router.push("/dashboard");
 } else {
 router.push("/admin");
 }
 } catch (err: unknown) {
 const message =
 err instanceof Error ? err.message : "Registration failed";
 setError(message);
 } finally {
 setLoading(false);
 }
 };

 const update = (field: string, value: string) =>
 setForm((prev) => ({ ...prev, [field]: value }));

 return (
 <div>
 <h1 className="mb-2 text-center text-2xl font-bold text-text ">
 {inviteOrg ? `Join ${inviteOrg.name}` : "Create your account"}
 </h1>
 <p className="mb-6 text-center text-sm text-text-muted ">
 {inviteOrg
 ? "Create your student account to start learning"
 : "Set up your organization and start teaching"}
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
 You&apos;re joining <strong>{inviteOrg.name}</strong> as a student
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
 School / Organization Name
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
 Full Name
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
 Email
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
 Password
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
 I agree to the{" "}
 <Link href="/privacy" className="font-medium text-primary hover:text-success-fg">Privacy Policy</Link>
 {" "}and{" "}
 <Link href="/terms" className="font-medium text-primary hover:text-success-fg">Terms of Service</Link>
 </label>
 </div>

 <Button type="submit" className="w-full" disabled={loading}>
 <UserPlus className="h-4 w-4" />
 {loading ? "Creating account..." : "Create Account"}
 </Button>
 </form>

 <p className="mt-6 text-center text-sm text-text-muted ">
 Already have an account?{" "}
 <Link
 href="/login"
 className="font-medium text-primary hover:text-success-fg"
 >
 Sign in
 </Link>
 </p>
 </div>
 );
}
