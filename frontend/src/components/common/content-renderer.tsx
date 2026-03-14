"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { MathRenderer, containsMath } from "./math-renderer";

interface ContentRendererProps {
  body: string;
  format?: "markdown" | "html";
}

export function ContentRenderer({ body, format = "markdown" }: ContentRendererProps) {
  if (!body) {
    return <p className="text-slate-400">No content yet.</p>;
  }

  // If content has math, use MathRenderer
  if (containsMath(body)) {
    return <MathRenderer content={body} />;
  }

  // HTML mode — render as raw HTML
  if (format === "html") {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: body }}
      />
    );
  }

  // Markdown mode (default)
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeRaw]}
    >
      {body}
    </ReactMarkdown>
  );
}
