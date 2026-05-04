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
 * Steps walk the teacher through the high-value admin surfaces:
 *   1. Dashboard — this is your control centre
 *   2. Courses — create and edit courses here
 *   3. Content Library — reusable exercises
 *   4. Gradebook — see student progress
 *   5. Users / Groups — add students, organize classes
 *   6. Bulk Enroll — add many students from CSV
 *   7. Billing — upgrade your plan
 * Each step points at a sidebar link (identified by data-tour attributes)
 * and shows a short explanation. The final step celebrates completion.
 *
 * We intentionally DO NOT click through forms or create real data in the
 * tour — that would be invasive and risks half-completing operations if
 * the teacher exits mid-step. The tour is a guided walkthrough, not an
 * automated demo.
 */

import { useEffect, useRef } from "react";
import { driver, type Driver } from "driver.js";
import "driver.js/dist/driver.css";

const TOUR_FLAG_KEY = "lms.tour.admin.v1";

const STEPS = [
  {
    element: '[data-tour="sidebar-dashboard"]',
    popover: {
      title: "Welcome to GrassLMS 👋",
      description:
        "This is your Admin Dashboard — the control centre for your school. Let's take a quick 60-second tour of the essentials.",
    },
  },
  {
    element: '[data-tour="sidebar-courses"]',
    popover: {
      title: "Courses",
      description:
        "Create, edit, and publish courses here. Every new school starts with a pre-loaded SAT Math course you can use as a template or rename.",
    },
  },
  {
    element: '[data-tour="sidebar-content-library"]',
    popover: {
      title: "Content Library",
      description:
        "Reusable exercises and questions. Build something once, drop it into any lesson. Students can't see the library directly — only through lessons.",
    },
  },
  {
    element: '[data-tour="sidebar-gradebook"]',
    popover: {
      title: "Gradebook",
      description:
        "Every assignment, quiz, and code challenge score in one table. Colour-coded cells, CSV and Excel export, frozen header row.",
    },
  },
  {
    element: '[data-tour="sidebar-users"]',
    popover: {
      title: "Users",
      description:
        "Add teachers and students one-by-one, or bulk-import via CSV. Each student gets their own login and progress tracking.",
    },
  },
  {
    element: '[data-tour="sidebar-groups"]',
    popover: {
      title: "Groups",
      description:
        "Organize students into classes or cohorts so you can enroll whole groups into a course at once.",
    },
  },
  {
    element: '[data-tour="sidebar-billing"]',
    popover: {
      title: "Billing",
      description:
        "Your current plan and invoices live here. Free for up to 10 students, upgrade when your class grows.",
    },
  },
  {
    popover: {
      title: "You're ready 🚀",
      description:
        "That's the tour. Questions? Every page has inline help. Your first SAT Math course is already seeded — open Courses to preview it, or start building your own.",
    },
  },
];

interface OnboardingTourProps {
  /** Force the tour to start even if the flag is set. */
  autoStart?: boolean;
}

export function OnboardingTour({ autoStart = false }: OnboardingTourProps) {
  const driverRef = useRef<Driver | null>(null);

  useEffect(() => {
    const d = driver({
      showProgress: true,
      allowClose: true,
      animate: true,
      steps: STEPS,
      onDestroyed: () => {
        try {
          localStorage.setItem(TOUR_FLAG_KEY, "done");
        } catch {
          /* ignore */
        }
      },
    });
    driverRef.current = d;

    // Expose a manual starter on window so a "Replay tour" button elsewhere
    // can call it without re-importing this component.
    (window as unknown as { __lmsAdminTour?: () => void }).__lmsAdminTour = () => {
      d.drive();
    };

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
      if (firstAnchor) {
        d.drive();
      }
    }, 800);

    return () => {
      clearTimeout(timer);
      try {
        d.destroy();
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
