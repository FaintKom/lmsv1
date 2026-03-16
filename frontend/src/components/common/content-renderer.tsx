"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import dynamic from "next/dynamic";
import { MathRenderer, containsMath } from "./math-renderer";

const BlockEditor = dynamic(
  () => import("@/components/editor/block-editor").then((m) => ({ default: m.BlockEditor })),
  { ssr: false, loading: () => <div className="animate-pulse h-20 rounded bg-slate-100 dark:bg-white/5" /> }
);

interface ContentRendererProps {
  body: string | Record<string, unknown>;
  format?: "markdown" | "html" | "tiptap";
}

export function ContentRenderer({ body, format = "markdown" }: ContentRendererProps) {
  if (!body) {
    return <p className="text-slate-400">No content yet.</p>;
  }

  // TipTap JSON — render with read-only BlockEditor
  if (format === "tiptap" && typeof body === "object") {
    return <BlockEditor content={body} editable={false} />;
  }

  // Below: legacy string-based formats
  const text = typeof body === "string" ? body : "";

  if (!text) {
    return <p className="text-slate-400">No content yet.</p>;
  }

  // If content has math, use MathRenderer
  if (containsMath(text)) {
    return <MathRenderer content={text} />;
  }

  // HTML mode — render as raw HTML
  if (format === "html") {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  // Markdown mode (default)
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
    >
      {text}
    </ReactMarkdown>
  );
}
