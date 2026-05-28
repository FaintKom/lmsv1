"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import dynamic from "next/dynamic";
import katex from "katex";
import "katex/dist/katex.min.css";
import { MathRenderer, containsMath } from "./math-renderer";
import { sanitizeHtml } from "@/lib/sanitize-html";

const BlockEditor = dynamic(
 () => import("@/components/editor/block-editor").then((m) => ({ default: m.BlockEditor })),
 { ssr: false, loading: () => <div className="animate-pulse h-20 rounded bg-ink-100 " /> }
);

interface ContentRendererProps {
 body: string | Record<string, unknown>;
 format?: "markdown" | "html" | "tiptap";
}

/**
 * Markdown sanitize schema. The default GitHub schema strips inline `style`,
 * `class`/`id` and a few structural tags that design-system lesson markup
 * relies on — recover them here. `<script>` / event handlers / `iframe` stay
 * forbidden (default); authors needing embeds or widgets use an `html` block,
 * which routes through `sanitizeHtml` / the sandboxed iframe instead.
 */
const markdownSchema = {
 ...defaultSchema,
 tagNames: [
 ...(defaultSchema.tagNames || []),
 "details",
 "summary",
 "figure",
 "figcaption",
 ],
 attributes: {
 ...defaultSchema.attributes,
 "*": [
 ...(defaultSchema.attributes?.["*"] || []),
 "className",
 "class",
 "style",
 "id",
 ],
 },
};

export function ContentRenderer({ body, format = "markdown" }: ContentRendererProps) {
 if (!body) {
 return <p className="text-text-subtle">No content yet.</p>;
 }

 // TipTap JSON — render with read-only BlockEditor
 if (format === "tiptap" && typeof body === "object") {
 return <BlockEditor content={body} editable={false} />;
 }

 // Below: legacy string-based formats
 const text = typeof body === "string" ? body : "";

 if (!text) {
 return <p className="text-text-subtle">No content yet.</p>;
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
 rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema]]}
 >
 {text}
 </ReactMarkdown>
 );
}

/**
 * Strip inline `max-width: NNNpx` (and related `margin: auto` that
 * old lesson authors added to hand-center content). The page layout
 * already constrains width, so leaving the inline style in causes
 * a double constraint where content renders in a narrow column.
 * Also strips `font-family` so content inherits the app font.
 */
