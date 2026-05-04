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

interface ToolbarProps {
 editor: Editor;
}

export function EditorBubbleMenu({ editor }: ToolbarProps) {
 const btnClass = (active: boolean) =>
 `rounded p-1.5 transition-colors ${
 active
 ? "bg-primary-soft text-success-fg "
 : "text-text-muted hover:bg-ink-100 "
 }`;

 return (
 <BubbleMenu
 editor={editor}
 className="flex items-center gap-0.5 rounded-lg border border-border-strong bg-paper-2 p-1 shadow-lg "
 >
 <button
 onClick={() => editor.chain().focus().toggleBold().run()}
 className={btnClass(editor.isActive("bold"))}
 title="Bold"
 >
 <Bold className="h-4 w-4" />
 </button>
 <button
 onClick={() => editor.chain().focus().toggleItalic().run()}
 className={btnClass(editor.isActive("italic"))}
 title="Italic"
 >
 <Italic className="h-4 w-4" />
 </button>
 <button
 onClick={() => editor.chain().focus().toggleStrike().run()}
 className={btnClass(editor.isActive("strike"))}
 title="Strikethrough"
 >
 <Strikethrough className="h-4 w-4" />
 </button>

 <div className="mx-1 h-5 w-px bg-ink-200 " />

 <button
 onClick={() => editor.chain().focus().toggleCode().run()}
 className={btnClass(editor.isActive("code"))}
 title="Inline Code"
 >
 <Code className="h-4 w-4" />
 </button>
 <button
 onClick={() => {
 const latex = window.prompt("Inline math (LaTeX):", "x^2");
 if (latex) {
 editor.chain().focus().insertContent({
 type: "text",
 text: `$${latex}$`,
 }).run();
 }
 }}
 className={btnClass(false)}
 title="Inline Math"
 >
 <Sigma className="h-4 w-4" />
 </button>

 <div className="mx-1 h-5 w-px bg-ink-200 " />

 <button
 onClick={() => {
 const url = window.prompt("Link URL:");
 if (url) {
 editor.chain().focus().setLink({ href: url }).run();
 }
 }}
 className={btnClass(editor.isActive("link"))}
 title="Link"
 >
 <Link className="h-4 w-4" />
 </button>
 <button
 onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
 className={btnClass(editor.isActive("heading", { level: 1 }))}
 title="Heading 1"
 >
 <Heading1 className="h-4 w-4" />
 </button>
 <button
 onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
 className={btnClass(editor.isActive("heading", { level: 2 }))}
 title="Heading 2"
 >
 <Heading2 className="h-4 w-4" />
 </button>
 </BubbleMenu>
 );
}
