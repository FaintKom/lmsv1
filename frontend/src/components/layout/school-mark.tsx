"use client";

import type { CSSProperties } from "react";

import type { SchoolBranding } from "@/lib/api/crm";
import { readableAs, readableOn } from "@/lib/brand/contrast";
import { useTranslation } from "@/lib/i18n/context";

/**
 * A school's logo and name, on a page nobody has logged into yet.
 *
 * Used by the sign-in screen and the public enquiry page — the two places a
 * school is looked at from outside. It paints its colours inline rather than
 * through the CSS variables, because on those pages there is no session and so
 * no `BrandVars` above it.
 *
 * The name's colour is handed to the stylesheet as two shades rather than one:
 * this component runs where there is no session, so it cannot know the visitor's
 * theme, and computing a single shade against white put dark green on a dark
 * page at 4.32:1 in production.
 *
 * Given nothing, it renders nothing. That is the whole of the "unknown slug
 * looks like an unbranded school" behaviour: no error, no gap, no hint about
 * whether the school exists.
 */
/** The page behind ordinary text, per theme. `--paper` in tokens.css says
 * outright: "page background — never #fff". Computing against pure white cost
 * exactly the difference — 4.42:1 where 4.5 was needed. */
const PAGE_LIGHT = "#fbfcf7";
const PAGE_DARK = "#0b100c";

export function SchoolMark({
  branding,
  className = "",
}: {
  branding: SchoolBranding | null | undefined;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!branding) return null;

  const { logo_url: logo, display_name: name, primary_color: primary } = branding;
  if (!logo && !name) return null;

  const initial = (name || "?").trim().charAt(0).toUpperCase();

  return (
    <div data-testid="school-mark" className={`mb-6 flex flex-col items-center gap-3 ${className}`}>
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logo}
          alt={name || t("auth.schoolLogo")}
          className="h-12 w-12 rounded-lg object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="grid h-12 w-12 place-items-center rounded-lg text-xl font-extrabold"
          style={primary ? { background: primary, color: readableOn(primary) } : undefined}
        >
          {initial}
        </span>
      )}
      {name && (
        <p
          className="brand-mark-name text-lg font-bold"
          style={
            primary
              ? ({
                  "--mark-light": readableAs(primary, PAGE_LIGHT),
                  "--mark-dark": readableAs(primary, PAGE_DARK),
                } as CSSProperties)
              : undefined
          }
        >
          {name}
        </p>
      )}
    </div>
  );
}
