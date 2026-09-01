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
 * Presented as a reel: arrows on either side of the card, a caption and dots
 * underneath. It used to be a pill tab bar, which read as a settings control
 * rather than as a set of samples to page through.
 *
 * Loaded through `dynamic()` so LessonShell, confetti and the drag machinery
 * stay out of the first landing bundle.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, ChevronRight, Code2, ListChecks, Link2, Boxes } from "lucide-react";

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

// Monaco is heavy, so the code slide loads with the rest of the reel rather
// than on first paint.
const CodeDemo = dynamic(
  () => import("@/components/landing/code-demo").then((m) => m.CodeDemo),
  { ssr: false },
);

type Slide = "quiz" | "matching" | "categorize" | "code";

const SLIDES: { id: Slide; icon: typeof ListChecks; label: string }[] = [
  { id: "quiz", icon: ListChecks, label: "landing.gallery.tabQuiz" },
  { id: "matching", icon: Link2, label: "landing.gallery.tabMatching" },
  { id: "categorize", icon: Boxes, label: "landing.gallery.tabCategorize" },
  { id: "code", icon: Code2, label: "landing.gallery.tabCode" },
];

/**
 * Mirrors Button's `outline` variant (see components/ui/button.tsx). Written
 * out rather than composed because `cn` is plain clsx with no tailwind-merge,
 * so overriding Button's size classes would leave two conflicting sets and let
 * stylesheet order pick the winner.
 */
const ARROW_CLASS =
  "press-scale shrink-0 items-center justify-center rounded-lg border " +
  "border-border-strong bg-surface text-text transition-colors hover:bg-surface-2 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function ExerciseGallery() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);

  const current = SLIDES[index];
  const go = (step: number) => setIndex((i) => (i + step + SLIDES.length) % SLIDES.length);

  // `size` carries the display utility too. Keeping `inline-flex` in
  // ARROW_CLASS put it in the same Tailwind group as `hidden`, and the
  // stylesheet — not the class attribute — decided which won, so both pairs of
  // arrows showed on a phone.
  const arrow = (dir: -1 | 1, size: string) => {
    const Icon = dir === -1 ? ChevronLeft : ChevronRight;
    return (
      <button
        type="button"
        onClick={() => go(dir)}
        aria-label={t(dir === -1 ? "landing.gallery.prev" : "landing.gallery.next")}
        className={`${ARROW_CLASS} ${size}`}
      >
        <Icon className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
      </button>
    );
  };

  // testid, not the heading text: the e2e locator matched on the copy, and a
  // rewrite has turned a copy edit into a red build before.
  return (
    <section data-testid="exercise-gallery" className="border-t border-border bg-surface py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-8 text-center">
          <h2 className="break-words text-2xl font-bold text-text sm:text-3xl">
            {t("landing.gallery.title")}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {arrow(-1, "hidden h-14 w-14 md:inline-flex")}

          {/* keyed on the slide so paging remounts the exercise in its initial
              state. `landing-exercise` drops LessonShell's chrome — see
              globals.css — rather than threading a prop through three shared
              exercise components for a landing-only concern. */}
          <div
            key={current.id}
            className="landing-exercise min-w-0 flex-1 rounded-xl border-2 border-border bg-surface-2/40 p-4 md:p-6"
          >
            {current.id === "quiz" && (
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

            {current.id === "matching" && (
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

            {current.id === "categorize" && (
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

            {current.id === "code" && <CodeDemo />}
          </div>

          {arrow(1, "hidden h-14 w-14 md:inline-flex")}
        </div>

        {/* Caption and dots. Below md the arrows live here too — flanking the
            card would leave a phone about 250px for a drag exercise. */}
        <div className="mt-5 flex items-center justify-center gap-4">
          {arrow(-1, "inline-flex h-12 w-12 md:hidden")}

          <div className="flex flex-col items-center gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold text-text">
              <current.icon className="h-4 w-4 text-primary" aria-hidden="true" />
              {t(current.label)}
            </span>
            {/* The dot is 6px; the button around it is 24, which is what a
                finger has to find (WCAG 2.2 SC 2.5.8, specs/065). Sizing the
                button rather than padding the dot keeps the dot a dot — and
                keeps neighbouring targets apart: these sit side by side, so an
                invisible 24px halo on a 6px dot would overlap its neighbour
                and make every tap ambiguous. */}
            <span className="flex items-center gap-1">
              {SLIDES.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={t(slide.label)}
                  aria-current={i === index}
                  className="inline-flex h-6 min-w-6 items-center justify-center px-1"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-1.5 rounded-pill transition-all ${
                      i === index ? "w-6 bg-primary" : "w-1.5 bg-border-strong hover:bg-text-subtle"
                    }`}
                  />
                </button>
              ))}
            </span>
          </div>

          {arrow(1, "inline-flex h-12 w-12 md:hidden")}
        </div>

        {/* Only true for the three locally-graded slides. The code slide is
            marked by the server, and saying otherwise there would be a lie on
            the one slide that proves the opposite. */}
        {current.id !== "code" && (
          <p className="mt-6 text-center text-sm text-text-subtle">{t("landing.gallery.note")}</p>
        )}
      </div>
    </section>
  );
}
