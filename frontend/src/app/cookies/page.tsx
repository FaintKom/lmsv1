import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CookiePolicyPage() {
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
        Cookie Policy
      </h1>
      <p className="mb-8 text-sm text-ink-500 dark:text-ink-400">
        Effective Date: March 31, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-ink-700 dark:text-ink-400">
        {/* 1. What Are Cookies */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            1. What Are Cookies
          </h2>
          <p>
            Cookies are small text files that are stored on your device (computer, tablet, or phone)
            when you visit a website. They are widely used to make websites work correctly, provide a
            better user experience, and give site operators useful information.
          </p>
          <p className="mt-2">
            GrassLMS uses a minimal number of cookies, limited to what is necessary for the platform
            to function and to remember your preferences. We do not use any advertising, analytics,
            or third-party tracking cookies.
          </p>
        </section>

        {/* 2. Cookies We Use */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            2. Cookies We Use
          </h2>

          <h3 className="mb-2 mt-4 font-semibold text-ink-700 dark:text-ink-300">
            2.1 Essential Cookies (Required)
          </h3>
          <p>
            These cookies are necessary for the platform to function. Without them, you would not be
            able to log in or use core features. They cannot be disabled.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-200 dark:border-white/10">
                  <th className="pb-2 pr-4 font-semibold text-ink-700 dark:text-ink-300">
                    Cookie
                  </th>
                  <th className="pb-2 pr-4 font-semibold text-ink-700 dark:text-ink-300">
                    Purpose
                  </th>
                  <th className="pb-2 font-semibold text-ink-700 dark:text-ink-300">
                    Duration
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-white/5">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">auth_token</td>
                  <td className="py-2 pr-4">
                    Keeps you logged in and authenticates your requests
                  </td>
                  <td className="py-2">Session / 7 days</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">session_id</td>
                  <td className="py-2 pr-4">
                    Identifies your active session on the server
                  </td>
                  <td className="py-2">Session</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">cookie-consent</td>
                  <td className="py-2 pr-4">
                    Remembers that you acknowledged the cookie notice
                  </td>
                  <td className="py-2">1 year</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-6 font-semibold text-ink-700 dark:text-ink-300">
            2.2 Functional Cookies (Preferences)
          </h3>
          <p>
            These cookies remember your preferences to provide a more comfortable experience. They
            are set when you change a setting (such as switching to dark mode) and are stored in your
            browser&rsquo;s local storage.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-ink-200 dark:border-white/10">
                  <th className="pb-2 pr-4 font-semibold text-ink-700 dark:text-ink-300">
                    Item
                  </th>
                  <th className="pb-2 pr-4 font-semibold text-ink-700 dark:text-ink-300">
                    Purpose
                  </th>
                  <th className="pb-2 font-semibold text-ink-700 dark:text-ink-300">
                    Storage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100 dark:divide-white/5">
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">theme</td>
                  <td className="py-2 pr-4">
                    Remembers your display theme preference (light or dark mode)
                  </td>
                  <td className="py-2">Local storage</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">locale</td>
                  <td className="py-2 pr-4">
                    Remembers your preferred language for the interface
                  </td>
                  <td className="py-2">Local storage</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">sidebar-collapsed</td>
                  <td className="py-2 pr-4">
                    Remembers whether you prefer the sidebar open or collapsed
                  </td>
                  <td className="py-2">Local storage</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="mb-2 mt-6 font-semibold text-ink-700 dark:text-ink-300">
            2.3 What We Do Not Use
          </h3>
          <p>GrassLMS does not use:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Analytics cookies</strong> &mdash; We do not use Google Analytics or any other
              third-party analytics service
            </li>
            <li>
              <strong>Advertising cookies</strong> &mdash; We do not display ads or track you for
              advertising purposes
            </li>
            <li>
              <strong>Third-party tracking cookies</strong> &mdash; No external service places
              cookies through our platform to track your behavior across websites
            </li>
          </ul>
        </section>

        {/* 3. How to Manage Cookies */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            3. How to Manage Cookies
          </h2>
          <p>
            Most web browsers allow you to control cookies through their settings. You can typically
            find cookie management options in your browser&rsquo;s &ldquo;Settings,&rdquo;
            &ldquo;Privacy,&rdquo; or &ldquo;Security&rdquo; section.
          </p>
          <p className="mt-2">Common options include:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Viewing and deleting individual cookies</li>
            <li>Blocking all cookies or only third-party cookies</li>
            <li>Setting your browser to notify you when a cookie is set</li>
            <li>Clearing all cookies when you close your browser</li>
          </ul>
          <p className="mt-2">
            Please note that if you block or delete essential cookies, you will not be able to log in
            or use the platform. Functional preferences stored in local storage can be cleared
            through your browser&rsquo;s developer tools or by clearing site data for GrassLMS.
          </p>
          <p className="mt-2">
            For specific instructions, refer to your browser&rsquo;s help documentation:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Chrome: Settings &rarr; Privacy and Security &rarr; Cookies and other site data</li>
            <li>Firefox: Settings &rarr; Privacy &amp; Security &rarr; Cookies and Site Data</li>
            <li>Safari: Preferences &rarr; Privacy &rarr; Manage Website Data</li>
            <li>Edge: Settings &rarr; Cookies and site permissions &rarr; Manage and delete cookies</li>
          </ul>
        </section>

        {/* 4. Changes */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            4. Changes to This Policy
          </h2>
          <p>
            We may update this Cookie Policy from time to time. If we add new categories of cookies
            (such as analytics), we will update this page and notify you through the platform. The
            &ldquo;Effective Date&rdquo; at the top indicates when this policy was last revised.
          </p>
        </section>

        {/* 5. Contact */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-ink-900 dark:text-ink-200">
            5. Contact Us
          </h2>
          <p>
            If you have questions about our use of cookies, please contact us at{" "}
            <a
              href="mailto:privacy@learnhub.app"
              className="font-medium text-green-600 hover:text-green-700"
            >
              privacy@learnhub.app
            </a>
            .
          </p>
          <p className="mt-3">
            For more information about how we handle your personal data, see our{" "}
            <Link
              href="/privacy"
              className="font-medium text-green-600 hover:text-green-700"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
