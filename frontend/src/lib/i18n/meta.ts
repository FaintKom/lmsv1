// Locale metadata only — safe to import from any component without pulling
// translation dictionaries into the bundle. Dictionaries live in ./locales/*
// and are code-split per locale (see context.tsx).

export type Locale = "en" | "es" | "ru" | "tr" | "de" | "uk";

export const LOCALES: { code: Locale; name: string }[] = [
  { code: "en", name: "English" },
  { code: "es", name: "Español" },
  { code: "ru", name: "Русский" },
  { code: "tr", name: "Türkçe" },
  { code: "de", name: "Deutsch" },
  { code: "uk", name: "Українська" },
];

export const DEFAULT_LOCALE: Locale = "en";

export type TranslationMap = Record<string, string>;
