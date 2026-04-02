"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import dynamic from "next/dynamic";
import katex from "katex";
import "katex/dist/katex.min.css";
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

  // HTML mode — use iframe if content has scripts (for interactive widgets)
  // Must be checked BEFORE math detection since HTML may contain $ signs (e.g., "$50")
  if (format === "html") {
    const hasScript = text.includes("<script");
    if (hasScript) {
      const parts = splitInteractive(text);
      return (
        <>
          {parts.before && <HtmlWithMath html={parts.before} />}
          <SandboxedIframe html={parts.interactive} />
          {parts.after && <HtmlWithMath html={parts.after} />}
        </>
      );
    }
    return <HtmlWithMath html={text} />;
  }

  // If content has math, use MathRenderer
  if (containsMath(text)) {
    return <MathRenderer content={text} />;
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

/** Render HTML with KaTeX math support. First inserts HTML, then processes $...$ and $$...$$ */
function HtmlWithMath({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    // Find all text nodes and process $...$ and $$...$$ patterns
    const walker = document.createTreeWalker(ref.current, NodeFilter.SHOW_TEXT);
    const textNodes: Text[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.textContent && /\$/.test(node.textContent)) {
        textNodes.push(node as Text);
      }
    }

    for (const textNode of textNodes) {
      const text = textNode.textContent || "";
      // Skip if inside <code>, <pre>, or <script> tags
      const parent = textNode.parentElement;
      if (parent && /^(code|pre|script|style)$/i.test(parent.tagName)) continue;

      // Process block math $$...$$ and inline math $...$
      const parts: (string | { tex: string; display: boolean })[] = [];
      let remaining = text;
      let hasMatch = false;

      // Block math first
      remaining = remaining.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
        hasMatch = true;
        return `\x00BLOCK:${tex}\x00`;
      });
      // Inline math
      remaining = remaining.replace(/\$([^$\n]+?)\$/g, (_, tex) => {
        hasMatch = true;
        return `\x00INLINE:${tex}\x00`;
      });

      if (!hasMatch) continue;

      const fragments = remaining.split('\x00');
      const span = document.createElement('span');

      for (const frag of fragments) {
        if (frag.startsWith('BLOCK:')) {
          const el = document.createElement('span');
          try {
            katex.render(frag.slice(6), el, { displayMode: true, throwOnError: false });
          } catch { el.textContent = frag.slice(6); }
          span.appendChild(el);
        } else if (frag.startsWith('INLINE:')) {
          const el = document.createElement('span');
          try {
            katex.render(frag.slice(7), el, { displayMode: false, throwOnError: false });
          } catch { el.textContent = frag.slice(7); }
          span.appendChild(el);
        } else if (frag) {
          span.appendChild(document.createTextNode(frag));
        }
      }

      textNode.parentNode?.replaceChild(span, textNode);
    }
  }, [html]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />;
}

/** Split HTML into { before, interactive, after } around script-containing blocks */
function splitInteractive(html: string): { before: string; interactive: string; after: string } {
  // Strategy 1: explicit markers <!-- interactive --> ... <!-- /interactive -->
  const markerStart = "<!-- interactive -->";
  const markerEnd = "<!-- /interactive -->";
  const ms = html.indexOf(markerStart);
  const me = html.indexOf(markerEnd);
  if (ms !== -1 && me !== -1 && me > ms) {
    return {
      before: html.slice(0, ms).trim(),
      interactive: html.slice(ms + markerStart.length, me).trim(),
      after: html.slice(me + markerEnd.length).trim(),
    };
  }

  // Strategy 2: find the parent block element that contains the first <script>
  // Look for <!-- Interactive Widget --> comment or similar markers
  const widgetComment = /<!--\s*Interactive\s*Widget\s*-->/i;
  const wcMatch = html.match(widgetComment);

  // Find the first <script and last </script>
  const firstScript = html.indexOf("<script");
  const lastScriptEnd = html.lastIndexOf("</script>");
  if (firstScript === -1) return { before: "", interactive: html, after: "" };

  const afterScriptTag = lastScriptEnd + "</script>".length;

  // Find the opening tag of the block containing the script.
  // Walk backwards from the script (or widget comment) to find the start of its container div.
  let interactiveStart = wcMatch ? wcMatch.index! : firstScript;

  // Walk backwards to find the nearest block-level opening tag before the interactive zone
  const beforeChunk = html.slice(0, interactiveStart);
  // Find the last closing block tag (</p>, </h2>, </div>, </ol>, </ul>, etc.) before interactive
  const closingBlockRe = /<\/(p|div|h[1-6]|ul|ol|blockquote|section|pre)>\s*$/i;
  const closingMatch = beforeChunk.match(closingBlockRe);
  if (closingMatch) {
    interactiveStart = beforeChunk.lastIndexOf(closingMatch[0]) + closingMatch[0].length;
  }

  // Find the end of the interactive zone: the closing </div> that wraps the script's container
  // After the last </script>, find the next closing block tag
  let interactiveEnd = afterScriptTag;
  const afterChunk = html.slice(afterScriptTag);
  const nextCloseDiv = afterChunk.match(/^\s*<\/div>/i);
  if (nextCloseDiv) {
    interactiveEnd = afterScriptTag + nextCloseDiv.index! + nextCloseDiv[0].length;
  }

  return {
    before: html.slice(0, interactiveStart).trim(),
    interactive: html.slice(interactiveStart, interactiveEnd).trim(),
    after: html.slice(interactiveEnd).trim(),
  };
}

function SandboxedIframe({ html }: { html: string }) {
  // Inject a script that sends its height to parent via postMessage
  const resizeScript = `<script>
    function sendHeight(){
      var h = document.documentElement.scrollHeight;
      parent.postMessage({type:'iframe-resize', height: h}, '*');
    }
    window.addEventListener('load', function(){ sendHeight(); setTimeout(sendHeight, 100); setTimeout(sendHeight, 500); });
    new MutationObserver(sendHeight).observe(document.body, {childList:true, subtree:true, attributes:true});
  </script>`;
  const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font-family:system-ui,sans-serif;color:#1e293b;line-height:1.7;overflow:hidden}*{box-sizing:border-box}@media(prefers-color-scheme:dark){body{color:#e2e8f0;background:#1e1e1e}}</style></head><body>${html}${resizeScript}</body></html>`;

  const handleRef = (iframe: HTMLIFrameElement | null) => {
    if (!iframe) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source === iframe.contentWindow && e.data?.type === 'iframe-resize' && e.data.height) {
        iframe.style.height = e.data.height + 'px';
      }
    };
    window.addEventListener('message', onMessage);
    // Also try direct access as fallback
    iframe.onload = () => {
      try {
        const h = iframe.contentDocument?.documentElement?.scrollHeight;
        if (h) iframe.style.height = h + 'px';
      } catch { /* sandbox restriction */ }
    };
  };

  return (
    <iframe
      ref={handleRef}
      srcDoc={srcdoc}
      sandbox="allow-scripts"
      className="w-full border-0 rounded-xl overflow-hidden"
      style={{ minHeight: 100 }}
      scrolling="no"
    />
  );
}
