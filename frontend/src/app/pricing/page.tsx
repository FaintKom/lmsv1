"use client";

/**
 * Pricing page.
 *
 * The four plans here are the four rows `billing/service.py` seeds into the
 * `plans` table — same names, same prices, same student caps. If you change a
 * number here, change it there, or a school will read one figure and be billed
 * another.
 *
 * Plans are separated by one dimension only: how many students. Enforcement in
 * `billing/limits.py` is currently a no-op, so every plan really does have the
 * whole product in it — which is what the "in every plan" list says. Re-enable
 * per-feature gating and this page becomes a lie.
 *
 * No checkout button: no payment provider is live yet. A button that opens
 * nothing is worse than no button, and merchant-of-record reviewers click
 * every one of them.
 */

import Link from "next/link";
import { ArrowRight, Check, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LandingHeader } from "@/components/landing/landing-header";
import { useTranslation } from "@/lib/i18n/context";

export default function PricingPage() {
  const { t } = useTranslation();

  const plans = [
    {
      name: t("pricing.planFree"),
      price: "$0",
      limit: t("pricing.planFreeLimit"),
      who: t("pricing.planFreeFor"),
      featured: false,
    },
    {
      name: t("pricing.planStarter"),
      price: "$29",
      limit: t("pricing.planStarterLimit"),
      who: t("pricing.planStarterFor"),
      featured: false,
    },
    {
      name: t("pricing.planPro"),
      price: "$79",
      limit: t("pricing.planProLimit"),
      who: t("pricing.planProFor"),
      featured: true,
    },
    {
      name: t("pricing.planEnterprise"),
      price: "$199",
      limit: t("pricing.planEnterpriseLimit"),
      who: t("pricing.planEnterpriseFor"),
      featured: false,
    },
  ];

  const included = [
    t("pricing.inc1"),
    t("pricing.inc2"),
    t("pricing.inc3"),
    t("pricing.inc4"),
    t("pricing.inc5"),
    t("pricing.inc6"),
    t("pricing.inc7"),
    t("pricing.inc8"),
  ];

  const faq = [
    { q: t("pricing.faq1Q"), a: t("pricing.faq1A") },
    { q: t("pricing.faq2Q"), a: t("pricing.faq2A") },
    { q: t("pricing.faq3Q"), a: t("pricing.faq3A") },
    { q: t("pricing.faq4Q"), a: t("pricing.faq4A") },
    { q: t("pricing.faq5Q"), a: t("pricing.faq5A") },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <LandingHeader />

      <main>
        <section className="border-b border-border py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <h1 className="mb-4 text-2xl font-extrabold leading-tight tracking-tight text-text sm:text-3xl md:text-4xl">
              {t("pricing.title")}
            </h1>
            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-text-muted">
              {t("pricing.sub")}
            </p>
          </div>
        </section>

        {/* Four plans. The grid drops to one column on phones: at 320px a
            four-across row put the price at 11px and the caption below the
            fold. */}
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`flex flex-col rounded-xl border bg-surface p-6 ${
                    plan.featured
                      ? "border-primary shadow-lg"
                      : "border-border-strong"
                  }`}
                >
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
                    {plan.name}
                  </h2>
                  <p className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-4xl font-extrabold text-text">{plan.price}</span>
                    <span className="text-sm text-text-subtle">{t("pricing.perMonth")}</span>
                  </p>
                  <p className="mt-4 text-sm font-semibold text-primary">{plan.limit}</p>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{plan.who}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-sm text-text-subtle">{t("pricing.note")}</p>
          </div>
        </section>

        {/* One list, not four columns of ticks and crosses: the plans differ by
            student count only, so a comparison matrix would be four identical
            columns. */}
        <section className="border-t border-border bg-surface-2/50 py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="mb-6 text-center text-2xl font-bold text-text">
              {t("pricing.includedTitle")}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-text">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border py-12">
          <div className="mx-auto max-w-3xl px-6">
            <div className="rounded-xl border border-warning bg-warning-soft px-6 py-5">
              <p className="text-sm leading-relaxed text-warning-fg">
                {t("pricing.checkoutNote")}
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="mb-8 text-center text-2xl font-bold text-text">
              {t("pricing.faqTitle")}
            </h2>
            <div className="space-y-3">
              {faq.map((item) => (
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

        <section className="border-t border-border bg-gradient-to-b from-success-soft/50 to-surface py-14">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg">
                  {t("pricing.ctaStart")}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg">
                  {t("pricing.ctaAsk")}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
