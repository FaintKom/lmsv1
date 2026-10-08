import { Node, mergeAttributes } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";

export type CalloutVariant = "info" | "warning" | "success" | "error";

declare module "@tiptap/core" {
 interface Commands<ReturnType> {
 callout: {
 setCallout: (attrs?: { variant?: CalloutVariant }) => ReturnType;
 };
 }
}

export const Callout = Node.create({
 name: "callout",
 group: "block",
 content: "paragraph+",

 addAttributes() {
 return {
 variant: {
 default: "info",
 parseHTML: (el) => el.getAttribute("data-variant") || "info",
 renderHTML: (attrs) => ({ "data-variant": attrs.variant }),
 },
 };
 },

 parseHTML() {
 return [{ tag: 'div[data-type="callout"]' }];
 },

 renderHTML({ HTMLAttributes }) {
 const variant = HTMLAttributes["data-variant"] || "info";
 // A 1px frame and a drawn icon per variant, so the kind of note never
 // rests on colour alone (DS v3: no side stripe, no emoji).
 const colors: Record<string, string> = {
 info: "border-info bg-info-soft text-info",
 warning: "border-warning bg-sun-50 text-warning-fg",
 success: "border-primary bg-success-soft text-primary-text",
 error: "border-danger bg-danger-soft text-danger-fg",
 };
 // Lucide paths: info, triangle-alert, circle-check, circle-x.
 const icons: Record<string, string[]> = {
 info: ["M12 16v-4", "M12 8h.01"],
 warning: ["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3", "M12 9v4", "M12 17h.01"],
 success: ["m9 12 2 2 4-4"],
 error: ["m15 9-6 6", "m9 9 6 6"],
 };
 const key = variant in icons ? variant : "info";
 const svg = "http://www.w3.org/2000/svg";
 const shapes = [
 ...(key === "warning" ? [] : [[`${svg} circle`, { cx: "12", cy: "12", r: "10" }]]),
 ...icons[key].map((d) => [`${svg} path`, { d }]),
 ];

 return [
 "div",
 mergeAttributes(HTMLAttributes, {
 "data-type": "callout",
 role: "note",
 class: `callout my-3 flex gap-3 rounded-lg border p-4 ${colors[key]}`,
 }),
 [
 `${svg} svg`,
 {
 class: "callout-icon mt-0.5 size-5 shrink-0",
 viewBox: "0 0 24 24",
 fill: "none",
 stroke: "currentColor",
 "stroke-width": "2",
 "stroke-linecap": "round",
 "stroke-linejoin": "round",
 "aria-hidden": "true",
 contenteditable: "false",
 },
 ...shapes,
 ],
 ["div", { class: "callout-content min-w-0 flex-1 text-text" }, 0],
 ] as unknown as DOMOutputSpec;
 },

 addCommands() {
 return {
 setCallout:
 (attrs) =>
 ({ commands }) => {
 return commands.insertContent({
 type: this.name,
 attrs,
 content: [{ type: "paragraph" }],
 });
 },
 };
 },
});
