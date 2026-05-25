"use client";

import Link from "next/link";
import {
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
import { useTranslation } from "@/lib/i18n/context";

export default function Home() {
 const { t } = useTranslation();
 return (
 <div className="min-h-screen bg-paper-2">
 {/* Header */}
 <LandingHeader />

 <main>
 {/* Hero */}
 <section className="relative overflow-hidden">
 <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_40%_at_50%_60%,rgba(34,197,94,0.08),transparent)]" />
 <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 text-center md:pt-28">
 <div className="mb-6 inline-flex items-center gap-2 rounded-pill border border-primary-soft bg-success-soft px-4 py-1.5 text-sm font-medium text-success-fg">
 <Sparkles className="h-4 w-4" />
 {t("landing.platformBadge")}
 </div>
 <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight text-text md:text-6xl">
 {t("landing.heroTeachSmarter")}
 <br />
 <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
 {t("landing.heroInteractive")}
 </span>
 </h1>
 <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-text-muted">
 {t("landing.heroSubExtended")}
 </p>
 <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
 <Link href="/register">
 <Button size="lg">
 {t("landing.getStarted")}
 <ArrowRight className="h-5 w-5" />
 </Button>
 </Link>
 <Link href="/login">
 <Button variant="outline" size="lg">
 {t("landing.signIn")}
 </Button>
 </Link>
 </div>
 </div>
 </section>

 {/* Features */}
 <section className="border-t border-border bg-surface-2/50 py-20">
 <div className="mx-auto max-w-6xl px-6">
 <div className="mb-12 text-center">
 <h2 className="mb-3 text-3xl font-bold text-text">
 {t("landing.everythingYouNeed")}
 </h2>
 <p className="text-text-muted">
 {t("landing.everythingYouNeedSub")}
 </p>
 </div>
 <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:border-primary-soft hover:shadow-lg hover:shadow-success-soft">
 <div className="mb-5 inline-flex rounded-lg bg-success-soft p-3.5">
 <Code className="h-6 w-6 text-primary" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-text">
 {t("landing.feat37LangsTitle")}
 </h3>
 <p className="text-sm leading-relaxed text-text-muted">
 {t("landing.feat37LangsDesc")}
 </p>
 </div>

 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:border-primary-soft hover:shadow-lg hover:shadow-success-soft">
 <div className="mb-5 inline-flex rounded-lg bg-success-soft p-3.5">
 <Calculator className="h-6 w-6 text-primary" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-text">
 {t("landing.featMathTitle")}
 </h3>
 <p className="text-sm leading-relaxed text-text-muted">
 {t("landing.featMathDesc")}
 </p>
 </div>

 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:border-primary-soft hover:shadow-lg hover:shadow-success-soft">
 <div className="mb-5 inline-flex rounded-lg bg-success-soft p-3.5">
 <Brain className="h-6 w-6 text-primary" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-text">
 {t("landing.featAITitle")}
 </h3>
 <p className="text-sm leading-relaxed text-text-muted">
 {t("landing.featAIDesc")}
 </p>
 </div>

 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:border-warning hover:shadow-lg hover:shadow-sun-50">
 <div className="mb-5 inline-flex rounded-lg bg-sun-50 p-3.5">
 <Gamepad2 className="h-6 w-6 text-warning-fg" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-text">
 {t("landing.featGamesTitle")}
 </h3>
 <p className="text-sm leading-relaxed text-text-muted">
 {t("landing.featGamesDesc")}
 </p>
 </div>

 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:border-danger hover:shadow-lg hover:shadow-danger-soft">
 <div className="mb-5 inline-flex rounded-lg bg-danger-soft p-3.5">
 <Trophy className="h-6 w-6 text-danger-fg" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-text">
 {t("landing.featGamificationTitle")}
 </h3>
 <p className="text-sm leading-relaxed text-text-muted">
 {t("landing.featGamificationDesc")}
 </p>
 </div>

 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:border-info hover:shadow-lg hover:shadow-info-soft">
 <div className="mb-5 inline-flex rounded-lg bg-info-soft p-3.5">
 <BookOpen className="h-6 w-6 text-info-fg" />
 </div>
 <h3 className="mb-2 text-lg font-semibold text-text">
 {t("landing.featLessonsTitle")}
 </h3>
 <p className="text-sm leading-relaxed text-text-muted">
 {t("landing.featLessonsDesc")}
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
 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-sun-50">
 <Globe className="h-6 w-6 text-warning-fg" />
 </div>
 <h3 className="mb-1 font-semibold text-text">
 {t("landing.trust4Langs")}
 </h3>
 <p className="text-sm text-text-muted">
 {t("landing.trust4LangsDesc")}
 </p>
 </div>
 <div className="text-center">
 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-success-soft">
 <Shield className="h-6 w-6 text-primary" />
 </div>
 <h3 className="mb-1 font-semibold text-text">
 {t("landing.trustPrivacy")}
 </h3>
 <p className="text-sm text-text-muted">
 {t("landing.trustPrivacyDesc")}
 </p>
 </div>
 <div className="text-center">
 <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-success-soft">
 <BarChart3 className="h-6 w-6 text-primary" />
 </div>
 <h3 className="mb-1 font-semibold text-text">
 {t("landing.trustDashboard")}
 </h3>
 <p className="text-sm text-text-muted">
 {t("landing.trustDashboardDesc")}
 </p>
 </div>
 </div>
 </div>
 </section>

 {/* Metrics / Social Proof */}
 <section className="border-t border-border bg-paper-2 py-16">
 <div className="mx-auto max-w-6xl px-6">
 <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
 {[
 { value: "37", label: t("landing.metricLangsLabel"), sub: t("landing.metricLangsSub") },
 { value: "15+", label: t("landing.metricExLabel"), sub: t("landing.metricExSub") },
 { value: "4", label: t("landing.metricIfLangsLabel"), sub: t("landing.metricIfLangsSub") },
 { value: "200-800", label: t("landing.metricSatLabel"), sub: t("landing.metricSatSub") },
 ].map((m) => (
 <div key={m.label} className="text-center">
 <p className="text-4xl font-extrabold text-primary md:text-5xl">{m.value}</p>
 <p className="mt-2 text-sm font-semibold text-ink-700">{m.label}</p>
 <p className="mt-1 text-xs text-text-subtle">{m.sub}</p>
 </div>
 ))}
 </div>
 </div>
 </section>

 {/* Product Showcase */}
 <section className="border-t border-border bg-surface-2/50 py-20">
 <div className="mx-auto max-w-6xl px-6">
 <div className="mb-12 text-center">
 <h2 className="mb-3 text-3xl font-bold text-text">{t("landing.showcaseTitle")}</h2>
 <p className="text-text-muted">{t("landing.showcaseSubtitle")}</p>
 </div>
 <div className="grid gap-6 md:grid-cols-2">
 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:shadow-lg">
 <div className="mb-4 flex items-center gap-3">
 <div className="rounded-lg bg-success-soft p-3"><Monitor className="h-6 w-6 text-primary" /></div>
 <h3 className="text-lg font-semibold text-text">{t("landing.showcaseStudentDash")}</h3>
 </div>
 <p className="mb-4 text-sm leading-relaxed text-text-muted">
 {t("landing.showcaseStudentDashDesc")}
 </p>
 <div className="flex flex-wrap gap-2">
 {[t("landing.showcaseFeatCatalog"), t("landing.showcaseFeatTracker"), t("landing.showcaseFeatAchievements"), t("landing.showcaseFeatCalendar"), t("landing.showcaseFeatDark")].map((f) => (
 <span key={f} className="inline-flex items-center gap-1 rounded-pill bg-success-soft px-3 py-1 text-xs font-medium text-success-fg">
 <CheckCircle className="h-3 w-3" /> {f}
 </span>
 ))}
 </div>
 </div>

 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:shadow-lg">
 <div className="mb-4 flex items-center gap-3">
 <div className="rounded-lg bg-success-soft p-3"><Layout className="h-6 w-6 text-primary" /></div>
 <h3 className="text-lg font-semibold text-text">{t("landing.showcaseTeacher")}</h3>
 </div>
 <p className="mb-4 text-sm leading-relaxed text-text-muted">
 {t("landing.showcaseTeacherDesc")}
 </p>
 <div className="flex flex-wrap gap-2">
 {[t("landing.showcaseFeatBuilder"), t("landing.showcaseFeatGradebook"), t("landing.showcaseFeatGroups"), t("landing.showcaseFeatAnalytics"), t("landing.showcaseFeatReview")].map((f) => (
 <span key={f} className="inline-flex items-center gap-1 rounded-pill bg-success-soft px-3 py-1 text-xs font-medium text-success-fg">
 <CheckCircle className="h-3 w-3" /> {f}
 </span>
 ))}
 </div>
 </div>

 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:shadow-lg">
 <div className="mb-4 flex items-center gap-3">
 <div className="rounded-lg bg-sun-50 p-3"><Code className="h-6 w-6 text-warning-fg" /></div>
 <h3 className="text-lg font-semibold text-text">{t("landing.showcaseSandbox")}</h3>
 </div>
 <p className="mb-4 text-sm leading-relaxed text-text-muted">
 {t("landing.showcaseSandboxDesc")}
 </p>
 <div className="flex flex-wrap gap-2">
 {[t("landing.showcaseFeat37"), t("landing.showcaseFeatAutoGrade"), t("landing.showcaseFeatTestCases"), t("landing.showcaseFeatLivePreview"), t("landing.showcaseFeatHtmlCss")].map((f) => (
 <span key={f} className="inline-flex items-center gap-1 rounded-pill bg-sun-50 px-3 py-1 text-xs font-medium text-warning-fg">
 <CheckCircle className="h-3 w-3" /> {f}
 </span>
 ))}
 </div>
 </div>

 <div className="group rounded-lg border border-border-strong/60 bg-paper-2 p-8 transition-all hover:shadow-lg">
 <div className="mb-4 flex items-center gap-3">
 <div className="rounded-lg bg-info-soft p-3"><PieChart className="h-6 w-6 text-info-fg" /></div>
 <h3 className="text-lg font-semibold text-text">{t("landing.showcaseSat")}</h3>
 </div>
 <p className="mb-4 text-sm leading-relaxed text-text-muted">
 {t("landing.showcaseSatDesc")}
 </p>
 <div className="flex flex-wrap gap-2">
 {[t("landing.showcaseFeatAdaptive"), t("landing.showcaseFeatDesmos"), t("landing.showcaseFeatScoreAn"), t("landing.showcaseFeatDomain"), t("landing.showcaseFeatKeys")].map((f) => (
 <span key={f} className="inline-flex items-center gap-1 rounded-pill bg-info-soft px-3 py-1 text-xs font-medium text-info-fg">
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
 <h2 className="mb-3 text-3xl font-bold text-text">{t("landing.forWhoTitle")}</h2>
 <p className="text-text-muted">{t("landing.forWhoSubtitle")}</p>
 </div>
 <div className="grid gap-8 md:grid-cols-3">
 <div className="rounded-lg border border-primary-soft/60 bg-gradient-to-b from-green-50 to-white p-8">
 <div className="mb-5 inline-flex rounded-lg bg-primary-soft p-3.5">
 <School className="h-7 w-7 text-primary" />
 </div>
 <h3 className="mb-2 text-lg font-bold text-text">{t("landing.audSchools")}</h3>
 <p className="mb-4 text-sm leading-relaxed text-text-muted">
 {t("landing.audSchoolsDesc")}
 </p>
 <ul className="space-y-2 text-sm text-text-muted">
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> {t("landing.audSchoolsItem1")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> {t("landing.audSchoolsItem2")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> {t("landing.audSchoolsItem3")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> {t("landing.audSchoolsItem4")}</li>
 </ul>
 </div>

 <div className="rounded-lg border border-primary-soft/60 bg-gradient-to-b from-emerald-50 to-white p-8">
 <div className="mb-5 inline-flex rounded-lg bg-primary-soft p-3.5">
 <Users className="h-7 w-7 text-primary" />
 </div>
 <h3 className="mb-2 text-lg font-bold text-text">{t("landing.audOnline")}</h3>
 <p className="mb-4 text-sm leading-relaxed text-text-muted">
 {t("landing.audOnlineDesc")}
 </p>
 <ul className="space-y-2 text-sm text-text-muted">
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> {t("landing.audOnlineItem1")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> {t("landing.audOnlineItem2")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> {t("landing.audOnlineItem3")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" /> {t("landing.audOnlineItem4")}</li>
 </ul>
 </div>

 <div className="rounded-lg border border-warning/60 bg-gradient-to-b from-amber-50 to-white p-8">
 <div className="mb-5 inline-flex rounded-lg bg-sun-100 p-3.5">
 <UserCheck className="h-7 w-7 text-warning-fg" />
 </div>
 <h3 className="mb-2 text-lg font-bold text-text">{t("landing.audTutors")}</h3>
 <p className="mb-4 text-sm leading-relaxed text-text-muted">
 {t("landing.audTutorsDesc")}
 </p>
 <ul className="space-y-2 text-sm text-text-muted">
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-warning-fg shrink-0" /> {t("landing.audTutorsItem1")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-warning-fg shrink-0" /> {t("landing.audTutorsItem2")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-warning-fg shrink-0" /> {t("landing.audTutorsItem3")}</li>
 <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-warning-fg shrink-0" /> {t("landing.audTutorsItem4")}</li>
 </ul>
 </div>
 </div>
 </div>
 </section>

 {/* FAQ */}
 <section className="border-t border-border bg-surface-2/50 py-20">
 <div className="mx-auto max-w-3xl px-6">
 <div className="mb-12 text-center">
 <h2 className="mb-3 text-3xl font-bold text-text">{t("landing.faqTitle")}</h2>
 <p className="text-text-muted">{t("landing.faqSub")}</p>
 </div>
 <div className="space-y-3">
 {[
 { q: t("landing.faq1Q"), a: t("landing.faq1A") },
 { q: t("landing.faq2Q"), a: t("landing.faq2A") },
 { q: t("landing.faq3Q"), a: t("landing.faq3A") },
 { q: t("landing.faq4Q"), a: t("landing.faq4A") },
 { q: t("landing.faq5Q"), a: t("landing.faq5A") },
 { q: t("landing.faq6Q"), a: t("landing.faq6A") },
 ].map((item) => (
 <details key={item.q} className="group rounded-lg border border-border-strong bg-paper-2">
 <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-semibold text-ink-700 [&::-webkit-details-marker]:hidden">
 {item.q}
 <ChevronDown className="h-4 w-4 text-text-subtle transition-transform group-open:rotate-180" />
 </summary>
 <div className="px-6 pb-4 text-sm leading-relaxed text-text-muted">
 {item.a}
 </div>
 </details>
 ))}
 </div>
 </div>
 </section>

 {/* CTA */}
 <section className="border-t border-border bg-gradient-to-b from-success-soft/50 to-paper-2 py-20">
 <div className="mx-auto max-w-2xl px-6 text-center">
 <h2 className="mb-4 text-3xl font-bold text-text">
 {t("landing.ctaReady")}
 </h2>
 <p className="mb-8 text-text-muted">
 {t("landing.ctaReadySub")}
 </p>
 <div className="mb-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
 <Link href="/register">
 <Button size="lg">
 {t("landing.ctaCreateFree")}
 <ArrowRight className="h-5 w-5" />
 </Button>
 </Link>
 <Link href="/demo?role=student">
 <Button variant="outline" size="lg">
 {t("landing.ctaTryDemo")}
 </Button>
 </Link>
 </div>
 <div className="mt-12 border-t border-border-strong pt-10">
 <h3 className="mb-2 text-lg font-semibold text-text">
 {t("landing.ctaJoinWaitlist")}
 </h3>
 <p className="mb-6 text-sm text-text-muted">
 {t("landing.ctaWaitlistSub")}
 </p>
 <WaitlistForm source="landing-cta" />
 </div>
 </div>
 </section>
 </main>

 {/* Footer */}
 <footer className="border-t border-border py-8">
 <div className="mx-auto max-w-6xl px-6">
 <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
 <span className="text-sm text-text-subtle">
 {t("landing.copyright")}
 </span>
 <div className="flex gap-6 text-sm text-text-subtle">
 <Link href="/terms" className="hover:text-text-muted">{t("landing.terms")}</Link>
 <Link href="/privacy" className="hover:text-text-muted">{t("landing.privacy")}</Link>
 <Link href="/cookies" className="hover:text-text-muted">{t("landing.cookies")}</Link>
 </div>
 </div>
 </div>
 </footer>
 </div>
 );
}
