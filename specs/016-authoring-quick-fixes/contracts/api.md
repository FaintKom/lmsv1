# Contracts: Authoring Quick Fixes

No endpoints are added or changed. The fix relies on these existing
contracts, which the new tests pin down:

## PATCH /api/v1/courses/{course_id}

- Auth: course owner (teacher/admin of the same organisation).
- Body (partial): `{"thumbnail_url": "<url>"}` sets the picture;
  `{"thumbnail_url": null}` clears it; a body without the field leaves it
  unchanged.
- Cross-organisation course id → **404** (not 403), per constitution I.
- Response: `CourseResponse` including `thumbnail_url`.

## POST /api/v1/courses/upload-image

- Auth: teacher or admin.
- multipart file field `file`; images only (extension + content validated),
  max 5 MB.
- Response: `{"url": "/api/v1/courses/images/<32-hex>.<ext>"}`.

## GET /api/v1/courses/images/{filename}

- Serves previously uploaded images; filename strictly
  `^[a-f0-9]{32}\.(jpg|jpeg|png|gif|webp|svg)$`.

## Frontend route contract

- `/admin/content-library/{exerciseId}` accepts optional query parameter
  `courseId`; a valid UUID makes the editor's back controls target
  `/admin/courses/{courseId}/edit`, anything else falls back to
  `/admin/content-library`. The parameter is never forwarded to the API.
