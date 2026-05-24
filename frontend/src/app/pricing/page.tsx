"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
 ArrowRight,
 Check,
 Crown,
 Minus,
 Sparkles,
 Star,
 Zap,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n/context";

interface Plan {
 id: string;
 name: string;
 price_monthly: number;
 max_students: number | null;
 max_courses: number | null;
 features: Record<string, boolean>;
}

// Static fallback shown if the API is unreachable (matches the seeded plans
// in backend/app/billing/service.py::seed_default_plans).
const FALLBACK_PLANS: Plan[] = [
 {
 id: "free",
 name: "Free",
 price_monthly: 0,
 max_students: 10,
 max_courses: 3,
 features: { sandbox: true, certificates: false, analytics: false, ai_hints: false, white_label: false, custom_domain: false },
 },
 {
 id: "starter",
 name: "Starter",
 price_monthly: 29,
 max_students: 50,
 max_courses: 15,
 features: { sandbox: true, certificates: true, analytics: false, ai_hints: false, white_label: false, custom_domain: false },
 },
 {
 id: "professional",
 name: "Professional",
 price_monthly: 79,
 max_students: 250,
 max_courses: 50,
 features: { sandbox: true, certificates: true, analytics: true, ai_hints: true, white_label: false, custom_domain: false },
 },
 {
 id: "enterprise",
 name: "Enterprise",
 price_monthly: 199,
 max_students: null,
 max_courses: null,
 features: { sandbox: true, certificates: true, analytics: true, ai_hints: true, white_label: true, custom_domain: true },
 },
];

const PLAN_ORDER = ["Free", "Starter", "Professional", "Enterprise"];

const PLAN_ICON: Record<string, React.ReactNode> = {
 Free: <Zap className="h-5 w-5" />,
 Starter: <Star className="h-5 w-5" />,
 Professional: <Sparkles className="h-5 w-5" />,
 Enterprise: <Crown className="h-5 w-5" />,
};

