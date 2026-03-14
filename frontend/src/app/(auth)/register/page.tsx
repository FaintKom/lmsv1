"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, GraduationCap, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    org_name: "",
    full_name: "",
    email: "",
    password: "",
    role: "" as "teacher" | "student" | "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) {
      setError("Please select your role");
      return;
    }
    setError("");
    setLoading(true);

    try {
      await register(form);
      if (form.role === "student") {
        router.push("/dashboard");
      } else {
        router.push("/admin");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">
        Create your account
      </h1>
      <p className="mb-6 text-center text-sm text-slate-500">
        Start building your learning platform today
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Role Selector */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            I am a...
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => update("role", "teacher")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                form.role === "teacher"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <BookOpen className={cn(
                "h-6 w-6",
                form.role === "teacher" ? "text-indigo-600" : "text-slate-400"
              )} />
              <span className="text-sm font-semibold">Teacher</span>
              <span className="text-[11px] leading-tight text-center opacity-70">
                Create courses & manage students
              </span>
            </button>
            <button
              type="button"
              onClick={() => update("role", "student")}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all",
                form.role === "student"
                  ? "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50"
              )}
            >
              <GraduationCap className={cn(
                "h-6 w-6",
                form.role === "student" ? "text-indigo-600" : "text-slate-400"
              )} />
              <span className="text-sm font-semibold">Student</span>
              <span className="text-[11px] leading-tight text-center opacity-70">
                Learn & complete courses
              </span>
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            {form.role === "student" ? "School / Organization" : "School / Organization Name"}
          </label>
          <Input
            value={form.org_name}
            onChange={(e) => update("org_name", e.target.value)}
            placeholder={form.role === "student" ? "Your school name" : "My School"}
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Full Name
          </label>
          <Input
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            placeholder="John Doe"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Email
          </label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Password
          </label>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            placeholder="Min 8 characters"
            minLength={8}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || !form.role}>
          <UserPlus className="h-4 w-4" />
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
