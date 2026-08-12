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
    <section className="border-t border-border bg-surface-2/50 py-20">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h2 className="mb-3 text-3xl font-bold text-text">{t("landing.compare.title")}</h2>
          <p className="text-text-muted">{t("landing.compare.subtitle")}</p>
        </div>

        <div className="overflow-hidden rounded-xl border-2 border-border">
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
