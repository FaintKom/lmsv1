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

      <h1 className="mb-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
        Terms of Service
      </h1>
      <p className="mb-8 text-sm text-slate-500 dark:text-slate-400">
        Effective Date: March 31, 2026
      </p>

      <div className="space-y-8 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
        {/* 1. Acceptance of Terms */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            1. Acceptance of Terms
          </h2>
          <p>
            By accessing or using GrassLMS (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or
            &ldquo;our&rdquo;), you agree to be bound by these Terms of Service
            (&ldquo;Terms&rdquo;). If you are using GrassLMS on behalf of a school or organization,
            you represent that you have the authority to bind that organization to these Terms, and
            &ldquo;you&rdquo; refers to both you individually and the organization.
          </p>
          <p className="mt-2">
            If you do not agree to these Terms, you may not access or use the platform. These Terms
            apply to all users, including administrators, teachers, students, and parents.
          </p>
        </section>

        {/* 2. Description of Service */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            2. Description of Service
          </h2>
          <p>
            GrassLMS is a business-to-business (B2B) software-as-a-service learning management
            system designed for schools and learning centers. The platform enables schools to teach
            programming, mathematics, and languages through a comprehensive suite of educational
            tools.
          </p>
          <p className="mt-2">The platform includes:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>9 lesson types for diverse content delivery</li>
            <li>
              11 interactive exercise formats including code editors, quizzes, and assignments
            </li>
            <li>Support for 37 programming languages with sandboxed code execution</li>
            <li>An AI Tutor powered by a self-hosted language model for student assistance</li>
            <li>
              Gamification features including experience points, levels, streaks, and achievements
            </li>
            <li>SAT preparation materials and practice exercises</li>
            <li>Progress tracking, analytics, and reporting for teachers and administrators</li>
          </ul>
          <p className="mt-2">
            We reserve the right to modify, update, or discontinue any feature of the platform at
            any time. We will provide reasonable notice for material changes that affect your use of
            the service.
          </p>
        </section>

        {/* 3. User Accounts & Roles */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            3. User Accounts &amp; Roles
          </h2>
          <p>GrassLMS supports four user roles:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Administrator:</strong> Manages the school&rsquo;s subscription, creates and
              manages teacher and student accounts, and oversees platform usage within the
              organization.
            </li>
            <li>
              <strong>Teacher:</strong> Creates and manages courses, lessons, and exercises; monitors
              student progress; and provides feedback.
            </li>
            <li>
              <strong>Student:</strong> Accesses assigned courses, completes lessons and exercises,
              and tracks personal learning progress.
            </li>
            <li>
              <strong>Parent:</strong> Views their child&rsquo;s learning activity, progress, and
              performance reports.
            </li>
          </ul>
          <p className="mt-2">
            Schools register for the platform and are responsible for creating and managing user
            accounts within their organization. Each person may have only one account. You are
            responsible for maintaining the confidentiality of your account credentials and for all
            activity that occurs under your account. You must notify us immediately at{" "}
            <a
              href="mailto:support@learnhub.app"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              support@learnhub.app
            </a>{" "}
            if you suspect unauthorized access to your account.
          </p>
        </section>

        {/* 4. Subscription & Payment */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            4. Subscription &amp; Payment
          </h2>
          <p>GrassLMS offers the following subscription plans:</p>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Free:</strong> $0/month &mdash; up to 5 students and 1 teacher.
            </li>
            <li>
              <strong>Starter:</strong> $15/month &mdash; up to 30 students and 3 teachers.
            </li>
            <li>
              <strong>School:</strong> $35/month &mdash; up to 100 students and 10 teachers.
            </li>
            <li>
              <strong>Academy:</strong> $75/month &mdash; up to 300 students and 30 teachers.
            </li>
          </ul>
          <p className="mt-2">
            Annual billing is available at a 20% discount. All payments are processed securely
            through Stripe. Paid subscriptions automatically renew at the end of each billing period
            unless cancelled before the renewal date. You may cancel your subscription at any time
            through your account settings.
          </p>
          <p className="mt-2">
            We reserve the right to change subscription prices with at least 30 days&rsquo; advance
            notice. Price changes will take effect at the start of your next billing period following
            the notice. For details on how Stripe handles your payment data, please refer to{" "}
            <a
              href="https://stripe.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Stripe&rsquo;s Privacy Policy
            </a>
            .
          </p>
        </section>

        {/* 5. User Content */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            5. User Content
          </h2>
          <p>
            Teachers retain ownership of the course content they create on the platform, including
            lessons, exercises, and instructional materials. Students retain ownership of their
            submissions, including code, written responses, and other work product.
          </p>
          <p className="mt-2">
            By uploading content to GrassLMS, you grant us a non-exclusive, worldwide, royalty-free
            license to host, display, transmit, cache, and back up your content solely for the
            purpose of operating, maintaining, and providing the platform to you and your
            organization. This license ends when you delete your content or when your account is
            terminated, subject to our data retention policy.
          </p>
          <p className="mt-2">
            You are solely responsible for the legality, accuracy, and appropriateness of all content
            you upload or create on the platform. You represent that you have the necessary rights to
            upload any content and that your content does not infringe on the intellectual property
            rights of any third party.
          </p>
        </section>

        {/* 6. Intellectual Property */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            6. Intellectual Property
          </h2>
          <p>
            GrassLMS and its licensors own all rights, title, and interest in and to the platform,
            including but not limited to the source code, object code, design, user interface,
            graphics, branding, logo, and all related intellectual property. All rights are reserved.
          </p>
          <p className="mt-2">
            You may not copy, modify, distribute, sell, lease, reverse engineer, decompile, or
            disassemble any part of the platform or its underlying technology. You may not remove or
            alter any proprietary notices, labels, or marks on the platform. Your right to use the
            platform is limited to the license granted under your active subscription.
          </p>
        </section>

        {/* 7. Code Execution */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            7. Code Execution
          </h2>
          <p>
            GrassLMS provides a sandboxed code execution environment that supports 37 programming
            languages. This environment is provided &ldquo;as is&rdquo; for educational purposes
            only. We make no guarantees regarding the accuracy, completeness, or reliability of code
            execution results.
          </p>
          <p className="mt-2">
            We are not liable for any output, side effects, or results produced by code executed on
            the platform. The following activities are strictly prohibited in the code execution
            environment:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Cryptocurrency mining or any form of resource abuse</li>
            <li>Creating, distributing, or testing malware, viruses, or malicious code</li>
            <li>Network scanning, port scanning, or probing external systems</li>
            <li>
              Attempting to escape, bypass, or circumvent the sandbox environment or its restrictions
            </li>
            <li>Accessing or attempting to access systems or data outside the sandbox</li>
          </ul>
          <p className="mt-2">
            Violations of these restrictions may result in immediate account suspension or
            termination.
          </p>
        </section>

        {/* 8. AI Tutor */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            8. AI Tutor
          </h2>
          <p>
            GrassLMS includes an AI Tutor feature powered by a language model that is entirely
            self-hosted on our own servers. No student data, questions, code, or conversation content
            is sent to any external AI provider or third-party service.
          </p>
          <p className="mt-2">
            The AI Tutor uses the Socratic method to guide students through problems by asking
            leading questions rather than providing direct answers. It is designed to supplement, not
            replace, professional instruction from qualified teachers. The AI Tutor is not a
            substitute for human teaching, professional tutoring, or academic advising.
          </p>
          <p className="mt-2">
            The AI Tutor may occasionally produce inaccurate, incomplete, or misleading information.
            Students should always verify AI-generated guidance with their teacher or course
            materials. We make no warranties regarding the accuracy or reliability of AI Tutor
            responses.
          </p>
          <p className="mt-2">
            AI Tutor conversations are processed in real time and are not stored long-term.
            Conversation data may be temporarily held in server memory during your session and is not
            retained after the session ends. The AI Tutor is subject to rate limiting to ensure fair
            usage across all users.
          </p>
        </section>

        {/* 9. Acceptable Use */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            9. Acceptable Use
          </h2>
          <p>
            You agree to use GrassLMS in compliance with all applicable laws and our{" "}
            <Link
              href="/acceptable-use"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Acceptable Use Policy
            </Link>
            , which is incorporated into these Terms by reference. You may not use the platform for
            any unlawful, abusive, or unauthorized purpose.
          </p>
          <p className="mt-2">
            Violations of the Acceptable Use Policy may result in warnings, temporary suspension, or
            permanent termination of your account, at our sole discretion. We reserve the right to
            investigate suspected violations and take appropriate action, including reporting
            violations to law enforcement where necessary.
          </p>
        </section>

        {/* 10. Privacy */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            10. Privacy
          </h2>
          <p>
            Your use of GrassLMS is also governed by our{" "}
            <Link
              href="/privacy"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Privacy Policy
            </Link>
            , which describes how we collect, use, store, and protect your personal data. By using
            the platform, you acknowledge that you have read and understood our Privacy Policy.
          </p>
        </section>

        {/* 11. Children & Student Data */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            11. Children &amp; Student Data
          </h2>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            COPPA Compliance
          </h3>
          <p>
            When a school subscribes to GrassLMS and creates student accounts, the school acts as an
            agent of the parents and provides consent on behalf of parents for the collection and use
            of students&rsquo; educational data, as permitted under the Children&rsquo;s Online
            Privacy Protection Act (COPPA). Data collected from students is used solely for
            educational purposes within the scope of the school&rsquo;s subscription.
          </p>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            FERPA Compliance
          </h3>
          <p>
            GrassLMS acts as a &ldquo;school official&rdquo; with a &ldquo;legitimate educational
            interest&rdquo; under the Family Educational Rights and Privacy Act (FERPA). We access
            student education records only to provide the educational services contracted by the
            school. We do not use student data for any purpose other than providing and improving the
            educational services described in these Terms.
          </p>

          <h3 className="mb-1 mt-4 font-semibold text-slate-700 dark:text-slate-300">
            Minimum Data Collection
          </h3>
          <p>
            We collect only the minimum data necessary to provide the educational service. We do not
            collect more data from students than is reasonably necessary for participation in the
            platform. We do not use student data for advertising, profiling, or any non-educational
            purpose.
          </p>
        </section>

        {/* 12. Termination */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            12. Termination
          </h2>
          <p>
            Either party may terminate the subscription with 30 days&rsquo; written notice to the
            other party. You may cancel your subscription at any time through your account settings
            or by contacting us at{" "}
            <a
              href="mailto:support@learnhub.app"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              support@learnhub.app
            </a>
            .
          </p>
          <p className="mt-2">
            We may terminate or suspend your account immediately, without prior notice, for severe
            violations of the Acceptable Use Policy, including but not limited to: illegal activity,
            sandbox escape attempts, distribution of malware, or any activity that poses a security
            risk to the platform or its users.
          </p>
          <p className="mt-2">Upon termination:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              You will have 30 days to export your data, including course content and student
              records.
            </li>
            <li>
              After the 30-day export period, your data will be permanently deleted from our active
              systems.
            </li>
            <li>
              Encrypted backups containing your data may be retained for up to 90 days after deletion
              from active systems, after which they are purged.
            </li>
          </ul>
          <p className="mt-2">
            Free accounts that have been inactive for 12 consecutive months may be terminated and
            their data deleted after reasonable notice. We will attempt to notify the account
            administrator by email before terminating an inactive account.
          </p>
        </section>

        {/* 13. Disclaimers */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            13. Disclaimers
          </h2>
          <p>
            THE PLATFORM IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
            WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="mt-2">
            We do not warrant that the platform will be uninterrupted, error-free, or free of
            harmful components. We do not guarantee any specific learning outcomes, academic results,
            or educational achievements from the use of the platform. The platform is a tool to
            assist in education, and results depend on many factors beyond our control, including
            student effort, teacher instruction, and curriculum design.
          </p>
        </section>

        {/* 14. Limitation of Liability */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            14. Limitation of Liability
          </h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, LEARNHUB&rsquo;S AGGREGATE LIABILITY ARISING OUT
            OF OR RELATED TO THESE TERMS OR THE USE OF THE PLATFORM SHALL NOT EXCEED THE TOTAL FEES
            PAID BY YOU TO LEARNHUB DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT
            GIVING RISE TO THE CLAIM.
          </p>
          <p className="mt-2">
            IN NO EVENT SHALL LEARNHUB BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA,
            USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, REGARDLESS OF WHETHER WE HAVE BEEN ADVISED OF
            THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p className="mt-2">
            Some jurisdictions do not allow the exclusion or limitation of certain warranties or
            liability. In such jurisdictions, our liability shall be limited to the greatest extent
            permitted by applicable law.
          </p>
        </section>

        {/* 15. Governing Law */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            15. Governing Law
          </h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State
            of Delaware, United States, without regard to its conflict of laws provisions.
          </p>
          <p className="mt-2">
            Any dispute arising out of or relating to these Terms or the use of the platform shall
            be resolved through binding arbitration administered in accordance with the rules of the
            American Arbitration Association. The arbitration shall be conducted in the State of
            Delaware. Either party may seek injunctive or other equitable relief in any court of
            competent jurisdiction to prevent the actual or threatened infringement of intellectual
            property rights.
          </p>
          <p className="mt-2">
            YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED ONLY ON AN
            INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION. You waive
            any right to participate in a class action lawsuit or class-wide arbitration against
            GrassLMS.
          </p>
        </section>

        {/* 16. Changes to Terms */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            16. Changes to Terms
          </h2>
          <p>
            We may update these Terms from time to time. If we make material changes, we will
            provide at least 30 days&rsquo; advance notice by posting a notification on the platform
            and sending an email to the address associated with your account. The &ldquo;Effective
            Date&rdquo; at the top of this page indicates when the Terms were last updated.
          </p>
          <p className="mt-2">
            Your continued use of the platform after the effective date of the updated Terms
            constitutes your acceptance of the changes. If you do not agree to the updated Terms, you
            must stop using the platform and may terminate your account in accordance with Section 12.
          </p>
        </section>

        {/* 17. Contact */}
        <section>
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-slate-200">
            17. Contact Us
          </h2>
          <p>
            If you have any questions, concerns, or requests regarding these Terms of Service,
            please contact us:
          </p>
          <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p className="font-medium text-slate-700 dark:text-slate-300">
              GrassLMS Support Team
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
          <p className="mt-3">We aim to respond to all inquiries within 30 days.</p>
        </section>
      </div>
    </div>
  );
}
