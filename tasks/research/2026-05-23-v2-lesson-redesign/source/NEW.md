# What's NEW vs the existing lmsv1 codebase

> This file lists only what didn't exist before — every other type already has a stub in `frontend/src/components/exercises/`.
> Pair with `SPEC.md` for full details.

---

## 1 · `theory` content type — **brand new**

There is no `theory` type in `exercise-renderer.tsx` today. To add it:

### Database (Alembic migration)
A new `lesson_blocks` table (or extend the existing `Exercise` model with a `block_type` enum):

```python
class TheoryBlock(Base):
    __tablename__ = "theory_blocks"
    id = Column(UUID, primary_key=True)
    lesson_id = Column(UUID, ForeignKey("lessons.id"), nullable=False)
    sort_order = Column(Integer, nullable=False)
    title = Column(String, nullable=False)
    subtitle = Column(String, nullable=True)
    source_kind = Column(Enum("pdf", "pptx", "key", "gslides", name="theory_source"), nullable=False)
    source_url = Column(String, nullable=False)         # storage URL or embed URL
    source_filename = Column(String, nullable=True)     # for uploaded files
    pages = Column(Integer, nullable=True)              # auto-detected
    speaker_notes = Column(ARRAY(String), nullable=True)  # one entry per slide
    created_at = Column(DateTime, server_default=func.now())
```

### Backend
- `POST /api/theory-blocks` — create from URL or multipart upload
- `GET /api/theory-blocks/:id`
- A worker job for **PPTX** and **Keynote** uploads: convert to PDF via CloudConvert / LibreOffice headless (`soffice --convert-to pdf`), then store both originals.
- A small util for the **Google Slides URL converter** — already implemented in JS in `q-theory.jsx:464`:

```python
import re

def gslides_to_embed(share_url: str) -> str | None:
    m = re.search(r"presentation/d/([\w-]+)", share_url)
    if not m: return None
    return f"https://docs.google.com/presentation/d/{m.group(1)}/embed?start=false&loop=false"
```

### Frontend rendering
Add to `exercise-renderer.tsx` (or split `lesson-player.tsx`):

```ts
case "theory":
  return <TheoryRenderer block={block} onComplete={() => onContinue()} />;
```

`TheoryRenderer` shows the inline variant by default, with an "Open fullscreen" button → opens portal overlay with `TheoryFullscreen`. Both already built in `q-theory.jsx`.

### Iframe rendering by source kind
```tsx
const src = useMemo(() => {
  switch (block.source_kind) {
    case "pdf":     return block.source_url;
    case "pptx":    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(block.source_url)}`;
    case "key":     return convertedPdfUrl;  // server pre-converts
    case "gslides": return block.source_url; // already embed URL
  }
}, [block]);

return <iframe src={src} title={block.title} allowFullScreen />;
```

### Lesson editor changes
- Add a "+ Theory" button next to "+ Exercise" in the lesson builder
- Open `TheoryUploadCard` modal — already designed in `q-theory.jsx`
- On submit, POST creates the block, lesson refetches

### "Continue" behavior
Theory blocks **don't have a check step** — when the student has viewed all slides (or just hits Continue), `block.viewed_at` is recorded and lesson progress advances. **No hearts lost, no XP given** (per current spec — see SPEC.md §11).

---

## 2 · `repeat N [...]` blocks in Robot 2D — **new block type**

Currently `frontend/src/components/game/blockly/custom-blocks.ts` defines only `forward`, `turn_right`, `turn_left`, plus some sensor blocks. **There is no `repeat` block** — students stack 8 individual `forward` blocks instead.

### Adds:
- A new `repeat` Blockly block with one statement input (`children`) and one number field (`n`)
- Execution: wrap children in a JS `for (let i = 0; i < n; i++) { ... }` in `step-executor.ts`
- Storage: existing `block_type` field accepts new value `"repeat"`; children stored as nested array

### Visual upgrade in the LMS renderer
- Block tree rendered with **indent + bracket-line in parent color**
- Toggle FULL / COMPACT — compact mode collapses leaves into chips (`↑3 ↻ ↑2`) for very long programs (50+ steps)
- Right-column program panel scrolls independently of the grid
- See `q-fullscreen.jsx · Robot2DFullscreen` for the reference implementation

This is the **most important upgrade for advanced levels** — without it, programs become unmanageable past level ~6.

---

## 3 · Venn diagram — three modes — **two are new**

Currently `frontend/src/components/game/math/templates/venn-diagram.tsx` only supports the "numbers" mode (count students per region).

### New modes
Add a `mode` field to the venn template config:

```ts
type VennConfig =
  | { mode: "numbers"; set_a_label, set_b_label, total, given, answers }
  | { mode: "elements"; set_a_label, set_b_label, items: (string|number)[],
      correct: Record<string, "a_only"|"intersection"|"b_only"|"neither"> }
  | { mode: "text"; set_a_label, set_b_label,
      answers: { a_only, intersection, b_only, neither } };  // free-text descriptions
