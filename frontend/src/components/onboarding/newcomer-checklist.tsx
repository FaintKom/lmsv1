"use client";

import { ProgressBar } from "@/components/ui/progress-bar";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

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
 const { t } = useTranslation();
 const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

 useEffect(() => {
 try {
 setDismissed(localStorage.getItem(STORAGE_KEY) === "true");
 } catch {
 setDismissed(false); // storage blocked: show it, just cannot remember the dismissal
 }
 }, []);

 const items: ChecklistItem[] = [
 { label: t("onboarding.profile"), href: "/profile", done: hasProfile },
 { label: t("onboarding.browse"), href: "/courses", done: hasBrowsed },
 { label: t("onboarding.enroll"), href: "/courses", done: hasEnrollment },
 { label: t("onboarding.lesson"), href: "/courses", done: hasCompletedLesson },
 ];

 const doneCount = items.filter((i) => i.done).length;
 const allDone = doneCount === items.length;
 const pct = Math.round((doneCount / items.length) * 100);

 if (dismissed || allDone) return null;

 function handleDismiss() {
 try {
 localStorage.setItem(STORAGE_KEY, "true");
 } catch {
 /* private mode: hidden for this visit only */
 }
 setDismissed(true);
 }

 // Flat like every card (DESIGN_SPEC: cards sit flat); no side stripe (specs/075).
 return (
 <section className="rounded-lg bg-surface">
 <div className="flex items-center justify-between gap-3 p-5 pb-3">
 <div className="flex items-center gap-2.5">
 <h2 className="text-md font-semibold text-text">{t("onboarding.title")}</h2>
 <span className="rounded-pill bg-success-soft px-2 py-0.5 text-xs font-medium tabular-nums text-success-fg">
 {doneCount}/{items.length}
 </span>
 </div>
 <button
 onClick={handleDismiss}
 className="tap-target rounded-sm p-1.5 pointer-coarse:p-3.5 text-text-subtle transition-colors hover:bg-surface-2 hover:text-text"
 aria-label={t("onboarding.dismiss")}
 >
 <X className="h-4 w-4" />
 </button>
 </div>

 <div className="mx-5 mb-3">
 <ProgressBar value={pct} size="sm" />
 </div>

 <ul className="px-3 pb-3">
 {items.map((item) => (
 <li key={item.label}>
 <Link
 href={item.href}
 className="flex min-h-11 items-center gap-3 rounded-sm px-2 py-2 transition-colors hover:bg-surface-2"
 >
 {item.done ? (
 <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
 ) : (
 <Circle className="h-5 w-5 flex-shrink-0 text-text-subtle" aria-hidden="true" />
 )}
 <span className={item.done ? "text-sm text-text-subtle line-through" : "text-sm font-medium text-text"}>
 {item.label}
 </span>
 </Link>
 </li>
 ))}
 </ul>
 </section>
 );
}
