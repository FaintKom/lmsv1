"use client";

import { useRef, useCallback, useEffect } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import ImageExtension from "@tiptap/extension-image";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import LinkExtension from "@tiptap/extension-link";
import Mathematics from "@tiptap/extension-mathematics";
import { common, createLowlight } from "lowlight";
import {
 Bold,
 Italic,
 Strikethrough,
 Code,
 Heading1,
 Heading2,
 Heading3,
 List,
 ListOrdered,
 Quote,
 Code2,
 Minus,
 Link2,
 ImageIcon,
 AlertCircle,
 Sigma,
 Spline,
 BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import "katex/dist/katex.min.css";
import "./editor-styles.css";

import apiClient from "@/lib/api-client";
import { Callout } from "./extensions/callout";
import { MathBlock } from "./extensions/math-block";
import { MathPlot } from "./extensions/math-plot";
import { Term } from "./extensions/term";
import { SlashCommands } from "./slash-commands";
import { EditorBubbleMenu } from "./toolbar";
import { useTranslation } from "@/lib/i18n/context";

const lowlight = createLowlight(common);

// ---------------------------------------------------------------------------
// Toolbar button
// ---------------------------------------------------------------------------

function ToolbarButton({
 onClick,
 active,
 title,
 children,
}: {
 onClick: () => void;
 active?: boolean;
 title: string;
 children: React.ReactNode;
}) {
 return (
 <button
 type="button"
 onClick={onClick}
 title={title}
 aria-label={title}
 aria-pressed={active}
 className={`rounded p-1.5 transition-colors ${
 active
 ? "bg-primary-soft text-success-fg "
 : "text-text-muted hover:bg-surface-2 hover:text-text "
 }`}
 >
 {children}
 </button>
 );
}

function ToolbarSeparator() {
 return <div className="mx-1 h-5 w-px bg-ink-200 " />;
}

// ---------------------------------------------------------------------------
// Fixed toolbar above editor
// ---------------------------------------------------------------------------

function EditorToolbar({
 editor,
 onImageUpload,
}: {
 editor: Editor;
 onImageUpload: (file: File) => void;
}) {
 const { t } = useTranslation();
 const fileInputRef = useRef<HTMLInputElement>(null);

 return (
 <div className="flex flex-wrap items-center gap-0.5 border-b border-border-strong bg-surface-2 px-2 py-1.5">
 {/* Text formatting */}
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleBold().run()}
 active={editor.isActive("bold")}
 title={t("be.bold")}
 >
 <Bold className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleItalic().run()}
 active={editor.isActive("italic")}
 title={t("be.italic")}
 >
 <Italic className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleStrike().run()}
 active={editor.isActive("strike")}
 title={t("be.strike")}
 >
 <Strikethrough className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleCode().run()}
 active={editor.isActive("code")}
 title={t("be.inlineCode")}
 >
 <Code className="h-4 w-4" />
 </ToolbarButton>

 <ToolbarSeparator />

 {/* Headings */}
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
 active={editor.isActive("heading", { level: 1 })}
 title={t("be.heading").replace("{n}", "1")}
 >
 <Heading1 className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
 active={editor.isActive("heading", { level: 2 })}
 title={t("be.heading").replace("{n}", "2")}
 >
 <Heading2 className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
 active={editor.isActive("heading", { level: 3 })}
 title={t("be.heading").replace("{n}", "3")}
 >
 <Heading3 className="h-4 w-4" />
 </ToolbarButton>

 <ToolbarSeparator />

 {/* Lists */}
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleBulletList().run()}
 active={editor.isActive("bulletList")}
 title={t("be.bulletList")}
 >
 <List className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleOrderedList().run()}
 active={editor.isActive("orderedList")}
 title={t("be.numberedList")}
 >
 <ListOrdered className="h-4 w-4" />
 </ToolbarButton>

 <ToolbarSeparator />

 {/* Blocks */}
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleBlockquote().run()}
 active={editor.isActive("blockquote")}
 title={t("be.quote")}
 >
 <Quote className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.chain().focus().toggleCodeBlock().run()}
 active={editor.isActive("codeBlock")}
 title={t("be.codeBlock")}
 >
 <Code2 className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.commands.setMathBlock({ latex: "" })}
 active={editor.isActive("mathBlock")}
 title={t("be.mathBlock")}
 >
 <Sigma className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.commands.setMathPlot()}
 active={editor.isActive("mathPlot")}
 title={t("be.functionPlot")}
 >
 <Spline className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() =>
 editor.chain().focus().setCallout({ variant: "info" }).run()
 }
 active={editor.isActive("callout")}
 title={t("be.callout")}
 >
 <AlertCircle className="h-4 w-4" />
 </ToolbarButton>
 <ToolbarButton
 onClick={() => editor.chain().focus().setHorizontalRule().run()}
 title={t("be.divider")}
 >
 <Minus className="h-4 w-4" />
 </ToolbarButton>

 <ToolbarSeparator />

 {/* Link */}
 <ToolbarButton
 onClick={() => {
 const url = window.prompt(t("be.linkPrompt"));
 if (url) {
 editor.chain().focus().setLink({ href: url }).run();
 }
 }}
 active={editor.isActive("link")}
 title={t("be.link")}
 >
 <Link2 className="h-4 w-4" />
 </ToolbarButton>

 {/* Term hint */}
 <ToolbarButton
 onClick={() => {
 if (editor.isActive("term")) {
 editor.chain().focus().unsetTerm().run();
 return;
 }
 if (editor.state.selection.empty) return;
 const definition = window.prompt(t("be.termPrompt"));
 if (definition) {
 editor.chain().focus().setTerm({ definition }).run();
 }
 }}
 active={editor.isActive("term")}
 title={t("be.termHint")}
 >
 <BookOpen className="h-4 w-4" />
 </ToolbarButton>

 {/* Image upload */}
 <ToolbarButton
 onClick={() => fileInputRef.current?.click()}
 title={t("be.uploadImage")}
 >
 <ImageIcon className="h-4 w-4" />
 </ToolbarButton>
 <input
 ref={fileInputRef}
 type="file"
 accept="image/*"
 className="hidden"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) onImageUpload(f);
 e.target.value = "";
 }}
 />
 </div>
 );
}

