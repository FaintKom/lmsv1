# Feature Specification: Unified Answer System

**Feature Branch**: `feat/answer-system`

**Created**: 2026-08-19

**Status**: Draft

**Input**: User description: "Этап 4 плана tasks/feedback-2026-08-19-authoring.md — система ответов и проверки (замечания 3, 4, 9, 27, часть 24). Владелец: адаптивный сингл/мультипл чойс (один правильный → radio, несколько → чекбоксы); текстовый ответ с явными условиями проверки; reading на ту же систему + картинки; перевод — проверку сделать понятной; всем заданиям опциональное поле «что делать»."

Choice questions force the author to think about widget types instead of
marking what's correct; text answers are graded by an invisible hardcoded
rule (trim + lowercase equality) the author can neither see nor change;
reading duplicates both problems with its own question format; translation
grades through a hidden fuzzy threshold nobody chose. This stage makes
correctness the author's explicit, visible decision everywhere.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Adaptive choice questions (Priority: P1)

A teacher writing a quiz question just marks which options are correct. One
correct option → the student sees radio buttons; several correct → the
student sees checkboxes and must pick exactly the correct set. No
"single/multiple" switch exists anywhere.

**Why this priority**: owner's #4 — the widget must follow the answer key,
not be a separate authoring decision.

**Independent Test**: author one question with one correct option and one
with two; the student sees radio for the first, checkboxes for the second;
picking the exact correct set (and only it) passes.

**Acceptance Scenarios**:

1. **Given** a question with exactly one correct option, **When** a student
   opens it, **Then** it renders as a single-choice control.
2. **Given** a question with two or more correct options, **When** a student
   opens it, **Then** it renders as a multi-choice control.
3. **Given** a multi-choice question, **When** the student selects the
   exact correct set, **Then** it grades correct; any superset, subset or
   other set grades incorrect.
4. **Given** existing quizzes authored before this change, **When** students
   answer them, **Then** they grade exactly as before.
5. **Given** the student payload, **Then** it reveals whether a question is
   multi-choice but never which options are correct.

---

### User Story 2 - Text answers with visible checking rules (Priority: P1)

A teacher adding a text-answer question sees and controls the checking
rules: case sensitivity, whitespace trimming, punctuation handling, and a
list of accepted variants (synonyms/alternate spellings). The editor states
the rules in plain words; the grader follows exactly those rules.

**Why this priority**: owner's #3 — "непонятно как задавать условия
правильного ответа".

**Independent Test**: create a text question with accepted variants and
case-insensitivity on; answers matching any variant in any case pass;
flipping case-sensitivity on makes the wrong-case answer fail.

**Acceptance Scenarios**:

1. **Given** the text-answer editor, **When** the teacher opens it,
   **Then** the checking rules are visible as explicit controls, not
   implied.
2. **Given** accepted variants ["colour", "color"], **When** a student
   answers either, **Then** it grades correct.
3. **Given** case sensitivity off (default), **When** the student answers in
   any case, **Then** case does not affect the verdict; toggled on, it does.
