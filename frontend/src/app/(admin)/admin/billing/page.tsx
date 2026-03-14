"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CreditCard,
  DollarSign,
  Receipt,
  Check,
  Star,
  Zap,
  Crown,
  Loader2,
  ExternalLink,
  CheckCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

interface Plan {
  id: string;
  name: string;
  price_monthly: number;
  max_students: number;
  max_courses: number;
  features: Record<string, boolean>;
}

interface SubscriptionData {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

interface InvoiceData {
  id: string;
  amount_cents: number;
  status: string;
  invoice_url: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
}

const PLAN_ICONS: Record<string, React.ReactNode> = {
  Free: <Zap className="h-6 w-6" />,
  Starter: <Star className="h-6 w-6" />,
  Professional: <CreditCard className="h-6 w-6" />,
  Enterprise: <Crown className="h-6 w-6" />,
};

const PLAN_COLORS: Record<string, string> = {
  Free: "border-slate-200 bg-white",
  Starter: "border-blue-200 bg-blue-50",
  Professional: "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500",
  Enterprise: "border-amber-200 bg-amber-50",
};

const FEATURE_LABELS: Record<string, string> = {
  sandbox: "Code Sandbox",
  analytics: "Advanced Analytics",
  certificates: "Certificates",
  ai_hints: "AI Tutoring",
  white_label: "White Label",
  custom_domain: "Custom Domain",
};

export default function AdminBillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get("/billing/plans").then(({ data }) => data).catch(() => []),
      apiClient.get("/billing/subscription").then(({ data }) => data).catch(() => null),
      apiClient.get("/billing/invoices").then(({ data }) => data).catch(() => []),
    ])
      .then(([plansData, subData, invoicesData]) => {
        setPlans(plansData);
        setSubscription(subData);
        setInvoices(invoicesData);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCheckout = async (planId: string) => {
    setCheckingOut(planId);
    try {
      const { data } = await apiClient.post("/billing/checkout", {
        plan_id: planId,
      });
      window.location.href = data.checkout_url;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Checkout failed";
      toast.error(msg);
    } finally {
      setCheckingOut(null);
    }
  };

  const handlePortal = async () => {
    try {
      const { data } = await apiClient.post("/billing/portal");
      window.location.href = data.portal_url;
    } catch {
      toast.error("Could not open billing portal. Make sure Stripe is configured.");
    }
  };

  const currentPlan = plans.find((p) => p.id === subscription?.plan_id);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <Skeleton className="mb-2 h-4 w-48" />
        <Skeleton className="mb-8 h-8 w-52" />
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-5">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mb-4 h-6 w-36" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-5">
              <Skeleton className="mb-4 h-10 w-10 rounded-xl" />
              <Skeleton className="mb-2 h-6 w-24" />
              <Skeleton className="mb-4 h-10 w-20" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="mt-4 h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Billing" }]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Billing & Plans</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current subscription info */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-emerald-50 p-3">
              <DollarSign className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Current Plan</p>
              <p className="text-xl font-bold text-slate-900">
                {currentPlan?.name || "Free"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-blue-50 p-3">
              <CreditCard className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Status</p>
              <p className="text-xl font-bold text-slate-900">
                {subscription ? (
                  <span className={subscription.status === "active" ? "text-emerald-600" : "text-amber-600"}>
                    {subscription.status}
                  </span>
                ) : (
                  "No subscription"
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-xl bg-violet-50 p-3">
              <Receipt className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400">Monthly Cost</p>
              <p className="text-xl font-bold text-slate-900">
                ${currentPlan?.price_monthly || 0}/mo
              </p>
            </div>
            {subscription && (
              <Button variant="outline" size="sm" className="ml-auto" onClick={handlePortal}>
                Manage <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plans grid */}
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Available Plans</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === subscription?.plan_id;
          const recommended = plan.name === "Professional";

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-shadow hover:shadow-lg ${PLAN_COLORS[plan.name] || "border-slate-200"}`}
            >
              {recommended && (
                <div className="absolute right-0 top-0 bg-indigo-600 px-3 py-1 text-[10px] font-bold uppercase text-white">
                  Popular
                </div>
              )}
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`rounded-xl p-2 ${recommended ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-600"}`}>
                    {PLAN_ICONS[plan.name] || <Zap className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-slate-900">${plan.price_monthly}</span>
                  <span className="text-sm text-slate-400">/month</span>
                </div>

                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {plan.max_students === -1 ? "Unlimited" : plan.max_students} students
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Check className="h-4 w-4 text-emerald-500" />
                    {plan.max_courses === -1 ? "Unlimited" : plan.max_courses} courses
                  </div>
                  {Object.entries(plan.features).map(([key, enabled]) => (
                    <div
                      key={key}
                      className={`flex items-center gap-2 ${enabled ? "text-slate-600" : "text-slate-300 line-through"}`}
                    >
                      {enabled ? (
                        <Check className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span className="inline-block h-4 w-4 text-center text-slate-300">-</span>
                      )}
                      {FEATURE_LABELS[key] || key}
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <Button disabled className="w-full">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Current Plan
                  </Button>
                ) : plan.price_monthly === 0 ? (
                  <Button variant="outline" disabled className="w-full">
                    Free tier
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${recommended ? "bg-indigo-600 hover:bg-indigo-700" : ""}`}
                    onClick={() => handleCheckout(plan.id)}
                    disabled={!!checkingOut}
                  >
                    {checkingOut === plan.id && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Subscribe
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              Invoice History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-400">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Period</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0">
                      <td className="py-3 text-slate-700">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-medium text-slate-900">
                        ${(inv.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500">
                        {new Date(inv.period_start).toLocaleDateString()} - {new Date(inv.period_end).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {inv.invoice_url && (
                          <a
                            href={inv.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            View <ExternalLink className="ml-0.5 inline h-3 w-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
