import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/login"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
        Refund &amp; Cancellation Policy
      </h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
        Effective Date: March 31, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {/* 1. Overview */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            1. Overview
          </h2>
          <p>
            GrassLMS is committed to providing a clear and fair refund and cancellation policy for
            all subscription tiers. This policy applies to all organizations and individuals who
            subscribe to paid GrassLMS plans. If you have any questions about billing, cancellations,
            or refunds, please contact us at{" "}
            <a
              href="mailto:support@learnhub.app"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              support@learnhub.app
            </a>
            .
          </p>
        </section>

        {/* 2. Free Tier */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            2. Free Tier
          </h2>
          <p>
            The Free tier requires no payment and therefore no refund applies. You may use the Free
            tier indefinitely with no obligation. You can upgrade to a paid plan at any time.
          </p>
        </section>

        {/* 3. Monthly Subscriptions */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            3. Monthly Subscriptions
          </h2>
          <p>If you are on a monthly subscription plan:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              You may cancel at any time through the billing page in your admin panel or by emailing
              us
            </li>
            <li>Cancellation takes effect at the end of your current billing period</li>
            <li>You retain full access to all features until the billing period ends</li>
            <li>No partial-month refunds are issued</li>
            <li>There are no cancellation fees</li>
          </ul>
        </section>

        {/* 4. Annual Subscriptions */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            4. Annual Subscriptions
          </h2>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            14-Day Money-Back Guarantee
          </h3>
          <p>
            Annual subscriptions include a 14-day money-back guarantee from the date of purchase. If
            you are not satisfied for any reason within the first 14 days, you may request a full
            refund &mdash; no questions asked. Contact{" "}
            <a
              href="mailto:support@learnhub.app"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              support@learnhub.app
            </a>{" "}
            to request your refund.
          </p>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            After 14 Days
          </h3>
          <p>
            After the 14-day guarantee period, you may still cancel at any time. Your access will
            continue until the end of your annual billing period. No refund is issued for the
            remaining months. Annual pricing reflects a 20% discount compared to monthly billing.
          </p>
        </section>

        {/* 5. How to Cancel */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            5. How to Cancel
          </h2>
          <p>You can cancel your subscription using either of the following methods:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Option 1:</strong> Go to Admin &rarr; Billing &rarr; Manage Subscription. This
              opens the Stripe customer portal where you can cancel directly.
            </li>
            <li>
              <strong>Option 2:</strong> Email{" "}
              <a
                href="mailto:support@learnhub.app"
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                support@learnhub.app
              </a>{" "}
              with your organization name. We will process the cancellation on your behalf.
            </li>
          </ul>
          <p className="mt-3">
            Cancellation is confirmed via email within 1 business day.
          </p>
        </section>

        {/* 6. Plan Changes */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            6. Plan Changes
          </h2>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            Upgrades
          </h3>
          <p>
            Plan upgrades take effect immediately. You will be charged a prorated amount for the
            remainder of your current billing period.
          </p>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            Downgrades
          </h3>
          <p>
            Plan downgrades take effect at the start of your next billing cycle. If your current
            number of students exceeds the new plan&rsquo;s student limit, you must reduce the number
            of active students before the downgrade can take effect.
          </p>
        </section>

        {/* 7. Data After Cancellation */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            7. Data After Cancellation
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>30-Day Grace Period:</strong> After your subscription ends, you have 30 days to
              export your data, including courses, grades, and student progress.
            </li>
            <li>
              <strong>Export Options:</strong> Data can be exported in standard formats through the
              admin panel.
            </li>
            <li>
              <strong>After 30 Days:</strong> All organization data is permanently deleted from our
              systems.
            </li>
            <li>
              <strong>Free Tier:</strong> Data is retained for as long as your account remains
              active. There is no automatic deletion for Free tier accounts.
            </li>
          </ul>
        </section>

        {/* 8. Exceptions */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            8. Exceptions
          </h2>
          <p>
            We understand that certain situations may warrant special consideration:
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Service Outage:</strong> If GrassLMS experiences a service outage exceeding 24
              hours, an automatic pro-rata credit will be applied to your next invoice.
            </li>
            <li>
              <strong>Billing Errors:</strong> Any billing errors will be fully corrected within 5
              business days of being reported or detected.
            </li>
            <li>
              <strong>Special Circumstances:</strong> If you have a unique situation not covered by
              this policy, please contact{" "}
              <a
                href="mailto:support@learnhub.app"
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                support@learnhub.app
              </a>
              . Each case is reviewed individually.
            </li>
          </ul>
        </section>

        {/* 9. Contact */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            9. Contact Us
          </h2>
          <p>
            For questions about billing, cancellations, refunds, or any other subscription-related
            matters, please contact us:
          </p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              GrassLMS Billing Support
            </p>
            <p className="mt-1">
              Email:{" "}
              <a
                href="mailto:support@learnhub.app"
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                support@learnhub.app
              </a>
            </p>
          </div>
          <p className="mt-3">
            We aim to respond to all billing inquiries within 1 business day.
          </p>
        </section>
      </div>
    </div>
  );
}
