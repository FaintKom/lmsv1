# Data Model: Lesson Container & Exercise Catalogue

No schema migrations. Everything below is JSONB shape or frontend constant.

## Lesson (existing table, unchanged)

- `lessons.content_type` — stays for legacy lessons; new lessons are always
  created with the default (`text`) and never branch on it.
- `lessons.content` — JSONB v2 container: `{ blocks: LessonBlock[] , ... }`
  (exact v2 marker as written by the lesson editor's `buildV2Content`).

## LessonBlock (JSONB shape; schema widened, not enforced)

```
{
  id: string,            # client-generated
  type: "text" | "html" | "video" | "exercise" | "assignment",
  sort_order: int,
  page: int,
  body?: string, format?: string,     # text/html
  url?: string,                        # video
  exercise_id?: string,                # exercise
  assignment_id?: string               # assignment (NEW)
}
```

## Assignment (existing table, unchanged)

Created/updated/deleted through the existing assignments API from the
lesson editor. A block references it by `assignment_id`; the assignment does
not know about the block (course-level overview keeps listing it even if the
lesson dies — the spec's orphan edge case).

## Exercise catalogue groups (frontend constant)

- `EXERCISE_TYPES_META[n].group`: `"basic" | "math" | "languages" |
  "programming" | "scorm"`.
- Mapping:
  - basic: quiz, matching, ordering, fill_blanks, true_false, categorize,
    file_upload, map_pin_drop, bubble_sheet
  - math: math_interactive (16 subtypes via TEMPLATE_LIST), math_stepwise,
    math_system, stereometry
  - languages: translation, sentence_builder, dialogue, conjugation,
    reading, crossword, word_search, srs_flashcard
  - programming: code_challenge, web_editor, robot_2d, world_3d
  - scorm: scorm_package
- Invariant (tested): groups partition `ALL_EXERCISE_TYPES` exactly.
