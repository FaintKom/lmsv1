"use client";

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionProps, type SuggestionKeyDownProps } from "@tiptap/suggestion";
import {
 Heading1,
 Heading2,
 Heading3,
 List,
 ListOrdered,
 Code,
 Sigma,
 Image,
 Quote,
 AlertCircle,
 Minus,
 Type,
} from "lucide-react";
import type { Editor } from "@tiptap/core";

type Translate = (key: string) => string;

interface CommandDef {
 titleKey: string;
 descKey: string;
 icon: React.ComponentType<{ className?: string }>;
 command: (editor: Editor, t: Translate) => void;
}

/** A command as the menu shows it: names already in the reader's language. */
interface CommandItem extends CommandDef {
 title: string;
 description: string;
 t: Translate;
}

const COMMANDS: CommandDef[] = [
 {
 titleKey: "be.text",
 descKey: "be.textDesc",
 icon: Type,
 command: (editor) => editor.chain().focus().setParagraph().run(),
 },
 {
 titleKey: "be.heading:1",
 descKey: "be.h1Desc",
 icon: Heading1,
 command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
 },
 {
 titleKey: "be.heading:2",
 descKey: "be.h2Desc",
 icon: Heading2,
 command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
 },
 {
 titleKey: "be.heading:3",
 descKey: "be.h3Desc",
 icon: Heading3,
 command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
 },
 {
 titleKey: "be.bulletList",
 descKey: "be.bulletDesc",
 icon: List,
 command: (editor) => editor.chain().focus().toggleBulletList().run(),
 },
 {
 titleKey: "be.numberedList",
 descKey: "be.numberedDesc",
 icon: ListOrdered,
 command: (editor) => editor.chain().focus().toggleOrderedList().run(),
 },
 {
 titleKey: "be.codeBlock",
 descKey: "be.codeDesc",
 icon: Code,
 command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
 },
 {
 titleKey: "be.mathBlock",
 descKey: "be.mathDesc",
 icon: Sigma,
 command: (editor) => {
 editor.commands.setMathBlock({ latex: "" });
 },
 },
 {
 titleKey: "be.image",
 descKey: "be.imageDesc",
 icon: Image,
 command: (editor, t) => {
 const url = window.prompt(t("be.imagePrompt"));
 if (url) {
 editor.chain().focus().setImage({ src: url }).run();
 }
 },
 },
 {
 titleKey: "be.quote",
 descKey: "be.quoteDesc",
 icon: Quote,
 command: (editor) => editor.chain().focus().toggleBlockquote().run(),
 },
 {
 titleKey: "be.callout",
 descKey: "be.calloutDesc",
 icon: AlertCircle,
 command: (editor) => editor.chain().focus().setCallout({ variant: "info" }).run(),
 },
 {
 titleKey: "be.divider",
 descKey: "be.dividerDesc",
 icon: Minus,
 command: (editor) => editor.chain().focus().setHorizontalRule().run(),
 },
];

/** "be.heading:2" → t("be.heading") with {n} filled in. */
function label(t: Translate, key: string): string {
 const [k, n] = key.split(":");
 return n ? t(k).replace("{n}", n) : t(k);
}

/** The menu for one query, matched against names in the reader's language. */
export function slashItems(t: Translate, query: string): CommandItem[] {
 const q = query.toLowerCase();
 return COMMANDS.map((c) => ({ ...c, title: label(t, c.titleKey), description: t(c.descKey), t })).filter(
 (item) => item.title.toLowerCase().includes(q),
 );
}

interface CommandListProps {
 items: CommandItem[];
 command: (item: CommandItem) => void;
 emptyLabel: string;
}

interface CommandListHandle {
 onKeyDown: (props: SuggestionKeyDownProps) => boolean;
}