```

`VennDiagramTemplate` dispatches to one of `VennDiagramNumbers`, `VennDiagramElements`, `VennDiagramText`. Reference implementations in `q-math-templates.jsx · VennDiagramElementsExerciseV2`, `VennDiagramTextExerciseV2`.

**`elements` mode** is the most powerful — it's set theory taught hands-on. Use for: classifying numbers (evens/primes), grammar (verbs/nouns), historical figures (scientists/inventors), animals (mammals/aquatic).

---

## 4 · `FULLSCREEN_TYPES` set — **add 2 types**

Currently in `exercise-renderer.tsx:84`:
```ts
const FULLSCREEN_TYPES = new Set(["robot_2d", "math_interactive", "world_3d"]);
```

Add:
```ts
const FULLSCREEN_TYPES = new Set([
  "robot_2d",
  "math_interactive",
  "world_3d",
  "scorm_package",   // ← new — SCORM is always fullscreen
  "theory",          // ← new — presentations need real estate
]);
```

`scorm_package` should ALSO have `defaultFullscreen: true` — the inline view should auto-open the portal on mount (per SPEC.md §5.3).

---

## 5 · Lesson chrome — `LessonShell` component

The existing renderer uses ad-hoc card chrome (`<div className="rounded-lg border ...">`). The new design centralizes it as `LessonShell`. Most relevant props:

```tsx
interface LessonShellProps {
  // Gamification — pulled from user context, not props in production
  hearts?: number;
  streak?: number;
  hideStats?: boolean;        // ← NEW · hide hearts+streak for passive content (theory, scorm)

  // Lesson position — pass from lesson.exercises.length + currentIndex
  step?: number;
  totalSteps?: number;
  // OR legacy
  progress?: number;          // raw percentage if no step context

  // Content
  eyebrow?: string;           // e.g. "PYTHON · LESSON 6 / 12"
  title?: ReactNode;          // can contain <span className="gp-mark"> for sun-300 marker

