"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import apiClient from "@/lib/api-client";

type Role = "teacher" | "admin" | "student" | "other";

interface WaitlistFormProps {
  source?: string;
}

/**
 * Public landing-page waitlist capture form.
 *
 * Posts to the rate-limited public `POST /api/v1/waitlist` endpoint.
 * The endpoint is idempotent and doesn't leak membership, so we always
 * show the same success state regardless of whether the email was new.
 */
export function WaitlistForm({ source = "landing" }: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("submitting");
    setErrorMsg("");
    try {
      await apiClient.post("/waitlist", {
        email: email.trim(),
        role,
        source,
      });
      setStatus("success");
    } catch (err) {
      const anyErr = err as { response?: { status?: number; data?: { detail?: string } } };
      if (anyErr?.response?.status === 429) {
        setErrorMsg("Too many attempts. Please try again later.");
      } else if (anyErr?.response?.data?.detail) {
        setErrorMsg(String(anyErr.response.data.detail));
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-green-200 bg-green-50/60 p-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden="true" />
        <p className="text-base font-semibold text-ink-900">
          You&apos;re on the list
        </p>
        <p className="text-sm text-ink-700">
          Thanks — we&apos;ll reach out as soon as early access opens.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex w-full max-w-md flex-col gap-3"
      aria-label="Join the waitlist"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="waitlist-email" className="sr-only">
          Email address
        </label>
        <input
          id="waitlist-email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@school.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
          disabled={status === "submitting"}
        />
        <Button type="submit" size="lg" disabled={status === "submitting"}>
          {status === "submitting" ? "Sending..." : "Join waitlist"}
          {status !== "submitting" && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-center">
        <label htmlFor="waitlist-role" className="text-xs text-ink-500">
          I am a
        </label>
        <select
          id="waitlist-role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-100"
          disabled={status === "submitting"}
        >
          <option value="teacher">Teacher</option>
          <option value="admin">School admin</option>
          <option value="student">Student</option>
          <option value="other">Other</option>
        </select>
      </div>

      {status === "error" && errorMsg && (
        <p role="alert" className="text-center text-sm text-coral-500">
          {errorMsg}
        </p>
      )}
      <p className="text-center text-xs text-ink-400">
        No spam. We&apos;ll only email when there&apos;s something to share.
      </p>
    </form>
  );
}
