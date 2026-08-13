"use client";

/**
 * What each side of the platform gets.
 *
 * This used to be a tabbed section with two UI mockups: a student card
 * reading "Python Basics 85% · 1240 XP · Gold · 7 streak" and a teacher
 * gradebook of invented marks. None of those numbers came from anywhere, and
 * they sat one screen below a strip that promises every number on the page is
 * checkable in the code. The mockups are gone; the real product is already on
 * this page, above, in the code demo and the exercise gallery.
 */

import {
  GraduationCap,
  Presentation,
  BookOpen,
  Code2,
  Trophy,
  ClipboardList,
  Video,
  LayoutGrid,
  Table2,
  ClipboardCheck,
  Users,
  BarChart3,
  Award,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

const STUDENT_FEATURES: { icon: LucideIcon; key: string }[] = [
  { icon: BookOpen, key: "landing.roles.s1" },
  { icon: Code2, key: "landing.roles.s2" },
  { icon: Trophy, key: "landing.roles.s3" },
  { icon: Award, key: "landing.roles.s4" },
  { icon: ClipboardList, key: "landing.roles.s5" },
  { icon: GraduationCap, key: "landing.roles.s6" },
];

const TEACHER_FEATURES: { icon: LucideIcon; key: string }[] = [
  { icon: LayoutGrid, key: "landing.roles.t1" },
  { icon: Table2, key: "landing.roles.t2" },
  { icon: ClipboardCheck, key: "landing.roles.t3" },
  { icon: Users, key: "landing.roles.t4" },
  { icon: BarChart3, key: "landing.roles.t5" },
  { icon: Video, key: "landing.roles.t6" },
];

function RoleColumn({
  icon: RoleIcon,
  titleKey,
  ledeKey,
  features,
}: {
  icon: LucideIcon;
  titleKey: string;
  ledeKey: string;
  features: { icon: LucideIcon; key: string }[];
}) {
  const { t } = useTranslation();

  return (
    // min-w-0 + break-words: a grid item defaults to min-width:auto, so at
    // 320px a long German or Russian word widened the track past the container.
    <div className="min-w-0 break-words rounded-xl border border-border-strong bg-surface p-5 sm:p-7">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex shrink-0 rounded-lg bg-success-soft p-3">
          <RoleIcon className="h-6 w-6 text-primary" />
        </span>
        <h3 className="text-xl font-bold text-text">{t(titleKey)}</h3>
      </div>
      <p className="mb-6 leading-relaxed text-text-muted">{t(ledeKey)}</p>
      <ul className="space-y-3">
        {features.map(({ icon: Icon, key }) => (
          <li key={key} className="flex items-start gap-3">
            <span className="inline-flex shrink-0 rounded-lg bg-success-soft p-2">
              <Icon className="h-4 w-4 text-primary" />
            </span>
            <span className="pt-1 text-sm font-medium text-text">{t(key)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RoleShowcase() {
  const { t } = useTranslation();

  return (
    <section className="border-t border-border bg-surface py-16">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-10 text-center">
          <h2 className="mb-3 break-words text-2xl font-bold text-text sm:text-3xl">
            {t("landing.roles.title")}
          </h2>
          <p className="text-text-muted">{t("landing.roles.subtitle")}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RoleColumn
            icon={GraduationCap}
            titleKey="landing.roles.tabStudent"
            ledeKey="landing.roles.studentLede"
            features={STUDENT_FEATURES}
          />
          <RoleColumn
            icon={Presentation}
            titleKey="landing.roles.tabTeacher"
            ledeKey="landing.roles.teacherLede"
            features={TEACHER_FEATURES}
          />
        </div>

      </div>
    </section>
  );
}
