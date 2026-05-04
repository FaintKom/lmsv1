import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CopyrightPolicyPage() {
 return (
 <div className="mx-auto max-w-3xl px-6 py-12">
 <Link
 href="/login"
 className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-success-fg"
 >
 <ArrowLeft className="h-4 w-4" />
 Back to Login
 </Link>

 <h1 className="mb-2 text-3xl font-bold text-text ">
 Copyright &amp; DMCA Policy
 </h1>
 <p className="mb-8 text-sm text-text-muted ">
 Effective Date: March 31, 2026
 </p>

 <div className="space-y-8 text-sm leading-relaxed text-text-muted ">
 {/* 1. Intellectual Property Overview */}
 <section>
 <h2 className="mb-3 text-lg font-semibold text-ink-700 ">
 1. Intellectual Property Overview
 </h2>
 <p>
 This policy describes the ownership of content on the GrassLMS platform and outlines our
 procedures for handling copyright infringement claims under the Digital Millennium
 Copyright Act (DMCA).
 </p>

 <h3 className="mb-1 mt-4 font-semibold text-ink-700 ">
 Platform Content
 </h3>
 <p>
 The GrassLMS platform itself &mdash; including its source code, design, user interface,
 logos, and branding &mdash; is owned by GrassLMS and protected by applicable intellectual
 property laws.
 </p>

 <h3 className="mb-1 mt-4 font-semibold text-ink-700 ">
 Course Content
 </h3>
 <p>
 Course content created by teachers (including lesson text, exercises, quizzes, images,
 and other educational materials) is owned by the teacher or their school, as determined
 by their agreement with each other. GrassLMS does not claim ownership of course content.
 </p>

 <h3 className="mb-1 mt-4 font-semibold text-ink-700 ">
 Student Content
 </h3>
 <p>
 Student submissions &mdash; including code, assignment responses, and comments &mdash;
 are owned by the student. GrassLMS does not claim ownership of student content.
 </p>

 <h3 className="mb-1 mt-4 font-semibold text-ink-700 ">
 License to GrassLMS
 </h3>
 <p>
 By uploading content to the platform, you grant GrassLMS a limited, non-exclusive,
 royalty-free license to host, display, transmit, and backup that content solely for the
 purpose of operating and providing the GrassLMS service. This license does not transfer
 ownership and terminates when you remove the content or your account is deleted.
 </p>
 </section>

 {/* 2. DMCA Takedown Process */}
 <section>
 <h2 className="mb-3 text-lg font-semibold text-ink-700 ">
 2. DMCA Takedown Process
 </h2>
 <p>
 If you believe that content on the GrassLMS platform infringes your copyright, you may
 submit a written notification to our designated copyright agent at{" "}
 <a
 href="mailto:copyright@grasslms.online"
 className="font-medium text-primary hover:text-success-fg"
 >
 copyright@grasslms.online
 </a>
 . Your notice must include:
 </p>
 <ul className="mt-2 list-disc space-y-1 pl-5">
 <li>A description of the copyrighted work you claim has been infringed</li>
 <li>
 The URL or specific location on the platform where the infringing content is located
 </li>
 <li>Proof that you own or are authorized to act on behalf of the copyright owner</li>
 <li>Your full name, mailing address, phone number, and email address</li>
 <li>
 A statement that you have a good faith belief that the use of the material is not
 authorized by the copyright owner, its agent, or the law
 </li>
 <li>
 A statement, made under penalty of perjury, that the information in your notice is
 accurate and that you are the copyright owner or authorized to act on the owner&rsquo;s
 behalf
 </li>
 <li>Your physical or electronic signature</li>
 </ul>
 <p className="mt-3">
 Upon receiving a valid DMCA notice, we will investigate and respond within 48 hours. If
 the claim is valid, the infringing content will be removed and the uploader will be
 notified.
 </p>
 </section>

 {/* 3. Counter-Notification */}
 <section>
 <h2 className="mb-3 text-lg font-semibold text-ink-700 ">
 3. Counter-Notification
 </h2>
 <p>
 If you believe your content was wrongly removed due to a DMCA takedown notice, you may
 submit a counter-notification to{" "}
 <a
 href="mailto:copyright@grasslms.online"
 className="font-medium text-primary hover:text-success-fg"
 >
 copyright@grasslms.online
 </a>
 . Your counter-notification must include:
 </p>
 <ul className="mt-2 list-disc space-y-1 pl-5">
 <li>Identification of the content that was removed and its location before removal</li>
 <li>
 A statement under penalty of perjury that you have a good faith belief that the content
 was removed or disabled as a result of mistake or misidentification
 </li>
 <li>
 Your consent to the jurisdiction of the federal district court for the judicial district
 in which your address is located, and that you will accept service of process from the
 person who provided the original DMCA notice
 </li>
 <li>Your full name, mailing address, phone number, and email address</li>
 <li>Your physical or electronic signature</li>
 </ul>
 <p className="mt-3">
 Upon receiving a valid counter-notification, we will forward it to the original
 complainant. If the copyright holder does not file a court action within 10&ndash;14
 business days, the removed content may be restored.
 </p>
 </section>

 {/* 4. Repeat Infringers */}
 <section>
 <h2 className="mb-3 text-lg font-semibold text-ink-700 ">
 4. Repeat Infringers
 </h2>
 <p>
 GrassLMS has adopted a policy for addressing repeat copyright infringement. Consequences
 escalate as follows:
 </p>
 <ul className="mt-2 list-disc space-y-2 pl-5">
 <li>
 <strong>First offense:</strong> Written warning issued and infringing content removed
 </li>
 <li>
 <strong>Second offense:</strong> 30-day account suspension and infringing content
 removed
 </li>
 <li>
 <strong>Third offense:</strong> Permanent account termination
 </li>
 </ul>
 <p className="mt-3">
 We reserve the right to terminate any account with fewer strikes in cases of egregious or
 willful infringement.
 </p>
 </section>

 {/* 5. Fair Use */}
 <section>
 <h2 className="mb-3 text-lg font-semibold text-ink-700 ">
 5. Fair Use
 </h2>
 <p>
 We recognize that educational use of copyrighted materials may qualify as fair use under
 17 U.S.C. &sect; 107. Fair use claims are evaluated on a case-by-case basis, considering
 the following factors:
 </p>
 <ul className="mt-2 list-disc space-y-1 pl-5">
 <li>The purpose and character of the use, including whether it is for educational or commercial purposes</li>
 <li>The nature of the copyrighted work</li>
 <li>The amount and substantiality of the portion used in relation to the whole</li>
 <li>The effect of the use on the potential market for the copyrighted work</li>
 </ul>
 <p className="mt-3">
 While an educational context is a relevant factor, it does not automatically constitute
 fair use. Each situation is assessed individually.
 </p>
 </section>

 {/* 6. Open Source */}
 <section>
 <h2 className="mb-3 text-lg font-semibold text-ink-700 ">
 6. Open Source
 </h2>
 <p>
 The GrassLMS platform incorporates open-source software components, each governed by its
 own license terms. A full list of open-source licenses and attributions is available upon
 request. To request this information, contact us at{" "}
 <a
 href="mailto:support@grasslms.online"
 className="font-medium text-primary hover:text-success-fg"
 >
 support@grasslms.online
 </a>
 .
 </p>
 </section>

 {/* 7. Contact */}
 <section>
 <h2 className="mb-3 text-lg font-semibold text-ink-700 ">
 7. Contact Us
 </h2>
 <p>
 For copyright-related inquiries, DMCA notices, or counter-notifications, please contact
 us:
 </p>
 <div className="mt-2 rounded-lg border border-border-strong bg-surface-2 p-4 ">
 <p className="font-medium text-ink-700 ">
 GrassLMS Copyright Agent
 </p>
 <p className="mt-1">
 Email:{" "}
 <a
 href="mailto:copyright@grasslms.online"
 className="font-medium text-primary hover:text-success-fg"
 >
 copyright@grasslms.online
 </a>
 </p>
 </div>
 <p className="mt-3">
 We aim to investigate and respond to all copyright inquiries within 48 hours.
 </p>
 </section>
 </div>
 </div>
 );
}
