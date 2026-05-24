"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setLoading(true);

 try {
 await login(email, password);
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
 <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink-700 ">
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
 <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-ink-700 ">
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
