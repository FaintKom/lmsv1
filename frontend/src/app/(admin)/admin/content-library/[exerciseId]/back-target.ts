const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Where the exercise editor's back controls should go. The course editor
 * links here with ?courseId=<uuid>; anything else falls back to the library
 * (specs/016-authoring-quick-fixes US2). Strict UUID check keeps arbitrary
 * strings out of the path.
 */
export function backTarget(courseId: string | null): string {
  return courseId && UUID_RE.test(courseId)
    ? `/admin/courses/${courseId}/edit`
    : "/admin/content-library";
}
