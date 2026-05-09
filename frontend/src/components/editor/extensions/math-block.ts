import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";

declare module "@tiptap/core" {
 interface Commands<ReturnType> {
 mathBlock: {
 setMathBlock: (attrs?: { latex?: string }) => ReturnType;
 };
 }
}

export const MathBlock = Node.create({
 name: "mathBlock",
 group: "block",
 atom: true,

 addAttributes() {
 return {
 latex: {
 default: "",
 parseHTML: (el) => el.getAttribute("data-latex") || "",
 renderHTML: (attrs) => ({ "data-latex": attrs.latex }),
 },
 };
 },

 parseHTML() {
 return [{ tag: 'div[data-type="math-block"]' }];
 },

 renderHTML({ HTMLAttributes }) {
 const latex = HTMLAttributes["data-latex"] || "";
 let rendered = "";
 try {
 rendered = katex.renderToString(latex, {
 displayMode: true,
 throwOnError: false,
 });
 } catch {
 rendered = `<span class="text-danger-fg">[Math Error]</span>`;
 }

 return [
 "div",
 mergeAttributes(HTMLAttributes, {
 "data-type": "math-block",
 class: "math-block my-4 flex items-center justify-center rounded-lg border border-border-strong bg-surface-2 p-4 cursor-pointer",
 }),
 ["div", { class: "math-display", contenteditable: "false" }, ""],
 ];
 },

 addNodeView() {
 return ({ node, getPos, editor }) => {
 const dom = document.createElement("div");
 dom.setAttribute("data-type", "math-block");
 dom.className = "math-block my-4 rounded-lg border border-border-strong bg-surface-2 p-4";

 const renderPreview = () => {
 const latex = node.attrs.latex || "";
 if (!latex) {
 dom.innerHTML = `<p class="text-center text-sm text-text-subtle cursor-pointer">Click to add math formula</p>`;
 } else {
 try {
 const html = katex.renderToString(latex, { displayMode: true, throwOnError: false });
 dom.innerHTML = `<div class="flex justify-center cursor-pointer">${html}</div>`;
 } catch {
 dom.innerHTML = `<p class="text-center text-danger-fg">Invalid LaTeX</p>`;
 }
 }
 };

 const showEditor = () => {
 const latex = node.attrs.latex || "";
 dom.innerHTML = "";
 dom.className = "math-block my-4 rounded-lg border-2 border-primary bg-surface-2 p-4 space-y-3";

 const textarea = document.createElement("textarea");
 textarea.value = latex;
 textarea.placeholder = "Enter LaTeX formula... e.g. \\int_0^1 f(x)dx";
 textarea.className = "w-full rounded-md border border-ink-300 bg-paper-2 px-3 py-2 text-sm font-mono text-ink-700 focus:border-primary focus:outline-none resize-none";
 textarea.rows = 3;
 textarea.addEventListener("input", () => {
 // Update preview
 try {
 const html = katex.renderToString(textarea.value, { displayMode: true, throwOnError: false });
 preview.innerHTML = html;
 } catch {
 preview.innerHTML = `<span class="text-danger-fg text-sm">Invalid LaTeX</span>`;
 }
 });
 textarea.addEventListener("keydown", (e) => {
 if (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey)) {
 e.preventDefault();
 const pos = typeof getPos === "function" ? getPos() : null;
 if (pos !== null && pos !== undefined) {
 editor.chain().focus().command(({ tr }) => {
 tr.setNodeMarkup(pos, undefined, { latex: textarea.value });
 return true;
 }).run();
 }
 renderPreview();
 }
 });

 const preview = document.createElement("div");
 preview.className = "flex justify-center min-h-[2rem] py-2 border-t border-border-strong ";
 if (latex) {
 try {
 preview.innerHTML = katex.renderToString(latex, { displayMode: true, throwOnError: false });
 } catch {
 preview.innerHTML = `<span class="text-danger-fg text-sm">Invalid LaTeX</span>`;
 }
 } else {
 preview.innerHTML = `<span class="text-text-subtle text-sm">Preview appears here</span>`;
 }

 const hint = document.createElement("p");
 hint.className = "text-[10px] text-text-subtle text-center";
 hint.textContent = "Press Enter to save, Escape to cancel";

 dom.appendChild(textarea);
 dom.appendChild(preview);
 dom.appendChild(hint);
 textarea.focus();
 };

 dom.addEventListener("click", () => {
 if (!editor.isEditable) return;
 showEditor();
 });

 renderPreview();

 return {
 dom,
 update(updatedNode) {
 if (updatedNode.type.name !== "mathBlock") return false;
 // Only re-render preview if not currently editing
 if (!dom.querySelector("textarea")) {
 renderPreview();
 }
 return true;
 },
 stopEvent() {
 return true;
 },
 };
 };
 },

 addCommands() {
 return {
 setMathBlock:
 (attrs) =>
 ({ commands }) => {
 return commands.insertContent({
 type: this.name,
 attrs: { latex: attrs?.latex || "" },
 });
 },
 };
 },
});
