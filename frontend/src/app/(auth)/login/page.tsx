"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LogIn } from "lucide-react";

export default function LoginPage() {
 const router = useRouter();
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
 err instanceof Error ? err.message : "Invalid email or password";
 setError(message);
 } finally {
 setLoading(false);
 }
 };

 return (
 <div>
 <h1 className="mb-2 text-center text-2xl font-bold text-text ">
 Welcome back
 </h1>
 <p className="mb-8 text-center text-sm text-text-muted ">
 Sign in to your account to continue
 </p>

 <form onSubmit={handleSubmit} className="space-y-5">
 {error && (
 <div role="alert" aria-live="polite" className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm text-danger-fg">
 {error}
 </div>
 )}
 <div>
 <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-ink-700 ">
 Email
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
 Password
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
 {loading ? "Signing in..." : "Sign In"}
 </Button>
 </form>

 <div className="mt-3 text-center">
 <Link
 href="/forgot-password"
 className="text-sm text-text-muted hover:text-primary "
 >
 Forgot your password?
 </Link>
 </div>

 <p className="mt-6 text-center text-sm text-text-muted ">
 Don&apos;t have an account?{" "}
 <Link
 href="/register"
 className="font-medium text-primary hover:text-success-fg"
 >
 Create one
 </Link>
 </p>
 </div>
 );
}
