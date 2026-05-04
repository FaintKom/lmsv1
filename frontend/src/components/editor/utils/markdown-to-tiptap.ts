import type { JSONContent } from "@tiptap/react";

/**
 * Converts legacy markdown/html content to TipTap JSON.
 * This is a simple best-effort converter for migration.
 */
export function markdownToTiptap(body: string, format: string): JSONContent {
 if (!body) {
 return { type: "doc", content: [{ type: "paragraph" }] };
 }

 if (format === "html") {
 // For HTML, create a single paragraph with the raw text
 // The full HTML will be parsed by TipTap if loaded into an editor
 return {
 type: "doc",
 content: htmlToBlocks(body),
 };
 }

 // Markdown parsing
 const lines = body.split("\n");
 const blocks: JSONContent[] = [];
 let i = 0;

 while (i < lines.length) {
 const line = lines[i];

 // Empty line -> skip
 if (line.trim() === "") {
 i++;
 continue;
 }

 // Block math $$...$$
 if (line.trim().startsWith("$$")) {
 let latex = "";
 if (line.trim().endsWith("$$") && line.trim().length > 4) {
 // Single line block math
 latex = line.trim().slice(2, -2).trim();
 i++;
 } else {
 // Multi-line block math
 i++;
 const mathLines: string[] = [];
 while (i < lines.length && !lines[i].trim().startsWith("$$")) {
 mathLines.push(lines[i]);
 i++;
 }
 latex = mathLines.join("\n").trim();
 if (i < lines.length) i++; // skip closing $$
 }
 blocks.push({ type: "mathBlock", attrs: { latex } });
 continue;
 }

 // Code block ```
 if (line.trim().startsWith("```")) {
 const lang = line.trim().slice(3).trim() || "javascript";
 i++;
 const codeLines: string[] = [];
 while (i < lines.length && !lines[i].trim().startsWith("```")) {
 codeLines.push(lines[i]);
 i++;
 }
 if (i < lines.length) i++; // skip closing ```
 blocks.push({
 type: "codeBlock",
 attrs: { language: lang },
 content: [{ type: "text", text: codeLines.join("\n") }],
 });
 continue;
 }

 // Headings
 const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
 if (headingMatch) {
 const level = headingMatch[1].length;
 blocks.push({
 type: "heading",
 attrs: { level },
 content: parseInlineContent(headingMatch[2]),
 });
 i++;
 continue;
 }

 // Horizontal rule
 if (/^[-*_]{3,}\s*$/.test(line.trim())) {
 blocks.push({ type: "horizontalRule" });
 i++;
 continue;
 }

 // Blockquote
 if (line.trim().startsWith("> ")) {
 const quoteLines: string[] = [];
 while (i < lines.length && lines[i].trim().startsWith("> ")) {
 quoteLines.push(lines[i].trim().slice(2));
 i++;
 }
 blocks.push({
 type: "blockquote",
 content: [
 {
 type: "paragraph",
 content: parseInlineContent(quoteLines.join(" ")),
 },
 ],
 });
 continue;
 }

 // Bullet list
 if (/^[-*+]\s+/.test(line.trim())) {
 const items: JSONContent[] = [];
 while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
 const itemText = lines[i].trim().replace(/^[-*+]\s+/, "");
 items.push({
 type: "listItem",
 content: [{ type: "paragraph", content: parseInlineContent(itemText) }],
 });
 i++;
 }
 blocks.push({ type: "bulletList", content: items });
 continue;
 }

 // Ordered list
 if (/^\d+\.\s+/.test(line.trim())) {
 const items: JSONContent[] = [];
 while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
 const itemText = lines[i].trim().replace(/^\d+\.\s+/, "");
 items.push({
 type: "listItem",
 content: [{ type: "paragraph", content: parseInlineContent(itemText) }],
 });
 i++;
 }
 blocks.push({ type: "orderedList", content: items });
 continue;
 }

 // Regular paragraph
 const paraLines: string[] = [];
 while (i < lines.length && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
 paraLines.push(lines[i]);
 i++;
 }
 if (paraLines.length > 0) {
 blocks.push({
 type: "paragraph",
 content: parseInlineContent(paraLines.join(" ")),
 });
 }
 }

 if (blocks.length === 0) {
 blocks.push({ type: "paragraph" });
 }

 return { type: "doc", content: blocks };
}

function isBlockStart(line: string): boolean {
 const trimmed = line.trim();
 return (
 trimmed.startsWith("#") ||
 trimmed.startsWith("```") ||
 trimmed.startsWith("$$") ||
 trimmed.startsWith("> ") ||
 /^[-*+]\s+/.test(trimmed) ||
 /^\d+\.\s+/.test(trimmed) ||
 /^[-*_]{3,}\s*$/.test(trimmed)
 );
}

function parseInlineContent(text: string): JSONContent[] {
 if (!text) return [{ type: "text", text: " " }];

 const result: JSONContent[] = [];
 // Split by inline math $...$, bold **...**, italic *...*, code `...`
 const regex = /(\$[^$]+\$|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
 let lastIndex = 0;
 let match;

 while ((match = regex.exec(text)) !== null) {
 // Text before match
 if (match.index > lastIndex) {
 result.push({ type: "text", text: text.slice(lastIndex, match.index) });
 }

 const token = match[1];

 if (token.startsWith("$") && token.endsWith("$")) {
 // Inline math — keep as $...$ text, Mathematics extension handles rendering
 result.push({ type: "text", text: token });
 } else if (token.startsWith("**") && token.endsWith("**")) {
 result.push({
 type: "text",
 text: token.slice(2, -2),
 marks: [{ type: "bold" }],
 });
 } else if (token.startsWith("*") && token.endsWith("*")) {
 result.push({
 type: "text",
 text: token.slice(1, -1),
 marks: [{ type: "italic" }],
 });
 } else if (token.startsWith("`") && token.endsWith("`")) {
 result.push({
 type: "text",
 text: token.slice(1, -1),
 marks: [{ type: "code" }],
 });
 }

 lastIndex = match.index + token.length;
 }

 // Remaining text
 if (lastIndex < text.length) {
 result.push({ type: "text", text: text.slice(lastIndex) });
 }

 return result.length > 0 ? result : [{ type: "text", text: " " }];
}

function htmlToBlocks(html: string): JSONContent[] {
 // Simple HTML → paragraph fallback
 // Strip HTML tags for a basic conversion
 const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
 if (!text) return [{ type: "paragraph" }];

 return [
 {
 type: "paragraph",
 content: [{ type: "text", text }],
 },
 ];
}