function normalizeLessonHtml(html: string): string {
 return html
 // Drop inline max-width on the outermost wrapper divs
 .replace(/max-width\s*:\s*[^;"}]+;?/gi, "")
 // Drop margin:0 auto etc — rely on page layout
 .replace(/margin\s*:\s*0\s+auto\s*;?/gi, "")
 // Drop hardcoded font-family so app font wins
 .replace(/font-family\s*:\s*[^;"}]+;?/gi, "");
}

/** Render HTML with KaTeX math support. First inserts HTML, then processes $...$ and $$...$$ */
function HtmlWithMath({ html }: { html: string }) {
 const ref = useRef<HTMLDivElement>(null);
 const normalized = sanitizeHtml(normalizeLessonHtml(html));

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
 let remaining = text;
 let hasMatch = false;

 // Block math first
 remaining = remaining.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => {
 hasMatch = true;
 return `\x00BLOCK:${tex}\x00`;
 });
 // Inline math. The opening and closing $ must NOT be padded by
 // whitespace — that's the LaTeX convention and it's the only
 // reliable way to distinguish "$x$" (math) from "$2 ... $3"
 // (currency in a word problem). Single-char form `$x$` is also
 // allowed. This stops the renderer from accidentally rendering
 // "$2 each and oranges for $" as a broken KaTeX expression.
 remaining = remaining.replace(
 /\$(\S[^$\n]*?\S|\S)\$/g,
 (_, tex) => {
 hasMatch = true;
 return `\x00INLINE:${tex}\x00`;
 }
 );

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
 }, [normalized]);

 return (
 <div
 ref={ref}
 className="lms-lesson-content"
 dangerouslySetInnerHTML={{ __html: normalized }}
 />
 );
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

/**
 * Strip an outer `<!DOCTYPE ...><html>...<body>...</body></html>` wrapper
 * if the author embedded a full HTML document inside a lesson block.
 * Keeps `<head>`'s `<style>` tags so widget CSS still applies — we
 * move them to the top of body so they parse correctly inside our
 * own srcdoc template.
 *
 * Without this, we end up with nested DOCTYPE/html/body tags inside the
 * iframe, which browsers "parse" but the result is fragile: scrollHeight
 * is wrong, scripts may run in the outer context only, and postMessage
 * resize never fires.
 */
function unwrapFullHtmlDoc(html: string): string {
 let s = html;
 // Strip doctype
 s = s.replace(/<!doctype[^>]*>/gi, "");
 // Extract <head> content (we want to keep its <style> tags)
 const headMatch = s.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
 const headInner = headMatch
 ? headMatch[1]
 // Drop meta/title/link — we provide our own
 .replace(/<(?:meta|title|link)[^>]*>/gi, "")
 .replace(/<\/(?:meta|title|link)\s*>/gi, "")
 .trim()
 : "";
 // Extract <body> content, or fall back to everything-after-html-open
 const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
 if (bodyMatch) {
 s = (headInner ? headInner + "\n" : "") + bodyMatch[1];
 } else {
 // Remove <html> and </html> tags but keep their contents
 s = s.replace(/<\/?html[^>]*>/gi, "");
 if (headInner) s = headInner + "\n" + s;
 }
 return s;
}

function SandboxedIframe({ html }: { html: string }) {
 // Remove any embedded <!DOCTYPE html><html>...<body>...</body></html>
 // wrapper the author may have pasted in. Keeps their <style> blocks.
 const cleaned = unwrapFullHtmlDoc(html);

 // The resize script runs in the iframe. It uses a ResizeObserver on
 // documentElement so the height updates as sliders, canvases, and
 // async content grow. postMessage goes to window.parent with target
 // '*' because the iframe has a null origin under sandbox="allow-scripts".
 const resizeScript = `<script>(function(){
 function send(){
 var h = Math.max(
 document.documentElement.scrollHeight,
 document.body ? document.body.scrollHeight : 0,
 document.body ? document.body.offsetHeight : 0
 );
 if (h > 0) parent.postMessage({type:'lms-iframe-resize', height: h}, '*');
 }
 if (document.readyState === 'loading') {
 document.addEventListener('DOMContentLoaded', send);
 } else { send(); }
 window.addEventListener('load', send);
 setTimeout(send, 50); setTimeout(send, 200); setTimeout(send, 600); setTimeout(send, 1500);
 if (window.ResizeObserver) {
 try { new ResizeObserver(send).observe(document.documentElement); } catch(e){}
 try { if (document.body) new ResizeObserver(send).observe(document.body); } catch(e){}
 }
 if (window.MutationObserver && document.body) {
 new MutationObserver(send).observe(document.body, {childList:true, subtree:true, attributes:true, characterData:true});
 }
 // Re-send on user input (sliders, buttons) because some changes don't
 // trigger mutation or resize observers.
 document.addEventListener('input', send, true);
 document.addEventListener('click', send, true);
 })();</script>`;

 const srcdoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif;color:#1e293b;line-height:1.6;padding:12px;touch-action:manipulation}*{box-sizing:border-box}canvas{max-width:100%}input[type=range]{min-height:44px}@media(prefers-color-scheme:dark){body{color:#e2e8f0;background:#1e1e1e}}</style></head><body>${cleaned}${resizeScript}</body></html>`;

 const handleRef = (iframe: HTMLIFrameElement | null) => {
 if (!iframe) return;
 const onMessage = (e: MessageEvent) => {
 if (
 e.source === iframe.contentWindow &&
 e.data?.type === "lms-iframe-resize" &&
 typeof e.data.height === "number" &&
 e.data.height > 20
 ) {
 iframe.style.height = e.data.height + "px";
 }
 };
 window.addEventListener("message", onMessage);
 };

 return (
 <iframe
 ref={handleRef}
 srcDoc={srcdoc}
 sandbox="allow-scripts"
 className="w-full border-0 rounded-lg overflow-hidden bg-paper-2 "
 style={{ minHeight: 120 }}
 scrolling="no"
 title="Interactive widget"
 />
 );
}
