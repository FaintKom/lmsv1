"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathRendererProps {
  content: string;
  className?: string;
}

/**
 * Renders text with inline ($...$) and block ($$...$$) LaTeX formulas.
 * Non-math content is rendered as HTML.
 */
export function MathRenderer({ content, className }: MathRendererProps) {
  const rendered = useMemo(() => renderMath(content), [content]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

function renderMath(text: string): string {
  if (!text) return "";

  // First handle block math $$...$$
  let result = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: true,
        throwOnError: false,
        trust: false,
      });
    } catch {
      return `<span class="text-coral-500">[Math Error]</span>`;
    }
  });

  // Then handle inline math $...$ (simple pattern, block math already handled)
  result = result.replace(/\$([^$]+?)\$/g, (_, tex) => {
    try {
      return katex.renderToString(tex.trim(), {
        displayMode: false,
        throwOnError: false,
        trust: false,
      });
    } catch {
      return `<span class="text-coral-500">[Math Error]</span>`;
    }
  });

  return result;
}

/**
 * Check if text contains any LaTeX formulas.
 */
export function containsMath(text: string): boolean {
  if (!text) return false;
  // Check for block math $$...$$ or inline math $...$
  return text.includes("$$") || /\$[^$]+\$/.test(text);
}
