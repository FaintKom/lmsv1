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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { WaitlistForm } from "@/components/waitlist-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">GrassLMS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="ghost" size="sm">
                Try Demo
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(99,102,241,0.08),transparent)]" />
          <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center md:pt-28">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Sparkles className="h-4 w-4" />
              Platform for modern education
            </div>
            <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-6xl">
              Teach smarter with
              <br />
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
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
              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50">
                <div className="mb-5 inline-flex rounded-2xl bg-indigo-50 p-3.5">
                  <Code className="h-6 w-6 text-indigo-600" />
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

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50">
                <div className="mb-5 inline-flex rounded-2xl bg-violet-50 p-3.5">
                  <Brain className="h-6 w-6 text-violet-600" />
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
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                  <BarChart3 className="h-6 w-6 text-indigo-500" />
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

        {/* CTA */}
        <section className="border-t border-slate-100 bg-gradient-to-b from-indigo-50/50 to-white py-20">
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