4. **Given** questions authored before this change, **Then** they grade as
   before (the defaults reproduce today's behaviour).

---

### User Story 3 - Reading joins the same system (Priority: P2)

Reading-comprehension questions use the same adaptive choice and the same
text-answer rules as quizzes. The passage can include images.

**Why this priority**: owner's #27 — reading currently forks both
behaviours and its text checking is opaque.

**Independent Test**: a reading exercise with a multi-correct choice
question and a text question with variants behaves exactly like the quiz
versions; an image inserted into the passage shows for the student.

**Acceptance Scenarios**:

1. **Given** a reading choice question with several correct options,
   **Then** students get checkboxes and set-equality grading.
2. **Given** a reading text question, **Then** the same visible rules apply
   as in quizzes.
3. **Given** an image added to the passage, **When** a student reads it,
   **Then** the image renders in place.

---

### User Story 4 - Translation checking made visible (Priority: P2)

The translation editor states how answers are checked: the accepted-answers
list, the case toggle, and approximate matching as an explicit option with
a plain-language description — not a hidden similarity threshold.

**Why this priority**: owner's #24 — "непонятно как происходит проверка".

**Independent Test**: the editor shows the three rules; turning approximate
matching off makes near-miss answers fail; the defaults keep existing
exercises grading as today.

**Acceptance Scenarios**:

1. **Given** the translation editor, **Then** accepted answers, case
   sensitivity and approximate matching are visible, labelled controls.
2. **Given** approximate matching off, **When** a student answers with a
   near-miss, **Then** it grades incorrect; on (default), near-misses within
   the documented tolerance pass as today.
3. **Given** existing translation exercises, **Then** verdicts are
   unchanged by default.

---

### User Story 5 - Optional "what to do" note on every task (Priority: P3)

Any exercise can carry an optional instruction text shown to the student
above the task. It is off (empty) by default and appears in the editor as a
single optional field.

**Why this priority**: owner's #9.

**Acceptance Scenarios**:

1. **Given** any exercise editor, **When** the teacher fills the optional
   instructions field, **Then** students see that text above the task.
2. **Given** the field is empty (default), **Then** nothing extra renders.

---

### Edge Cases

- A multi-correct question answered through the old single-answer payload
  (stale clients, old drafts): grades incorrect rather than erroring.
- Accepted-variant lists with duplicates or empty strings: ignored quietly.
- Text rules must apply in every grading path that grades the question
  (submit, non-persisting check, live lessons) — one rule, one
  implementation.
- The multi-choice signal in student payloads must not leak which options
  are correct.
- Reading passages with images must reuse the existing image upload; the
  answer-stripping layer must keep passage images intact for students.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A choice question's student control MUST be derived from its
  answer key: one correct option → single-choice, several → multi-choice.
- **FR-002**: Multi-choice grading MUST require exactly the set of correct
  options.
- **FR-003**: The student payload MUST carry the single/multi signal without
  revealing which options are correct.
- **FR-004**: Text-answer questions MUST expose editable checking rules:
  case sensitivity, trimming, punctuation handling, accepted variants; the
  grader MUST follow them exactly, in all grading paths.
- **FR-005**: Defaults MUST reproduce today's grading for existing content
  (choice and text, quiz, reading and translation alike).
- **FR-006**: Reading questions MUST use the same adaptive-choice and
  text-rules mechanisms as quiz questions.
- **FR-007**: Reading passages MUST support inline images via the existing
  image upload.
- **FR-008**: The translation editor MUST present its checking rules
  (accepted answers, case, approximate matching) as labelled controls, with
  approximate matching switchable.
- **FR-009**: Every exercise editor MUST offer an optional instructions
  field, empty by default, rendered to students only when non-empty.
- **FR-010**: New user-facing text MUST exist in all six locales.

### Key Entities

- **Choice question**: options each carrying an is-correct mark; widget
  behaviour derived, not stored.
- **Text answer rules**: per-question checking settings + accepted
  variants; stored with the question, defaults = current behaviour.
- **Instructions note**: optional per-exercise text, shown above the task.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Authoring a multi-correct question requires zero extra
  decisions beyond marking the correct options.
- **SC-002**: A teacher can read the exact text-checking rules from the
  editor screen without documentation.
- **SC-003**: 100% of pre-existing quiz/reading/translation content grades
  identically before and after (pinned by tests).
- **SC-004**: The same answer rules produce the same verdict on submit and
  on the non-persisting check path.

## Assumptions

- «Текстовый ввод — отдельное задание» (owner #4) is implemented as the
  text-answer question kind with fully explicit rules inside quiz/reading —
  not as a 27th exercise type; a new registry type would ripple through
  catalogue, docs and marketing claims for no added capability. Flagged to
  the owner in the PR.
- Text-rule storage rides the existing per-question JSON (no migration).
- Approximate translation matching keeps today's tolerance as the "on"
  behaviour; the toggle only makes it visible and optional.
- The instructions note is a config field read by the shared renderers; per
  the owner it defaults to off (empty).
