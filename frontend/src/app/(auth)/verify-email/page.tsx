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
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 dark:bg-[#1E1E1E]">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm dark:bg-[#2C2C2C]">
        <div className="mb-6 flex justify-center">
          {status === "loading" && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-500/20">
              <MailCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          )}
          {status === "success" && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-500/20">
              <CheckCircle className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
          )}
          {status === "error" && (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-coral-50 dark:bg-coral-500/20">
              <XCircle className="h-7 w-7 text-coral-500 dark:text-coral-300" />
            </div>
          )}
        </div>
        <h1 className="mb-2 text-center text-xl font-bold text-ink-900 dark:text-ink-100">
          {status === "loading" && "Verifying your email..."}
          {status === "success" && "Email verified"}
          {status === "error" && "Verification failed"}
        </h1>
        <p className="mb-6 text-center text-sm text-ink-700 dark:text-ink-400">
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
