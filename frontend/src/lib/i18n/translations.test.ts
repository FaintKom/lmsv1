import { describe, expect, it } from "vitest";

import { DEFAULT_LOCALE, LOCALES, translations } from "./translations";
import { EXERCISE_TYPES_META } from "@/lib/api/exercises";

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

 const enKeys = new Set(Object.keys(translations.en));

 it.each(
 LOCALES.filter((l) => l.code !== DEFAULT_LOCALE).map((l) => l.code),
 )("has the same keys in en and %s", (locale) => {
 const other = new Set(Object.keys(translations[locale]));

 const missing = [...enKeys].filter((k) => !other.has(k));
 const extra = [...other].filter((k) => !enKeys.has(k));

 expect(missing).toEqual([]);
 expect(extra).toEqual([]);
 });

 it.each(LOCALES.map((l) => l.code))(
 "has no empty-string values in %s",
 (locale) => {
 const empty = Object.entries(translations[locale])
 .filter(([, v]) => !v || v.trim() === "")
 .map(([k]) => k);
 expect(empty).toEqual([]);
 },
 );

 /**
  * The landing page gives the number of exercise types as a fact, and says so
  * out loud. It went stale the first time a type was added — the registry
  * reached 25 while the page still read 24 — so the claim is pinned here.
  */
 it.each(LOCALES.map((l) => l.code))(
 "states the real exercise-type count in %s",
 (locale) => {
 expect(translations[locale]["landing.facts.typesValue"]).toBe(
 String(EXERCISE_TYPES_META.length),
 );
 },
 );
});
