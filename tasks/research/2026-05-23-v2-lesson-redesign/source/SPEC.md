# GrassLMS · Exercise types · Integration spec

> 40 interactive task types polished in Duolingo-style posture, built on the GrassLMS Lively design system.
> All prototypes live in `index.html` as a design canvas. Use this doc as the engineering handoff.

---

## 0 · System overview

### 0.1 Visual chrome (every exercise wears this)

| Element | Behavior |
|---|---|
| **Close ×** (top-left) | Quits the lesson |
| **Progress bar** | Fills `step / totalSteps` · text label "5 / 12" next to it. **Hide** when `step+totalSteps` not provided. |
| **Streak 🔥** | Coral pill in `coral-50` bg + `coral-700` text. From user profile. **Hide** for passive content (Theory, SCORM). |
| **Hearts ♥** | Coral pill. Lose −1 on wrong answer. **Hide** for passive content. |
| **Skip button** (bottom-left) | Ghost button. Hide on game-flow exercises (matching, robot, etc.) |
| **Check button** (bottom-right) | Primary green `shadow-pop` button. Disabled until input present. |

After answer:
- **Correct** → green-50 bottom sheet · ✓ icon · message + Continue button + confetti burst
- **Wrong** → coral-50 bottom sheet · ✗ icon · "Answer: X" + Continue button (coral)
- **Max attempts** → reveal answer + Continue

### 0.2 Design tokens (from `tokens.css` / GrassLMS Lively v1)

| Use | Token | Hex |
|---|---|---|
| Primary CTA | `--green-600` | #0a8754 |
| Primary shadow | `--green-700` | #07683f |
| Reward / streak / hearts | `--coral-500` | #ff7a5c |
| Highlight marker on hero word | `--sun-300` | #ffe066 |
| Page bg | `--paper` | #fafbf6 |
| Card surface | `--paper-2` | #ffffff |
| Body text | `--ink-900` | #0a1a10 |
| Muted text | `--ink-500` | #4d5a51 |
| Card radius | `--radius-lg` | 18px |
| Button radius | `--radius-md` | 14px |

Fonts: **Manrope** display/body, **Geist Mono** for eyebrows, code, tables, numerics.

Buttons use the signature **shadow-pop** physics: `box-shadow: 0 4px 0 0 var(--green-700)` (no blur), translate-Y +2px on hover, +4px on active. Defined as `.gp-btn` in `index.html`.

### 0.3 Submission contract

The existing `exercise-renderer.tsx` already calls `POST /exercises/:id/submit`. New variants here keep that contract; only the UI layer is replaced.

```ts
type SubmitPayload =
  | { answers: { question_id: string; selected_option: string }[] } // quiz
  | { interactive_answers: any }                                     // all interactive types
  | { source_code: string; language: string }                        // code_challenge
  | { game_result: GameResult }                                      // robot_2d, world_3d, math_interactive
  | { /* file: multipart */ }                                        // file_upload
```

---

## 1 · Quiz family (7 types)

Used in **80% of lessons**. All single-screen, single-question or multi-question.

### 1.1 `quiz` · Multiple choice
**Purpose**: pick 1 from N options.
**Config**: `{ questions: [{ id, question_text, options: [{text, is_correct}], points }] }`
**UI**: each option = full-width tile, number badge on the left, mono-font option text. On wrong: correct one turns green, picked one coral.
**Use for**: factual recall, conceptual checks, vocab.
**See `q-basics.jsx` · `QuizExerciseV2`**

### 1.2 `true_false` · Two-button binary
**Purpose**: judge a statement.
**Config**: `{ statement: string, answer: boolean, explain?: string }`
**UI**: centered statement card (mono, italic-feel) + two big shadow-pop tiles "True / False".
**Use for**: misconception checks, definition validation.
**See `q-basics.jsx` · `TrueFalseExerciseV2`**

### 1.3 `fill_blanks` · Tap-bank to fill blanks
**Purpose**: complete a sentence/expression by tapping words from a bank.
**Config**: `{ text: "The {{blank}} of an array is the {{blank}}.", word_bank: [...], blanks: [...] (correct answers in order) }`
**UI**: sentence with underlined slots; bank of pills below; tap to place, tap placed slot to remove.
**Use for**: vocab in context, syntax patterns, cloze tests.
**See `q-basics.jsx` · `FillBlanksExerciseV2`**

