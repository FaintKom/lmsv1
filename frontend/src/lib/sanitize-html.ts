import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize author-supplied HTML before it is injected via
 * `dangerouslySetInnerHTML`. Strips `<script>`, inline event handlers
 * (`onerror`, `onload`, `onclick`, ...) and `javascript:` URIs while keeping
 * the rich formatting (headings, tables, lists, images, SVG diagrams,
 * inline styles) that lesson content relies on.
 *
 * Interactive widgets that legitimately need `<script>` are NOT sanitized
 * here — ContentRenderer routes script-containing HTML into a null-origin
 * `sandbox="allow-scripts"` iframe instead, so those scripts cannot reach
 * the parent document's localStorage / JWT.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  return DOMPurify.sanitize(dirty, {
    ADD_ATTR: ["target"],
  });
}
