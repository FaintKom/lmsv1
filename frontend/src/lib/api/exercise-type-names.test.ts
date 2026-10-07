import { describe, expect, it } from "vitest";

import { LOCALES, translations } from "@/lib/i18n/translations";

import { EXERCISE_TYPES_META, exerciseTypeLabelKey, exerciseTypeName } from "./exercises";

// specs/070: type names used to be English strings in code, so a Russian
// teacher saw "Quiz" under a translated "Базовые". The dictionaries are now the
// only source, and every type has to be in every one of them.
describe("exercise type names", () => {
  it.each(LOCALES.map((l) => l.code))("every type is named in %s", (locale) => {
    const missing = EXERCISE_TYPES_META.map((m) => exerciseTypeLabelKey(m.value)).filter(
      (key) => !translations[locale][key],
    );
    expect(missing).toEqual([]);
  });

  it("Russian names are not the English ones", () => {
    const untranslated = EXERCISE_TYPES_META.filter(
      (m) =>
        m.value !== "scorm_package" &&
        translations.ru[exerciseTypeLabelKey(m.value)] === translations.en[exerciseTypeLabelKey(m.value)],
    ).map((m) => m.value);
    expect(untranslated).toEqual([]);
  });

  it("a type the dictionaries do not know names itself, not its key", () => {
    const t = (key: string) => translations.ru[key] ?? key;
    expect(exerciseTypeName(t, "fill_blanks")).toBe("Пропуски");
    expect(exerciseTypeName(t, "brand_new_type")).toBe("brand_new_type");
  });
});
