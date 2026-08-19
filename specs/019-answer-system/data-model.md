# Data Model: Unified Answer System

No migrations; everything rides existing JSONB.

## Question (quiz) — existing table

- multiple_choice: `options: [{text, is_correct}]` — unchanged; "multi" is
  DERIVED (count of is_correct > 1), never stored.
- text_answer: `correct_answer` (primary) + NEW use of the free `options`
  JSONB as rules: `{case_sensitive?: bool=false, trim?: bool=true,
  ignore_punctuation?: bool=false, accepted?: string[]}`. Absent field ⇒
  today's behaviour.

## Stripped student payload

- Quiz question gains `multi: bool` (derived in _strip_answers); options
  keyless as today.
- Reading stripped config questions gain the same `multi`.

## Reading config questions (config JSONB)

`{type: "multiple_choice"|"text", options?, correct_answer?, case_sensitive?,
ignore_punctuation?, accepted?}` — same rule keys as quiz text questions.

## Translation config

`accepted_answers: string[]`, `case_sensitive: bool=false`,
NEW `fuzzy_match: bool=true` (default preserves today).

## Exercise config (all types)

NEW optional `instructions: string=""` — rendered above the task when
non-empty; nothing else reads it.

## Submit payloads

- single choice: `{question_id, selected_option}` (unchanged)
- multi choice: `{question_id, selected_options: string[]}`
- text: `{question_id, text}` (unchanged)
