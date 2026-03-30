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

  // HTML mode — use iframe if content has scripts (for interactive widgets)
  if (format === "html") {
    const hasScript = text.includes("<script");
    if (hasScript) {
      const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,sans-serif;color:#1e293b;line-height:1.7}*{box-sizing:border-box}@media(prefers-color-scheme:dark){body{color:#e2e8f0;background:#1e1e1e}}</style></head><body>${text}</body></html>`;
      return (
        <iframe
          srcDoc={srcdoc}
          sandbox="allow-scripts"
          className="w-full border-0 rounded-xl"
          style={{ minHeight: 600, height: "auto" }}
          onLoad={(e) => {
            // Auto-resize iframe to content height
            const iframe = e.target as HTMLIFrameElement;
            try {
              const height = iframe.contentDocument?.documentElement?.scrollHeight;
              if (height) iframe.style.height = height + 40 + "px";
            } catch { /* cross-origin, ignore */ }
          }}
        />
      );
    }
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