function CommandList({ items, command, emptyLabel }: CommandListProps & { ref?: React.Ref<CommandListHandle> }) {
 const [selectedIndex, setSelectedIndex] = useState(0);
 const containerRef = useRef<HTMLDivElement>(null);

 useEffect(() => {
 setSelectedIndex(0);
 }, [items]);

 useLayoutEffect(() => {
 const el = containerRef.current?.children[selectedIndex] as HTMLElement;
 el?.scrollIntoView({ block: "nearest" });
 }, [selectedIndex]);

 const selectItem = useCallback(
 (index: number) => {
 const item = items[index];
 if (item) command(item);
 },
 [items, command]
 );

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (e.key === "ArrowUp") {
 e.preventDefault();
 setSelectedIndex((i) => (i + items.length - 1) % items.length);
 return true;
 }
 if (e.key === "ArrowDown") {
 e.preventDefault();
 setSelectedIndex((i) => (i + 1) % items.length);
 return true;
 }
 if (e.key === "Enter") {
 e.preventDefault();
 selectItem(selectedIndex);
 return true;
 }
 return false;
 };

 document.addEventListener("keydown", handleKeyDown, true);
 return () => document.removeEventListener("keydown", handleKeyDown, true);
 }, [items, selectedIndex, selectItem]);

 if (items.length === 0) {
 return (
 <div className="slash-menu rounded-lg border border-border-strong bg-surface p-3 shadow-lg ">
 <p className="text-sm text-text-subtle">{emptyLabel}</p>
 </div>
 );
 }

 return (
 <div
 ref={containerRef}
 className="slash-menu max-h-72 overflow-y-auto rounded-lg border border-border-strong bg-surface p-1 shadow-lg "
 >
 {items.map((item, index) => {
 const Icon = item.icon;
 return (
 <button
 key={item.titleKey}
 onClick={() => selectItem(index)}
 className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
 index === selectedIndex
 ? "bg-success-soft text-success-fg "
 : "text-text hover:bg-surface-2 "
 }`}
 >
 <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface ">
 <Icon className="h-4 w-4" />
 </div>
 <div>
 <p className="text-sm font-medium">{item.title}</p>
 <p className="text-xs text-text-subtle">{item.description}</p>
 </div>
 </button>
 );
 })}
 </div>
 );
}

/**
 * The menu runs in TipTap callbacks, outside React, so the translator comes
 * in as an option: `SlashCommands.configure({ t })`. Filtering matches the
 * translated name, so "/заг" finds «Заголовок» for a Russian reader.
 */
export const SlashCommands = Extension.create<{ t: Translate }>({
 name: "slashCommands",

 addOptions() {
 return { t: (key: string) => key };
 },

 addProseMirrorPlugins() {
 const t: Translate = (key) => this.options.t(key);
 return [
 Suggestion<CommandItem>({
 editor: this.editor,
 char: "/",
 command: ({ editor, range, props }) => {
 props.command(editor, props.t);
 editor.chain().focus().deleteRange(range).run();
 },
 items: ({ query }) => slashItems(t, query),
 render: () => {
 let component: ReactRenderer<unknown> | null = null;
 let popup: HTMLDivElement | null = null;

 const place = (props: SuggestionProps<CommandItem>) => {
 const rect = props.clientRect?.();
 if (popup && rect) {
 popup.style.left = `${rect.left}px`;
 popup.style.top = `${rect.bottom + 4}px`;
 }
 };

 return {
 onStart: (props) => {
 component = new ReactRenderer(CommandList, {
 props: { ...props, emptyLabel: t("be.noResults") },
 editor: props.editor,
 });

 popup = document.createElement("div");
 popup.style.position = "absolute";
 popup.style.zIndex = "50";
 document.body.appendChild(popup);

 popup.appendChild(component.element as HTMLElement);
 place(props);
 },
 onUpdate: (props) => {
 component?.updateProps({ ...props, emptyLabel: t("be.noResults") });
 place(props);
 },
 onKeyDown: (props: SuggestionKeyDownProps) => {
 if (props.event.key === "Escape") {
 popup?.remove();
 component?.destroy();
 return true;
 }
 // Let the CommandList handle arrow/enter keys
 return false;
 },
 onExit: () => {
 popup?.remove();
 component?.destroy();
 },
 };
 },
 }),
 ];
 },
});
