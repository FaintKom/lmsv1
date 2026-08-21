/**
 * Which school this is, before anyone has logged in.
 *
 * The session lives in httpOnly cookies the client cannot read, and before
 * sign-in there is no session anyway. So the school has to be named some other
 * way: by its slug in the link it hands to its pupils, and after that by one
 * remembered string.
 *
 * This identifies nothing and authorises nothing. An unknown, stale or absent
 * slug means a neutral sign-in screen, and signing in works exactly as before.
 */

/**
 * Listed on /cookies, in the same table as `theme` and `sidebar-collapsed`.
 * Renaming this key means editing that page in the same change — a store on
 * someone's device that the privacy page does not mention is a defect, not an
 * omission.
 */
export const SCHOOL_SLUG_KEY = "school-slug";

/** Slugs are lowercase, dashed and short; anything else is not one of ours. */
const SLUG = /^[a-z0-9][a-z0-9-]{0,99}$/;

export function rememberSchool(slug: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (slug && SLUG.test(slug)) window.localStorage.setItem(SCHOOL_SLUG_KEY, slug);
  } catch {
    // Private browsing, storage disabled, quota. Forgetting which school it was
    // costs a neutral login screen; it must never cost the login itself.
  }
}

export function recallSchool(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const slug = window.localStorage.getItem(SCHOOL_SLUG_KEY);
    return slug && SLUG.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

/**
 * The slug to brand a pre-login page with: the one in the address if there is
 * one, otherwise the one we were told last time.
 */
export function schoolSlugFor(fromUrl: string | null | undefined): string | null {
  const trimmed = (fromUrl || "").trim().toLowerCase();
  if (trimmed && SLUG.test(trimmed)) return trimmed;
  return recallSchool();
}
