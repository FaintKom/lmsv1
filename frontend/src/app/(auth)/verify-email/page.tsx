"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { CheckCircle, MailCheck, XCircle } from "lucide-react";

type Status = "loading" | "success" | "error";

function VerifyEmailFlow() {
 const searchParams = useSearchParams();
 const token = searchParams.get("token") || "";
 const [status, setStatus] = useState<Status>("loading");
 const [message, setMessage] = useState("");

 useEffect(() => {
 if (!token) {
 setStatus("error");
 setMessage("Missing verification token. Use the link from your email.");
 return;
 }
 apiClient
 .post("/auth/verify-email", { token })
 .then(() => {
 setStatus("success");
 setMessage("Your email has been verified. You can now sign in.");
 })
 .catch((err) => {
 setStatus("error");
 setMessage(
 err?.response?.data?.detail ||
 "Verification failed. The link may have expired or already been used."
 );
 });
 }, [token]);

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
 {status === "loading" && "Verifying your email..."}
 {status === "success" && "Email verified"}
 {status === "error" && "Verification failed"}
 </h1>
 <p className="mb-6 text-center text-sm text-text-muted ">
 {message || "Please wait while we confirm your address."}
 </p>
 {status !== "loading" && (
 <Link href="/login">
 <Button className="w-full">
 {status === "success" ? "Sign in" : "Back to sign in"}
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
