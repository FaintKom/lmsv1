import { describe, expect, it } from "vitest";

import { textBlockEditor } from "./text-block-editor";

/**
 * The bug these were written against: every seeded lesson stores its text as
 * an HTML string, the editor only ever handed TipTap an object, and so the
 * teacher met an empty editor for a lesson that had text. The first keystroke
 * then replaced the string with a fresh TipTap document.
 */

// Shortened stand-in for what the seeds write: a heading, a callout built from
// <aside> with inline styles, and a table. The editor's schema holds neither
// of the last two, which is why a string is edited as a string.
const SEEDED_HTML =
  '<h2>Goal: get $x$ alone</h2>\n<aside style="border-left:4px solid #ccc;">' +
  "<div>One-step equation</div></aside>\n" +
  '<table class="md-table"><tbody><tr><td>x</td></tr></tbody></table>';

const TIPTAP_DOC = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "hi" }] }],
};

describe("textBlockEditor", () => {
  it("puts a string body in front of the teacher", () => {
    // The defect itself. Today this body reaches BlockEditor as null: the
    // editor opens empty, and the first keystroke overwrites the string.
    const editor = textBlockEditor(SEEDED_HTML);

    expect(editor.kind).toBe("source");
    expect(editor).toEqual({ kind: "source", text: SEEDED_HTML });
  });

  it("decides on the body, not on the format label", () => {
    // A string cannot go to a JSON editor whatever the label claims, and the
    // label is often missing or stale. Markdown, HTML and unlabelled strings
    // all take the same route.
    expect(textBlockEditor("## Markdown heading")).toEqual({
      kind: "source",
      text: "## Markdown heading",
    });
    expect(textBlockEditor("<p>no format field at all</p>")).toEqual({
      kind: "source",
      text: "<p>no format field at all</p>",
    });
  });

  it("keeps a script widget intact instead of parsing it away", () => {
    const widget = '<div id="plot"></div><script>draw()</script>';

    expect(textBlockEditor(widget)).toEqual({ kind: "source", text: widget });
  });

  it("still edits a TipTap document as rich text", () => {
    // The guard that stops the fix from swallowing the case that worked.
    expect(textBlockEditor(TIPTAP_DOC)).toEqual({
      kind: "rich",
      content: TIPTAP_DOC,
    });
  });

  it("opens a freshly added block as rich text", () => {
    // addBlock() creates { body: "", format: "tiptap" }. Nothing to lose, and
    // the toolbar is the whole point of a new block.
    expect(textBlockEditor("")).toEqual({ kind: "rich", content: null });
    expect(textBlockEditor("   \n  ")).toEqual({ kind: "rich", content: null });
    expect(textBlockEditor(undefined)).toEqual({ kind: "rich", content: null });
  });
});
