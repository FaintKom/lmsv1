"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { GraduationCap, ArrowRight, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";
import { LOCALES, type Locale } from "@/lib/i18n/translations";

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
 className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-text-muted hover:bg-ink-100 hover:text-ink-700"
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
 className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-border-strong bg-paper-2 py-1 shadow-lg z-50"
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
 return (
 <header className="sticky top-0 z-50 border-b border-border bg-paper-2/80 backdrop-blur-lg">
 <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
 <div className="flex items-center gap-2.5">
 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
 <GraduationCap className="h-5 w-5 text-white" />
 </div>
 <span className="text-xl font-bold text-text">GrassLMS</span>
 </div>
 <div className="flex items-center gap-3">
 <HeaderLocaleSwitcher />
 <Link href="/demo">
 <Button variant="ghost" size="sm">
 Try Demo
 </Button>
 </Link>
 <Link href="/login">
 <Button variant="ghost" size="sm">
 Sign In
 </Button>
 </Link>
 <Link href="/register">
 <Button size="sm">
 Get Started
 <ArrowRight className="h-4 w-4" />
 </Button>
 </Link>
 </div>
 </div>
 </header>
 );
}
