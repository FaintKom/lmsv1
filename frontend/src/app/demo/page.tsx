"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Loader2, Play, Users } from "lucide-react";

import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth-store";

/**
 * /demo — public "try before you buy" landing.
 *
 * Offers a one-click path into the product as either a student or a
 * teacher, using pre-seeded demo accounts on the server. No signup.
 *
 * On click we call POST /auth/demo-login with the requested role, which
 * returns access + refresh tokens for the canonical demo account. We
 * store them via the existing auth store and redirect:
 *   student -> /dashboard
 *   teacher -> /admin
 *
 * Query param `role=student|teacher` is also accepted — so marketing
 * emails can deep-link directly into a demo without requiring a click.
 */
function DemoRunner() {
  const router = useRouter();
  const params = useSearchParams();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [loading, setLoading] = useState<"student" | "teacher" | null>(null);
  const [error, setError] = useState("");

  const enterDemo = async (role: "student" | "teacher") => {
    setError("");
    setLoading(role);
    try {
      const { data } = await apiClient.post("/auth/demo-login", { role });
      // Auth store's fetchUser() reads from localStorage via apiClient
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      await fetchUser();
      router.push(role === "teacher" ? "/admin" : "/dashboard");
    } catch (err) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } };
      if (e?.response?.status === 404) {
        setError("Demo mode is not enabled on this server.");
      } else {
        setError(e?.response?.data?.detail || "Could not start demo. Please try again.");
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-[#1E1E1E] dark:via-[#1E1E1E] dark:to-[#2C2C2C]">
      {/* Minimal header */}
      <header className="border-b border-ink-100 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-[#2C2C2C]/60">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-ink-900 dark:text-ink-100">GrassLMS</span>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Real sign in
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300">
          <Play className="h-3.5 w-3.5" />
          No signup required
        </div>
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-ink-900 dark:text-ink-100 md:text-5xl">
          Try GrassLMS in one click
        </h1>
        <p className="mx-auto mb-10 max-w-xl text-lg text-ink-500 dark:text-ink-400">
          Pick a role and we'll drop you straight into the product with a
          pre-built SAT Math course to explore. No account, no credit card,
          no email.
        </p>

        {error && (
          <div className="mx-auto mb-6 max-w-md rounded-xl border border-coral-300 bg-coral-50 p-4 text-sm text-coral-700 dark:border-coral-500/30 dark:bg-coral-500/10 dark:text-coral-300">
            {error}
          </div>
        )}

        <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2">
          {/* Student card */}
          <button
            type="button"
            onClick={() => enterDemo("student")}
            disabled={loading !== null}
            className="flex flex-col items-center gap-4 rounded-2xl border border-ink-200 bg-white p-8 text-left shadow-sm transition-all hover:border-green-400 hover:shadow-md disabled:opacity-50 dark:border-white/10 dark:bg-[#2C2C2C]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-500/20">
              <Users className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100">
              Try as a student
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Take an SAT Math lesson, write some code, see what the student
              experience looks like.
            </p>
            <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
              {loading === "student" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting demo...
                </>
              ) : (
                "Enter student demo →"
              )}
            </div>
          </button>

          {/* Teacher card */}
          <button
            type="button"
            onClick={() => enterDemo("teacher")}
            disabled={loading !== null}
            className="flex flex-col items-center gap-4 rounded-2xl border border-ink-200 bg-white p-8 text-left shadow-sm transition-all hover:border-green-400 hover:shadow-md disabled:opacity-50 dark:border-white/10 dark:bg-[#2C2C2C]"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-500/20">
              <GraduationCap className="h-7 w-7 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-ink-100">
              Try as a teacher
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              See the admin dashboard, build a course, try the gradebook and
              bulk enrollment.
            </p>
            <div className="mt-auto inline-flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-400">
              {loading === "teacher" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting demo...
                </>
              ) : (
                "Enter teacher demo →"
              )}
            </div>
          </button>
        </div>

        <p className="mx-auto mt-12 max-w-md text-xs text-ink-400 dark:text-ink-500">
          Demo accounts are shared — your changes are visible to other visitors
          and reset periodically. For private trials,{" "}
          <Link href="/register" className="text-green-600 hover:underline">
            create a free account
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
