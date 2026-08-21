"use client";

import { useEffect } from "react";

import { readableAs, readableOn } from "@/lib/brand/contrast";

/** The page behind ordinary text, per theme. Matches --color-bg in globals.css. */
const PAGE_LIGHT = "#ffffff";
const PAGE_DARK = "#0b100c";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Paints the school's colours onto the page.
 *
 * This used to be the same `useEffect` copied line for line into the (admin)
 * and (dashboard) layouts — the two differed only in their comments. One copy
 * now, mounted by both.
 *
 * The part that is new rather than moved: `--primary-fg`. The stylesheet reads
 * `var(--primary-fg, #ffffff)`, so setting it here decides what gets written on
 * top of the school's colour. Leave it unset and the old constant applies,
 * which is exactly what a school that chose no colour should still get.
 *
 * Renders nothing.
 */
export function BrandVars() {
  const primary = useAuthStore((s) => s.branding?.primary_color);
  const secondary = useAuthStore((s) => s.branding?.secondary_color);

  useEffect(() => {
    const root = document.documentElement;
    const applied: string[] = [];

    const set = (name: string, value: string) => {
      root.style.setProperty(name, value);
      applied.push(name);
    };

    if (primary) {
      set("--primary", primary);
      set("--primary-light", `color-mix(in srgb, ${primary} 15%, transparent)`);
      set("--primary-dark", `color-mix(in srgb, ${primary} 85%, black)`);
      // Derived, not chosen. A light brand gets dark text and a dark brand gets
      // light text; the school's own colour is never substituted.
      set("--primary-fg", readableOn(primary));

      // The other direction: the brand colour used AS text, on the page. Both
      // themes are computed here and the stylesheet picks — so switching theme
      // needs no JavaScript and cannot lag a frame behind.
      set("--primary-text-light", readableAs(primary, PAGE_LIGHT));
      set("--primary-text-dark", readableAs(primary, PAGE_DARK));
    }

    if (secondary) {
      set("--secondary", secondary);
      set("--secondary-light", `color-mix(in srgb, ${secondary} 15%, transparent)`);
      set("--secondary-dark", `color-mix(in srgb, ${secondary} 85%, black)`);
    }

    // Clearing on the way out is what keeps a super admin who opened another
    // school's settings from carrying that school's colours back to their own.
    return () => applied.forEach((name) => root.style.removeProperty(name));
  }, [primary, secondary]);

  return null;
}
