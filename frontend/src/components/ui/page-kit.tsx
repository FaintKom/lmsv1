"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/context";

/**
 * The page kit (specs/075): one header, one figure tile, one set of tabs and
 * one empty state for every screen. Width is the layout's job, not the
 * page's: (dashboard) and (admin) cap it once, so a page never centres
 * itself and the left edge stays put from screen to screen.
 *
 * None of these carry an outer margin. `cn` is plain clsx, so a caller's
 * `mb-0` could not reliably beat a built-in `mb-8`; the page root spaces its
 * children instead (`grid gap-8`).
 */

/* ── PageHeader ─────────────────────────────────────────────────────────── */

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons on the right; they wrap under the title when space runs out. */
  actions?: ReactNode;
  /** A link back to the parent screen, shown above the title. */
  back?: { href: string; label?: string };
  className?: string;
}

/**
 * No eyebrow slot, on purpose: a label over the heading is item 7 of the
 * "never" list in DESIGN_SPEC. The heading carries its own weight.
 */
export function PageHeader({ title, description, actions, back, className }: PageHeaderProps) {
  const { t } = useTranslation();
  return (
    <header
      className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}
    >
      <div className="min-w-0 max-w-[65ch]">
        {back && (
          <Link
            href={back.href}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-text-muted transition-colors hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {back.label ?? t("common.back")}
          </Link>
        )}
        <h1 className="text-balance text-xl font-bold leading-tight text-text md:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-pretty text-base text-text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ── StatTile ───────────────────────────────────────────────────────────── */

interface StatTileProps {
  label: ReactNode;
  value: ReactNode;
  /** One line under the figure: what it counts, or what to do about it. */
  hint?: ReactNode;
  /** Muted, beside the label. Never in a coloured circle. */
  icon?: LucideIcon;
  className?: string;
}

/** A figure and its label. Colour is never the message; the words are. */
export function StatTile({ label, value, hint, icon: Icon, className }: StatTileProps) {
  return (
    <div className={cn("rounded-lg bg-surface p-5", className)}>
      <p className="flex items-center gap-1.5 text-sm text-text-muted">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-text-subtle" aria-hidden="true" />}
        {label}
      </p>
      <p className="mt-1.5 font-display text-2xl font-bold leading-none tabular-nums text-text">
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-text-subtle">{hint}</p>}
    </div>
  );
}

/* ── Tabs ───────────────────────────────────────────────────────────────── */

export interface TabItem {
  value: string;
  label: ReactNode;
  /** Present: the tab is a link to a sibling page. Absent: a button. */
  href?: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  "aria-label": string;
  className?: string;
}

/**
 * Sections of one screen, or sibling pages, underlined. Filters of a list are
 * not tabs: they stay chips. The strip scrolls sideways instead of clipping
 * when six languages make the labels long (specs/067).
 */
export function Tabs({ items, value, onChange, className, ...aria }: TabsProps) {
  const asLinks = items.every((i) => i.href);
  const itemClass = (active: boolean) =>
    cn(
      "-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-0.5 py-3 text-sm font-medium transition-colors",
      active
        ? "border-primary text-text"
        : "border-transparent text-text-muted hover:border-border-strong hover:text-text",
    );
  const inner = (item: TabItem) => (
    <>
      {item.icon && <item.icon className="h-4 w-4" aria-hidden="true" />}
      {item.label}
      {item.count !== undefined && (
        <span className="rounded-pill bg-surface-2 px-1.5 text-xs tabular-nums text-text-muted">
          {item.count}
        </span>
      )}
    </>
  );

  return (
    <div
      className={cn("flex gap-6 overflow-x-auto border-b border-border", className)}
      {...(asLinks ? { role: "navigation" } : { role: "tablist" })}
      aria-label={aria["aria-label"]}
    >
      {items.map((item) =>
        asLinks ? (
          <Link
            key={item.value}
            href={item.href!}
            aria-current={item.value === value ? "page" : undefined}
            className={itemClass(item.value === value)}
          >
            {inner(item)}
          </Link>
        ) : (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={item.value === value}
            onClick={() => onChange?.(item.value)}
            className={itemClass(item.value === value)}
          >
            {inner(item)}
          </button>
        ),
      )}
    </div>
  );
}

/* ── PageLoading ────────────────────────────────────────────────────────── */

/**
 * The page's shape while its data loads: a header and a few rows, where the
 * real ones will land. Replaces the lone spinner in the middle of nothing.
 */
export function PageLoading({ rows = 4 }: { rows?: number }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-8" role="status" aria-label={t("common.loading")}>
      <div className="grid gap-3">
        <div className="lms-skeleton h-8 w-56" />
        <div className="lms-skeleton h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="lms-skeleton h-20 w-full" />
        ))}
      </div>
    </div>
  );
}

/* ── FilterChips ────────────────────────────────────────────────────────── */

export interface FilterItem {
  value: string;
  label: ReactNode;
  count?: number;
}

interface FilterChipsProps {
  items: FilterItem[];
  value: string;
  onChange: (value: string) => void;
  "aria-label": string;
  className?: string;
}

/**
 * Narrows a list. Pressed is the brand fill, like the active sidebar item.
 * Not an inverted ink chip: bg-text is near-white in dark mode, a light
 * slab on a dark page, which e2e/dark-theme.spec.ts rightly refuses.
 */
export function FilterChips({ items, value, onChange, className, ...aria }: FilterChipsProps) {
  return (
    <div role="group" aria-label={aria["aria-label"]} className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
          className="press-scale inline-flex h-9 pointer-coarse:h-11 items-center gap-1.5 rounded-pill border border-border-strong bg-surface px-4 text-sm font-medium text-text transition-colors hover:border-text-subtle aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-fg"
        >
          {item.label}
          {item.count !== undefined && (
            <span className="tabular-nums opacity-70">{item.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ── EmptyState ─────────────────────────────────────────────────────────── */

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  /** What to do next, not "nothing here". */
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <Icon className="h-8 w-8 text-text-subtle" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold text-text">{title}</h2>
      {description && (
        <p className="mt-1.5 max-w-[48ch] text-pretty text-sm text-text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
