"use client";

import Link from "next/link";
import { coverArtProps } from "@/lib/course-cover";
import { SUBJECT_SURFACE, type Subject } from "@/lib/subject";
import { useTranslation } from "@/lib/i18n/context";

/** Fixed seeds: the panel looks the same on every visit. Staggered, not stacked. */
const FIELDS: { subject: Subject; seed: string; shift: string }[] = [
  { subject: "lang", seed: "grass-field-lang", shift: "mr-16" },
  { subject: "math", seed: "grass-field-math", shift: "ml-16" },
  { subject: "code", seed: "grass-field-code", shift: "mr-8" },
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen">
      <a
        href="#auth-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg"
      >
        {t("common.skipToContent")}
      </a>

      {/* Left side — the field (specs/076). The three subjects GrassLMS
          teaches, each on its own colour with its cover drawing (specs/073):
          what the product does, shown rather than decorated. */}
      <div className="hidden w-1/2 flex-col justify-between bg-ground p-12 text-text lg:flex">
        <Link href="/" className="flex w-fit items-center gap-2.5">
          <span className="relative flex h-10 w-10 items-center justify-center rounded-sm bg-logo text-xl font-extrabold text-logo-fg">
            g
            <span className="absolute bottom-[5px] right-[6px] h-[6px] w-[6px] rounded-full bg-sun-400" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">GrassLMS</span>
        </Link>

        <div className="mx-auto grid w-full max-w-md gap-4" aria-hidden="true">
          {FIELDS.map(({ subject, seed, shift }) => (
            <div
              key={subject}
              className={`relative h-28 overflow-hidden rounded-lg ${SUBJECT_SURFACE[subject]} ${shift}`}
            >
              <svg {...coverArtProps(subject, seed)} className="absolute inset-0 h-full w-full" />
            </div>
          ))}
        </div>

        <p className="max-w-sm text-base leading-relaxed text-text-muted">
          {t("auth.tagline")}
        </p>
      </div>

      {/* Right side — form */}
      <div className="flex w-full items-center justify-center bg-bg px-6 lg:w-1/2">
        <div id="auth-content" className="w-full max-w-md">
          {/* Mobile logo */}
          <Link
            href="/"
            className="mb-8 flex items-center justify-center gap-2.5 lg:hidden"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-sm bg-logo text-lg font-extrabold text-logo-fg">
              g
              <span className="absolute bottom-[4px] right-[5px] h-[5px] w-[5px] rounded-full bg-sun-400" />
            </div>
            <span className="text-md font-extrabold tracking-tight text-text">
              GrassLMS
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
