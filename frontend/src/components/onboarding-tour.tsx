"use client";

/**
 * First-time teacher onboarding tour via driver.js.
 *
 * Mounts on the admin dashboard once. Checks localStorage for a
 * `lms.tour.admin.v1` flag — if absent, starts the tour automatically
 * and writes the flag when the teacher either completes or skips. Also
 * exposes a `startTour()` imperative function via a global
 * `window.__lmsAdminTour()` so a "Replay tour" button anywhere else
 * can trigger it.
 *
 * Steps point at sidebar links (identified by data-tour attributes):
 * dashboard, courses, content library, gradebook, users, groups, then a
 * closing step. Every sentence in the copy is something the product does
 * today; specs/086 removed a promise of a pre-loaded SAT course that no
 * school ever got.
 *
 * We intentionally DO NOT click through forms or create real data in the
 * tour — that would be invasive and risks half-completing operations if
 * the teacher exits mid-step. The tour is a guided walkthrough, not an
 * automated demo.
 */

import { useEffect, useRef } from "react";
import { driver, type Driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

import { useTranslation } from "@/lib/i18n/context";

const TOUR_FLAG_KEY = "lms.tour.admin.v1";

/** [sidebar anchor, key prefix]; no anchor means a centred closing step. */
const STEPS: [string | null, string][] = [
 ["sidebar-dashboard", "tour.welcome"],
 ["sidebar-courses", "tour.courses"],
 ["sidebar-content-library", "tour.library"],
 ["sidebar-gradebook", "tour.gradebook"],
 ["sidebar-users", "tour.users"],
 ["sidebar-groups", "tour.groups"],
 [null, "tour.ready"],
];

interface OnboardingTourProps {
 /** Force the tour to start even if the flag is set. */
 autoStart?: boolean;
}

export function OnboardingTour({ autoStart = false }: OnboardingTourProps) {
 const { t } = useTranslation();
 // Read at start time, not mount time: the saved language loads just after
 // mount, and rebuilding the tour on that switch would destroy it, and a
 // destroyed tour writes the "done" flag.
 const tRef = useRef(t);
 tRef.current = t;
 const driverRef = useRef<Driver | null>(null);

 useEffect(() => {
 const start = () => {
 const tr = tRef.current;
 const steps: DriveStep[] = STEPS.map(([anchor, key]) => ({
 ...(anchor ? { element: `[data-tour="${anchor}"]` } : {}),
 popover: { title: tr(`${key}Title`), description: tr(`${key}Desc`) },
 }));
 driverRef.current?.destroy();
 const d = driver({
 showProgress: true,
 allowClose: true,
 animate: true,
 nextBtnText: tr("tour.next"),
 prevBtnText: tr("tour.prev"),
 doneBtnText: tr("tour.done"),
 progressText: tr("tour.progress"),
 steps,
 onDestroyed: () => {
 try {
 localStorage.setItem(TOUR_FLAG_KEY, "done");
 } catch {
 /* ignore */
 }
 },
 });
 driverRef.current = d;
 d.drive();
 };

 // Expose a manual starter on window so a "Replay tour" button elsewhere
 // can call it without re-importing this component.
 (window as unknown as { __lmsAdminTour?: () => void }).__lmsAdminTour = start;

 // Auto-start if this is the first visit and the required anchors exist.
 let done = false;
 try {
 done = localStorage.getItem(TOUR_FLAG_KEY) === "done";
 } catch {
 /* ignore */
 }

 const shouldStart = autoStart || !done;
 if (!shouldStart) return;

 // Delay so the sidebar has rendered its data-tour anchors
 const timer = setTimeout(() => {
 const firstAnchor = document.querySelector('[data-tour="sidebar-dashboard"]');
 if (firstAnchor) start();
 }, 800);

 return () => {
 clearTimeout(timer);
 try {
 driverRef.current?.destroy();
 } catch {
 /* ignore */
 }
 };
 }, [autoStart]);

 return null;
}

/** Call this from anywhere to start the tour manually. */
export function startOnboardingTour(): void {
 const fn = (window as unknown as { __lmsAdminTour?: () => void }).__lmsAdminTour;
 if (fn) fn();
}
