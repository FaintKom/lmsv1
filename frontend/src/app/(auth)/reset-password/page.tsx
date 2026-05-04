"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";

function ResetPasswordForm() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const token = searchParams.get("token") || "";
 const [password, setPassword] = useState("");
 const [confirmPassword, setConfirmPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState("");
 const [success, setSuccess] = useState(false);

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 setError("");

 if (password !== confirmPassword) {
 setError("Passwords do not match");
 return;
 }
 if (password.length < 6) {
 setError("Password must be at least 6 characters");
 return;
 }

 setLoading(true);
 try {
 await apiClient.post("/auth/reset-password", {
 token,
 new_password: password,
 });
 setSuccess(true);
 setTimeout(() => router.push("/login"), 3000);
 } catch (err: unknown) {
 const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to reset password";
 setError(msg);
 } finally {
 setLoading(false);
 }
 };

 if (!token) {
 return (
 <div className="text-center">
 <h1 className="mb-2 text-xl font-bold text-text ">Invalid link</h1>
 <p className="mb-6 text-sm text-text-muted ">
 This password reset link is invalid or has expired.
 </p>
 <Link
 href="/forgot-password"
 className="text-sm font-medium text-primary hover:text-success-fg"
 >
 Request a new reset link
 </Link>
 </div>
 );
 }

 if (success) {
 return (
 <div className="text-center">
 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-primary-soft ">
 <CheckCircle className="h-6 w-6 text-primary " />
 </div>
 <h1 className="mb-2 text-xl font-bold text-text ">Password updated!</h1>
 <p className="mb-6 text-sm text-text-muted ">
 Your password has been reset. Redirecting to sign in...
 </p>
 </div>
 );
 }

 return (
 <div>
 <h1 className="mb-2 text-center text-2xl font-bold text-text ">
 Reset password
 </h1>
 <p className="mb-8 text-center text-sm text-text-muted ">
 Enter your new password
 </p>

 <form onSubmit={handleSubmit} className="space-y-5">
 {error && (
 <div className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
 {error}
 </div>
 )}
 <div>
 <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 New Password
 </label>
 <Input
 id="new-password"
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder="At least 6 characters"
 required
 />
 </div>
 <div>
 <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 Confirm Password
 </label>
 <Input
 id="confirm-password"
 type="password"
 value={confirmPassword}
 onChange={(e) => setConfirmPassword(e.target.value)}
 placeholder="Repeat your password"
 required
 />
 </div>
 <Button type="submit" className="w-full" disabled={loading}>
 <KeyRound className="h-4 w-4" />
 {loading ? "Resetting..." : "Reset Password"}
 </Button>
 </form>

 <p className="mt-6 text-center">
 <Link
 href="/login"
 className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-primary "
 >
 <ArrowLeft className="h-3 w-3" /> Back to sign in
 </Link>
 </p>
 </div>
 );
}

export default function ResetPasswordPage() {
 return (
 <Suspense fallback={<div className="flex h-32 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-pill border-2 border-primary border-t-transparent" /></div>}>
 <ResetPasswordForm />
 </Suspense>
 );
}
