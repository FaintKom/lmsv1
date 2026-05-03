"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, X } from "lucide-react";
import apiClient from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const FACET_LABELS: Record<string, string> = {
  type: "Type",
  stage: "Stage",
  audience: "Audience",
  mode: "Mode",
  problems: "Solves",
};

type EntryItem = {
  id: string;
  type: string;
  title: string;
  summary: string;
  applicability: string;
  stage: string[];
  audience: string[];
  mode: string[];
  problems: string[];
  tags: string[];
  ai_quality: number | null;
  verifier_score: number | null;
  created_at: string;
  score?: number;
};

type FacetCounts = Record<string, { value: string; count: number }[]>;

export default function KnowledgePage() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [items, setItems] = useState<EntryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [facets, setFacets] = useState<FacetCounts>({});
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [total, setTotal] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load facet counts on mount
  useEffect(() => {
    apiClient
      .get("/knowledge/facets")
      .then(({ data }) => setFacets(data))
      .catch(() => {});
  }, []);

  // Fetch list/search whenever query or filters change
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    for (const [facet, vals] of Object.entries(selected)) {
      for (const v of vals) {
        // Map facet name to API param (plural)
        const apiKey =
          facet === "type"
            ? "types"
            : facet === "stage"
            ? "stages"
            : facet === "audience"
            ? "audiences"
            : facet === "mode"
            ? "modes"
            : facet === "problems"
            ? "problems"
            : facet;
        params.append(apiKey, v);
      }
    }

    const url = activeQuery
      ? `/knowledge/search?q=${encodeURIComponent(activeQuery)}&${params.toString()}`
      : `/knowledge?limit=50&${params.toString()}`;

    apiClient
      .get(url)
      .then(({ data }) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [activeQuery, selected]);

  function toggleFilter(facet: string, value: string) {
    setSelected((prev) => {
      const next = { ...prev };
      const set = new Set(next[facet] || []);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      next[facet] = set;
      return next;
    });
  }

  function clearFilters() {
    setSelected({});
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setActiveQuery(query.trim());
  }

  const activeFilterCount = useMemo(
    () => Object.values(selected).reduce((sum, s) => sum + s.size, 0),
    [selected],
  );

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-blue-500" />
          Knowledge
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Distilled edtech concepts, frameworks, tools and methods.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by concept, problem, or technique..."
            className="pl-9"
          />
        </div>
        <Button type="submit">Search</Button>
        {activeQuery && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setQuery("");
              setActiveQuery("");
            }}
          >
            Clear
          </Button>
        )}
      </form>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        {/* Filters sidebar */}
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-slate-500">Filters</h2>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:underline"
              >
                Clear ({activeFilterCount})
              </button>
            )}
          </div>

          {Object.entries(FACET_LABELS).map(([facet, label]) => {
            const values = facets[facet] || [];
            if (values.length === 0) return null;
            return (
              <FacetGroup
                key={facet}
                label={label}
                values={values}
                selected={selected[facet] || new Set()}
                onToggle={(v) => toggleFilter(facet, v)}
              />
            );
          })}
        </aside>

        {/* Results */}
        <main>
          <div className="mb-3 text-sm text-slate-500">
            {loading ? "Searching…" : `${total} ${total === 1 ? "entry" : "entries"}`}
            {activeQuery && (
              <> for <span className="font-medium">&ldquo;{activeQuery}&rdquo;</span></>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-2 h-4 w-full" />
                    <Skeleton className="mt-2 h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-slate-500">
                No entries match. Try a different query or clear filters.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <ResultCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function FacetGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: { value: string; count: number }[];
  selected: Set<string>;
  onToggle: (v: string) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-900/50">
      <div className="mb-2 text-xs font-semibold uppercase text-slate-500">{label}</div>
      <ul className="space-y-1.5 text-sm">
        {values.slice(0, 12).map((v) => (
          <li key={v.value}>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selected.has(v.value)}
                onChange={() => onToggle(v.value)}
                className="h-3.5 w-3.5 rounded border-slate-300"
              />
              <span className="flex-1 capitalize">{v.value.replace(/_/g, " ")}</span>
              <span className="text-xs text-slate-400">{v.count}</span>
            </label>
          </li>
        ))}
        {values.length > 12 && (
          <li className="pt-1 text-xs text-slate-400">+ {values.length - 12} more</li>
        )}
      </ul>
    </div>
  );
}

function ResultCard({ item }: { item: EntryItem }) {
  const tags = [...item.stage, ...item.problems].slice(0, 5);
  return (
    <Link href={`/knowledge/${item.id}`} className="block">
      <Card className="transition hover:border-blue-400 hover:shadow-sm dark:hover:border-blue-500">
        <CardContent className="p-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {item.type}
            </span>
            {item.score !== undefined && (
              <span className="text-xs text-slate-400">
                {Math.round(item.score * 100)}% match
              </span>
            )}
          </div>
          <h3 className="font-semibold leading-snug">{item.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
            {item.summary}
          </p>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                >
                  {t.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
