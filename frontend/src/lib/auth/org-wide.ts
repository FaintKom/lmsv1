/**
 * Who sees the whole school, and who sees only their own.
 *
 * The rule the owner set in specs/061: administrators and methodists look at
 * the school; a class teacher looks at their groups and courses. It is the
 * backend's `_is_org_wide` said once on this side, so the menu and the pages
 * behind it cannot drift apart.
 *
 * A methodist is a teacher with `is_methodist` — not a role of their own.
 * Keying on the role alone is the mistake that emptied their dashboard
 * (specs/061) and their review queue (specs/063), twice.
 */
export function isOrgWide(
  role: string | null | undefined,
  isMethodist: boolean | null | undefined,
): boolean {
  return role === "super_admin" || role === "admin" || Boolean(isMethodist);
}
