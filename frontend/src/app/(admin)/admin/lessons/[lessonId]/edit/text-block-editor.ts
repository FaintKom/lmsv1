/**
 * Which editor a text block opens in — decided by its body, not by its label.
 *
 * A text block holds either a TipTap document (an object) or a string of HTML
 * or markdown. The editor used to hand TipTap only the object and `null` for
 * everything else, so a lesson whose text was a string opened blank; the first
 * keystroke then replaced that string with a fresh TipTap document and the
 * original was gone. In production on 2026-08-20 that was 63 of the 64 text
 * blocks.
 *
 * The obvious repair — feed the HTML to TipTap, which does parse HTML — moves
 * the loss rather than fixing it. TipTap keeps only what its schema models,
 * and this editor's schema (StarterKit plus callout, math-block, math-plot,
 * term) has no `aside`, no bare `div` and no table at all. The seeds write all
 * three: callouts are `<aside style="…">`, tables are `<table class="md-table">`
 * (`scripts/seed_demo_org.py`). Converting on a keystroke would drop the table
 * outright and flatten the callout — the same data loss, quieter, with no
 * empty box to warn the teacher.
 *
 * So a string is edited as a string and saved in whatever format it arrived
 * in. `format` is deliberately not an argument: a string cannot go to a JSON
 * editor whatever the label claims, and the label is sometimes absent and
 * sometimes wrong. The body is neither.
 *
 * ponytail: no lossless-round-trip detection. Guessing whether this particular
 * HTML survives TipTap would put a heuristic in charge of whether to destroy
 * it. If teachers want rich editing for legacy blocks, that is a deliberate
 * per-block conversion with a preview — not a side effect of typing.
 */

export type TextBlockEditor =
  | { kind: "rich"; content: Record<string, unknown> | null }
  | { kind: "source"; text: string };

export function textBlockEditor(
  body: string | Record<string, unknown> | undefined,
): TextBlockEditor {
  if (typeof body === "object" && body !== null) {
    return { kind: "rich", content: body };
  }
  // Empty is a block just added (`addBlock` writes `body: ""`): nothing to
  // lose, and the toolbar is the point of a new block.
  if (typeof body === "string" && body.trim() !== "") {
    return { kind: "source", text: body };
  }
  return { kind: "rich", content: null };
}
