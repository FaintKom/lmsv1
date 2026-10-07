"use client";

import { BubbleMenu } from "@tiptap/react/menus";
import type { Editor } from "@tiptap/react";
import {
 Bold,
 Italic,
 Strikethrough,
 Code,
 Link,
 Heading1,
 Heading2,
 Sigma,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

interface ToolbarProps {
 editor: Editor;
}

export function EditorBubbleMenu({ editor }: ToolbarProps) {
 const { t } = useTranslation();
 const btnClass = (active: boolean) =>
 `rounded p-1.5 transition-colors ${
 active
 ? "bg-primary-soft text-success-fg "
 : "text-text-muted hover:bg-surface-2 "
 }`;

 return (
 <BubbleMenu
 editor={editor}
 className="flex items-center gap-0.5 rounded-lg border border-border-strong bg-surface p-1 shadow-lg "
 >
 <button
 onClick={() => editor.chain().focus().toggleBold().run()}
 className={btnClass(editor.isActive("bold"))}
 title={t("be.bold")}
 aria-label={t("be.bold")}
 >
 <Bold className="h-4 w-4" />
 </button>
 <button
 onClick={() => editor.chain().focus().toggleItalic().run()}
 className={btnClass(editor.isActive("italic"))}
 title={t("be.italic")}
 aria-label={t("be.italic")}
 >
 <Italic className="h-4 w-4" />
 </button>
 <button
 onClick={() => editor.chain().focus().toggleStrike().run()}
 className={btnClass(editor.isActive("strike"))}
 title={t("be.strike")}
 aria-label={t("be.strike")}
 >
 <Strikethrough className="h-4 w-4" />
 </button>

 <div className="mx-1 h-5 w-px bg-ink-200 " />

 <button
 onClick={() => editor.chain().focus().toggleCode().run()}
 className={btnClass(editor.isActive("code"))}
 title={t("be.inlineCode")}
 aria-label={t("be.inlineCode")}
 >
 <Code className="h-4 w-4" />
 </button>
 <button
 onClick={() => {
 const latex = window.prompt(t("be.inlineMathPrompt"), "x^2");
 if (latex) {
 editor.chain().focus().insertContent({
 type: "text",
 text: `$${latex}$`,
 }).run();
 }
 }}
 className={btnClass(false)}
 title={t("be.inlineMath")}
 aria-label={t("be.inlineMath")}
 >
 <Sigma className="h-4 w-4" />
 </button>

 <div className="mx-1 h-5 w-px bg-ink-200 " />

 <button
 onClick={() => {
 const url = window.prompt(t("be.linkPrompt"));
 if (url) {
 editor.chain().focus().setLink({ href: url }).run();
 }
 }}
 className={btnClass(editor.isActive("link"))}
 title={t("be.link")}
 aria-label={t("be.link")}
 >
 <Link className="h-4 w-4" />
 </button>
 <button
 onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
 className={btnClass(editor.isActive("heading", { level: 1 }))}
 title={t("be.heading").replace("{n}", "1")}
 aria-label={t("be.heading").replace("{n}", "1")}
 >
 <Heading1 className="h-4 w-4" />
 </button>
 <button
 onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
 className={btnClass(editor.isActive("heading", { level: 2 }))}
 title={t("be.heading").replace("{n}", "2")}
 aria-label={t("be.heading").replace("{n}", "2")}
 >
 <Heading2 className="h-4 w-4" />
 </button>
 </BubbleMenu>
 );
}
