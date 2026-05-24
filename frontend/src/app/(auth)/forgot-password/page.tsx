"use client";

import { useState } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/lib/i18n/context";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
 const { t } = useTranslation();
 const [email, setEmail] = useState("");
 const [loading, setLoading] = useState(false);
 const [sent, setSent] = useState(false);
 const [error, setError] = useState("");

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");
 setLoading(true);
 try {
 await apiClient.post("/auth/forgot-password", { email });
 setSent(true);
 } catch {
 setError(t("auth.somethingWentWrong"));
 } finally {
 setLoading(false);
 }
 };

 if (sent) {
 return (
 <div className="text-center">
 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-primary-soft ">
 <CheckCircle className="h-6 w-6 text-primary " />
 </div>
 <h1 className="mb-2 text-xl font-bold text-text ">{t("auth.checkYourEmail")}</h1>
 <p className="mb-6 text-sm text-text-muted ">
 {`${t("auth.resetEmailSentPrefix")} ${email}${t("auth.resetEmailSentSuffix")}`}
 </p>
 <Link
 href="/login"
 className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-success-fg"
 >
 <ArrowLeft className="h-3 w-3" /> {t("auth.backToSignIn")}
 </Link>
 </div>
 );
 }

 return (
 <div>
 <h1 className="mb-2 text-center text-2xl font-bold text-text ">
 {t("auth.forgotPasswordTitle")}
 </h1>
 <p className="mb-8 text-center text-sm text-text-muted ">
 {t("auth.forgotPasswordSub")}
 </p>

 <form onSubmit={handleSubmit} className="space-y-5">
 {error && (
 <div className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
 {error}
 </div>
 )}
 <div>
 <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 {t("auth.email")}
 </label>
 <Input
 id="reset-email"
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="you@example.com"
 required
 />
 </div>
 <Button type="submit" className="w-full" disabled={loading}>
 <Mail className="h-4 w-4" />
 {loading ? t("auth.sending") : t("auth.sendResetLink")}
 </Button>
 </form>

 <p className="mt-6 text-center">
 <Link
 href="/login"
 className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary "
 >
 <ArrowLeft className="h-3 w-3" /> {t("auth.backToSignIn")}
 </Link>
 </p>
 </div>
 );
}
