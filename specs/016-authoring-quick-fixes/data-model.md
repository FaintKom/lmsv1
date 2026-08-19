# Data Model: Authoring Quick Fixes

No schema changes, no migrations. Fields touched:

## Course.thumbnail_url (existing)

- `courses.thumbnail_url` — `String(500)`, nullable
  (backend/app/courses/models.py:42).
- Written via `PATCH /api/v1/courses/{id}` body field `thumbnail_url`
  (string URL or `null` to clear; absent = unchanged, enforced by
  `exclude_unset=True`).
- Value produced by `POST /api/v1/courses/upload-image` →
  `{"url": "/api/v1/courses/images/<32-hex>.<ext>"}`.
- Read by `CourseResponse.thumbnail_url`, rendered by the course card.

## Return context (transient, not persisted)

- Query parameter `courseId` on
  `/admin/content-library/{exerciseId}?courseId=<uuid>`.
- Valid UUID → back target `/admin/courses/{courseId}/edit`; missing or
  malformed → `/admin/content-library`. Never stored, never sent to the API.

## Math template registry (frontend constant)

- `MATH_TEMPLATES`: unchanged keys, including four legacy aliases
  (`function_graphing`, `graph_transformation`, `inequality_graphing`,
  `card_sorting`) that saved exercise configs may reference in
  `template_config.type`.
- `TEMPLATE_LIST` (picker source): canonical entries only — aliases and
  `custom_html` excluded.
