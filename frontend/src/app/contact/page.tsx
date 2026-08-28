"use client";

/**
 * Contact page.
 *
 * Exists because a merchant-of-record reviewer looks for a way to reach a
 * human before approving an account, and because a school will not buy from
 * a site with no way to ask a question first.
 *
 * The address here is the one already published three times in
 * `app/terms/page.tsx`. Keep them the same: two different support addresses on
 * one site reads as a site nobody maintains.
 *
 * No form. A form needs an endpoint, spam handling and a reply queue; a mailto
 * link needs none of those and reaches the same inbox.
 */

import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

import { LandingHeader } from "@/components/landing/landing-header";
import { useTranslation } from "@/lib/i18n/context";

const SUPPORT_EMAIL = "support@grasslms.online";

export default function ContactPage() {
  const { t } = useTranslation();

  const askFor = [t("contact.ask1"), t("contact.ask2"), t("contact.ask3")];

  return (
    <div className="min-h-screen bg-surface">
      <LandingHeader />

      <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
        <Link
          href="/"
          className="tap-target mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-success-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("contact.back")}
        </Link>

        <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
          {t("contact.title")}
        </h1>
        <p className="mb-8 text-lg leading-relaxed text-text-muted">{t("contact.sub")}</p>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="flex items-center gap-3 rounded-xl border border-border-strong bg-surface-2/50 px-6 py-5 hover:border-primary"
        >
          <Mail className="h-5 w-5 shrink-0 text-primary" />
          <span className="min-w-0 break-all text-base font-semibold text-text">
            {SUPPORT_EMAIL}
          </span>
        </a>

        <p className="mt-8 text-sm font-semibold text-text">{t("contact.askTitle")}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-text-muted">
          {askFor.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <p className="mt-8 text-sm leading-relaxed text-text-muted">{t("contact.response")}</p>

        <div className="mt-10 border-t border-border pt-6 text-sm text-text-subtle">
          {t("contact.legalNote")}
        </div>
      </main>
    </div>
  );
}
