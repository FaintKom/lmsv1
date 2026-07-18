"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { type Locale, type TranslationMap, DEFAULT_LOCALE, LOCALES } from "./meta";
import en from "./locales/en";

interface I18nContextType {
 locale: Locale;
 setLocale: (locale: Locale) => void;
 t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType>({
 locale: DEFAULT_LOCALE,
 setLocale: () => {},
 t: (key: string) => key,
});

/**
 * Per-locale dynamic imports — each locale is its own chunk, fetched only
 * when the user actually switches to it. English ships statically as the
 * default/fallback dictionary. Importing ./translations here would pull all
 * six dictionaries (~1MB source) back into the client bundle — don't.
 */
const loaders: Record<Locale, () => Promise<{ default: TranslationMap }>> = {
 en: () => Promise.resolve({ default: en }),
 es: () => import("./locales/es"),
 ru: () => import("./locales/ru"),
 tr: () => import("./locales/tr"),
 de: () => import("./locales/de"),
 uk: () => import("./locales/uk"),
};

// Module-level cache so a locale is fetched once per session and locale
// switches after the first are instant.
const loaded: Partial<Record<Locale, TranslationMap>> = { en };

function isLocale(value: string): value is Locale {
 return LOCALES.some((l) => l.code === value);
}

function getStoredLocale(): Locale {
 if (typeof window === "undefined") return DEFAULT_LOCALE;
 const stored = localStorage.getItem("locale");
 if (stored && isLocale(stored)) return stored;
 // Try browser language
 const browserLang = navigator.language.slice(0, 2);
 if (isLocale(browserLang)) return browserLang;
 return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
 const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
 // Bumped when a dictionary finishes loading so `t` re-renders consumers.
 const [, setLoadedTick] = useState(0);

 const ensureLoaded = useCallback((target: Locale) => {
 if (loaded[target]) return;
 loaders[target]()
 .then((mod) => {
 loaded[target] = mod.default;
 setLoadedTick((n) => n + 1);
 })
 .catch(() => {
 // Chunk fetch failed (offline / deploy raced the session) —
 // English fallback in t() keeps the UI usable.
 });
 }, []);

 useEffect(() => {
 const initial = getStoredLocale();
 setLocaleState(initial);
 ensureLoaded(initial);
 }, [ensureLoaded]);

 const setLocale = useCallback((newLocale: Locale) => {
 setLocaleState(newLocale);
 ensureLoaded(newLocale);
 localStorage.setItem("locale", newLocale);
 document.documentElement.lang = newLocale;
 }, [ensureLoaded]);

 const t = useCallback(
 (key: string): string => {
 return loaded[locale]?.[key] || en[key] || key;
 },
 [locale]
 );

 return (
 <I18nContext.Provider value={{ locale, setLocale, t }}>
 {children}
 </I18nContext.Provider>
 );
}

export function useTranslation() {
 return useContext(I18nContext);
}
