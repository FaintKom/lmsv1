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
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
            <span className="text-xl font-bold text-slate-900">LearnHub</span>
          </div>
          <div className="flex items-center gap-3">
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
              Built-in code editor, interactive quizzes, and real-time progress
              tracking. Everything you need to run a modern school or online
              course.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button size="lg">
                  Start Free Trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg">
                  Sign In as Demo User
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Demo: admin@demo.com / password
            </p>
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
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-50">
                <div className="mb-5 inline-flex rounded-2xl bg-indigo-50 p-3.5">
                  <Code className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Code Editor & Sandbox
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Browser-based IDE with auto-grading. Students write, run, and
                  submit code. Supports Python and JavaScript.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-50">
                <div className="mb-5 inline-flex rounded-2xl bg-emerald-50 p-3.5">
                  <BookOpen className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Course Builder
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Create courses with modules, text lessons, video, quizzes, and
                  coding challenges. Publish when ready.
                </p>
              </div>

              <div className="group rounded-2xl border border-slate-200/60 bg-white p-8 transition-all hover:border-violet-200 hover:shadow-lg hover:shadow-violet-50">
                <div className="mb-5 inline-flex rounded-2xl bg-violet-50 p-3.5">
                  <BarChart3 className="h-6 w-6 text-violet-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-slate-900">
                  Analytics & Progress
                </h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  Track enrollments, completion rates, and student performance.
                  Identify who needs help at a glance.
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
                  <Zap className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-900">
                  Fast Setup
                </h3>
                <p className="text-sm text-slate-500">
                  Get started in minutes. No complex configuration needed.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <Shield className="h-6 w-6 text-emerald-500" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-900">
                  Secure Sandbox
                </h3>
                <p className="text-sm text-slate-500">
                  Code runs in isolated environments with time and memory
                  limits.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                  <Sparkles className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="mb-1 font-semibold text-slate-900">
                  Multi-tenant
                </h3>
                <p className="text-sm text-slate-500">
                  Each school gets their own isolated workspace with full
                  control.
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
            <Link href="/register">
              <Button size="lg">
                Create Free Account
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate-400">
          LearnHub LMS &mdash; Built for modern education
        </div>
      </footer>
    </div>
  );
}
