import Link from "next/link";
import {
  GraduationCap,
  Code,
  BookOpen,
  BarChart3,
  Sparkles,
  Shield,
  Zap,
  ArrowRight,
  Brain,
  Gamepad2,
  Calculator,
  Trophy,
  Globe,
  Monitor,
  Users,
  School,
  UserCheck,
  Layout,
  PieChart,
  FileText,
  ChevronDown,
  Languages,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";
import { InteractiveDemo } from "@/components/landing/interactive-demo";
import { LandingHeader } from "@/components/landing/landing-header";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <LandingHeader />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(34,197,94,0.08),transparent)]" />
          <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center md:pt-28">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700">
              <Sparkles className="h-4 w-4" />
              Platform for modern education
            </div>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
              Teach smarter with
              <br />
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                interactive learning
              </span>
            </h1>
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-500">
              37 programming languages, interactive math, AI tutor, gamification,
              and game-based learning. Everything a modern school needs in one
              platform.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg">
                  Get Started Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-slate-100 bg-slate-50/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-slate-900">
                Everything you need
              </h2>
              <p className="text-slate-500">
                Powerful tools for teachers and engaging experience for students
              </p>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-green-200 hover:shadow-lg hover:shadow-green-50">
                <div className="mb-5 inline-flex rounded-2xl bg-green-50 p-3.5">
                  <Code className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Code in 37 Languages
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Browser-based editor with auto-grading. Python, JavaScript, Java,
                  C++, Go, Rust, and 31 more. Sandboxed execution with test cases.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50">
                <div className="mb-5 inline-flex rounded-2xl bg-emerald-50 p-3.5">
                  <Calculator className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Interactive Math
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  15+ exercise types: coordinate planes, graphing, equation scales,
                  fractions, number lines. Plus full SAT Math prep with Desmos.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50">
                <div className="mb-5 inline-flex rounded-2xl bg-emerald-50 p-3.5">
                  <Brain className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  AI Tutor
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Built-in AI assistant that guides students through problems using
                  the Socratic method. Self-hosted, private, no data leaves your server.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-amber-200 hover:shadow-lg hover:shadow-amber-50">
                <div className="mb-5 inline-flex rounded-2xl bg-amber-50 p-3.5">
                  <Gamepad2 className="h-6 w-6 text-amber-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Game-Based Learning
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  2D robot programming puzzles and 3D exploration worlds. Students
                  learn by playing, solving, and building.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-rose-200 hover:shadow-lg hover:shadow-rose-50">
                <div className="mb-5 inline-flex rounded-2xl bg-rose-50 p-3.5">
                  <Trophy className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Gamification
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  XP, daily streaks, 10+ badges, 5-tier league system, and class
                  leaderboards. Students stay motivated and engaged.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-sky-200 hover:shadow-lg hover:shadow-sky-50">
                <div className="mb-5 inline-flex rounded-2xl bg-sky-50 p-3.5">
                  <BookOpen className="h-6 w-6 text-sky-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  9 Lesson Types, 11 Exercises
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Text, video, quizzes, code challenges, interactive widgets, file
                  uploads. Matching, ordering, fill-blanks, categorize, and more.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interactive Demo */}
        <InteractiveDemo />

        {/* Trust */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
                  <Globe className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-900">
                  4 Languages
                </h3>
                <p className="text-sm text-slate-500">
                  Interface in English, Spanish, Russian, and Turkish.
                  Serve students worldwide.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <Shield className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-900">
                  Privacy First
                </h3>
                <p className="text-sm text-slate-500">
                  GDPR and COPPA compliant. AI runs on your server. No
                  third-party tracking. Student data stays private.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-900">
                  Teacher Dashboard
                </h3>
                <p className="text-sm text-slate-500">
                  Gradebook, assignments, analytics, review queue, and
                  content library. Everything in one place.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Metrics / Social Proof */}
        <section className="border-t border-slate-100 bg-white py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {[
                { value: "37", label: "Programming Languages", sub: "Python, JS, Java, C++, Go, Rust..." },
                { value: "15+", label: "Exercise Types", sub: "Code, quizzes, matching, games..." },
                { value: "4", label: "Interface Languages", sub: "English, Spanish, Russian, Turkish" },
                { value: "200-800", label: "SAT Score Range", sub: "Adaptive simulation with Desmos" },
              ].map((m) => (
                <div key={m.label} className="text-center">
                  <p className="text-4xl font-extrabold text-green-600 md:text-5xl">{m.value}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{m.label}</p>
                  <p className="mt-1 text-xs text-slate-400">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Showcase */}
        <section className="border-t border-slate-100 bg-slate-50/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-slate-900">See what you get</h2>
              <p className="text-slate-500">A complete teaching toolkit, ready out of the box</p>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-green-50 p-3"><Monitor className="h-6 w-6 text-green-600" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">Student Dashboard</h3>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  Clean, distraction-free learning environment. Course catalog, progress tracking,
                  achievements, and a personal calendar — all in one place.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Course catalog", "Progress tracker", "Achievements", "Calendar", "Dark mode"].map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                      <CheckCircle className="h-3 w-3" /> {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3"><Layout className="h-6 w-6 text-emerald-600" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">Teacher Admin Panel</h3>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  Create courses with drag-and-drop, manage students and groups, grade assignments,
                  and track performance — all from a powerful admin dashboard.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Course builder", "Gradebook", "Student groups", "Analytics", "Review queue"].map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      <CheckCircle className="h-3 w-3" /> {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-amber-50 p-3"><Code className="h-6 w-6 text-amber-600" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">Code Sandbox</h3>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  Monaco editor (same as VS Code) with syntax highlighting, auto-complete, and
                  sandboxed execution. Students run code safely in the browser.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["37 languages", "Auto-grading", "Test cases", "Live preview", "HTML/CSS/JS editor"].map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                      <CheckCircle className="h-3 w-3" /> {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:shadow-lg">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-sky-50 p-3"><PieChart className="h-6 w-6 text-sky-600" /></div>
                  <h3 className="text-lg font-semibold text-slate-900">SAT Math Simulator</h3>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  Full Digital SAT experience: 2 adaptive modules, Desmos calculator, realistic scoring,
                  domain analytics, and unlimited practice questions.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Adaptive modules", "Desmos calc", "Score analytics", "Domain practice", "Keyboard shortcuts"].map((f) => (
                    <span key={f} className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                      <CheckCircle className="h-3 w-3" /> {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* For Whom */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-slate-900">Built for everyone who teaches</h2>
              <p className="text-slate-500">Whether you run a school, teach online, or tutor small groups</p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border border-green-200/60 bg-gradient-to-b from-green-50 to-white p-8">
                <div className="mb-5 inline-flex rounded-2xl bg-green-100 p-3.5">
                  <School className="h-7 w-7 text-green-600" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">Schools</h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  Manage classes, departments, and curricula. Track student progress across subjects.
                  GDPR-compliant and privacy-first.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Multi-teacher organization</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Student groups & enrollment</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Custom branding (logo & colors)</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Gradebook & assignments</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50 to-white p-8">
                <div className="mb-5 inline-flex rounded-2xl bg-emerald-100 p-3.5">
                  <Users className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">Online Schools</h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  Launch your online education business. Create courses, sell access,
                  and scale to hundreds of students with automated tools.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> Unlimited course creation</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> Student analytics & progress</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> Certificates & achievements</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" /> AI tutor for 24/7 support</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-amber-200/60 bg-gradient-to-b from-amber-50 to-white p-8">
                <div className="mb-5 inline-flex rounded-2xl bg-amber-100 p-3.5">
                  <UserCheck className="h-7 w-7 text-amber-600" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">Tutors</h3>
                <p className="mb-4 text-sm leading-relaxed text-slate-500">
                  Perfect for private tutors and small groups. Interactive lessons,
                  SAT prep, and coding exercises — all in one platform.
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-500 shrink-0" /> Free plan for up to 20 students</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-500 shrink-0" /> SAT Math adaptive simulator</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-500 shrink-0" /> Live lessons & calendar</li>
                  <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-amber-500 shrink-0" /> Quick setup, no tech needed</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-slate-100 bg-slate-50/50 py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="mb-12 text-center">
              <h2 className="mb-3 text-3xl font-bold text-slate-900">Frequently asked questions</h2>
              <p className="text-slate-500">Everything you need to know before getting started</p>
            </div>
            <div className="space-y-3">
              {[
                {
                  q: "Is GrassLMS really free?",
                  a: "Yes! The free plan includes up to 20 students, 3 courses, and 2 groups — with no time limit. You can upgrade anytime as you grow.",
                },
                {
                  q: "Do I need to install anything?",
                  a: "No. GrassLMS runs entirely in the browser. Students and teachers just need a web browser — works on desktop, tablet, and phone.",
                },
                {
                  q: "Can I use it for SAT prep?",
                  a: "Absolutely. GrassLMS includes a full Digital SAT Math simulator with adaptive 2-module tests, Desmos calculator, realistic scoring (200-800), and unlimited practice questions.",
                },
                {
                  q: "What programming languages are supported?",
                  a: "37 languages including Python, JavaScript, Java, C++, Go, Rust, TypeScript, Ruby, PHP, Swift, Kotlin, and more. All execute in a secure sandbox.",
                },
                {
                  q: "Is student data private and secure?",
                  a: "Yes. We are GDPR and COPPA compliant. The AI tutor runs on your server, no student data is shared with third parties, and all communication is encrypted.",
                },
                {
                  q: "Can I customize the platform with my brand?",
                  a: "Yes. Upload your logo, set your brand colors, and your students see your school name — not ours. Available on all plans.",
                },
              ].map((item) => (
                <details key={item.q} className="group rounded-xl border border-slate-200 bg-white">
                  <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="px-6 pb-4 text-sm leading-relaxed text-slate-500">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-slate-100 bg-gradient-to-b from-green-50/50 to-white py-20">
          <div className="mx-auto max-w-2xl px-6 text-center">
            <h2 className="mb-4 text-3xl font-bold text-slate-900">
              Ready to get started?
            </h2>
            <p className="mb-8 text-slate-500">
              Create your school account and start building courses today.
            </p>
            <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg">
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg">
                  Try the demo
                </Button>
              </Link>
            </div>
            <div className="mt-12 border-t border-slate-200 pt-10">
              <h3 className="mb-2 text-lg font-semibold text-slate-900">
                Or join the waitlist for early access
              </h3>
              <p className="mb-6 text-sm text-slate-500">
                Get notified when new features launch and early-bird pricing opens.
              </p>
              <WaitlistForm source="landing-cta" />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-sm text-slate-400">
              &copy; 2026 GrassLMS &mdash; Modern Learning Platform
            </span>
            <div className="flex gap-6 text-sm text-slate-400">
              <Link href="/terms" className="hover:text-slate-600">Terms</Link>
              <Link href="/privacy" className="hover:text-slate-600">Privacy</Link>
              <Link href="/cookies" className="hover:text-slate-600">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
