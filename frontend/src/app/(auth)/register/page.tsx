"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, GraduationCap, BookOpen, Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";

interface OrgOption {
  id: string;
  name: string;
  slug: string;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    org_name: "",
    org_id: "",
    full_name: "",
    email: "",
    password: "",
    role: "" as "teacher" | "student" | "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteOrg, setInviteOrg] = useState<OrgOption | null>(null);

  // Org search state
  const [orgSearch, setOrgSearch] = useState("");
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [selectedOrgName, setSelectedOrgName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle invite link: ?org=<org_id>
  useEffect(() => {
    const orgParam = searchParams.get("org");
    if (orgParam) {
      // Fetch org name by ID
      apiClient
        .get("/auth/organizations", { params: { q: "" } })
        .then(({ data }) => {
          const found = data.find((o: OrgOption) => o.id === orgParam);
          if (found) {
            setInviteOrg(found);
            setForm((prev) => ({
              ...prev,
              role: "student",
              org_id: found.id,
              org_name: found.name,
            }));
            setSelectedOrgName(found.name);
            setOrgSearch(found.name);
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);

  // Search organizations when typing
  useEffect(() => {
    if (form.role !== "student") return;
    const timer = setTimeout(() => {
      apiClient
        .get("/auth/organizations", { params: { q: orgSearch } })
        .then(({ data }) => setOrgs(data))
        .catch(() => setOrgs([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [orgSearch, form.role]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOrgDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) {
      setError("Please select your role");
      return;
    }
    if (form.role === "student" && !form.org_id) {
      setError("Please select your school/organization");
      return;
    }
    if (form.role === "teacher" && !form.org_name.trim()) {
      setError("Please enter your organization name");
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

  const selectOrg = (org: OrgOption) => {
    setForm((prev) => ({ ...prev, org_id: org.id, org_name: org.name }));
    setSelectedOrgName(org.name);
    setOrgSearch(org.name);
    setShowOrgDropdown(false);
  };

  return (
    <div>
      <h1 className="mb-2 text-center text-2xl font-bold text-slate-900">
        {inviteOrg ? `Join ${inviteOrg.name}` : "Create your account"}
      </h1>
      <p className="mb-6 text-center text-sm text-slate-500">
        {inviteOrg
          ? "Create your student account to start learning"
          : "Start building your learning platform today"}
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Invite banner */}
        {inviteOrg && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
            You&apos;re joining <strong>{inviteOrg.name}</strong> as a student
          </div>
        )}

        {/* Role Selector — hidden if invited */}
        {!inviteOrg && (<div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            I am a...
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                update("role", "teacher");
                setForm((prev) => ({ ...prev, role: "teacher", org_id: "", org_name: "" }));
                setSelectedOrgName("");
                setOrgSearch("");
              }}
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
              onClick={() => {
                update("role", "student");
                setForm((prev) => ({ ...prev, role: "student", org_id: "", org_name: "" }));
                setSelectedOrgName("");
                setOrgSearch("");
              }}
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
        </div>)}

        {/* Organization field — different for teacher vs student, hidden if invited */}
        {form.role && !inviteOrg && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              {form.role === "student" ? "Find your school" : "School / Organization Name"}
            </label>
            {form.role === "student" ? (
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={orgSearch}
                    onChange={(e) => {
                      setOrgSearch(e.target.value);
                      setShowOrgDropdown(true);
                      if (selectedOrgName && e.target.value !== selectedOrgName) {
                        setSelectedOrgName("");
                        setForm((prev) => ({ ...prev, org_id: "" }));
                      }
                    }}
                    onFocus={() => setShowOrgDropdown(true)}
                    placeholder="Search for your school..."
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-8 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
                {showOrgDropdown && (
                  <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {orgs.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-400">
                        {orgSearch ? "No organizations found" : "Start typing to search..."}
                      </div>
                    ) : (
                      orgs.map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => selectOrg(org)}
                          className={cn(
                            "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-indigo-50",
                            form.org_id === org.id
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-slate-700"
                          )}
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                            {org.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="block">{org.name}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
                {selectedOrgName && (
                  <p className="mt-1 text-xs text-emerald-600">
                    Joining: {selectedOrgName}
                  </p>
                )}
              </div>
            ) : (
              <Input
                value={form.org_name}
                onChange={(e) => update("org_name", e.target.value)}
                placeholder="My School"
                required
              />
            )}
          </div>
        )}

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
