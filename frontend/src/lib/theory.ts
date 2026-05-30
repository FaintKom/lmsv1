/**
 * Theory lesson-block helpers — source typing + iframe embed-src building.
 *
 * A theory block holds a slide deck from one of three free sources:
 *   - pdf     · uploaded file, served by the backend, shown in the browser's
 *              native PDF viewer via a plain <iframe src={absoluteUrl}>
 *   - pptx    · uploaded file, rendered through Microsoft's free Office Online
 *              viewer (needs a PUBLIC absolute URL — works in prod, not on a
 *              localhost backend the viewer can't reach)
 *   - gslides · user pastes a share link, we store the /embed URL directly
 *
 * Keynote (.key) is intentionally unsupported: rendering it needs a paid
 * server-side conversion (CloudConvert / unoconv).
 */

export type TheorySourceKind = "pdf" | "pptx" | "gslides";

export interface TheorySource {
  kind: TheorySourceKind;
  /** For pdf/pptx: backend path like `/api/v1/courses/files/<uuid>.pdf`.
   *  For gslides: the already-converted `…/embed?…` URL. */
  url: string;
  filename?: string;
}

export interface TheoryContent {
  title?: string;
  subtitle?: string;
  source?: TheorySource;
  speaker_notes?: string[];
}

const OFFICE_EMBED = "https://view.officeapps.live.com/op/embed.aspx?src=";

/**
 * Google Slides share link → embeddable URL. Returns null when the input is
 * not a recognizable Slides link (drives the validation pill colour in the UI).
 */
export function convertGSlidesUrl(shareUrl: string): string | null {
  if (!shareUrl) return null;
  const m = shareUrl.match(/presentation\/d\/([\w-]+)/);
  if (!m) return null;
  return `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false`;
}

/** Make a backend-relative path absolute so third-party viewers can fetch it. */
function absolutize(url: string, origin: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin.replace(/\/$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * Build the <iframe src> for a theory source. `origin` is normally
 * `window.location.origin`; pass "" on the server (returns a relative src for
 * pdf, which still resolves once mounted).
 */
export function buildEmbedSrc(source: TheorySource, origin = ""): string {
  switch (source.kind) {
    case "gslides":
      // Stored value may be a raw share link if it slipped past the UI.
      return convertGSlidesUrl(source.url) ?? source.url;
    case "pptx":
      return OFFICE_EMBED + encodeURIComponent(absolutize(source.url, origin));
    case "pdf":
    default:
      return absolutize(source.url, origin);
  }
}

export const THEORY_SOURCE_LABEL: Record<TheorySourceKind, string> = {
  pdf: "PDF",
  pptx: "PPTX",
  gslides: "G-SLIDES",
};