### 1.4 `matching` · Connect pairs
**Purpose**: pair left items ↔ right items.
**Config**: `{ pairs: [{left, right}] }` — display order is shuffled.
**UI**: 2×N grid · tap one left, tap one right · correct match turns green permanently · wrong match flashes coral, both reset.
**Use for**: term ↔ definition, function ↔ output, English ↔ translation.
**See `q-basics.jsx` · `MatchingExerciseV2`**

### 1.5 `ordering` · Drag to sort
**Purpose**: arrange items into correct sequence.
**Config**: `{ items: [...] (in correct order; displayed shuffled) }`
**UI**: vertical list, each row draggable, grip icon on right, number badge on left.
**Use for**: algorithm steps, historical events, recipe order, narrative beats.
**See `q-basics.jsx` · `OrderingExerciseV2`**

### 1.6 `categorize` · Drag to buckets
**Purpose**: classify items into N labeled buckets.
**Config**: `{ categories: [{ name, items: [...] (correct membership) }] }`
**UI**: bucket containers above, unsorted pills below; drag a pill into a bucket. Each bucket has its own tint.
**Use for**: parts of speech, periodic table groups, mutable/immutable, sorting genres.
**See `q-basics.jsx` · `CategorizeExerciseV2`**

### 1.7 `bubble_sheet` · SAT-style answer sheet
**Purpose**: classroom or test-style batch of N MCQs at once.
**Config**: `{ questions: [{ number, q, opts: [...], correct: idx }] }`
**UI**: per-question row · numbered circle bubble + option text · 4 bubble buttons (A/B/C/D). After Check: correct row turns green, wrong selection coral.
**Use for**: SAT/test prep, summative quizzes, batch grading.
**See `q-basics.jsx` · `BubbleSheetExerciseV2`**

---

## 2 · Language family (8 types)

### 2.1 `translation` · Type the translation
**Purpose**: produce the target-language equivalent.
**Config**: `{ source_text, source_language, target_language, accepted_answers: [...], case_sensitive?, hints?: [...] }`
**UI**: source card (with speaker button), textarea, optional hint chip.
**Validation**: case-insensitive, punctuation-stripped match against any in `accepted_answers`.
**See `q-language.jsx` · `TranslationExerciseV2`**

### 2.2 `sentence_builder` · Tile assembly *(canonical Duolingo)*
**Purpose**: construct a sentence from word tiles.
**Config**: `{ source_text, correct_order: [...], distractors?: [...] }` — all words shuffled into a bank, distractors mixed in.
**UI**: source card + speaker, "answer" row with bordered top/bottom, bank below; tap tile to move between answer/bank.
**Use for**: language learning, syntax practice.
**See `q-language.jsx` · `SentenceBuilderExerciseV2`**

### 2.3 `dialogue` · Chat-bubble reply
**Purpose**: pick the contextually correct reply in a conversation.
**Config**: `{ context, messages: [{ speaker, text, options?: [{id, text, is_correct}] }] }`
**UI**: avatar + chat bubble for prompt, your reply preview on selection, 3 reply tiles.
**Use for**: pragmatic / situational language.
**See `q-language.jsx` · `DialogueExerciseV2`**

### 2.4 `conjugation` · Verb table
**Purpose**: fill all conjugations of a verb.
**Config**: `{ verb, tense, language, table: [{ pronoun, correct }] }`
**UI**: card with rows of `pronoun → input`, mono font.
**See `q-language.jsx` · `ConjugationExerciseV2`**

### 2.5 `reading` · Passage + Q
**Purpose**: read text, answer questions about it.
**Config**: `{ passage, questions: [{ question, type, options?, correct_answer }] }`
**UI**: 2-column · passage left, question + options right.
**See `q-language.jsx` · `ReadingExerciseV2`**

### 2.6 `crossword` · Letter grid
**Purpose**: solve crossword.
**Config**: `{ grid_size, words: [{ word, clue, row, col, direction: "across"|"down" }] }`
**UI**: editable letter cells + ACROSS/DOWN clue panel. Per-cell color: green ok, coral wrong.
**See `q-language.jsx` · `CrosswordExerciseV2`**

