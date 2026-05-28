import DOMPurify from "isomorphic-dompurify";

/**
 * Hosts that may be embedded via <iframe> in lesson content. Restricting to
 * reputable education / video providers means an author cannot iframe an
 * attacker-controlled page or a `javascript:` / `data:` URL — the host
 * allowlist is the security boundary, the forced sandbox is defense in depth.
 */
const ALLOWED_IFRAME_HOSTS = [
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "vimeo.com",
  "player.vimeo.com",
  "geogebra.org",
  "desmos.com",
  "codepen.io",
  "phet.colorado.edu",
  "scratch.mit.edu",
  "h5p.org",
  "docs.google.com",
  "drive.google.com",
];

function isAllowedIframeSrc(src: string): boolean {
  try {
    const url = new URL(src, "https://invalid.invalid");
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const host = url.hostname.toLowerCase();
    return ALLOWED_IFRAME_HOSTS.some((h) => host === h || host.endsWith("." + h));
  } catch {
    return false;
  }
}

let hookRegistered = false;
function ensureIframeHook(): void {
  if (hookRegistered) return;
  DOMPurify.addHook("uponSanitizeElement", (node, data) => {
    if (data.tagName !== "iframe") return;
    const el = node as Element;
    if (!isAllowedIframeSrc(el.getAttribute("src") || "")) {
      el.parentNode?.removeChild(el);
      return;
    }
    // Trusted host, but still confine it: no top-navigation, no modals.
    el.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-popups allow-presentation allow-forms",
    );
    el.removeAttribute("srcdoc");
  });
  hookRegistered = true;
}

/**
 * Sanitize author-supplied HTML before it is injected via
 * `dangerouslySetInnerHTML`. Strips `<script>`, inline event handlers
 * (`onerror`, `onload`, `onclick`, ...) and `javascript:` URIs while keeping
 * the rich formatting (headings, tables, lists, images, SVG diagrams,
 * inline styles) that lesson content relies on. `<iframe>` is permitted only
 * for the allowlisted embed hosts above (YouTube, Vimeo, GeoGebra, Desmos…).
 *
 * Interactive widgets that legitimately need `<script>` are NOT sanitized
 * here — ContentRenderer routes script-containing HTML into a null-origin
 * `sandbox="allow-scripts"` iframe instead, so those scripts cannot reach
 * the parent document's localStorage / JWT.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty) return "";
  ensureIframeHook();
  return DOMPurify.sanitize(dirty, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["target", "allow", "allowfullscreen", "frameborder", "scrolling", "sandbox"],
  });
}
