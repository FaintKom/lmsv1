/**
 * Which subject a course belongs to, for its field colour (specs/071).
 *
 * `courses.category` is free text typed by whoever created the course. On prod
 * (2026-09-30) it held Languages, Programming, programming, Mathematics,
 * platform, testing and null. Matching on word stems in the six UI languages
 * covers those and the obvious variants; anything else gets the neutral field.
 *
 * ponytail: a keyword list, not a column. Add `courses.subject` with a
 * migration once schools start inventing their own categories.
 */
export type Subject = "lang" | "math" | "code" | "other";

const STEMS: [Subject, RegExp][] = [
  ["lang", /language|english|german|spanish|french|язык|englisch|sprach|idioma|dil|мов/],
  ["math", /math|algebra|geometr|calculus|матем|алгебр|геометр|mathe|matem/],
  ["code", /program|coding|computer|python|javascript|informatic|программ|информат|програм|yazılım/],
];

export function subjectOf(category: string | null | undefined): Subject {
  const c = (category ?? "").trim().toLowerCase();
  if (!c) return "other";
  return STEMS.find(([, re]) => re.test(c))?.[0] ?? "other";
}

/** Tailwind surface class per subject; text on it is `text-subject-ink`. */
export const SUBJECT_SURFACE: Record<Subject, string> = {
  lang: "bg-subject-lang",
  math: "bg-subject-math",
  code: "bg-subject-code",
  other: "bg-subject-other",
};
