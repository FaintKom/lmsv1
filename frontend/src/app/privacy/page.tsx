import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
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
        Privacy Policy
      </h1>

      <div className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Data Collection
          </h2>
          <p>
            We collect information you provide directly to us, such as when you create an account,
            enroll in courses, submit assignments, or contact us for support. This includes your
            name, email address, and learning activity data necessary to provide our educational
            services.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Data Usage
          </h2>
          <p>
            We use the information we collect to provide, maintain, and improve our learning
            platform, to process your enrollments and track your progress, and to communicate with
            you about your account and courses. We do not sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Your Rights
          </h2>
          <p>
            You have the right to access, correct, or delete your personal data at any time. You
            can export all your data from your profile settings. You may also request that we
            restrict or stop processing your personal information by contacting us directly.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            Contact
          </h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please
            contact us at privacy@learnhub.example.com. We will respond to your inquiry within 30
            days.
          </p>
        </section>
      </div>
    </div>
  );
}
