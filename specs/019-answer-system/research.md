# Research: Unified Answer System

## Today's grading, verbatim

- Choice (`assessments/grading.py:23`): single `selected_option` compared to
  the first matching option with `is_correct` — no multi support at all.
- Text (`grading.py:31`): `strip().lower()` equality against a single
  `correct_answer`. No variants, no visible rules.
- Reading (`submissions/service.py:488`): its own per-question loop with two
  option shapes (strings vs dicts) and the same hidden text rule.
- Translation (`service.py:359`): `accepted_answers` + `case_sensitive` +
  ALWAYS-ON fuzzy match with a hardcoded 0.8 character-similarity
  threshold — the "непонятно как проверяется" the owner hit.

## Where the student payload is shaped

`_for_reader` → `_strip_answers` (exercises/router.py:701/729) is the single
choke point for non-staff reads; it already rewrites quiz question options
(pops `is_correct`) and the reading config. The `multi` flag is derived
there before popping — no schema change, options remain keyless.

## Storage for text rules

`Question.options` (JSONB) is only used by multiple_choice questions;
text_answer questions leave it NULL — free storage for
`{case_sensitive, trim, ignore_punctuation, accepted[]}` without migration.
Reading question dicts (config JSONB) take the same keys inline.

- **Decision**: one `normalize_text(value, rules)` + one
  `text_answer_matches(question_rules, correct, student)` in grading.py;
  every grading path (grade_quiz, /check quiz branch, reading grader) calls
  it. Defaults = today's behaviour (grandfathering, FR-005).
- **Alternatives**: per-path duplication (the current state, thrice) —
  rejected; a new exercise type for text input — registry/docs churn for no
  capability, recorded as spec assumption.

## Multi-choice payload

- **Decision**: multi questions grade `selected_options: string[]` by set
  equality of option texts; single questions keep `selected_option`.
  Legacy payload against a multi question = wrong, not 500.
- **Alternatives**: partial credit per correct pick — different pedagogy,
  nobody asked; option ids instead of texts — texts are today's contract.

## Fuzzy translation

- **Decision**: `config.fuzzy_match` (default true) gates the existing 0.8
  similarity block; editor exposes it as «допускать близкие ответы» with a
  one-line explanation. Off ⇒ exact match against accepted list only.
