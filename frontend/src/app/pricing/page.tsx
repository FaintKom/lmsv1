"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
 ArrowRight,
 Check,
 Crown,
 GraduationCap,
 Minus,
 Sparkles,
 Star,
 Zap,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { Button } from "@/components/ui/button";

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

const PLAN_TAGLINE: Record<string, string> = {
 Free: "For trying GrassLMS with a small class",
 Starter: "For small schools and solo teachers",
 Professional: "For growing programs with real analytics needs",
 Enterprise: "For schools and districts that need the whole platform",
};

const FEATURE_ROWS: { key: string; label: string }[] = [
 { key: "sandbox", label: "Code sandbox (37 languages)" },
 { key: "certificates", label: "Course completion certificates" },
 { key: "analytics", label: "Advanced analytics" },
 { key: "ai_hints", label: "AI tutor hints" },
 { key: "white_label", label: "White label branding" },
 { key: "custom_domain", label: "Custom domain" },
];

const FAQ = [
 {
 q: "Can I try GrassLMS before paying?",
 a: "Yes — Free includes up to 10 students and 3 courses forever. No credit card required.",
 },
 {
 q: "What counts as a 'student'?",
 a: "Any user with the student role enrolled in at least one course in your organization. Teachers and admins are unlimited.",
 },
 {
 q: "Do you charge per student or per school?",
 a: "Plans are per school (per organization). The price is flat; only the student cap differs between tiers.",
 },
 {
 q: "Can I upgrade or downgrade later?",
 a: "Yes, any time through the Admin → Billing page. Upgrades are prorated. Downgrades take effect at the end of the current billing period.",
 },
 {
 q: "What happens to my data if I cancel?",
 a: "Your course content and student progress stay in place for 30 days. You can export everything as JSON at any time (GDPR Article 20). After 30 days of inactivity the account is archived and data is deleted on request.",
 },
 {
 q: "Do you offer discounts for schools?",
 a: "Yes. Registered non-profit educational institutions get 50% off any paid plan. Contact us with your registration details.",
 },
];

export default function PricingPage() {
 const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);

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
 <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
 <GraduationCap className="h-5 w-5 text-white" />
 </div>
 <span className="text-xl font-bold text-text">GrassLMS</span>
 </Link>
 <div className="flex items-center gap-3">
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

 <main className="mx-auto max-w-6xl px-6 py-16 md:py-20">
 {/* Hero */}
 <div className="mb-14 text-center">
 <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-text md:text-5xl">
 Simple, transparent pricing
 </h1>
 <p className="mx-auto max-w-2xl text-lg text-text-muted">
 Pick a plan that matches your school. Upgrade any time. Every plan
 includes the interactive code sandbox, 4C/ID course builder, and
 AI tutor on the student side.
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
 MOST POPULAR
 </div>
 )}
 <div className="mb-4 flex items-center gap-2 text-ink-700">
 {PLAN_ICON[plan.name]}
 <h3 className="text-lg font-bold">{plan.name}</h3>
 </div>
 <p className="mb-6 min-h-[40px] text-sm text-text-muted">
 {PLAN_TAGLINE[plan.name] || ""}
 </p>
 <div className="mb-6">
 <span className="text-4xl font-extrabold text-text">
 ${plan.price_monthly}
 </span>
 <span className="ml-1 text-sm text-text-muted">/ month</span>
 </div>
 <ul className="mb-6 space-y-2.5 text-sm text-ink-700">
 <li className="flex items-center gap-2">
 <Check className="h-4 w-4 text-primary" />
 {plan.max_students === null
 ? "Unlimited students"
 : `Up to ${plan.max_students} students`}
 </li>
 <li className="flex items-center gap-2">
 <Check className="h-4 w-4 text-primary" />
 {plan.max_courses === null
 ? "Unlimited courses"
 : `Up to ${plan.max_courses} courses`}
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
 {plan.price_monthly === 0 ? "Start Free" : "Start trial"}
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
 Full feature comparison
 </h2>
 <div className="overflow-x-auto rounded-lg border border-border-strong">
 <table className="w-full text-sm">
 <thead>
 <tr className="border-b border-border-strong bg-surface-2 text-left">
 <th className="p-4 font-semibold text-text-muted">Feature</th>
 {plans.map((p) => (
 <th
 key={p.id}
 className="p-4 text-center font-semibold text-text"
 >
 {p.name}
 </th>
 ))}
 </tr>
 </thead>
 <tbody>
 <tr className="border-b border-border">
 <td className="p-4 text-ink-700">Students</td>
 {plans.map((p) => (
 <td key={p.id} className="p-4 text-center text-ink-700">
 {p.max_students === null ? "Unlimited" : p.max_students}
 </td>
 ))}
 </tr>
 <tr className="border-b border-border">
 <td className="p-4 text-ink-700">Courses</td>
 {plans.map((p) => (
 <td key={p.id} className="p-4 text-center text-ink-700">
 {p.max_courses === null ? "Unlimited" : p.max_courses}
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
 Frequently asked questions
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
 Not sure which plan fits?
 </h2>
 <p className="mx-auto mb-6 max-w-xl text-success-soft">
 Start on Free and upgrade later once you know your class size.
 You can export your data at any time.
 </p>
 <Link href="/register">
 <Button
 size="lg"
 className="bg-paper-2 text-success-fg hover:bg-success-soft"
 >
 Create your school — it's free
 <ArrowRight className="h-5 w-5" />
 </Button>
 </Link>
 </div>
 </main>

 {/* Footer */}
 <footer className="border-t border-border py-10 text-center text-sm text-text-subtle">
 <div className="mx-auto max-w-6xl px-6">
 <p>&copy; {new Date().getFullYear()} GrassLMS. All rights reserved.</p>
 </div>
 </footer>
 </div>
 );
}
