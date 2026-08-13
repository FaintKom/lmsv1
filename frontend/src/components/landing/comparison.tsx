"use client";

/**
 * "How it usually goes" against "how it goes here".
 *
 * Every right-hand claim has to be checkable in the product, because this page
 * has no customer logos or testimonials to lean on — there are no customers
 * yet, and inventing them is not on the table. The claims map to the 24 types
 * in EXERCISE_TYPES_META, the server-side grading in app/exercises, the live
 * lesson in app/live_lessons, and the six locale files.
 */

import { ArrowRight } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

const ROWS = [
  { before: "landing.compare.gradingBefore", after: "landing.compare.gradingAfter" },
  { before: "landing.compare.codeBefore", after: "landing.compare.codeAfter" },
  { before: "landing.compare.liveBefore", after: "landing.compare.liveAfter" },
  { before: "landing.compare.answersBefore", after: "landing.compare.answersAfter" },
] as const;

export function Comparison() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-border bg-surface-2/50 py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h2 className="mb-3 break-words text-2xl font-bold text-text sm:text-3xl">
            {t("landing.compare.title")}
          </h2>
          <p className="text-text-muted">{t("landing.compare.subtitle")}</p>
        </div>

        {/* Two columns need room. On a 390px screen each cell was about 160px
            wide, every line broke four or five times, and the USUALLY / HERE
            header scrolled off before the third row — by then you could no
            longer tell which side you were reading. Phones get stacked cards
            that label both halves in place. */}
        <div className="space-y-4 md:hidden">
          {ROWS.map((row) => (
            <div
              key={row.before}
              className="overflow-hidden rounded-xl border-2 border-border bg-surface"
            >
              <div className="bg-surface-2 px-4 py-3">
                <span className="eyebrow mb-1 block text-text-subtle">
                  {t("landing.compare.statusQuo")}
                </span>
                <p className="text-sm leading-relaxed text-text-muted">{t(row.before)}</p>
              </div>
              <div className="border-t-2 border-border px-4 py-3">
                <span className="eyebrow mb-1 block text-primary">
                  {t("landing.compare.here")}
                </span>
                <p className="flex items-start gap-2 text-sm font-medium leading-relaxed text-text">
                  <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{t(row.after)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border-2 border-border md:block">
          <div className="grid grid-cols-2 border-b-2 border-border bg-surface">
            <div className="px-5 py-3">
              <span className="eyebrow text-text-subtle">{t("landing.compare.statusQuo")}</span>
            </div>
            <div className="border-l-2 border-border px-5 py-3">
              <span className="eyebrow text-primary">{t("landing.compare.here")}</span>
            </div>
          </div>

          {ROWS.map((row, i) => (
            <div
              key={row.before}
              className={`grid grid-cols-2 ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="bg-surface-2 px-5 py-4 text-sm leading-relaxed text-text-muted">
                {t(row.before)}
              </div>
              <div className="flex items-start gap-2 border-l-2 border-border bg-surface px-5 py-4 text-sm font-medium leading-relaxed text-text">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{t(row.after)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
