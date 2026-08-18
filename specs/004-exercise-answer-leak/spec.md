# 004 — Answer keys reach students through the exercise list

**Status:** shipped (PR #323, merged 2026-08-17) · **Branch:** `fix/exercise-config-leak` · 2026-08-18

## What is wrong

A student can read the answer key of any exercise set to them.

Reproduction, confirmed against production:

1. Log in as `student@grasslms.online`.
2. `GET /api/v1/exercises?lesson_id=80901bec-2b1c-5337-b9d4-883019430864`
3. Read `items[].config.solution_code`.

The same response carries test cases the teacher marked hidden.

## Why

`app/exercises/router.py` has three endpoints that read an exercise:

| Endpoint | Strips answers |
|---|---|
| `GET /exercises/{id}` | yes |
| `GET /exercises/by-lesson/{lesson_id}` | yes |
| `GET /exercises` (list, accepts `lesson_id`) | **no** |

Each endpoint decided for itself whether to call `_strip_answers`. The list
endpoint never did, and it takes the same `lesson_id` filter as the endpoint
that does — so the guarded route has an unguarded twin.

`backend/tests/test_exercises_integrity.py` has 12 stripping tests. Every one
of them goes through `GET /exercises/{id}` (helper `_student_config`). The
suite was green the whole time the list endpoint was open.

## Scope

**In scope — closes the confirmed leak:**

- Every read of an `Exercise` builds its response through one function, so no
  endpoint can be added without the strip. The rule becomes "nothing calls
  `ExerciseResponse.model_validate` directly", which is checkable by grep.
- Tests that exercise all three read paths, with a teacher positive control
  in the same test (a strip assertion alone passes against an endpoint that
  returns nothing at all).

**Out of scope — cannot be stripped, needs its own spec:**

Four types are graded *by the browser*, which then posts the verdict:

| Type | Key the client grades against | Client code |
|---|---|---|
| `math_stepwise` | `config.final_answer` | `math-stepwise-exercise.tsx:331` |
| `math_interactive` | `template_config.{final_answer, correct_answers, answers, rule_answer, target_slope, target_intercept, target_points}`, `choices[].correct`, `cards[].category` | `components/game/math/templates/*.tsx` |
| `robot_2d`, `world_3d` | `custom_win_js` | game runner |

`_submit_game_level` (`service.py:1089`) stores `completed` and `score`
straight off the request body. Stripping these keys breaks the exercises, and
leaving them is only half the hole: a student can post `{completed: true,
score: 1.0}` without opening the exercise. Both halves close together, by
moving grading server-side — a separate piece of work, tracked in
`tasks/todo.md`.

`final_answer` from the bug report is `math_stepwise`. It stays exposed after
this change; the other two confirmed leaks (`solution_code`, hidden test
cases) close.

Found while auditing, and worth its own fix: `math_stepwise` reaches
`grade_interactive()` through the `else` arm of the submit dispatch, and that
function has no `math_stepwise` branch — so it returns `(0.0, False)`. Every
submission of that type is stored with score 0 and `passed = false` whatever
the student answered. `tasks/todo.md` claimed the type was already
server-graded; it never was.

## Audit of the remaining types

Ground truth is `submissions/service.py::grade_interactive` — a key the server
grades against is a key the student must not have.

Server-graded, key already stripped: `matching` (`pairs`), `ordering`
(`correct_order`), `fill_blanks` (`blanks`), `true_false` (`correct_answer`),
`categorize` (`categories`), `translation` (`accepted_answers`),
`sentence_builder` (`correct_order`/`words`/`distractors`), `dialogue`
(`messages[].options[].is_correct`), `conjugation` (`table[].correct`),
`reading` (`questions[].correct_answer`, `options[].is_correct`), `crossword`
(`words[].word`), `map_pin_drop` (`pins[].x/y/tolerance`), `bubble_sheet`
(`questions[].correct`), `code_challenge` (`solution_code`, hidden test cases).

`quiz` keys off the `questions` relation, stripped separately.

No key to leak: `file_upload`, `web_editor`, `scorm_package`, `srs_flashcard`
(self-rated), `math_system` and `stereometry` (server solves from the
equations/solid; the answer is never stored).

`word_search` ships `words`, and the server grades on it — but the renderer
prints that list on screen and builds the grid from it. Display data, not a
key.

## Acceptance

- A student reading a `code_challenge` through **any** of the three endpoints
  sees no `solution_code` and no test case with `is_hidden = true`.
- A teacher reading the same exercise sees both.
- A parent is treated as a student (already true in `_may_see_answers`).
- The new tests fail against the current code on the list endpoint.

## Aftermath, 2026-08-18

The four client-graded types were measured in production rather than assumed:
nine exercises in all, every one of them demo, QA, or Kitchen Sink content, and
not a single submission ever made through `/submit` — the 19 rows against
`math_stepwise` all carried `{"demo_seed": true}` and were written into the
table by the analytics seeder.

All nine were deleted (dump kept at
`/opt/lms/backups/client_graded_exercises_20260818.json`). Unpublishing was
considered and rejected: exercises carry no publish flag, so the only lever is
`courses.status`, and pulling the four affected courses would have hidden 49
exercises to cover 9 — including both sales demo courses and the course feeding
the analytics QA accounts.

So neither hole is reachable today. Both return the moment someone authors a
new exercise of any of these types, which is why the follow-up in
`tasks/todo.md` is written as a gate on shipping them again rather than as a
backlog item.
