# Contracts: Unified Answer System

No endpoints added. Changed shapes (backward compatible):

## GET exercise (student read, stripped)

- quiz `questions[i]` gains `multi: boolean` (derived; no keys leaked).
- reading stripped `config.questions[i]` gains the same `multi`.

## POST /exercises/{id}/submit and /check — quiz answers

- single: `{question_id, selected_option}` as today;
- multi: `{question_id, selected_options: [..]}`, graded by set equality;
- text: `{question_id, text}`, graded by the question's visible rules.
- Old payload shapes never 500; mismatched shape grades incorrect.

## Grading rule (server-side, shared)

`is_answer_correct` in assessments/grading.py is the single judge for quiz
questions in every path (submit, quiz lessons, /check); reading's grader
delegates to the same helpers. Verdict parity across paths is SC-004 and is
covered by tests.