### 2.7 `word_search` · Find words in grid
**Purpose**: drag-select words in a letter grid.
**Config**: `{ grid_size, grid: [string[]], words: [...] }`
**UI**: mouse-drag selection painting cells, validates against any direction.
**See `q-language.jsx` · `WordSearchExerciseV2`**

### 2.8 `srs_flashcard` · Anki-style spaced repetition
**Purpose**: review vocab/concepts; user rates Again/Hard/Good/Easy → SRS schedules next review.
**Config**: `{ cards: [{ front, back, pinyin? }], mastery_threshold?, daily_new_cards?, daily_review_cap? }`
**UI**: card flips on tap, 4 colored rating buttons appear after flip · no hearts (it's practice, not assessment).
**No progress bar** — has its own deck counter in eyebrow.
**See `q-language.jsx` · `SRSFlashcardExerciseV2`**

---

## 3 · Programming family (4 types)

### 3.1 `code_challenge` · Monaco editor + tests
**Purpose**: write code that passes a set of tests.
**Config**: `{ language: "python"|"javascript"|...37 languages, starter_code, description, examples: [{input, output}], test_cases: [{input, expected_output, is_hidden}] }`
**UI**: 2-column · problem statement + examples left, dark editor + Output/Tests tabbed panel right. Real Monaco in production; placeholder textarea here.
**Submission**: `POST /exercises/:id/submit { source_code, language }` → returns `{ total_passed, total_tests, test_results }`.
**See `q-programming.jsx` · `CodeChallengeExerciseV2`** · mobile in `q-mobile.jsx` · `CodeMobile` (Replit-style w/ tabs + code keyboard)

### 3.2 `web_editor` · HTML/CSS/JS + live iframe
**Purpose**: build a UI snippet meeting requirements.
**Config**: `{ description, starter_html, starter_css, starter_js, requirements: [...string] }`
**UI**: 4-tab editor (HTML/CSS/JS) + live iframe preview + requirements checklist. Mobile uses CodePen-style tabs.
**See `q-programming.jsx` · `WebEditorExerciseV2`** · mobile · `WebEditorMobile`

### 3.3 `robot_2d` · Blockly drives a grid robot 🎯 **fullscreen-capable**
**Purpose**: stack instruction blocks to make a robot reach a goal.
**Config**: `{ grid_size, start, goal, coins, walls, available_blocks: ["forward","turn-right","turn-left","repeat"] }`
**UI inline**: simple linear block list (for beginner levels).
**UI fullscreen**: full sidebar with palette + stats, central large grid, right-side scrollable program tree with **nested `repeat N [...]` blocks** + indent + bracket. Toggle FULL/COMPACT rendering.
**Inline mode**: no progress bar, no hearts — level number in eyebrow.
**See `q-programming.jsx` · `Robot2DExerciseV2`** · fullscreen in `q-fullscreen.jsx` · `Robot2DFullscreen`

### 3.4 `world_3d` · Isometric world navigation 🎯 **fullscreen-capable**
**Purpose**: walk a character to a flag in an iso scene.
**Config**: `{ grid_size, start, goal, obstacles, available_actions }`
**UI**: SVG-rendered iso grid with shadow tiles, character with hat, D-pad bottom-right.
**See `q-programming.jsx` · `World3DExerciseV2`** · fullscreen · `World3DFullscreen`

---

## 4 · Math family (6 base + 11 interactive templates)

### 4.0 Base math types

**`math_stepwise`** — student writes each line of work; each line graded separately. `{ problem, solution_steps: [{label, expected, hint}] }` · `MathStepwiseExerciseV2`
**`math_interactive`** — dispatcher into one of 11 templates by `template_id`. See §4.1.

### 4.1 Math interactive templates

All live in `q-math-templates.jsx`. Each has its own UI and config schema.

| # | Template | Purpose | Key config |
|---|---|---|---|
| 1 | **`numeric_input`** | Single numeric answer w/ keypad | `{ problem, correct, tolerance, example? }` · keypad always visible · `NumericInputExerciseV2` |
| 2 | **`equation_balance`** | Visual scale: subtract/divide from both sides until x isolated | `{ initial: {leftX, leftW, rightX, rightW}, target_x }` · `EquationBalanceExerciseV2` |
| 3 | **`number_line`** | Drag a marker to a position on −N…+N line | `{ min, max, correct }` · `NumberLineExerciseV2` |
| 4 | **`visual_fractions`** | Click pie/bar slices to shade target fraction | `{ numerator, denominator }` · `VisualFractionsExerciseV2` |
| 5 | **`multiple_choice_math`** | MCQ with serif-rendered math expressions | `{ text, expr, options, correct }` · `MultipleChoiceMathExerciseV2` |
| 6 | **`arithmetic_puzzle`** | Fill missing number in equations from a number bank | `{ equations: [{cells, answer, blankIndex}], bank }` · `ArithmeticPuzzleExerciseV2` |
| 7 | **`card_sort`** | Drag equation cards into category columns (Linear/Quadratic/Exponential) | `{ categories: [{id, label, color}], cards: [{text, category}] }` · `CardSortExerciseV2` |
| 8 | **`coordinate_plane`** | Drag points onto target coordinates | `{ target_points: [{x, y, label}], grid_range, tolerance }` · `CoordinatePlaneExerciseV2` |
| 9 | **`equation_solver`** | Stepwise: pick correct operation chip at each stage; wrong ones shake | `{ initial_left, initial_right, steps: [{action, options, after}], final_answer }` · `EquationSolverExerciseV2` |
| 10 | **`function_graph`** | Sliders for m/b, live-drawing line to match dashed target | `{ function_type, target_params, grid_range, tolerance }` · `FunctionGraphExerciseV2` |
| 11 | **`graph_transform`** | Sliders for h/v/a to transform parent y=x² to match target | `{ parent_function, target_h, target_v, target_a }` · `GraphTransformExerciseV2` |
| 12 | **`inequality_graph`** | Slope + intercept sliders + operator chips + shade above/below | `{ slope, intercept, operator: ">"|">="|"<"|"<=" }` · `InequalityGraphExerciseV2` |
| 13 | **`scatter_plot`** | Drag two endpoints of best-fit line over data points | `{ points: [{x,y}], target_slope, target_intercept, x_range, y_range, mode }` · `ScatterPlotExerciseV2` |
| 14 | **`table_pattern`** | Fill blanks in an x→f(x) table + name the rule | `{ x_values, y_values (nulls=blanks), answers, rule_answer }` · `TablePatternExerciseV2` |
| 15 | **`two_way_table`** | Fill missing cells of statistical contingency table | `{ row_headers, col_headers, cells (nulls=blanks), answers }` · `TwoWayTableExerciseV2` |
| 16 | **`venn_diagram`** · 3 modes | See below | `{ mode, ... }` |

#### 4.1.x Venn diagram — three modes

The Venn template supports a `mode` flag in config:

- **`mode: "numbers"`** — count students per region (`VennDiagramExerciseV2`)
  `{ set_a_label, set_b_label, total, given: {a_only, intersection}, answers: {b_only, neither} }`
- **`mode: "elements"`** — drag specific items into regions (`VennDiagramElementsExerciseV2`)
  `{ set_a_label, set_b_label, items: [...], correct: { item: "a_only"|"intersection"|"b_only"|"neither" } }`
- **`mode: "text"`** — describe each region in words (`VennDiagramTextExerciseV2`)
  `{ set_a_label, set_b_label, answers: { a_only: string, intersection: string, b_only: string, neither: string } }` · validates via fuzzy keyword match.

---

## 5 · Other (3 types)

### 5.1 `map_pin_drop`
**Purpose**: place a pin on a target location.
**Config**: `{ image_url, instructions, pins: [{ label, x: %, y: %, tolerance: % }] }`
**UI**: click anywhere to drop a coral pin; on Check, target reveals as green pin if missed.
**See `q-other.jsx` · `MapPinDropExerciseV2`**

### 5.2 `file_upload`
**Purpose**: submit a file (essay, PDF, screenshot).
**Config**: `{ allowed_types, max_file_mb, prompt }`
**UI**: drag-drop zone, click to browse, file-info card after selection. No hearts.
**See `q-other.jsx` · `FileUploadExerciseV2`**

### 5.3 `scorm_package` 🎯 **always fullscreen**
**Purpose**: embedded third-party SCORM 1.2 module.
**Config**: `{ scorm_zip_url, manifest_url }` — module owns its own UI.
**UI inline**: simple iframe placeholder w/ "Open fullscreen" button.
**UI fullscreen**: dark top bar with outline + cmi.core.lesson_status indicator + Open external · sidebar with module outline · main area = embedded module · progress strip bottom.
**No hearts / no streak / no progress bar** in the LMS chrome — SCORM tracks its own progress and reports back via API.
**See `q-other.jsx` · `SCORMPackageExerciseV2`** · fullscreen · `SCORMFullscreen`

---

## 6 · Theory (NEW content type)

A non-exercise block in a lesson — static teaching material. Sits between exercises.

### 6.1 Sources supported

| Source | Backend handling | Frontend rendering |
|---|---|---|
| **PDF** | Stored as-is | `<iframe src={pdfUrl}>` (browser native viewer) or pdf.js |
| **PPTX** (.pptx, .ppt) | Stored, optionally converted to PDF for offline | `<iframe src={"https://view.officeapps.live.com/op/embed.aspx?src=" + encodeURIComponent(pptxUrl)}>` |
| **Keynote** (.key) | Server converts to PDF on upload (CloudConvert / unoconv) | Render the resulting PDF |
| **Google Slides** | User pastes share URL → backend converts to embed URL | `<iframe src={embedUrl}>` |

### 6.2 Google Slides URL → embed conversion

```js
function convertGSlidesUrl(shareUrl) {
  // https://docs.google.com/presentation/d/{ID}/edit?usp=sharing
  // →
  // https://docs.google.com/presentation/d/{ID}/embed?start=false&loop=false&delayms=3000
  const m = shareUrl.match(/presentation\/d\/([\w-]+)/);
  if (!m) return null;
  return `https://docs.google.com/presentation/d/${m[1]}/embed?start=false&loop=false`;
}
```

Validation in UI: bad URL → coral pill, good link not converted → sun pill, embed-ready → green pill.

### 6.3 UI variants

- **Inline** (`TheoryViewerExercise`) · in-lesson slide block · big stage + thumbnail strip + Notes / Download / Fullscreen / Continue. **No hearts / no streak**.
- **Fullscreen** (`TheoryFullscreen`) · presenter view, dark theme · top bar with course breadcrumb · togglable thumbnails sidebar + speaker notes sidebar · playback strip with slide-dot markers · keyboard ←/→.
- **Mobile** (`TheoryMobile`) · 4:3 slide, thumbnail strip, Notes-on-demand, ←/→ buttons.
- **Teacher upload card** (`TheoryUploadCard`) · 3-step picker · choose source → upload/paste → preview & publish.

### 6.4 Config schema

```ts
type TheoryBlock = {
  type: "theory";
  title: string;
  subtitle?: string;
  source: { kind: "pdf"|"pptx"|"key"|"gslides"; url: string; filename?: string; pages?: number };
  speaker_notes?: string[]; // one per slide
};
```

**See `q-theory.jsx`** for all 4 components.

---

## 7 · Special modes

### 7.1 Fullscreen exercise types

Some exercises need more screen real-estate. The existing `exercise-renderer.tsx` has `FULLSCREEN_TYPES = new Set([...])` — add `scorm_package` and `theory` to it:

```ts
const FULLSCREEN_TYPES = new Set([
  "robot_2d",          // big grid + program panel
  "math_interactive",  // some templates (graph templates) benefit
  "world_3d",          // immersive 3D scene
  "scorm_package",     // SCORM always
  "theory",            // presentations
]);
```

UI: shows "Open fullscreen" button in the inline card; clicking opens portal overlay.

### 7.2 Mobile UI

Phone-first variants exist for the most-frequent exercise types:
- `SentenceBuilderMobile`, `QuizMobile`, `FillBlanksMobile`, `FlashcardMobile` — language/quiz
- `CodeMobile` (Replit-style with custom code keyboard above OS keyboard)
- `WebEditorMobile` (CodePen-style with 4 tabs)
- `TheoryMobile`

Other exercise types reuse the desktop component (it's responsive enough). Key mobile patterns:
- 44px minimum hit-target
- Code editor has a sticky **code-keyboard row** above the OS keyboard with `Tab ( ) [ ] { } : ; = " ' # _ < > + − * /`
- Bottom feedback sheet is the same as desktop