  // Submission
  feedback: { kind: "ok"|"no"; msg; correct?; explain? } | null;
  canCheck: boolean;          // controls Check button disabled state
  onCheck: () => void;
  onContinue: () => void;
  checkLabel?: string;        // "Submit", "Run", etc.
  showSkip?: boolean;         // default true; hide for game flows
  lostHeart?: boolean;        // triggers heart pulse animation
}
```

This replaces ad-hoc chrome in every exercise renderer. Implementation in `shell.jsx`.

---

## 6 · Bottom-sheet feedback — **new pattern**

Currently exercises show feedback as a small inline `<ResultDisplay>` (see `exercise-renderer.tsx:200-260`). The new pattern is a **full-width bottom sheet** that takes over the action bar:

- Correct: green-50 bg, green-300 top border, ✓ icon, message + optional explain + green **Continue** button
- Wrong: coral-50 bg, coral-300 top border, ✗ icon, "Answer: X" reveal + coral **Continue** button

This matches Duolingo / Babbel / Khan Academy conventions and gives the eye a clear "next step" target.

Implementation: `FeedbackSheet` in `shell.jsx`. The bottom action bar already lives inside `LessonShell`; when `feedback != null`, it swaps to the sheet.

---

## 7 · Hearts loss animation + confetti — **new visuals**

Currently no reward feedback in the codebase. Adding:

- **Heart-loss pulse** — when `hearts` decreases, brief scale(1.4) animation on the heart pill. Already defined as `.gp-heart-loss` keyframe in `index.html`.
- **Confetti burst** — 36 particles in GrassLMS palette (`green-500`, `sun-400`, `coral-500`, `green-300`, `sun-300`), 1.4s fall animation. Hook `useConfetti()` in `shell.jsx` returns `{ fire, layer }` — fire on correct answer, mount `layer` in component.

No external deps (no canvas-confetti library) — pure CSS animations.

---

## 8 · Mobile code editor pattern — **new for mobile PWA**

The existing repo has no mobile-optimized code editor. The new design (`q-mobile.jsx · CodeMobile`) introduces a **custom code keyboard row** above the OS keyboard:

```
+----------------------------------------+
| Top bar: ← two_sum.py    Two Sum  ▶Run |
+----------------------------------------+
| Tabs: [Code] Console Tests             |
+----------------------------------------+
| 1  def two_sum(nums, target):          |
| 2      seen = {}                       |
| ...                                    |
+----------------------------------------+
| Code keyboard:                         |
| Tab ( ) [ ] { } : ; =                  |
| " ' # _ < > + − * /                    |
+----------------------------------------+
| (iOS keyboard)                         |
```

Each code-key just inserts a string at cursor position. Tab inserts 4 spaces.

`WebEditorMobile` uses **CodePen-style 4-tab** layout: HTML / CSS / JS / Preview, colored by source type.

---

## 9 · Step/total progress — **derive, don't hardcode**

Production integration: `LessonShell` receives `step` and `totalSteps` from the lesson player, computed as:

```ts
const totalSteps = lesson.exercises.length + lesson.theoryBlocks.length;
const step = lesson.currentBlockIndex + 1; // 1-indexed for display
```

Don't pass a hardcoded `progress` percent — let the player compute it. If neither is provided, the bar hides entirely (used by SRS practice, single missions).

---

## 10 · Where to lose hearts (rules)

Production should enforce these per-exercise-type rules:

| Type | Hearts lost on wrong? | Why |
|---|---|---|
| `quiz`, `true_false`, `fill_blanks`, `matching`, `ordering`, `categorize` | ✅ Yes | Standard grading |
| `bubble_sheet` | ✅ Yes | Test-style |
| `translation`, `sentence_builder`, `dialogue`, `conjugation`, `reading`, `crossword`, `word_search` | ✅ Yes | Language assessment |
| `srs_flashcard` | ❌ No | Self-rated practice |
| `code_challenge`, `web_editor` | ❌ No | Long-form work; punishing iteration discourages experimentation |
| `robot_2d`, `world_3d` | ❌ No | Game flow — losing a heart per failed run is too harsh |
| `math_stepwise` | ✅ Yes (per wrong step) |  |
| `math_interactive` | ✅ Yes (most templates) | except `function_graph`, `graph_transform` which need experimentation |
| `map_pin_drop` | ✅ Yes |  |
| `file_upload` | ❌ No | Submission, not a quiz |
| `scorm_package` | ❌ No | External grading |
| `theory` | ❌ No | Reading material |

Configurable via a new `loses_heart_on_wrong: boolean` field on the Exercise model (default true), backend reads when computing penalty.

---

## TL;DR — what's actually NEW to your backend

1. `theory_blocks` table + endpoints + PPTX/Keynote → PDF worker
2. Google Slides URL → embed URL converter (one regex)
3. `repeat` block type in Blockly schema + executor wrapping
4. `mode` field on Venn template config
5. `block_type` enum extended with `"theory"`
6. `loses_heart_on_wrong` field on Exercise
7. `FULLSCREEN_TYPES` extended with `theory` + `scorm_package`

Everything else is **frontend-only** — drop in `LessonShell`, replace per-type renderers with the new components, done.
