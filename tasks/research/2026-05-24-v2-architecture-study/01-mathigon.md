# Mathigon — lesson framework architecture

Source: https://github.com/mathigon/textbooks (15k+ stars, MIT)
Studio docs: https://mathigon.io/studio

## Core idea
A textbook chapter = `content.md` + `functions.ts` + `styles.scss`.
Authors write Markdown with custom interactive tags; per-step TypeScript
hooks animate / validate / unlock the next step.

## Repo layout (relevant bits)

```
content/
  shared/              # cross-course glossary + bios + shared web components
  fractals/
    content.md         # text + custom tags, separated by --- into steps
    functions.ts       # one exported function per step ID
    styles.scss
  probability/...
```

Each course is a sibling folder under `content/`.

## Content.md syntax (custom Markdown extension)

```markdown
> id: intro
> goals: tap-anywhere

# Welcome to Fractals

Click the [Sierpinski triangle](->triangle) to start.

::: .box
**Tip:** zoom with two-finger pinch.
:::

---

> id: dimension

What is the dimension of this fractal?
[[1|2|log(3)/log(2)|3]]
```

Key extensions over CommonMark:
- `> key: value` front-matter per step (id, goals, optional class)
- `---` step separators
- `[[a|b|c]]` inline multiple-choice (autograded)
- `::: .box ... :::` styled containers
- `[label](->ref)` references back to interactive elements by ID
- `<x-equation>`, `<x-coordinate-system>`, etc. — custom web components

Parsed by [@mathigon/parser](https://github.com/mathigon/parser) (Gulp
plugin) into HTML wrapped in `<x-step>` web components, one per step.

## Step lifecycle (TypeScript)

Each step ID matches an exported function in `functions.ts`:

```ts
export function intro($step: Step) {
  $step.$('.triangle')!.on('click', () => $step.score('tap-triangle'));
}

export function dimension($step: Step) {
  $step.onScore('blank-0', () => {
    $step.addHint('correct');
  });
}
```

- `$step` is a reference to the `<x-step>` web component
- `.$()` and `.$$()` = scoped querySelector / All
- `$step.score(id)` marks a "goal" complete (unlocks Continue button)
- `$step.model.x = 5` writes to a reactive model — bound template re-renders
- Function runs **once** when the step is first revealed

## Reactive model
- Each step has `$step.model` (proxy)
- Variables in markdown can reference model: `Result: ${x * 2}`
- Template re-evaluates when any referenced model field changes
- Same model can be shared across steps via parent `<x-course>`

## Custom web components
- All interactive elements (graphs, equations, simulations) are web components
- Tag name conventions: `<x-foo>`, `<x-bar>` (the `x-` prefix is theirs)
- Registered globally in `shared/components/`
- Author drops them in markdown like normal HTML

## What's worth adopting for our LMS

### Tier 1 — directly applicable
1. **Step-based lesson model with goals**
   Our V2LessonRunner already advances on `onFinish`. Mathigon's "goals"
   (multiple per step, all must complete) is one level richer — could be
   a `requiredScores: string[]` prop on V2Step.

2. **Per-step reactive model**
   Their `$step.model.x` Proxy pattern is essentially Zustand-per-step.
   For long-form lessons (not just exercise drills), this could let an
   admin embed live formulas/graphs that reference student input.

### Tier 2 — bigger commitment
3. **Custom-Markdown lesson authoring**
   Methodists write `.md` with our custom tags instead of using the
   admin lesson editor. Pros: version-control, AI-friendly,
   composable. Cons: requires our own parser fork, methodist training.

4. **Web-component-based interactives**
   Mathigon registers everything as `<x-equation>` etc. We're on React
   so this maps to React components. The architectural lesson is:
   **clean prop contract per interactive type** — which is exactly
   what our V2 components do (`QuizV2`, `WhiteboardV2`, …).

### Skip
- The Gulp build chain (we're Next.js)
- The custom CMS/server (`@mathigon/studio`) — overlaps Frappe LMS

## Open questions
- Could Mathigon courses be **imported** into our LMS as V2 lessons?
  Their format is open-source and well-documented. A converter could
  unlock ~50 free interactive chapters.
- Their per-step `goals` model maps well to learning-outcome tracking
  — could feed our future skill graph mastery signal.
