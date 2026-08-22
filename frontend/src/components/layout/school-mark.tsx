"use client";

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
 * Given nothing, it renders nothing. That is the whole of the "unknown slug
 * looks like an unbranded school" behaviour: no error, no gap, no hint about
 * whether the school exists.
 */
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
          className="text-lg font-bold"
          style={primary ? { color: readableAs(primary, "#ffffff") } : undefined}
        >
          {name}
        </p>
      )}
    </div>
  );
}
