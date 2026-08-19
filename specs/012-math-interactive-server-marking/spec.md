# Feature Specification: The server marks a maths widget

**Feature Branch**: not opened yet — this spec is the decision, not the build

**Created**: 2026-08-19

**Status**: Slices 1 and 2 shipped (#372, #376); slice 3 in progress (#378)

**Input**: The follow-up named in `specs/010-game-verdict-not-from-client/spec.md` and in the corner-case audit.

## Where this stands

`math_interactive` used to be marked by the browser, which posted its own verdict:
`{"game_result": {"completed": true, "score": 1.0}}` scored 100 without the
exercise being opened. That is closed — since #352 the submission is stored
unmarked, with the pupil's report kept for the teacher, and no forged pass is
possible. What is missing is the marking itself.

So this is not a hole any more. It is a feature the product has been missing since
the type shipped, and the honest interim is visible to a pupil: "Sent to your
teacher".

## What has to be true

The widget decides, in the browser, whether the pupil got it right. Sixteen
templates do this, each with its own rule and its own answer key inside
`template_config`. The rule and the key are both in the page the pupil controls.

To mark on the server, three things are needed per template:

1. **The work, not the verdict.** The submission carries what the pupil did — the
   points they placed, the number they typed, the option they chose — the way
   `robot_2d` now sends its program rather than its outcome.
2. **The key, read server-side** from `template_config`, which is already stripped
   from what a pupil receives for the types where stripping applies.
3. **A comparison** that matches what the widget does, including its tolerance, or
   pupils will be marked differently depending on which side answered.

## Requirements *(mandatory)*

- **FR-001**: A submission MUST carry the pupil's work in a shape the server can
  judge, per template.
- **FR-002**: The server MUST reach its own verdict from `template_config` and MUST
  NOT read any verdict the client sends.
- **FR-003**: Marking MUST agree with the widget's own check, tolerance included,
  so a pupil sees the same answer whether they check as they go or submit.
- **FR-004**: A template with no server-side check MUST keep the current behaviour
  — stored, unmarked, shown as sent to the teacher — rather than guessing.
- **FR-005**: The answer key MUST NOT reach a pupil for any template the server
  can mark.

## Success Criteria *(mandatory)*

- **SC-001**: A correct answer in a covered template scores 100 without the
  browser being trusted.
- **SC-002**: Posting a forged verdict scores nothing, for covered and uncovered
  templates alike.
- **SC-003**: A pupil who solves a covered template in the widget and one who
  submits the same work through the API get the same mark.
- **SC-004**: Uncovered templates still reach the teacher rather than silently
  scoring zero.

## Slicing, by what the content actually uses

Counted in production on 2026-08-19: `math_interactive` exercises exist for
`coordinate_plane` (1) and one row with no `template_type` at all. The Kitchen Sink
course carries the coordinate plane. So the order below is by evidence, not by
alphabet.

**Slice 1 — `coordinate_plane`.** The pupil drags labelled points; the widget
compares each against `target_points` within a tolerance (default 0.5 in the
component). Payload: the placed points. This is the one template with real content
behind it, and the smallest honest check.

**Slice 2 — the answer-shaped templates.** `numeric_input`, `multiple_choice_math`,
`equation_solver`: a single value or choice, compared with a key already in the
config. Each is a few lines once slice 1 has set the payload convention.

**Slice 3 — the rest.** `function_graph`, `number_line`, `arithmetic_puzzle`,
`table_pattern`, `two_way_table`, `card_sort`, `venn_diagram`, `visual_fractions`,
`scatter_plot`, `graph_transform`, `inequality_graph`, `equation_balance`. Each
needs its own reading of what the widget counts as correct. Some of these may be
better left to the teacher than approximated.

## Assumptions

- Slices land one at a time, each with the covered templates listed, so a teacher
  can tell which of their exercises are marked and which go to review.
- The client keeps its local check for immediate feedback. It stops being the
  record.
- No content in production depends on automatic marking today: the type has one
  seeded exercise and no submissions through `/submit`.

## What this spec deliberately does not decide

Which slice to build first is a product call: slice 1 is the only one with content
behind it, and the two demo rows are ours. If the answer is "none for now", the
current state is defensible — nothing can be forged, and the work reaches a human.

---

## Progress, 2026-08-19

Ten of the sixteen templates are marked on the server:

| Marked here | The rule, taken from its widget |
|---|---|
| `coordinate_plane` | each point within tolerance (0.5), all of them |
| `numeric_input` | any accepted answer within tolerance (0.01), fractions included |
| `multiple_choice_math` | the picked option against `choices[].correct` |
| `number_line` | each marker within tolerance (0.3), all of them |
| `card_sort` | each card in the category it names |
| `table_pattern` | blanks within tolerance, plus the rule with spaces and case removed |
| `two_way_table` | whole numbers, exact |
| `visual_fractions` | the count of shaded parts against the numerator |
| `graph_transform` | three parameters within tolerance (0.3), a third each |
| `inequality_graph` | slope, intercept and shaded side, a third each |

Still unmarked, and recorded for the teacher instead:

- **`equation_solver`** — its score counts hints taken and wrong turns made in the
  page. The server sees none of that, and inventing a number is worse than saying
  a person should look.
- **`equation_balance`**, **`arithmetic_puzzle`**, **`venn_diagram`**,
  **`function_graph`**, **`scatter_plot`** — each needs its own reading before
  anything is claimed about it. `scatter_plot` has three modes, only one of which
  has a numeric key; `function_graph` matches a curve rather than a value.

The forgery stays closed for all sixteen either way: a `game_result` with no work
behind it is recorded unmarked, which every marked template's test asserts.
