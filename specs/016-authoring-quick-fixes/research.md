# Research: Authoring Quick Fixes

No NEEDS CLARIFICATION markers existed; research here records the code
archaeology that grounded each bug and the decision taken.

## 1. Course picture

- **Finding**: full backend path already exists — `Course.thumbnail_url`
  (models.py:42), `CourseUpdate.thumbnail_url` (schemas.py:18),
  `update_course` with `exclude_unset=True` (service.py:204), image upload
  endpoint `POST /courses/upload-image` (router.py:65, teacher/admin-gated,
  5MB, extension+content validated) and `GET /courses/images/{filename}`
  serving. The course card (`course-card.tsx`) already renders the field.
  The editor UI is the only missing piece.
- **Decision**: frontend-only control; reuse upload endpoint; PATCH with
  `null` to remove (exclude_unset makes null an explicit clear).
- **Alternatives considered**: new dedicated thumbnail endpoint — rejected,
  duplicates a working, validated upload path for zero gain.

## 2. Back navigation from the exercise editor

- **Finding**: `content-library/[exerciseId]/page.tsx` hardcodes
  `/admin/content-library` at lines 163 (not-found back) and 175 (header
  back). The course editor opens the exercise editor via plain `<a
  target="_blank">` links (courses edit page lines 1359, 2132) with no origin
  context, so the editor cannot know where the teacher came from.
- **Decision**: carry the origin as `?courseId=<uuid>` on those links; a pure
  helper maps a valid UUID to the course-editor path and everything else to
  the library. Query param survives new tabs by construction.
- **Alternatives considered**: `document.referrer` — unreliable across
  new-tab and refresh; browser `history.back()` — wrong when the editor was
  opened in a fresh tab (no history); a global "last course" store — state
  outlives its truth and breaks with two tabs open.

## 3. Number-line marker legibility

- **Finding**: marker letter is `fontSize={9}` white bold inside an 18px-wide
  triangle (number-line.tsx:135-141); marker fills come from
  `MARKER_STYLES`, and after checking they switch to success/danger colours.
  White-on-light fills is the reported failure.
- **Decision**: enlarge triangle ~×1.3, letter to ≥12px with dark stroke via
  `paint-order: stroke` so the glyph is readable on any fill; bump the value
  label similarly. SVG-only change, no config or grading impact.
- **Alternatives considered**: dynamic letter colour per fill luminance —
  more code for no clearer letters at 9px; moving letters outside the
  triangle — collides with the value label already above the marker.

## 4. Duplicate template entries

- **Finding**: `MATH_TEMPLATES` ends with four alias entries kept "for
  backward compatibility with seed data" (`function_graphing`,
  `graph_transformation`, `inequality_graphing`, `card_sorting`), identical
  label/description/component to their canonical twins.
  `TEMPLATE_LIST = Object.values(MATH_TEMPLATES).filter(t => t.type !==
  "custom_html")` — aliases pass the filter and the picker
  (`math-editor.tsx`, sole consumer) shows four names twice.
- **Decision**: exclude the alias keys from `TEMPLATE_LIST`; keep them in
  `MATH_TEMPLATES` so exercises saved under legacy names render and grade
  unchanged (spec FR-007).
- **Alternatives considered**: deleting the aliases and migrating stored
  configs — a data migration for a picker bug; disproportionate and risky.
