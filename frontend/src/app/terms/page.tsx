import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/login"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Link>

      <h1 className="mb-8 text-3xl font-bold text-slate-900 dark:text-slate-100">
        Terms of Service
      </h1>

      <div className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Acceptance of Terms
          </h2>
          <p>
            By accessing or using LearnHub, you agree to be bound by these Terms of Service. If
            you do not agree to these terms, please do not use the platform.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Use of Service
          </h2>
          <p>
            You agree to use the platform only for lawful educational purposes. You are responsible
            for maintaining the confidentiality of your account credentials and for all activities
            that occur under your account.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Content and Intellectual Property
          </h2>
          <p>
            Course content provided on the platform is owned by the respective educators and
            organizations. You may not reproduce, distribute, or create derivative works from
            course materials without explicit permission from the content owner.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Account Termination
          </h2>
          <p>
            We reserve the right to suspend or terminate accounts that violate these terms. You may
            delete your account and request removal of your data at any time by contacting support.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Limitation of Liability
          </h2>
          <p>
            LearnHub is provided &ldquo;as is&rdquo; without warranties of any kind. We are not
            liable for any indirect, incidental, or consequential damages arising from your use of
            the platform.
          </p>
        </section>
      </div>
    </div>
  );
}
