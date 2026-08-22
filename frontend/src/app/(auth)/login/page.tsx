"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SchoolMark } from "@/components/layout/school-mark";
import { fetchPublicSchool, type SchoolBranding } from "@/lib/api/crm";
import { rememberSchool, schoolSlugFor } from "@/lib/brand/school";
import { useTranslation } from "@/lib/i18n/context";
import { LogIn } from "lucide-react";

export default function LoginPage() {
 const router = useRouter();
 const { t } = useTranslation();
 const login = useAuthStore((s) => s.login);
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [error, setError] = useState("");
 const [loading, setLoading] = useState(false);
 const [brand, setBrand] = useState<SchoolBranding | null>(null);
 const [slug, setSlug] = useState<string | null>(null);

 // The slug is read here rather than through useSearchParams, which would
 // demand a <Suspense> boundary at prerender and fail the build. It is a
 // client-only value anyway: half of it comes from localStorage.
 //
 // A slug nobody owns, a school that stopped paying, storage that is switched
 // off — all end the same way, with no branding and nothing said about which
 // it was.
 useEffect(() => {
 const found = schoolSlugFor(new URLSearchParams(window.location.search).get("s"));
 setSlug(found);
 if (!found) return;
 let cancelled = false;
 fetchPublicSchool(found)
 .then((school) => !cancelled && setBrand(school.branding))
 .catch(() => {});
 return () => {
 cancelled = true;
 };
 }, []);

 // The page already wears the school's name; the tab should agree. Next resets
 // document.title from the route's static metadata at hydration, and there is
 // no session here for BrandVars to put it back — so this has to run after
 // render, not inside the fetch callback. Setting it there raced hydration and
 // won only about half the time.
 useEffect(() => {
 const named = brand?.display_name;
 if (named) document.title = named;
 }, [brand]);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setLoading(true);

 try {
 await login(email, password);
 // Remembered only now, so the next visit to a bare /login already knows
 // whose logo to show. Not a credential and not a session — losing it
 // costs a neutral screen, nothing more.
 rememberSchool(slug);
 const role = useAuthStore.getState().user?.role;
 const isAdminOrTeacher = role === "super_admin" || role === "admin" || role === "teacher";
 router.push(isAdminOrTeacher ? "/admin" : "/dashboard");
 } catch (err: unknown) {
 const message =
 err instanceof Error ? err.message : t("auth.invalidEmailOrPassword");
 setError(message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div>
 <SchoolMark branding={brand} />
 <h1 className="mb-2 text-center text-2xl font-bold text-text ">
 {t("auth.welcome")}
 </h1>
 <p className="mb-8 text-center text-sm text-text-muted ">
 {t("auth.signInToContinue")}
 </p>

 <form onSubmit={handleSubmit} className="space-y-5">
 {error && (
 <div role="alert" aria-live="polite" className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
 {error}
 </div>
 )}
 <div>
 <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-text ">
 {t("auth.email")}
 </label>
 <Input
 id="login-email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="you@example.com"
 required
 aria-required="true"
 />
 </div>
 <div>
 <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-text ">
 {t("auth.password")}
 </label>
 <Input
 id="login-password"
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="Your password"
 required
 aria-required="true"
 />
 </div>
 <Button type="submit" className="w-full" disabled={loading}>
 <LogIn className="h-4 w-4" />
 {loading ? t("auth.signingIn") : t("auth.login")}
 </Button>
 </form>

 <div className="mt-3 text-center">
 <Link
 href="/forgot-password"
 className="text-sm text-text-muted hover:text-primary "
 >
 {t("auth.forgotPassword")}
 </Link>
 </div>

 <p className="mt-6 text-center text-sm text-text-muted ">
 {t("auth.noAccount")}{" "}
 <Link
 href="/register"
 className="font-medium text-primary hover:text-success-fg"
 >
 {t("auth.createOne")}
 </Link>
 </p>
 </div>
 );
}
