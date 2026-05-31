"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { CheckCircle, ShieldCheck, XCircle } from "lucide-react";

type Status = "idle" | "submitting" | "success" | "error";

function ParentalConsentFlow() {
 const searchParams = useSearchParams();
 const { t } = useTranslation();
 const token = searchParams.get("token") || "";
 const [status, setStatus] = useState<Status>("idle");
 const [message, setMessage] = useState("");

 const confirm = async () => {
 if (!token) {
 setStatus("error");
 setMessage(t("parentalConsent.missingToken"));
 return;
 }
 setStatus("submitting");
 try {
 await apiClient.post("/auth/parental-consent/confirm", { token });
 setStatus("success");
 setMessage(t("parentalConsent.successBody"));
 } catch (err: unknown) {
 setStatus("error");
 const detail =
 (err as { response?: { data?: { detail?: string } } })?.response?.data
 ?.detail;
 setMessage(detail || t("parentalConsent.errorBody"));
 }
 };

 return (
 <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4">
 <div className="w-full max-w-md rounded-lg bg-paper-2 p-8 shadow-sm">
 <div className="mb-6 flex justify-center">
 {(status === "idle" || status === "submitting") && (
 <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft">
 <ShieldCheck className="h-7 w-7 text-primary" />
 </div>
 )}
 {status === "success" && (
 <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft">
 <CheckCircle className="h-7 w-7 text-primary" />
 </div>
 )}
 {status === "error" && (
 <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-danger-soft">
 <XCircle className="h-7 w-7 text-danger-fg" />
 </div>
 )}
 </div>
 <h1 className="mb-2 text-center text-xl font-bold text-text">
 {status === "success"
 ? t("parentalConsent.successTitle")
 : status === "error"
 ? t("parentalConsent.errorTitle")
 : t("parentalConsent.title")}
 </h1>
 <p className="mb-6 text-center text-sm text-text-muted">
 {message ||
 (status === "idle"
 ? t("parentalConsent.intro")
 : t("parentalConsent.submitting"))}
 </p>

 {status === "idle" && (
 <Button className="w-full" onClick={confirm} disabled={!token}>
 {t("parentalConsent.grantButton")}
 </Button>
 )}
 {status === "submitting" && (
 <Button className="w-full" disabled>
 {t("parentalConsent.submitting")}
 </Button>
 )}
 {(status === "success" || status === "error") && (
 <Link href="/login">
 <Button className="w-full">
 {t("parentalConsent.backToSignIn")}
 </Button>
 </Link>
 )}
 </div>
 </div>
 );
}

export default function ParentalConsentPage() {
 return (
 <Suspense fallback={null}>
 <ParentalConsentFlow />
 </Suspense>
 );
}