// ---------------------------------------------------------------------------
// Block Editor
// ---------------------------------------------------------------------------

interface BlockEditorProps {
 content: JSONContent | string | null;
 onChange?: (json: JSONContent) => void;
 editable?: boolean;
}

export function BlockEditor({
 content,
 onChange,
 editable = true,
}: BlockEditorProps) {
 const { t } = useTranslation();
 const tRef = useRef(t);
 tRef.current = t;
 const editor = useEditor({
 extensions: [
 StarterKit.configure({
 codeBlock: false,
 horizontalRule: false,
 }),
 Placeholder.configure({
 placeholder: ({ node }) => {
 if (node.type.name === "heading") {
 return tRef.current("be.heading").replace("{n}", String(node.attrs.level));
 }
 return tRef.current("be.placeholder");
 },
 }),
 CodeBlockLowlight.configure({
 lowlight,
 defaultLanguage: "javascript",
 }),
 ImageExtension.configure({
 inline: false,
 allowBase64: false,
 }),
 HorizontalRule,
 LinkExtension.configure({
 openOnClick: false,
 HTMLAttributes: {
 class: "text-primary underline ",
 },
 }),
 Mathematics.configure({
 katexOptions: {
 throwOnError: false,
 },
 }),
 Callout,
 MathBlock,
 MathPlot,
 Term,
 ...(editable ? [SlashCommands.configure({ t: (key: string) => tRef.current(key) })] : []),
 ],
 content: content || { type: "doc", content: [{ type: "paragraph" }] },
 editable,
 editorProps: {
 attributes: {
 class: `block-editor-content prose prose-slate max-w-none focus:outline-none ${
 editable ? "min-h-[300px]" : ""
 }`,
 },
 },
 onUpdate: ({ editor: e }) => {
 onChange?.(e.getJSON());
 },
 immediatelyRender: false,
 });

 // -----------------------------------------------------------------------
 // Image upload helper
 // -----------------------------------------------------------------------

 const uploadAndInsertImage = useCallback(
 async (file: File) => {
 if (!editor) return;

 const formData = new FormData();
 formData.append("file", file);

 try {
 const { data } = await apiClient.post<{ url: string }>(
 "/courses/upload-image",
 formData,
 { headers: { "Content-Type": "multipart/form-data" } },
 );
 editor.chain().focus().setImage({ src: data.url }).run();
 } catch {
 toast.error(tRef.current("be.uploadFailed"));
 }
 },
 [editor],
 );

 // -----------------------------------------------------------------------
 // Paste & drop image handlers
 // -----------------------------------------------------------------------

 useEffect(() => {
 if (!editor || !editable) return;

 const dom = editor.view.dom;

 const handlePaste = (event: Event) => {
 const clipboardEvent = event as ClipboardEvent;
 const items = clipboardEvent.clipboardData?.items;
 if (!items) return;
 for (const item of items) {
 if (item.type.startsWith("image/")) {
 clipboardEvent.preventDefault();
 const file = item.getAsFile();
 if (file) uploadAndInsertImage(file);
 return;
 }
 }
 };

 const handleDrop = (event: Event) => {
 const dragEvent = event as DragEvent;
 const files = dragEvent.dataTransfer?.files;
 if (!files?.length) return;
 const file = files[0];
 if (file.type.startsWith("image/")) {
 dragEvent.preventDefault();
 uploadAndInsertImage(file);
 }
 };

 dom.addEventListener("paste", handlePaste);
 dom.addEventListener("drop", handleDrop);

 return () => {
 dom.removeEventListener("paste", handlePaste);
 dom.removeEventListener("drop", handleDrop);
 };
 }, [editor, editable, uploadAndInsertImage]);

 // -----------------------------------------------------------------------
 // Render
 // -----------------------------------------------------------------------

 if (!editor) {
 return (
 <div className="flex h-[300px] items-center justify-center rounded-lg border border-border-strong ">
 <p className="text-sm text-text-subtle">{t("admin.exerciseEditor.loadingEditor")}</p>
 </div>
 );
 }

 return (
 <div
 className={`block-editor rounded-lg border border-border-strong bg-surface overflow-hidden focus-within:ring-2 focus-within:ring-border-focus ${
 editable ? "shadow-sm" : ""
 }`}
 >
 {editable && (
 <EditorToolbar
 editor={editor}
 onImageUpload={uploadAndInsertImage}
 />
 )}
 {editable && <EditorBubbleMenu editor={editor} />}
 <EditorContent
 editor={editor}
 className="block-editor-wrapper px-6 py-4"
 />
 </div>
 );
}
