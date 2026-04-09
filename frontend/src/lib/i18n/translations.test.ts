import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, LOCALES, translations } from "./translations";

/**
 * Translation parity tests.
 *
 * These catch a very specific class of bug: adding a new UI string to the
 * English dictionary and forgetting to add it to the Russian one (or vice
 * versa). Without this test, the missing-key fallback is silent — users
 * just see the English string showing up in a Russian UI and nobody
 * notices until a customer complains.
 *
 * Baseline as of P0-13 was 354/354 en/ru parity. If you add a new key,
 * update both dictionaries in the same commit.
 */

describe("translations", () => {
  it("declares a default locale that exists in the map", () => {
    expect(translations).toHaveProperty(DEFAULT_LOCALE);
  });

  it("advertises the same locales in LOCALES as in translations", () => {
    const declared = new Set(LOCALES.map((l) => l.code));
    const available = new Set(Object.keys(translations));
    expect(declared).toEqual(available);
  });

  it("has the same keys in en and ru (P0-13 parity)", () => {
    const en = new Set(Object.keys(translations.en));
    const ru = new Set(Object.keys(translations.ru));

    const missingFromRu = [...en].filter((k) => !ru.has(k));
    const extraInRu = [...ru].filter((k) => !en.has(k));

    expect(missingFromRu).toEqual([]);
    expect(extraInRu).toEqual([]);
  });

  it("has no empty-string values in en (missing translation)", () => {
    const empty = Object.entries(translations.en)
      .filter(([, v]) => !v || v.trim() === "")
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });

  it("has no empty-string values in ru", () => {
    const empty = Object.entries(translations.ru)
      .filter(([, v]) => !v || v.trim() === "")
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });
});
