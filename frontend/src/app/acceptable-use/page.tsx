import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AcceptableUsePolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/login"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-ink-900 dark:text-ink-100">
        Acceptable Use Policy
      </h1>
      <p className="mb-8 text-sm text-ink-500 dark:text-ink-400">
        Effective Date: March 31, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-ink-700 dark:text-ink-400">
        {/* 1. Purpose */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            1. Purpose
          </h2>
          <p>
            These rules ensure that GrassLMS is a safe, productive learning environment for all
            users, including minors. By using the platform, you agree to follow this Acceptable Use
            Policy. This policy applies to all users: students, teachers, parents, school
            administrators, and any other individuals who access GrassLMS.
          </p>
        </section>

        {/* 2. Prohibited Content */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            2. Prohibited Content
          </h2>
          <p>You may not upload, share, or create any of the following on GrassLMS:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Illegal material</li>
            <li>Content harmful to minors</li>
            <li>Harassment or bullying</li>
            <li>Hate speech or discrimination</li>
            <li>Sexually explicit material</li>
            <li>Violent or threatening content</li>
            <li>Personal information of others without consent</li>
            <li>Spam or unsolicited commercial content</li>
          </ul>
        </section>

        {/* 3. Prohibited Activities */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            3. Prohibited Activities
          </h2>
          <p>You may not engage in any of the following activities:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Attempt unauthorized access to accounts or systems</li>
            <li>Scrape or crawl the platform</li>
            <li>Reverse engineer or decompile any part of the platform</li>
            <li>Launch DDoS or similar attacks</li>
            <li>Sell, transfer, or share your account</li>
            <li>Impersonate another user or GrassLMS staff</li>
            <li>Circumvent security measures or access controls</li>
            <li>Use automated tools to submit answers or complete exercises</li>
          </ul>
        </section>

        {/* 4. Code Execution Rules */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            4. Code Execution Rules
          </h2>
          <p>
            The code sandbox is provided for educational purposes only. You may not use it to:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Mine cryptocurrency</li>
            <li>Scan networks or ports</li>
            <li>Create or distribute malware or viruses</li>
            <li>Attempt to escape the sandbox environment</li>
            <li>Consume excessive compute resources</li>
            <li>Access other users&rsquo; data or files</li>
            <li>Use the sandbox for any non-educational purpose</li>
          </ul>
        </section>

        {/* 5. Academic Integrity */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            5. Academic Integrity
          </h2>
          <p>To maintain the value of your learning, you may not:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Plagiarize or submit others&rsquo; work as your own</li>
            <li>Share solutions to graded exercises</li>
            <li>Use automated tools to generate answers for graded work</li>
            <li>Misrepresent your abilities or qualifications</li>
            <li>Tamper with grades or progress records</li>
          </ul>
        </section>

        {/* 6. Communication Standards */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            6. Communication Standards
          </h2>
          <p>In discussions and comments:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Be respectful and constructive</li>
            <li>No personal attacks or name-calling</li>
            <li>No doxxing (revealing personal information)</li>
            <li>No threats of any kind</li>
            <li>No advertising or solicitation</li>
            <li>Stay on-topic</li>
            <li>Disagree respectfully</li>
          </ul>
        </section>

        {/* 7. Account Security */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            7. Account Security
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Keep your password private and strong</li>
            <li>Do not share login credentials</li>
            <li>
              Notify us immediately at{" "}
              <a
                href="mailto:support@learnhub.app"
                className="font-medium text-green-600 hover:text-green-700"
              >
                support@learnhub.app
              </a>{" "}
              if you believe your account is compromised
            </li>
            <li>One account per person</li>
            <li>You are responsible for all activity under your account</li>
          </ul>
        </section>

        {/* 8. Protection of Minors */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            8. Protection of Minors
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Do not solicit personal information from students</li>
            <li>No inappropriate or sexual contact with minors</li>
            <li>
              Report any concerns about a minor&rsquo;s safety to{" "}
              <a
                href="mailto:support@learnhub.app"
                className="font-medium text-green-600 hover:text-green-700"
              >
                support@learnhub.app
              </a>{" "}
              immediately
            </li>
            <li>Adults interacting with students must maintain professional boundaries</li>
          </ul>
        </section>

        {/* 9. Reporting Violations */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            9. Reporting Violations
          </h2>
          <p>
            If you see content or behavior that violates this policy:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              Email{" "}
              <a
                href="mailto:support@learnhub.app"
                className="font-medium text-green-600 hover:text-green-700"
              >
                support@learnhub.app
              </a>{" "}
              with details
            </li>
            <li>Or contact your school administrator</li>
          </ul>
          <p className="mt-2">
            All reports are reviewed within 24 hours. You will not be penalized for good-faith
            reporting.
          </p>
        </section>

        {/* 10. Enforcement */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            10. Enforcement
          </h2>
          <p>Violations are handled with a graduated response:</p>

          <h3 className="mb-1 mt-4 font-semibold text-ink-700 dark:text-ink-300">
            Standard Violations
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>First violation:</strong> Written warning
            </li>
            <li>
              <strong>Second violation:</strong> Content removal + 7-day suspension
            </li>
            <li>
              <strong>Third violation:</strong> 30-day suspension
            </li>
            <li>
              <strong>Fourth violation:</strong> Permanent account termination
            </li>
          </ul>

          <h3 className="mb-1 mt-4 font-semibold text-ink-700 dark:text-ink-300">
            Severe Violations
          </h3>
          <p>
            Illegal activity, threats, harm to minors, or data breach attempts result in immediate
            permanent termination without warning.
          </p>

          <p className="mt-3">
            Appeals can be submitted to{" "}
            <a
              href="mailto:support@learnhub.app"
              className="font-medium text-green-600 hover:text-green-700"
            >
              support@learnhub.app
            </a>{" "}
            within 14 days of the enforcement action.
          </p>
        </section>

        {/* 11. Contact */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            11. Contact Us
          </h2>
          <p>
            If you have any questions or concerns about this Acceptable Use Policy, please contact
            us:
          </p>
          <div className="mt-2 rounded-lg border border-ink-200 bg-ink-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="font-medium text-ink-700 dark:text-ink-300">
              GrassLMS Support Team
            </p>
            <p className="mt-1">
              Email:{" "}
              <a
                href="mailto:support@learnhub.app"
                className="font-medium text-green-600 hover:text-green-700"
              >
                support@learnhub.app
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
