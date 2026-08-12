"use client";

/**
 * Landing page.
 *
 * Rule for this file: every claim on it is checkable in the product. There are
 * no customers yet, so there are no logos, testimonials or growth numbers —
 * inventing them was never an option. What carries the page instead is the
 * product itself: a code task the server grades, three real exercise
 * components, and four numbers that come from the code
 * (EXERCISE_TYPES_META = 24, SUPPORTED_LANGUAGES = 5, LOCALES = 6).
 */

import Link from "next/link";
import { ArrowRight, ChevronDown, Radio, Hand, CheckCircle2, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";
import { CodeDemo } from "@/components/landing/code-demo";
import { ExerciseGallery } from "@/components/landing/exercise-gallery";
import { Comparison } from "@/components/landing/comparison";
import { RoleShowcase } from "@/components/landing/role-showcase";
import { LandingHeader } from "@/components/landing/landing-header";
import { useTranslation } from "@/lib/i18n/context";

export default function Home() {
  const { t } = useTranslation();

  const facts = [
    { value: t("landing.facts.typesValue"), label: t("landing.facts.typesLabel") },
    { value: t("landing.facts.langsValue"), label: t("landing.facts.langsLabel") },
    { value: t("landing.facts.localesValue"), label: t("landing.facts.localesLabel") },
    { value: t("landing.facts.answersValue"), label: t("landing.facts.answersLabel") },
  ];

  const roster = [
    { initial: "A", icon: CheckCircle2, tone: "success" as const, label: t("landing.live.chipOk") },
    { initial: "B", icon: Clock, tone: "warning" as const, label: t("landing.live.chipIdle") },
    { initial: "C", icon: Hand, tone: "danger" as const, label: t("landing.live.chipStuck") },
    { initial: "D", icon: CheckCircle2, tone: "success" as const, label: t("landing.live.chipOk") },
  ];

  const toneClass = {
    success: "border-primary-soft bg-success-soft text-success-fg",
    warning: "border-warning bg-warning-soft text-warning-fg",
    danger: "border-danger-soft bg-danger-soft text-danger-fg",
  };

  return (
    <div className="min-h-screen bg-surface">
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(34,197,94,0.08),transparent)]" />
          <div className="mx-auto max-w-3xl px-6 pb-16 pt-20 text-center md:pt-28">
            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-text md:text-6xl">
              {t("landing.hero.title")}
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-text-muted">
              {t("landing.hero.sub")}
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg">
                  {t("landing.getStarted")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  {t("landing.signIn")}
                </Button>
              </Link>
            </div>
            <p className="mt-6 text-sm text-text-subtle">{t("landing.hero.demoHint")}</p>
          </div>
        </section>

        {/* The proof: a code task this page's visitor can actually solve.
            CodeDemo renders a bare grid, so the page owns its framing. */}
        <section className="pb-20">
          <div className="mx-auto max-w-5xl px-6">
            <CodeDemo />
          </div>
        </section>

        {/* Facts strip — numbers that come from the code, not from marketing */}
        <section className="border-t border-border bg-surface py-14">
          <div className="mx-auto max-w-5xl px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label} className="text-center">
                  <p className="text-4xl font-extrabold text-primary md:text-5xl">{f.value}</p>
                  <p className="mt-2 text-sm font-medium leading-snug text-text-muted">{f.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-text-subtle">{t("landing.facts.note")}</p>
          </div>
        </section>

        {/* Three real exercise components */}
        <ExerciseGallery />

        {/* Live lesson */}
        <section className="border-t border-border bg-surface-2/50 py-20">
          <div className="mx-auto grid max-w-5xl items-center gap-10 px-6 md:grid-cols-2">
            <div>
              <span className="eyebrow mb-3 inline-flex items-center gap-2 text-primary">
                <Radio className="h-4 w-4" />
                {t("landing.live.eyebrow")}
              </span>
              <h2 className="mb-4 text-3xl font-bold text-text">{t("landing.live.title")}</h2>
              <p className="mb-6 leading-relaxed text-text-muted">{t("landing.live.body")}</p>
              <ul className="space-y-3 text-sm text-text">
                {[t("landing.live.point1"), t("landing.live.point2"), t("landing.live.point3")].map(
                  (point) => (
                    <li key={point} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>

            {/* Static illustration of the roster — the real one is behind a login */}
            <div className="overflow-hidden rounded-xl border border-border-strong bg-surface shadow-xl">
              <div className="flex items-center justify-between border-b border-border-strong bg-surface-2/70 px-4 py-3">
                <span className="flex items-center gap-2 text-sm font-semibold text-text">
                  <span className="h-2 w-2 rounded-full bg-danger" />
                  {t("landing.live.mockTitle")}
                </span>
                <span className="text-xs text-text-subtle">{t("landing.live.mockStep")}</span>
              </div>
              <div className="space-y-2 p-4">
                {roster.map((row) => (
                  <div
                    key={row.initial}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-bold text-text-muted">
                      {row.initial}
                    </span>
                    <span className="h-2 flex-1 rounded-full bg-surface-2" />
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-xs font-semibold ${toneClass[row.tone]}`}
                    >
                      <row.icon className="h-3.5 w-3.5" />
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Usually → here */}
        <Comparison />

        {/* Student and teacher views */}
        <RoleShowcase />

        {/* FAQ */}
        <section className="border-t border-border bg-surface py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-text">{t("landing.faqTitle")}</h2>
              <p className="text-text-muted">{t("landing.faqSub")}</p>
            </div>
            <div className="space-y-3">
              {[
                { q: t("landing.faq1Q"), a: t("landing.faq1A") },
                { q: t("landing.faq2Q"), a: t("landing.faq2A") },
                { q: t("landing.faq3Q"), a: t("landing.faq3A") },
                { q: t("landing.faq4Q"), a: t("landing.faq4A") },
                { q: t("landing.faq5Q"), a: t("landing.faq5A") },
                { q: t("landing.faq6Q"), a: t("landing.faq6A") },
              ].map((item) => (
                <details
                  key={item.q}
                  className="group rounded-lg border border-border-strong bg-surface"
                >
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-text [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="h-4 w-4 text-text-subtle transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-4 text-sm leading-relaxed text-text-muted">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-border bg-gradient-to-b from-success-soft/50 to-surface py-20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold text-text">{t("landing.ctaReady")}</h2>
            <p className="mb-8 text-text-muted">{t("landing.ctaReadySub")}</p>
            <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg">
                  {t("landing.ctaCreateFree")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo?role=student">
                <Button variant="outline" size="lg">
                  {t("landing.ctaTryDemo")}
                </Button>
              </Link>
            </div>
            <div className="mt-12 border-t border-border-strong pt-10">
              <h3 className="mb-2 text-lg font-semibold text-text">
                {t("landing.ctaJoinWaitlist")}
              </h3>
              <p className="mb-6 text-sm text-text-muted">{t("landing.ctaWaitlistSub")}</p>
              <WaitlistForm source="landing-cta" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm text-text-subtle">{t("landing.copyright")}</span>
            <div className="flex gap-6 text-sm text-text-subtle">
              <Link href="/terms" className="hover:text-text-muted">
                {t("landing.terms")}
              </Link>
              <Link href="/privacy" className="hover:text-text-muted">
                {t("landing.privacy")}
              </Link>
              <Link href="/cookies" className="hover:text-text-muted">
                {t("landing.cookies")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
