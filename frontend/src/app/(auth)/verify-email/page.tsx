"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { CheckCircle, MailCheck, XCircle } from "lucide-react";

type Status = "loading" | "success" | "error";

function VerifyEmailFlow() {
 const searchParams = useSearchParams();
 const { t } = useTranslation();
 const token = searchParams.get("token") || "";
 const [status, setStatus] = useState<Status>("loading");
 const [message, setMessage] = useState("");

 useEffect(() => {
 if (!token) {
 setStatus("error");
 setMessage(t("auth.missingVerifyToken"));
 return;
 }
 apiClient
 .post("/auth/verify-email", { token })
 .then(() => {
 setStatus("success");
 setMessage(t("auth.verifySuccess"));
 })
 .catch((err) => {
 setStatus("error");
 setMessage(
 err?.response?.data?.detail ||
 t("auth.verifyFailed")
 );
 });
 }, [token, t]);

 return (
 <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 ">
 <div className="w-full max-w-md rounded-lg bg-paper-2 p-8 shadow-sm ">
 <div className="mb-6 flex justify-center">
 {status === "loading" && (
 <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft ">
 <MailCheck className="h-7 w-7 text-primary " />
 </div>
 )}
 {status === "success" && (
 <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary-soft ">
 <CheckCircle className="h-7 w-7 text-primary " />
 </div>
 )}
 {status === "error" && (
 <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-danger-soft ">
 <XCircle className="h-7 w-7 text-danger-fg " />
 </div>
 )}
 </div>
 <h1 className="mb-2 text-center text-xl font-bold text-text ">
 {status === "loading" && t("verifyEmail.verifying")}
 {status === "success" && t("verifyEmail.success")}
 {status === "error" && t("verifyEmail.error")}
 </h1>
 <p className="mb-6 text-center text-sm text-text-muted ">
 {message || t("auth.pleaseWaitConfirm")}
 </p>
 {status !== "loading" && (
 <Link href="/login">
 <Button className="w-full">
 {status === "success" ? t("verifyEmail.signIn") : t("verifyEmail.backToSignIn")}
 </Button>
 </Link>
 )}
 </div>
 </div>
 );
}

export default function VerifyEmailPage() {
 return (
 <Suspense fallback={null}>
 <VerifyEmailFlow />
 </Suspense>
 );
}
