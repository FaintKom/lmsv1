"use client";

/**
 * Three real exercise components, running on the landing page.
 *
 * These are the same V2 components students use — not screenshots and not
 * reimplementations. They grade locally here because their `onGrade`/`onCheck`
 * props are optional: without them the component keeps the answer key it was
 * handed and decides on its own. Live exercises pass those callbacks and the
 * answer key never leaves the server (integrity model B).
 *
 * Loaded through `dynamic()` so LessonShell, confetti and the drag machinery
 * stay out of the first landing bundle.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { ListChecks, Link2, Boxes } from "lucide-react";

import { useTranslation } from "@/lib/i18n/context";

const QuizV2 = dynamic(() => import("@/components/exercises/v2/quiz-v2").then((m) => m.QuizV2), {
  ssr: false,
});
const MatchingV2 = dynamic(
  () => import("@/components/exercises/v2/matching-v2").then((m) => m.MatchingV2),
  { ssr: false },
);
const CategorizeV2 = dynamic(
  () => import("@/components/exercises/v2/categorize-v2").then((m) => m.CategorizeV2),
  { ssr: false },
);

type Tab = "quiz" | "matching" | "categorize";

const TABS: { id: Tab; icon: typeof ListChecks; label: string }[] = [
  { id: "quiz", icon: ListChecks, label: "landing.gallery.tabQuiz" },
  { id: "matching", icon: Link2, label: "landing.gallery.tabMatching" },
  { id: "categorize", icon: Boxes, label: "landing.gallery.tabCategorize" },
];

export function ExerciseGallery() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("quiz");

  return (
    <section className="border-t border-border bg-surface py-16">
      <div className="mx-auto max-w-4xl px-6">
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-3xl font-bold text-text">{t("landing.gallery.title")}</h2>
          <p className="text-text-muted">{t("landing.gallery.subtitle")}</p>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="inline-flex flex-wrap justify-center rounded-pill bg-surface-2 p-1">
            {TABS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                aria-pressed={tab === id}
                className={`flex items-center gap-2 rounded-pill px-5 py-2.5 text-sm font-semibold transition ${
                  tab === id
                    ? "bg-surface text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(label)}
              </button>
            ))}
          </div>
        </div>

        {/* keyed on tab so switching remounts the exercise in its initial state.
            `landing-exercise` drops LessonShell's chrome (see globals.css) rather
            than threading a prop through three shared exercise components for a
            landing-only concern. */}
        <div
          key={tab}
          className="landing-exercise rounded-xl border-2 border-border bg-surface-2/40 p-4 md:p-6"
        >
          {tab === "quiz" && (
            <QuizV2
              eyebrow={t("landing.gallery.eyebrow")}
              questions={[
                {
                  question_text: t("landing.gallery.quizQuestion"),
                  options: [
                    { text: t("landing.gallery.quizOpt1") },
                    { text: t("landing.gallery.quizOpt2"), is_correct: true },
                    { text: t("landing.gallery.quizOpt3") },
                    { text: t("landing.gallery.quizOpt4") },
                  ],
                },
              ]}
            />
          )}

          {tab === "matching" && (
            <MatchingV2
              eyebrow={t("landing.gallery.eyebrow")}
              title={t("landing.gallery.matchingTitle")}
              pairs={[
                { left: t("landing.gallery.matchL1"), right: t("landing.gallery.matchR1") },
                { left: t("landing.gallery.matchL2"), right: t("landing.gallery.matchR2") },
                { left: t("landing.gallery.matchL3"), right: t("landing.gallery.matchR3") },
              ]}
            />
          )}

          {tab === "categorize" && (
            <CategorizeV2
              eyebrow={t("landing.gallery.eyebrow")}
              title={t("landing.gallery.categorizeTitle")}
              categories={[
                {
                  name: t("landing.gallery.catA"),
                  items: [t("landing.gallery.catA1"), t("landing.gallery.catA2")],
                },
                {
                  name: t("landing.gallery.catB"),
                  items: [t("landing.gallery.catB1"), t("landing.gallery.catB2")],
                },
              ]}
            />
          )}
        </div>

        <p className="mt-4 text-center text-sm text-text-subtle">
          {t("landing.gallery.note")}
        </p>
      </div>
    </section>
  );
}
