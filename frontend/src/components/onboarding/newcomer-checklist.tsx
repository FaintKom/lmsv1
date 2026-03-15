"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, Sparkles } from "lucide-react";

const STORAGE_KEY = "onboarding-dismissed";

export interface NewcomerChecklistProps {
  hasProfile: boolean;
  hasBrowsed: boolean;
  hasEnrollment: boolean;
  hasCompletedLesson: boolean;
}

interface ChecklistItem {
  label: string;
  href: string;
  done: boolean;
}

export function NewcomerChecklist({
  hasProfile,
  hasBrowsed,
  hasEnrollment,
  hasCompletedLesson,
}: NewcomerChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  const items: ChecklistItem[] = [
    { label: "Complete your profile", href: "/profile", done: hasProfile },
    { label: "Browse available courses", href: "/courses", done: hasBrowsed },
    { label: "Enroll in your first course", href: "/courses", done: hasEnrollment },
    { label: "Complete your first lesson", href: "/courses", done: hasCompletedLesson },
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const pct = Math.round((doneCount / items.length) * 100);

  if (dismissed || allDone) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "true");
    setDismissed(true);
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-200/60 dark:border-white/10 border-l-4 border-l-indigo-500 bg-white dark:bg-[#2C2C2C] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Getting Started
          </h3>
          <span className="rounded-full bg-indigo-50 dark:bg-indigo-500/20 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {doneCount}/{items.length}
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-600"
          aria-label="Dismiss checklist"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mx-5 mb-4 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Checklist items */}
      <div className="space-y-1 px-5 pb-5">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
          >
            {item.done ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
            ) : (
              <Circle className="h-5 w-5 flex-shrink-0 text-slate-300" />
            )}
            <span
              className={
                item.done
                  ? "text-sm text-slate-400 dark:text-slate-500 line-through"
                  : "text-sm font-medium text-slate-700 dark:text-slate-300"
              }
            >
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