---

## 8 · Gamification — rules

### 8.1 Hearts

- Default 5. Lose 1 on wrong answer.
- Refill: ad / streak freeze / wait time.
- **Hide** on: SRS Flashcard (practice mode), Theory, SCORM, File upload, Robot/World inline single-mission, Code/Web editor (long-form work; we don't punish iteration on code).
- Show heart-pulse animation on loss (defined as `.gp-heart-loss` keyframe in `index.html`).

### 8.2 Streak 🔥

Shown on every interactive exercise. Pulled from user profile, not affected by individual exercise outcome — only by daily activity.

### 8.3 Progress

`step / totalSteps` derived from `lesson.exercises.length` + current index. Pass to `LessonShell` as props. Hide bar when undefined (standalone practice).

### 8.4 Confetti

Fire on:
- ✓ correct answer (all exercise types)
- Mission complete (Robot/World)
- Deck complete (SRS)
- Module complete (SCORM)

Uses `useConfetti()` hook from `shell.jsx` — 36 colorful particles, 1.4s fall, GrassLMS palette.

### 8.5 What NOT to add

- **No mascot character** — keep deliberately distinct from Duolingo. Brand owl-style trade dress is risky territory.
- **No "you lost! retry" hard-fail** — exercises always retry-able; submit attempts tracked, max-attempts reveals answer.
- **Don't tint headings green** — hierarchy via size + weight per design system.

---

## 9 · Implementation order (suggested)

If you're integrating piece by piece:

**Phase 1 — Core lesson chrome** (1 sprint)
- Update `LessonShell` to support `step/totalSteps + hideStats` (already shipped in `shell.jsx`)
- Apply to all `quiz` / `true_false` / `fill_blanks` / `matching` / `ordering` / `categorize` — biggest visual win, smallest backend churn
- Add confetti + heart-loss animation

**Phase 2 — Language family**
- Sentence builder (canonical Duolingo), translation, dialogue, conjugation, reading
- SRS flashcard with no-progress chrome

**Phase 3 — Code & game**
- Code challenge with new editor split + Output/Tests tabs
- Robot 2D fullscreen with `repeat` blocks (this is the big upgrade for advanced levels)
- World 3D fullscreen

**Phase 4 — Math**
- Math stepwise, numeric input, equation balance, number line, visual fractions, multiple choice math
- Then all 11 interactive templates one at a time (function graph + scatter plot first — most pedagogically valuable)

**Phase 5 — Other**
- Map pin drop, file upload
- SCORM fullscreen
- **Theory content type** — new — requires backend support for PDF/PPTX/KEY upload + Google Slides URL conversion

**Phase 6 — Mobile**
- Roll out mobile variants as PWA features
- Code keyboard is the biggest UX win

---

## 10 · File map

```
index.html                  Entry: loads React 18 + Babel + all scripts; global CSS for chrome/tiles/buttons
tokens.css                  GrassLMS design tokens (drop-in from design system)
design-canvas.jsx           Canvas wrapper (don't ship — handoff only)
shell.jsx                   LessonShell + FeedbackSheet + useConfetti() + Icon set
app.jsx                     Stitches everything into the design canvas
q-basics.jsx                7 quiz-family exercises
q-language.jsx              8 language exercises
q-programming.jsx           4 programming exercises
q-math.jsx                  6 base math exercises
q-math-templates.jsx        11 interactive math templates (Venn has 3 modes)
q-other.jsx                 3 misc (map / file / scorm)
q-fullscreen.jsx            Robot/World/SCORM fullscreen variants + FullscreenShell
q-theory.jsx                Theory inline + fullscreen + mobile + teacher upload card
q-mobile.jsx                Phone variants of key exercises
```

Each `q-*.jsx` is self-contained — exports its components to `window` for the canvas to consume. Components are pure React, no external deps beyond React 18.

---

## 11 · Outstanding questions for product

- [ ] Sound effects (success chime / wrong buzz) — yes / no? If yes, what library / where hosted?
- [ ] Streak freeze / hearts refill economy
- [ ] Should `code_challenge` lose hearts on failing tests, or be infinite-attempt practice?
- [ ] Theory blocks — count toward lesson XP? (currently they don't grade)
- [ ] Skip button on free-practice vs. graded lessons — different behavior?
