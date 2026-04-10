import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link
        href="/login"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Login
      </Link>

      <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
        Privacy Policy
      </h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
        Effective Date: March 31, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {/* 1. Introduction */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            1. Introduction
          </h2>
          <p>
            GrassLMS (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is a
            software-as-a-service learning management system that helps schools and learning centers
            teach programming, mathematics, and languages. We are committed to protecting the privacy
            of all users of our platform, including school administrators, teachers, students, and
            parents.
          </p>
          <p className="mt-2">
            This Privacy Policy explains what personal data we collect, how we use it, who we share
            it with, and what rights you have regarding your data. If you have any questions, you can
            reach our privacy team at{" "}
            <a
              href="mailto:privacy@learnhub.app"
              className="font-medium text-green-600 hover:text-green-700"
            >
              privacy@learnhub.app
            </a>
            .
          </p>
          <p className="mt-2">
            GrassLMS acts as the data controller for account and platform data. When a school or
            learning center subscribes to our service, they may also act as a data controller for
            their students&rsquo; educational data, and we act as a data processor on their behalf.
          </p>
        </section>

        {/* 2. Data We Collect */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            2. Data We Collect
          </h2>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            2.1 Account Data
          </h3>
          <p>
            When you create an account or when a school creates one on your behalf, we collect your
            name, email address, role (administrator, teacher, student, or parent), and the
            organization you belong to.
          </p>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            2.2 Learning Data
          </h3>
          <p>
            As you use the platform, we collect data related to your educational activities. This
            includes course progress, lesson completion status, exercise scores, assignment
            submissions (including code submissions), time spent on lessons and exercises, and quiz
            results.
          </p>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            2.3 Communication Data
          </h3>
          <p>
            We collect the content of discussion comments you post within courses and any messages
            you send to our support team.
          </p>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            2.4 Technical Data
          </h3>
          <p>
            When you access the platform, we automatically collect your IP address, browser type and
            version, device type, operating system, and referring URL. We also use essential cookies
            to keep you logged in and remember your preferences. See our{" "}
            <Link
              href="/cookies"
              className="font-medium text-green-600 hover:text-green-700"
            >
              Cookie Policy
            </Link>{" "}
            for details.
          </p>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            2.5 Payment Data
          </h3>
          <p>
            Subscription payments are processed by Stripe. We do not store credit card numbers,
            CVVs, or full bank account details on our servers. Stripe provides us with a transaction
            reference, the last four digits of the card, and the billing address to manage your
            subscription. For details on how Stripe handles your payment data, please refer to{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-green-600 hover:text-green-700"
            >
              Stripe&rsquo;s Privacy Policy
            </a>
            .
          </p>
        </section>

        {/* 3. How We Use Data */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            3. How We Use Your Data
          </h2>
          <p>We use the data we collect for the following purposes:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Providing and operating the learning platform</li>
            <li>Authenticating your identity and managing your account</li>
            <li>Tracking your learning progress and generating progress reports</li>
            <li>
              Providing teachers and school administrators with analytics about student performance
            </li>
            <li>Providing parents with visibility into their child&rsquo;s learning activity</li>
            <li>Running the AI Tutor feature to assist students with coursework</li>
            <li>Responding to your support requests and communications</li>
            <li>Improving the platform, fixing bugs, and developing new features</li>
            <li>Ensuring the security and integrity of the platform</li>
            <li>Complying with legal obligations</li>
          </ul>
          <p className="mt-2">
            We do not use your data for advertising. We do not sell your data. We do not use
            third-party analytics or tracking services.
          </p>
        </section>

        {/* 4. Legal Basis */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            4. Legal Basis for Processing (GDPR)
          </h2>
          <p>Under the General Data Protection Regulation, we process your data based on:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Contract Performance:</strong> Processing necessary to provide you with the
              service you or your school subscribed to, including account management, learning
              features, and progress tracking.
            </li>
            <li>
              <strong>Legitimate Interest:</strong> Processing necessary for platform security, fraud
              prevention, bug fixing, and service improvement, where our interests do not override
              your rights.
            </li>
            <li>
              <strong>Consent:</strong> Where required, such as for optional communications or when
              processing data of children where school or parental consent applies.
            </li>
            <li>
              <strong>Legal Obligation:</strong> Processing required to comply with applicable laws,
              regulations, or legal proceedings.
            </li>
          </ul>
        </section>

        {/* 5. Data Sharing */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            5. Who We Share Data With
          </h2>
          <p>We share personal data only in the following limited circumstances:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Stripe:</strong> We share the minimum data necessary for Stripe to process
              subscription payments. This includes billing name, email, and payment method details.
              Stripe acts as an independent data controller for payment processing.
            </li>
            <li>
              <strong>Schools and Administrators:</strong> School administrators can see the account
              data and learning data of students and teachers within their organization.
            </li>
            <li>
              <strong>Teachers:</strong> Teachers can view the learning progress, exercise
              submissions, and scores of students assigned to their courses.
            </li>
            <li>
              <strong>Parents:</strong> Parents linked to a student account can view their
              child&rsquo;s learning progress and activity.
            </li>
          </ul>
          <p className="mt-3 font-medium text-slate-700 dark:text-slate-300">
            We do not sell personal data. We do not share data with advertisers. We do not use
            third-party analytics services such as Google Analytics. We do not share data with any
            other third parties except as described above or as required by law.
          </p>
        </section>

        {/* 6. AI Tutor */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            6. AI Tutor and Your Data
          </h2>
          <p>
            GrassLMS includes an AI Tutor feature that helps students with coursework. The AI model
            is entirely self-hosted on our own servers. No student data, questions, code, or
            conversation content is sent to any external AI provider or third-party service.
          </p>
          <p className="mt-2">
            AI Tutor conversations are processed in real time to generate responses. We do not store
            AI conversation history long-term. Conversation data may be temporarily held in server
            memory during your session and is not retained after the session ends.
          </p>
        </section>

        {/* 7. Children's Privacy */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            7. Children&rsquo;s Privacy (COPPA Compliance)
          </h2>
          <p>
            We understand that many of our users are minors, including children under the age of 13.
            We take the protection of children&rsquo;s data seriously.
          </p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>School Consent:</strong> When a school subscribes to GrassLMS and creates
              student accounts, the school provides consent on behalf of parents for the collection
              and use of students&rsquo; educational data, as permitted under COPPA and FERPA. The
              school acts as the parent&rsquo;s agent in providing this consent, and data is used
              solely for educational purposes.
            </li>
            <li>
              <strong>No Direct Collection from Children:</strong> We do not knowingly collect
              personal data directly from children under 13 without school or parental consent. If a
              child attempts to register without going through a school or parent, the account will
              not be created.
            </li>
            <li>
              <strong>Parental Rights:</strong> Parents have the right to review their child&rsquo;s
              personal data, request corrections, and request deletion. To exercise these rights,
              contact us at{" "}
              <a
                href="mailto:privacy@learnhub.app"
                className="font-medium text-green-600 hover:text-green-700"
              >
                privacy@learnhub.app
              </a>{" "}
              or contact your child&rsquo;s school.
            </li>
            <li>
              <strong>Limited Data Collection:</strong> We collect only the data necessary to provide
              the educational service. We do not collect more data from children than is reasonably
              necessary for participation in the platform.
            </li>
          </ul>
        </section>

        {/* 8. Data Retention */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            8. Data Retention
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Active Accounts:</strong> We retain your data for as long as your account is
              active and the subscribing school maintains its subscription.
            </li>
            <li>
              <strong>After Account Termination:</strong> When a school terminates its subscription
              or an individual account is deleted, we retain account data for 30 days to allow for
              reactivation or data export. After 30 days, your data is permanently deleted from our
              active systems.
            </li>
            <li>
              <strong>Backups:</strong> Encrypted backups that may contain your data are retained for
              up to 90 days after deletion from active systems, after which they are purged.
            </li>
            <li>
              <strong>Legal Requirements:</strong> We may retain certain data longer if required by
              law, such as billing records for tax compliance.
            </li>
          </ul>
        </section>

        {/* 9. Data Security */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            9. Data Security
          </h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            data:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>All data in transit is encrypted using TLS 1.2 or higher (HTTPS everywhere)</li>
            <li>
              SSL certificates are provided by Let&rsquo;s Encrypt and automatically renewed
            </li>
            <li>Passwords are hashed using bcrypt and never stored in plain text</li>
            <li>
              Student code submissions are executed in sandboxed environments isolated from the main
              system
            </li>
            <li>Regular automated backups with encryption at rest</li>
            <li>Access to production systems is restricted to authorized personnel only</li>
            <li>
              The AI Tutor runs on our own servers, so student data never leaves our infrastructure
              for AI processing
            </li>
          </ul>
          <p className="mt-2">
            While no system is 100% secure, we continuously work to improve our security posture. If
            you discover a security vulnerability, please report it to{" "}
            <a
              href="mailto:privacy@learnhub.app"
              className="font-medium text-green-600 hover:text-green-700"
            >
              privacy@learnhub.app
            </a>
            .
          </p>
        </section>

        {/* 10. International Transfers */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            10. International Data Transfers
          </h2>
          <p>
            Our servers are hosted by Hetzner in Germany, within the European Union. Your data is
            stored and processed in the EU, which provides strong data protection under the GDPR.
          </p>
          <p className="mt-2">
            Stripe, our payment processor, may transfer and process payment data in the United
            States. These transfers are protected by Standard Contractual Clauses (SCCs) approved by
            the European Commission, as well as Stripe&rsquo;s own data protection measures.
          </p>
          <p className="mt-2">
            No other personal data is transferred outside the European Economic Area.
          </p>
        </section>

        {/* 11. Your Rights */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            11. Your Rights
          </h2>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            Under the GDPR (EU/EEA Residents)
          </h3>
          <p>You have the right to:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Access</strong> your personal data and receive a copy
            </li>
            <li>
              <strong>Rectification</strong> of inaccurate or incomplete data
            </li>
            <li>
              <strong>Erasure</strong> (&ldquo;right to be forgotten&rdquo;) of your data
            </li>
            <li>
              <strong>Data Portability</strong> &mdash; receive your data in a structured,
              machine-readable format
            </li>
            <li>
              <strong>Restriction</strong> of processing in certain circumstances
            </li>
            <li>
              <strong>Object</strong> to processing based on legitimate interest
            </li>
            <li>
              <strong>Withdraw Consent</strong> at any time, where consent is the legal basis
            </li>
            <li>
              <strong>Lodge a Complaint</strong> with your local data protection authority
            </li>
          </ul>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            Under the CCPA (California Residents)
          </h3>
          <p>You have the right to:</p>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>
              <strong>Know</strong> what personal information we collect, use, and disclose
            </li>
            <li>
              <strong>Delete</strong> your personal information
            </li>
            <li>
              <strong>Opt-Out</strong> of the sale of personal information (note: we do not sell
              personal information)
            </li>
            <li>
              <strong>Non-Discrimination</strong> for exercising your privacy rights
            </li>
          </ul>

          <p className="mt-3">
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:privacy@learnhub.app"
              className="font-medium text-green-600 hover:text-green-700"
            >
              privacy@learnhub.app
            </a>
            . We will respond within 30 days. For school-managed student accounts, requests may need
            to be submitted through the school.
          </p>
        </section>

        {/* 12. Cookie Policy */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            12. Cookies
          </h2>
          <p>
            We use only essential and functional cookies. We do not use analytics cookies,
            advertising cookies, or any third-party tracking cookies. For full details on the cookies
            we use and how to manage them, please see our{" "}
            <Link
              href="/cookies"
              className="font-medium text-green-600 hover:text-green-700"
            >
              Cookie Policy
            </Link>
            .
          </p>
        </section>

        {/* 13. Changes */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            13. Changes to This Policy
          </h2>
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices
            or applicable laws. If we make material changes, we will notify you at least 30 days
            before the changes take effect by posting a notice on the platform and, where possible,
            sending an email to the address associated with your account. The &ldquo;Effective
            Date&rdquo; at the top of this page indicates when the policy was last updated.
          </p>
        </section>

        {/* 14. Contact */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            14. Contact Us
          </h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our
            data practices, please contact us:
          </p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              GrassLMS Privacy Team
            </p>
            <p className="mt-1">
              Email:{" "}
              <a
                href="mailto:privacy@learnhub.app"
                className="font-medium text-green-600 hover:text-green-700"
              >
                privacy@learnhub.app
              </a>
            </p>
          </div>
          <p className="mt-3">We aim to respond to all inquiries within 30 days.</p>
        </section>
      </div>
    </div>
  );
}
