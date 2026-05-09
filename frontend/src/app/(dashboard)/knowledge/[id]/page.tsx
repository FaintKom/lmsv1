"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import apiClient from "@/lib/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type EntryDetail = {
  id: string;
  type: string;
  title: string;
  summary: string;
  content: string;
  applicability: string;
  stage: string[];
  audience: string[];
  mode: string[];
  problems: string[];
  tags: string[];
  ai_quality: number | null;
  verifier_score: number | null;
  created_at: string;
  sources: { id: string; url: string | null; source_type: string; title: string | null }[];
};

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [entry, setEntry] = useState<EntryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    apiClient
      .get(`/knowledge/${id}`)
      .then(({ data }) => setEntry(data))
      .catch((e) => {
        if (e?.response?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="mt-4 h-9 w-3/4" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-2/3" />
        <Skeleton className="mt-6 h-64 w-full" />
      </div>
    );
  }

  if (notFound || !entry) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-text-muted">Entry not found.</p>
        <Link href="/knowledge" className="mt-4 inline-block text-info-fg hover:underline">
          ← Back to knowledge
        </Link>
      </div>
    );
  }

  const facets = [
    { label: "Type", values: [entry.type] },
    { label: "Stage", values: entry.stage },
    { label: "Audience", values: entry.audience },
    { label: "Mode", values: entry.mode },
    { label: "Solves", values: entry.problems },
  ].filter((f) => f.values.length > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-3 -ml-2"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back
      </Button>

      <h1 className="text-3xl font-bold leading-tight">{entry.title}</h1>
      <p className="mt-2 text-base text-text-muted">{entry.summary}</p>

      {/* Facets */}
      <div className="mt-4 flex flex-wrap gap-2">
        {facets.map((f) => (
          <div key={f.label} className="text-xs">
            <span className="text-text-subtle">{f.label}:</span>{" "}
            {f.values.map((v) => (
              <span
                key={v}
                className="ml-1 rounded bg-ink-100 px-1.5 py-0.5 text-ink-700"
              >
                {v.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* Content */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <div className="prose prose-slate max-w-none
                          prose-headings:font-semibold
                          prose-a:text-info-fg
                          prose-code:rounded prose-code:bg-ink-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-sm
                          prose-li:my-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {entry.content}
            </ReactMarkdown>
          </div>

          {entry.applicability && (
            <div className="mt-5 rounded-lg border border-info bg-info-soft p-4 text-sm">
              <div className="font-semibold text-info-fg">
                When to apply
              </div>
              <div className="mt-1 text-info-fg">
                {entry.applicability}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tags */}
      {entry.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {entry.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-text-muted"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Sources */}
      {entry.sources.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold uppercase text-text-muted">Sources</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {entry.sources.map((s) => (
              <li key={s.id}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-info-fg hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {s.title || s.url}
                    <span className="ml-1 text-xs text-text-subtle">[{s.source_type}]</span>
                  </a>
                ) : (
                  <span className="text-text-muted">
                    {s.title} <span className="text-xs">[{s.source_type}]</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quality scores (admin info, hidden style) */}
      {(entry.ai_quality !== null || entry.verifier_score !== null) && (
        <div className="mt-6 border-t border-border pt-3 text-xs text-text-subtle">
          {entry.ai_quality !== null && (
            <span className="mr-3">AI quality: {entry.ai_quality.toFixed(2)}</span>
          )}
          {entry.verifier_score !== null && (
            <span>Verifier: {entry.verifier_score.toFixed(2)}</span>
          )}
        </div>
      )}
    </div>
  );
}
