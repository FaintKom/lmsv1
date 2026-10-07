"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import apiClient from "@/lib/api-client";
import { buttonClass } from "@/components/ui/button";
import LocaleSwitcher from "@/components/layout/locale-switcher";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/lib/i18n/context";

/**
 * /demo — public "try before you buy" landing.
 *
 * Offers a one-click path into the product as either a student or a
 * teacher, using pre-seeded demo accounts on the server. No signup.
 *
 * On click we call POST /auth/demo-login with the requested role, which
 * returns access + refresh tokens for the canonical demo account. We
 * store them via the existing auth store and redirect:
 * student -> /dashboard
 * teacher -> /admin
 *
 * Query param `role=student|teacher` is also accepted — so marketing
 * emails can deep-link directly into a demo without requiring a click.
 */
function DemoRunner() {
 const { t } = useTranslation();
 const router = useRouter();
 const params = useSearchParams();
 const fetchUser = useAuthStore((s) => s.fetchUser);
 const [loading, setLoading] = useState<"student" | "teacher" | null>(null);
 const [error, setError] = useState("");

 const enterDemo = async (role: "student" | "teacher") => {
 setError("");
 setLoading(role);
 try {
 // Session arrives as httpOnly cookies set by the server.
 await apiClient.post("/auth/demo-login", { role });
 await fetchUser();
 router.push(role === "teacher" ? "/admin" : "/dashboard");
 } catch (err) {
 const e = err as { response?: { status?: number; data?: { detail?: string } } };
 if (e?.response?.status === 404) {
 setError(t("demo.errorNotEnabled"));
 } else {
 setError(e?.response?.data?.detail || t("demo.errorGeneric"));
 }
 } finally {
 setLoading(null);
 }
 };

 // Auto-enter if ?role= is in the URL
 useEffect(() => {
 const r = params.get("role");
 if (r === "student" || r === "teacher") {
 enterDemo(r);
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 return (
 <div className="min-h-screen bg-bg">
 {/* Minimal header */}
 <header className="border-b border-border bg-surface">
 <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
 <Link href="/" className="flex items-center gap-2.5">
 <div className="relative flex h-9 w-9 items-center justify-center rounded-sm bg-primary text-lg font-extrabold text-primary-fg">
 g
 <span className="absolute bottom-[4px] right-[5px] h-[5px] w-[5px] rounded-full bg-sun-400" />
 </div>
 <span className="text-xl font-bold text-text ">GrassLMS</span>
 </Link>
 <div className="flex items-center gap-2">
 <LocaleSwitcher />
 <Link href="/login" className={buttonClass({ variant: "ghost", size: "sm" })}>
 {t("demo.signIn")}
 </Link>
 </div>
 </div>
 </header>

 <main className="mx-auto max-w-3xl px-6 py-16 text-center">
 <p className="mb-4 text-sm font-medium text-text-subtle">{t("demo.noSignup")}</p>
 <h1 className="mb-4 text-4xl font-bold text-text md:text-5xl">
 {t("demo.title")}
 </h1>
 <p className="mx-auto mb-10 max-w-xl text-lg text-text-muted ">
 {t("demo.subtitle")}
 </p>

 {error && (
 <div className="mx-auto mb-6 max-w-md rounded-lg border border-danger bg-danger-soft p-4 text-sm text-danger-fg ">
 {error}
 </div>
 )}

 <div className="mx-auto grid max-w-2xl gap-5 text-left md:grid-cols-2">
 {/* Student card */}
 <button
 type="button"
 onClick={() => enterDemo("student")}
 disabled={loading !== null}
 className="flex flex-col items-start gap-3 rounded-lg bg-subject-lang p-7 text-left text-subject-ink transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-safe:hover:-translate-y-0.5 disabled:opacity-50"
 >
 <h2 className="text-2xl font-bold">
 {t("demo.studentTitle")}
 </h2>
 <p className="text-sm opacity-80">
 {t("demo.studentDesc")}
 </p>
 <div className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold underline underline-offset-4">
 {loading === "student" ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 {t("demo.starting")}
 </>
 ) : (
 t("demo.enterStudent")
 )}
 </div>
 </button>

 {/* Teacher card */}
 <button
 type="button"
 onClick={() => enterDemo("teacher")}
 disabled={loading !== null}
 className="flex flex-col items-start gap-3 rounded-lg bg-subject-code p-7 text-left text-subject-ink transition-transform duration-[var(--motion-fast)] ease-[var(--motion-ease)] motion-safe:hover:-translate-y-0.5 disabled:opacity-50"
 >
 <h2 className="text-2xl font-bold">
 {t("demo.teacherTitle")}
 </h2>
 <p className="text-sm opacity-80">
 {t("demo.teacherDesc")}
 </p>
 <div className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold underline underline-offset-4">
 {loading === "teacher" ? (
 <>
 <Loader2 className="h-4 w-4 animate-spin" />
 {t("demo.starting")}
 </>
 ) : (
 t("demo.enterTeacher")
 )}
 </div>
 </button>
 </div>

 <p className="mx-auto mt-12 max-w-md text-xs text-text-subtle ">
 {t("demo.sharedHint")}{" "}
 <Link href="/register" className="text-primary hover:underline">
 {t("demo.createFreeAccount")}
 </Link>
 .
 </p>
 </main>
 </div>
 );
}

export default function DemoPage() {
 return (
 <Suspense fallback={null}>
 <DemoRunner />
 </Suspense>
 );
}
