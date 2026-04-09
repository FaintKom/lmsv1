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
  Free: "For trying LearnHub with a small class",
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
    q: "Can I try LearnHub before paying?",
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
    <div className="min-h-screen bg-white">
      {/* Header — matches landing page */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">LearnHub</span>
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
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-500">
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
                className={`relative flex flex-col rounded-2xl border p-6 shadow-sm ${
                  isPopular
                    ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-500/30"
                    : "border-slate-200 bg-white"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-4 flex items-center gap-2 text-slate-700">
                  {PLAN_ICON[plan.name]}
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                </div>
                <p className="mb-6 min-h-[40px] text-sm text-slate-500">
                  {PLAN_TAGLINE[plan.name] || ""}
                </p>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold text-slate-900">
                    ${plan.price_monthly}
                  </span>
                  <span className="ml-1 text-sm text-slate-500">/ month</span>
                </div>
                <ul className="mb-6 space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {plan.max_students === null
                      ? "Unlimited students"
                      : `Up to ${plan.max_students} students`}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {plan.max_courses === null
                      ? "Unlimited courses"
                      : `Up to ${plan.max_courses} courses`}
                  </li>
                  {FEATURE_ROWS.filter((r) => plan.features?.[r.key]).map(
                    (r) => (
                      <li key={r.key} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500" />
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
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">
            Full feature comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left">
                  <th className="p-4 font-semibold text-slate-600">Feature</th>
                  {plans.map((p) => (
                    <th
                      key={p.id}
                      className="p-4 text-center font-semibold text-slate-900"
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="p-4 text-slate-700">Students</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-4 text-center text-slate-700">
                      {p.max_students === null ? "Unlimited" : p.max_students}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="p-4 text-slate-700">Courses</td>
                  {plans.map((p) => (
                    <td key={p.id} className="p-4 text-center text-slate-700">
                      {p.max_courses === null ? "Unlimited" : p.max_courses}
                    </td>
                  ))}
                </tr>
                {FEATURE_ROWS.map((row) => (
                  <tr
                    key={row.key}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="p-4 text-slate-700">{row.label}</td>
                    {plans.map((p) => (
                      <td key={p.id} className="p-4 text-center">
                        {p.features?.[row.key] ? (
                          <Check className="mx-auto h-4 w-4 text-emerald-500" />
                        ) : (
                          <Minus className="mx-auto h-4 w-4 text-slate-300" />
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
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">
            Frequently asked questions
          </h2>
          <div className="mx-auto max-w-3xl space-y-4">
            {FAQ.map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-sm"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-3 text-base font-semibold text-slate-900">
                  <span>{item.q}</span>
                  <span className="text-slate-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 px-8 py-12 text-center text-white">
          <h2 className="mb-3 text-3xl font-extrabold">
            Not sure which plan fits?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-indigo-100">
            Start on Free and upgrade later once you know your class size.
            You can export your data at any time.
          </p>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-white text-indigo-700 hover:bg-indigo-50"
            >
              Create your school — it's free
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-10 text-center text-sm text-slate-400">
        <div className="mx-auto max-w-6xl px-6">
          <p>&copy; {new Date().getFullYear()} LearnHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
