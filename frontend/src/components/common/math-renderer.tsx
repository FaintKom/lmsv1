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

// Mirrors scripts/seed_demo_org.py::_inline_md so seed content renders identically.
function renderInlineMd(s: string): string {
 return s
   .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
   .replace(/(?<![\\\w*])\*([^*\n]+?)\*(?!\w)/g, "<em>$1</em>")
   .replace(/`([^`]+?)`/g, "<code>$1</code>");
}

/**
 * Renders short text that may contain inline markdown and/or LaTeX math.
 * Used for quiz question text and option labels where content authors mix
 * `**bold**`, `*em*`, `` `code` `` and `$x^2$`.
 */
export function MaybeMath({ text, className }: { text: string; className?: string }) {
 const html = useMemo(() => {
   if (!text) return "";
   const withMd = renderInlineMd(text);
   return containsMath(text) ? renderMath(withMd) : withMd;
 }, [text]);
 return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
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
 return `<span class="text-danger-fg">[Math Error]</span>`;
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
 return `<span class="text-danger-fg">[Math Error]</span>`;
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
