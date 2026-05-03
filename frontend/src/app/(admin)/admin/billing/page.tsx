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
  Free: "border-ink-200 dark:border-white/10 bg-white dark:bg-[#2C2C2C]",
  Starter: "border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/20",
  Professional: "border-green-300 dark:border-green-500/30 bg-green-50 dark:bg-green-500/20 ring-2 ring-green-500",
  Enterprise: "border-sun-100 dark:border-sun-500/30 bg-sun-50 dark:bg-sun-500/20",
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
  const [billingEnabled, setBillingEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get("/billing/status").then(({ data }) => data).catch(() => ({ enabled: false })),
      apiClient.get("/billing/plans").then(({ data }) => data).catch(() => []),
      apiClient.get("/billing/subscription").then(({ data }) => data).catch(() => null),
      apiClient.get("/billing/invoices").then(({ data }) => data).catch(() => []),
    ])
      .then(([statusData, plansData, subData, invoicesData]) => {
        setBillingEnabled(Boolean(statusData?.enabled));
        // Deduplicate plans by name (keep first occurrence)
        const seen = new Set<string>();
        const unique = (plansData as Plan[]).filter((p) => {
          if (seen.has(p.name)) return false;
          seen.add(p.name);
          return true;
        });
        setPlans(unique);
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
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "";
      if (detail.includes("Stripe is not configured")) {
        toast.error("Payments are not available yet. Stripe is not configured.");
      } else {
        toast.error(detail || "Could not start checkout. Please try again.");
      }
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
            <div key={i} className="rounded-xl border border-ink-200 dark:border-white/10 p-5">
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="mb-4 h-6 w-36" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-ink-200 dark:border-white/10 p-5">
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-100">Billing & Plans</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Manage your subscription and billing
        </p>
      </div>

      {/* Billing-disabled placeholder — no Stripe keys configured */}
      {billingEnabled === false && (
        <div className="mb-8 rounded-xl border border-sun-100 bg-sun-50 p-5 dark:border-sun-400/30 dark:bg-sun-500/10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun-100 dark:bg-sun-500/20">
              <CreditCard className="h-4 w-4 text-sun-700 dark:text-sun-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-sun-700 dark:text-sun-100">
                Billing is not enabled yet
              </p>
              <p className="mt-1 text-xs text-sun-700 dark:text-sun-300/80">
                Stripe has not been connected on this deployment. Plan listings below are informational only — subscriptions cannot be purchased until an administrator configures <code className="font-mono">STRIPE_SECRET_KEY</code> and <code className="font-mono">STRIPE_WEBHOOK_SECRET</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Current subscription info */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-green-400">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 dark:bg-green-500/20 p-3">
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-400 dark:text-ink-400">Current Plan</p>
              <p className="text-xl font-bold text-ink-900 dark:text-ink-100">
                {currentPlan?.name || "Free"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-400">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-blue-100 dark:bg-blue-500/20 p-3">
              <CreditCard className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-400 dark:text-ink-400">Status</p>
              <p className="text-xl font-bold text-ink-900 dark:text-ink-100">
                {subscription ? (
                  <span className={subscription.status === "active" ? "text-green-600" : "text-sun-500"}>
                    {subscription.status}
                  </span>
                ) : (
                  "No subscription"
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-400">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-xl bg-green-100 dark:bg-green-500/20 p-3">
              <Receipt className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-ink-400 dark:text-ink-400">Monthly Cost</p>
              <p className="text-xl font-bold text-ink-900 dark:text-ink-100">
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
      <h2 className="mb-4 text-lg font-semibold text-ink-900 dark:text-ink-100">Available Plans</h2>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent = plan.id === subscription?.plan_id;
          const recommended = plan.name === "Professional";

          return (
            <Card
              key={plan.id}
              className={`relative overflow-hidden transition-shadow hover:shadow-lg ${PLAN_COLORS[plan.name] || "border-ink-200 dark:border-white/10"}`}
            >
              {recommended && (
                <div className="absolute right-0 top-0 bg-green-600 px-3 py-1 text-[10px] font-bold uppercase text-white">
                  Popular
                </div>
              )}
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`rounded-xl p-2 ${recommended ? "bg-green-100 dark:bg-green-500/20 text-green-600" : "bg-ink-100 dark:bg-white/10 text-ink-700 dark:text-ink-400"}`}>
                    {PLAN_ICONS[plan.name] || <Zap className="h-6 w-6" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink-900 dark:text-ink-100">{plan.name}</h3>
                  </div>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-bold text-ink-900 dark:text-ink-100">${plan.price_monthly}</span>
                  <span className="text-sm text-ink-400 dark:text-ink-400">/month</span>
                </div>

                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-ink-700 dark:text-ink-400">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.max_students === -1 ? "Unlimited" : plan.max_students} students
                  </div>
                  <div className="flex items-center gap-2 text-ink-700 dark:text-ink-400">
                    <Check className="h-4 w-4 text-green-500" />
                    {plan.max_courses === -1 ? "Unlimited" : plan.max_courses} courses
                  </div>
                  {Object.entries(plan.features).map(([key, enabled]) => (
                    <div
                      key={key}
                      className={`flex items-center gap-2 ${enabled ? "text-ink-700 dark:text-ink-400" : "text-ink-300 dark:text-ink-700 line-through"}`}
                    >
                      {enabled ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <span className="inline-block h-4 w-4 text-center text-ink-300 dark:text-ink-700">-</span>
                      )}
                      {FEATURE_LABELS[key] || key}
                    </div>
                  ))}
                </div>

                {isCurrent || (plan.price_monthly === 0 && !subscription) ? (
                  <Button disabled className="w-full">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    Current plan
                  </Button>
                ) : plan.price_monthly === 0 ? (
                  <Button variant="outline" disabled className="w-full">
                    Free
                  </Button>
                ) : (
                  <Button
                    className={`w-full ${recommended ? "bg-green-600 hover:bg-green-700" : ""}`}
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
                  <tr className="border-b dark:border-white/10 text-left text-ink-400 dark:text-ink-400">
                    <th className="pb-2 font-medium">Date</th>
                    <th className="pb-2 font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Period</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b dark:border-white/10 last:border-0">
                      <td className="py-3 text-ink-700 dark:text-ink-300">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 font-medium text-ink-900 dark:text-ink-100">
                        ${(inv.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inv.status === "paid" ? "bg-green-100 dark:bg-green-500/20 text-green-700" : "bg-sun-100 dark:bg-sun-500/20 text-sun-700"
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 text-ink-500 dark:text-ink-400">
                        {new Date(inv.period_start).toLocaleDateString()} - {new Date(inv.period_end).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        {inv.invoice_url && (
                          <a
                            href={inv.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800"
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
