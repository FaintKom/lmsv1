"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/meta";

function HeaderLocaleSwitcher() {
 const { locale, setLocale } = useTranslation();
 const [open, setOpen] = useState(false);
 const ref = useRef<HTMLDivElement>(null);

 useEffect(() => {
 const handler = (e: MouseEvent) => {
 if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
 };
 document.addEventListener("mousedown", handler);
 return () => document.removeEventListener("mousedown", handler);
 }, []);

 const current = LOCALES.find((l) => l.code === locale);

 return (
 <div ref={ref} className="relative">
 <button
 onClick={() => setOpen(!open)}
 className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-2 hover:text-text"
 aria-label="Change language"
 aria-expanded={open}
 aria-haspopup="listbox"
 >
 <Globe className="h-3.5 w-3.5" aria-hidden="true" />
 <span>{current?.flag}</span>
 </button>
 {open && (
 <div
 role="listbox"
 aria-label="Select language"
 className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border-strong bg-surface py-1 shadow-lg z-50"
 >
 {LOCALES.map((l) => (
 <button
 key={l.code}
 onClick={() => {
 setLocale(l.code as Locale);
 setOpen(false);
 }}
 className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-surface-2 ${
 locale === l.code ? "font-semibold text-primary" : "text-text-muted"
 }`}
 >
 <span>{l.flag}</span>
 <span>{l.name}</span>
 </button>
 ))}
 </div>
 )}
 </div>
 );
}

export function LandingHeader() {
 // These labels were hardcoded English. The file passed the i18n ratchet
 // because HeaderLocaleSwitcher above calls useTranslation(), so the header
 // stayed English in every locale — and disagreed with the same actions
 // further down the page ("Sign In" vs "Sign in", "Try Demo" vs "Try the
 // demo"). They now use the keys the page body already uses.
 const { t } = useTranslation();
 return (
 <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-lg">
 <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
 <div className="flex items-center gap-2.5">
 <div className="relative flex h-9 w-9 items-center justify-center rounded-sm bg-green-500 text-lg font-extrabold text-white">
 g
 <span className="absolute bottom-[4px] right-[5px] h-[5px] w-[5px] rounded-full bg-sun-400" />
 </div>
 <span className="text-lg font-bold text-text sm:text-xl">GrassLMS</span>
 </div>
 <div className="flex items-center gap-3">
 <HeaderLocaleSwitcher />
 {/* Repeated in the hero. On a 390px screen these two are what push
     Get Started past the right edge, so they drop below sm. */}
 <Link href="/demo?role=student" className="hidden sm:block">
 <Button variant="ghost" size="sm">
 {t("landing.ctaTryDemo")}
 </Button>
 </Link>
 <Link href="/login" className="hidden sm:block">
 <Button variant="ghost" size="sm">
 {t("landing.signIn")}
 </Button>
 </Link>
 <Link href="/register">
 <Button size="sm" className="whitespace-nowrap">
 {t("landing.getStarted")}
 {/* At 320px the arrow is what tips the button past the edge. */}
 <ArrowRight className="hidden h-4 w-4 sm:block" />
 </Button>
 </Link>
 </div>
 </div>
 </header>
 );
}