export default function PricingPage() {
 const { t } = useTranslation();
 const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);

 const planNameLabel = (name: string): string => {
 if (name === "Free") return t("pricing.planFree");
 if (name === "Starter") return t("pricing.planStarter");
 if (name === "Professional") return t("pricing.planPro");
 if (name === "Enterprise") return t("pricing.planEnterprise");
 return name;
 };

 const PLAN_TAGLINE: Record<string, string> = {
 Free: t("pricing.taglineFree"),
 Starter: t("pricing.taglineStarter"),
 Professional: t("pricing.taglinePro"),
 Enterprise: t("pricing.taglineEnterprise"),
 };

 const FEATURE_ROWS: { key: string; label: string }[] = [
 { key: "sandbox", label: t("pricing.featSandbox") },
 { key: "certificates", label: t("pricing.featCertificates") },
 { key: "analytics", label: t("pricing.featAnalytics") },
 { key: "ai_hints", label: t("pricing.featAiHints") },
 { key: "white_label", label: t("pricing.featWhiteLabel") },
 { key: "custom_domain", label: t("pricing.featCustomDomain") },
 ];

 const FAQ = [
 { q: t("pricing.faq1Q"), a: t("pricing.faq1A") },
 { q: t("pricing.faq2Q"), a: t("pricing.faq2A") },
 { q: t("pricing.faq3Q"), a: t("pricing.faq3A") },
 { q: t("pricing.faq4Q"), a: t("pricing.faq4A") },
 { q: t("pricing.faq5Q"), a: t("pricing.faq5A") },
 { q: t("pricing.faq6Q"), a: t("pricing.faq6A") },
 ];

 useEffect(() => {
 apiClient
 .get("/billing/plans")
 .then(({ data }) => {
 if (Array.isArray(data) && data.length > 0) {
 // Deduplicate by name and sort into canonical order
 const seen = new Set<string>();
 const unique: Plan[] = [];
 for (const p of data as Plan[]) {
 if (!seen.has(p.name)) {
 seen.add(p.name);
 unique.push(p);
 }
 }
 unique.sort(
 (a, b) =>
 PLAN_ORDER.indexOf(a.name) - PLAN_ORDER.indexOf(b.name)
 );
 setPlans(unique);
 }
 })
 .catch(() => {
 // Keep fallback
 });
 }, []);

 return (
 <div className="min-h-screen bg-paper-2">
 {/* Header — matches landing page */}
 <header className="sticky top-0 z-50 border-b border-border bg-paper-2/80 backdrop-blur-lg">
 <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
 <Link href="/" className="flex items-center gap-2.5">
 <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-green-500 text-lg font-extrabold text-white">
 g
 <span className="absolute bottom-[4px] right-[5px] h-[5px] w-[5px] rounded-full bg-sun-400" />
 </div>
 <span className="text-xl font-bold text-text">GrassLMS</span>
 </Link>
 <div className="flex items-center gap-3">
 <Link href="/login">
 <Button variant="ghost" size="sm">
 {t("pricing.signIn")}
 </Button>
 </Link>
 <Link href="/register">
 <Button size="sm">
 {t("pricing.getStarted")}
 <ArrowRight className="h-4 w-4" />
 </Button>
 </Link>
 </div>
 </div>
 </header>

 <main className="mx-auto max-w-6xl px-6 py-16 md:py-20">
 {/* Hero */}
 <div className="mb-14 text-center">
 <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-text md:text-5xl">
 {t("pricing.heroTitle")}
 </h1>
 <p className="mx-auto max-w-2xl text-lg text-text-muted">
 {t("pricing.heroSub")}
 </p>
 </div>

 {/* Tier cards */}
 <div className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
 {plans.map((plan) => {
 const isPopular = plan.name === "Professional";
 return (
 <div
 key={plan.id}
 className={`relative flex flex-col rounded-lg border p-6 shadow-sm ${
 isPopular
 ? "border-green-300 bg-success-soft ring-2 ring-green-500/30"
 : "border-border-strong bg-paper-2"
 }`}
 >
 {isPopular && (
 <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill bg-primary px-3 py-1 text-xs font-semibold text-white">
 {t("pricing.mostPopular")}
 </div>
 )}
 <div className="mb-4 flex items-center gap-2 text-ink-700">
 {PLAN_ICON[plan.name]}
 <h3 className="text-lg font-bold">{planNameLabel(plan.name)}</h3>
 </div>
 <p className="mb-6 min-h-[40px] text-sm text-text-muted">
 {PLAN_TAGLINE[plan.name] || ""}
 </p>
 <div className="mb-6">
 <span className="text-4xl font-extrabold text-text">
 ${plan.price_monthly}
 </span>
 <span className="ml-1 text-sm text-text-muted">{t("pricing.perMonth")}</span>
 </div>
 <ul className="mb-6 space-y-2.5 text-sm text-ink-700">
 <li className="flex items-center gap-2">
 <Check className="h-4 w-4 text-primary" />
 {plan.max_students === null
 ? t("pricing.unlimitedStudents")
 : t("pricing.upToStudents").replace("{n}", String(plan.max_students))}
 </li>
 <li className="flex items-center gap-2">
 <Check className="h-4 w-4 text-primary" />
 {plan.max_courses === null
 ? t("pricing.unlimitedCourses")
 : t("pricing.upToCourses").replace("{n}", String(plan.max_courses))}
 </li>
 {FEATURE_ROWS.filter((r) => plan.features?.[r.key]).map(
 (r) => (
 <li key={r.key} className="flex items-center gap-2">
 <Check className="h-4 w-4 text-primary" />
 {r.label}
 </li>
 )
 )}
 </ul>
 <div className="mt-auto">
 <Link href="/register">
 <Button
 className="w-full"
 variant={isPopular ? "default" : "outline"}
 >
 {plan.price_monthly === 0 ? t("pricing.startFree") : t("pricing.startTrial")}
 </Button>
 </Link>
 </div>
 </div>
 );
 })}
 </div>

 {/* Feature comparison */}
 <div className="mb-20">
 <h2 className="mb-8 text-center text-2xl font-bold text-text">
 {t("pricing.fullComparison")}
 </h2>
 <div className="overflow-x-auto rounded-lg border border-border-strong">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border-strong bg-surface-2 text-left">
 <th className="p-4 font-semibold text-text-muted">{t("pricing.tableFeature")}</th>
 {plans.map((p) => (
 <th
 key={p.id}
 className="p-4 text-center font-semibold text-text"
 >
 {planNameLabel(p.name)}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 <tr className="border-b border-border">
 <td className="p-4 text-ink-700">{t("pricing.tableStudents")}</td>
 {plans.map((p) => (
 <td key={p.id} className="p-4 text-center text-ink-700">
 {p.max_students === null ? t("pricing.tableUnlimited") : p.max_students}
 </td>
 ))}
 </tr>
 <tr className="border-b border-border">
 <td className="p-4 text-ink-700">{t("pricing.tableCourses")}</td>
 {plans.map((p) => (
 <td key={p.id} className="p-4 text-center text-ink-700">
 {p.max_courses === null ? t("pricing.tableUnlimited") : p.max_courses}
 </td>
 ))}
 </tr>
 {FEATURE_ROWS.map((row) => (
 <tr
 key={row.key}
 className="border-b border-border last:border-0"
 >
 <td className="p-4 text-ink-700">{row.label}</td>
 {plans.map((p) => (
 <td key={p.id} className="p-4 text-center">
 {p.features?.[row.key] ? (
 <Check className="mx-auto h-4 w-4 text-primary" />
 ) : (
 <Minus className="mx-auto h-4 w-4 text-ink-300" />
 )}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 </div>

 {/* FAQ */}
 <div className="mb-20">
 <h2 className="mb-8 text-center text-2xl font-bold text-text">
 {t("pricing.faqTitle")}
 </h2>
 <div className="mx-auto max-w-3xl space-y-4">
 {FAQ.map((item) => (
 <details
 key={item.q}
 className="group rounded-lg border border-border-strong bg-paper-2 p-5 transition-shadow hover:shadow-sm"
 >
 <summary className="flex cursor-pointer items-start justify-between gap-3 text-base font-semibold text-text">
 <span>{item.q}</span>
 <span className="text-text-subtle transition-transform group-open:rotate-45">
 +
 </span>
 </summary>
 <p className="mt-3 text-sm leading-relaxed text-text-muted">
 {item.a}
 </p>
 </details>
 ))}
 </div>
 </div>

 {/* Bottom CTA */}
 <div className="rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 px-8 py-12 text-center text-white">
 <h2 className="mb-3 text-3xl font-extrabold">
 {t("pricing.bottomCtaTitle")}
 </h2>
 <p className="mx-auto mb-6 max-w-xl text-success-soft">
 {t("pricing.bottomCtaSub")}
 </p>
 <Link href="/register">
 <Button
 size="lg"
 className="bg-paper-2 text-success-fg hover:bg-success-soft"
 >
 {t("pricing.bottomCtaButton")}
 <ArrowRight className="h-5 w-5" />
 </Button>
 </Link>
 </div>
 </main>

 {/* Footer */}
 <footer className="border-t border-border py-10 text-center text-sm text-text-subtle">
 <div className="mx-auto max-w-6xl px-6">
 <p>{t("pricing.copyright").replace("{year}", String(new Date().getFullYear()))}</p>
 </div>
 </footer>
 </div>
 );
}
