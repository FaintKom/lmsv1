// Locale metadata only — safe to import from any component without pulling
// translation dictionaries into the bundle. Dictionaries live in ./locales/*
// and are code-split per locale (see context.tsx).

export type Locale = "en" | "es" | "ru" | "tr" | "de" | "uk";

export const LOCALES: { code: Locale; name: string; flag: string }[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "es", name: "Espanol", flag: "🇪🇸" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "tr", name: "Turkce", flag: "🇹🇷" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "uk", name: "Українська", flag: "🇺🇦" },
];

export const DEFAULT_LOCALE: Locale = "en";

export type TranslationMap = Record<string, string>;
