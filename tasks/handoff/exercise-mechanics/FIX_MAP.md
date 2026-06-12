# FIX MAP — every fix → its file in lmsv1

Legend: 🔴 BUG · 🔵 A11Y · 🟡 UX · 🟢 ADAPT.
"Playground ref" = file in this bundle whose code shows the working implementation.
IDs match the audit documents in `audits/`.

---

## §0 · Cross-cutting refactor (do once, saves ~300 lines)

**`useRetryContract()` hook** — new file, e.g. `frontend/src/hooks/use-retry-contract.ts`.
Extract the pattern duplicated in ~24 components:

- state: `attemptsLeft`, `usedAttempts`, `lostHeart` (500 ms pulse), `lockedOk`, `feedback`
- `win(msg, explain?)` → ok sheet + streak++ + confetti
- `miss(msg, {explain, correctList, correct})` → decrements hearts; at 0 → reveal sheet
  (kind `no`, structured `correctList`), else retry sheet leading with the win count
- `retry()` → locks correct parts (caller supplies a `gradeParts()` fn), clears wrong ones
- `revealAllowed` — true only when `feedback.kind === 'ok'` or attempts exhausted.
  **This single guard closes the TF-01 / MM-01 answer-leak bug class.**

Playground ref: the identical state block at the top of every component in `playground/ex-*.jsx`.

---

## §1 · Touch-blocking bugs — ship first 🔴

| ID | File (lmsv1) | Fix |
|---|---|---|
| CS-01 | `components/exercises/v2/card-sort-v2.tsx` | Replace HTML5 DnD (`draggable`/`onDragStart`/`onDrop` — never fires on iOS/Android touch) with pointer events + `setPointerCapture`, drop target via `elementFromPoint`/rect hit-test. Add tap-to-arm → tap-a-column (also the keyboard/SR path). Playground ref: `playground/ex-cards.jsx` (CardSortV2). |
| VE-01 | `components/exercises/v2/venn-elements-v2.tsx` | Same DnD→pointer port + tap-to-arm. Make all 4 drop zones visibly outlined while dragging/armed. Playground ref: `playground/ex-tables.jsx` (VennElementsV2). |
| SP-01 | `components/exercises/v2/scatter-plot-v2.tsx` | `onMouseDown/Move` → pointer events with capture; snap handles to 0.5 grid. Playground ref: `playground/ex-graphs2.jsx` (ScatterPlotV2). |
| XC-06 | repo-wide | Lint/grep gate: no `draggable=`, `onDragStart`, `onMouse(Down\|Move\|Up)` in exercise components. |

## §2 · Answer leaks 🔴

| ID | File | Fix |
|---|---|---|
| TF-01 | `v2/true-false-v2.tsx` | Tile-state logic marks `v === correctAnswer` green on *every* feedback, including "1 try left" → child copies it on retry. Gate the reveal on task-over (see §0 `revealAllowed`). Playground ref: `playground/ex-basic.jsx` (TrueFalseV2, `taskOver`). |
| MM-01 | `v2/mc-math-v2.tsx` | Same bug, same gate. Playground ref: `playground/ex-math.jsx` (McMathV2). |
| TP-01 | `v2/table-pattern-v2.tsx` | Rule input renders `placeholder={ruleDisplay}` — **the literal answer**. Replace with a neutral `ruleExample` prop ("like: 3x − 2") + caption listing accepted formats. |
| XC-07 | repo-wide | Lint rule: no answer-derived strings in `placeholder`, `title`, `aria-label`, or data attributes. |

## §3 · Unsolvable / unfair configurations 🔴

| ID | File | Fix |
|---|---|---|
| NI-02 | `v2/numeric-input-v2.tsx` | Pad has no minus key → negative answers impossible. Add ± key (sign toggle). |
| NI-03 | `v2/numeric-input-v2.tsx` | Sanitise input: comma → dot (RU decimal habit), one dot max, digits + leading minus only. |
| NL-03 | `v2/number-line-v2.tsx` | Marker starts at range midpoint → free win when target IS the midpoint. Offset start by one step when it coincides. |
| NL-04 | `v2/number-line-v2.tsx` | `canCheck` always true → reward for doing nothing. Require `moved`. |
| AP-01 | `v2/arithmetic-puzzle-v2.tsx` | Used-state computed by value → duplicate bank numbers grey out together; puzzle unsolvable. Track by bank index. Playground ref: `playground/ex-special2.jsx`. |
| SB-01 | `v2/sentence-builder-v2.tsx` | Same duplicate bug with words ("the cat saw the dog"). Tiles = `{id, word}`. Playground ref: `playground/ex-lang.jsx`. |
| EB-01 | `v2/equation-balance-v2.tsx` | Hardcoded "−4" op button is dead on most configs. Generate ops from scale state: −1, −minW, −x (when both sides have x), ÷n (when divisible). Playground ref: `playground/ex-graphs2.jsx` (EquationBalanceV2). |
| MS-02 | `v2/math-stepwise-v2.tsx` | Literal matching: "x=5.0" ≠ "x=5", ".5" ≠ "0.5", flipped sides fail. Add numeric-equivalence + side-flip compare (`stepsMatch()` in `playground/ex-math2.jsx`). |
| XM-01 | exercise config panel (authoring) | Validation rule: for every authorable answer, verify the child's input surface can physically produce it (pad keys, snap step, option set). |

## §4 · Container queries — one CSS change, every mechanic benefits 🟢

**File: `frontend/src/app/globals.css`**

| ID | Fix |
|---|---|
| SH-02 | `.lf-shell { container-type: inline-size; container-name: lesson; }` and convert the `@media (max-width: 560px)` exercise rules to `@container lesson (max-width: 560px)`. Exercises live in panes (lesson + sidebar), not viewports. Playground ref: bottom of `playground/grass.css`. |
| SH-01 | The existing mobile block targets `.lf-fb-msg`/`.lf-fb-explain` — classes that don't exist (rendered: `.lf-fb-text`/`.lf-fb-sub`). Fix the selectors. |
| SH-03 | `.lf-fb-row { flex-wrap: wrap }` + CTA `flex-basis: 100%` under 560 px — feedback sheet stacks, thumb-size button. |
| SH-08 | `gp-fall` keyframe translates fixed 560 px → confetti dies mid-air in tall panes. Use `110cqh`. |
| GX-01 | All graph mechanics: drop `width={380}`-style fixed SVG sizes → `viewBox` + `width:100%`; side panels via `.gx-layout` grid that stacks `≤560px`. Pointer math through `getBoundingClientRect` ratio. Files: `coordinate-plane`, `function-graph`, `graph-transform`, `inequality-graph`, `scatter-plot` + shared `_grid-axes.tsx`. |
| MT-02 | `v2/matching-v2.tsx`: column gap `clamp(28px, 12cqw, 80px)` instead of fixed 80 px. |
| RD-01 | `v2/reading-v2.tsx`: passage\|question grid stacks (passage above) `≤560px`; passage keeps its own bounded scroll. |
| CW-04 | `v2/crossword-v2.tsx`: cell size as CSS var `--cw` (44 px → 38 px narrow). |
| AM-01 | `v2/area-model-v2.tsx`: clamp proportional column ratios (max 2.4:1) + `minmax(64px, …fr)` floor + horizontal scroll fallback; `white-space:nowrap` on "50 × 4" labels. |
| TW-02 | `v2/two-way-table-v2.tsx`: `minmax(72px,100px)` label col, `minmax(56px,1fr)` cells. |
| CS-05 / SR-02 / BS-01 / MM-03 | card-sort columns, flashcard rating buttons, bubble-sheet options, mc-math options: hard `repeat(N,1fr)` → `repeat(auto-fit, minmax(<floor>, 1fr))`. |
| CC-02 / RB-02 | code-challenge panes + robot grid/editor stack `≤560px` (`.cc-grid`); robot cells fluid via `aspect-ratio`. |
| DG-03 | `v2/dialogue-v2.tsx`: bubble `max-width: min(340px, 78cqw)`. |
| SR-05 | `v2/srs-flashcard-v2.tsx`: card front `clamp(34px, 13cqw, 58px)` + `overflow-wrap:anywhere`. |
| NI-01 | `v2/numeric-input-v2.tsx`: pad keys ≥48 px tall with press physics + real disabled state. |
| VD-01 / TW-01 / AM-02 | venn/table/area inputs: ≥40 px, `inputMode="numeric"`, sanitised. |

## §5 · Shared LessonShell upgrades

**File: `frontend/src/components/lesson/lesson-shell.tsx`** (playground ref: `playground/shell.jsx`)

| ID | Fix |
|---|---|
| SH-04 🔵 | Feedback sheet: `role="status"` + `aria-live="assertive"` on the result row. |
| SH-05 🟡 | Hearts render as icon row (filled/empty) when `maxHearts ≤ 5`; loss animation on the specific heart. Upstream discards `maxHearts` (`void maxHearts`). |
| SH-06 🟡 | Blocked Check press: wiggle (`fb-shake`) + one-line tooltip hint (`checkHint` prop, e.g. "Pick an answer first"). |
| SH-07 🟡 | Hide Skip when no handler (currently renders a permanently disabled ghost button). |
| FIX-06 🟡 | Third feedback kind `meh` (grey, wifi icon, `.lf-bottom.notice`): network/config failures. Never consumes hearts, never resets streak, preserves the child's answer. Used by every server-graded mechanic. |
| FIX-08 🟡 | `checking` state: spinner + "Checking…" on the Check button during async grading. |
| FIX-10 🟡 | Structured reveal: `feedback.correctList: [left, right][]` renders as a scrollable two-column list (`.lf-reveal`), replacing run-on strings (MT-03, CT-04, MS-05, CS-03, VD-04, CP-04, AP-04). |
| XC-05 🟡 | Streak pill lights up (sun tones) when streak > 0. |
| SH-09 🟡 | Mount `#xp-anchor` + wire `flyXP()` into the success sheet (exists unused in `fb-motion.ts`). |
| XC-03 🔵 | `fb-motion.ts`: guard `flyClone`/`flyXP` with `prefers-reduced-motion` (instant commit, no clone). |

## §6 · Keyboard & a11y paths 🔵

| ID | File | Fix |
|---|---|---|
| MT-01 | `v2/matching-v2.tsx` | Enter/Space picks a tile; Enter on the other column pairs (mirror of click-click). |
| OR-02 | `v2/ordering-v2.tsx` | Focused row: ↑/↓ moves one slot; visible arrow buttons on focus; aria-live announces position. |
| CT-01 | `v2/categorize-v2.tsx` | Chips are divs → buttons; tap/Enter-to-arm → tap/Enter-a-bucket. |
| QZ-02 / MM-04 | quiz, mc-math | Number keys 1–9 select; index hints on tiles. |
| TF-02key | true-false | T/F and ←/→ select. |
| NL-01 | number-line | Marker = `role="slider"`, ←/→ step, Home/End, value bubble flash. |
| CP-03 / SP-02 / GX-05 | coordinate-plane, scatter | SVG draggables focusable (`role="button"`), arrow keys move one unit, focus ring on circle. |
| SR-01 | srs-flashcard | Space/Enter flips (real button + `aria-pressed`), 1–4 rate. |
| CW-01/02 | crossword | Typing auto-advances along the active word; Backspace walks back; arrows move; tapping a crossing cell toggles direction; clue list ↔ grid sync. |
| FB-02 / OR-02 / CT-aria | fill-blanks, ordering, categorize, card-sort, venn-elements | Visually-hidden `aria-live` region announcing place/remove/move. |
| MS-03 / CJ-01 | math-stepwise, conjugation | Real `<label for>` per row; `autocapitalize="none" spellcheck="false"` on language inputs. |
| FU-05 | file-upload | Drop zone div → button. |
| CC-01 | code-challenge | Tab inserts 2 spaces, keeps caret (don't let it move focus). |

## §7 · Per-mechanic behavior fixes 🟡

### Batch 1 — basics
- **QZ-01 / MM-05** quiz, mc-math: eliminated wrong picks stay struck out + disabled across retries (`.gp-tile.eliminated`).
- **QZ-03** quiz: selection dot ≠ correct ✓ (filled dot for selection; ✓ only on grading).
- **QZ-04** quiz: friendly empty state for zero-question config.
- **QZ-05** quiz: sans for prose options, mono reserved for math/code.
- **MT-04** matching: default attempts `min(3, pairs.length)` — not `pairs.length`.
- **MT-05** matching (proposed): on coarse pointers hint "tap to connect"; chunk >6 pairs.
- **CT-02** categorize instant mode: wrong drop = inline bucket shake + heart, full sheet only at 0 hearts.
- **CT-03** categorize: bucket titles 14 px sans bold + color swatch (was 10 px grey mono).
- **CT-05** categorize: bucket row `repeat(auto-fit, minmax(150px,1fr))`.
- **FB-01** fill-blanks: empty slots = visible dashed wells with "· · ·" / "here!" when armed (upstream: transparent text + lone "·").
- **FB-04** fill-blanks: one opacity source for used pills (locked 0.55 × inline 0.25 ≈ invisible).
- **TF-02** true-false (proposed): default 1 attempt — a retry on binary = guaranteed pass; spend the moment on `explain`.

### Batch 2 — math
- **NI-04** numeric-input: aria-labels on field and pad keys; labelled full-width delete key.
- **NI-06** numeric-input: hint card pulses after a wrong attempt + sheet nudge.
- **NL-02** number-line: tick labels thin automatically (~44 px budget, keep 0 and ends).
- **NL-05** number-line: miss hint gives direction only ("try further right").
- **ES-01/03/04** equation-solver: hearts wired (wrong pick costs one + eliminates option), step progress "2 / 3" in top bar, shared `fb-shake` instead of private keyframes (ES-02).
- **MS-01** math-stepwise: correct lines lock green on retry; focus first wrong line.
- **MM-02** (proposed): `--font-math` token instead of hardcoded Times New Roman.

### Batch 3 — language
- **TR-01** translation: normalise case / terminal punctuation / repeated spaces / typographic apostrophes.
- **TR-03** translation: edit-distance-1 near-miss = free neutral "Sooo close" sheet.
- **TR-02** translation: success sheet teaches alternates ("Also fine: …").
- **TR-04** translation: autosizing textarea; Enter checks, Shift+Enter newline.
- **CJ-02/03/04** conjugation: rows lock on retry; accent-insensitive grading w/ coaching ("watch the accents — 2 missing", accented forms filled in green); Enter advances.
- **SB-02/04/06** sentence-builder: tap placed word returns just it; flyClone bank↔strip; longest-correct-prefix hint.
- **DG-01** dialogue: `scrollTop` on the log — **never `scrollIntoView`** (scrolls the host app).
- **DG-02/04/05** dialogue: 900 ms typing dots; wrong reply lands → shakes coral → lifts back out + struck from options; `role="log"` aria-live.
- **RD-03/04** reading: multi-question flow with step progress; eliminated options persist; "Look back at the story" copy.
- **CW-03/05** crossword: correct letters lock on retry ("14 of 17 right"); failure reveal = dashed-green ghost letters, not all-coral.
- **XL-01..03** (proposed): keyboard-overlap handling (`scrollPaddingBottom`), locale-aware normalisation (ё ≡ е), Web Speech TTS button (`.fb-speak` CSS ready).

### Batch 4 — cards & tables
- **CS-02/03/06** card-sort: retry locks correct + bounces wrong to bank; structured reveal; placed cards tappable to return.
- **SR-03** srs-flashcard: "Again" re-queues the card ~3 positions later; progress dots mark lapses coral; completion copy explains.
- **SR-06** flashcard hover-flip teaser (8° rotateY) guarded for reduced motion.
- **VD-03/04/05** venn-numbers: typing clears stale red marks; reveal uses human region names; Enter checks.
- **VE-02/04/05** venn-items: bigger visible drop zones; human names in reveal (`a_only` → "A only"); retry locks/bounces.
- **TW-03/06** two-way-table: "Hint · undefined" → conditional; locks + partial counts; Enter hops to next empty cell.
- **TP-02/03** table-pattern: rule normalisation strips `f(x)=`/`y=`/`*`; "numbers right, rule wrong" message split; editing clears the red state.
- **AM-04** area-model: locks on retry; "every box right, addition slipped" message.

### Batch 5 — graphs
- **GX-03** all: Check unlocks on first interaction (was free everywhere).
- **GX-04** all multi-control: misses name the off dials, not directions (slope vs intercept; "3 of 4 settings right").
- **CP-01** coordinate-plane: points start spread along the bottom (were stacked at (0,0)).
- **CP-06** coordinate-plane: correct points lock; dashed pulsing target rings for missed ones.
- **IG-03** inequality: `signed()` formatter — no more "2x + -3".
- **FM-01/02/04** function-machine: sanitised decimal input; rule normalisation; duplicate-input nudge; method hint on wrong guess.
- **PW-01/02/03** probability-wheel: "×5 quick" bulk spin after 3 singles; phase-narrating status line under the tally; teachable-moment success copy when the winner isn't the biggest slice.
- **EB-02/03/04** equation-balance: Check needs ≥1 move; undo stack + move-history chips; disabled ÷ explains itself.
- **SP-05** scatter: miss teaches the heuristic (equal dots above/below).

### Batch 6 — special
- **CC-05** code-challenge: failing visible tests print `expected … · got …` (data already in the result type).
- **CC-06** code-challenge: Run spinner inline; Submit via shell `checking`.
- **RB-01** robot-2d: wall hit = shake + "BONK!" chip + abort with message (was silent clamp).
- **RB-04** robot-2d: executing block highlights during the run.
- **RB-03** robot-2d: step count = +/− steppers inside the block (was 36 px number input).
- **RB-06** (proposed): block reorder (drag or ↑/↓).
- **AP-02/03** arithmetic-puzzle: tap slot to clear; retry locks/bounces.
- **BS-02** bubble-sheet: kept-correct picks lock visibly green with ✓ badge on retry.
- **MP-02/03/05** map-pin: compass hint on miss; kid-friendly copy (no percent coordinates); final reveal draws target pin + dashed tolerance ring.
- **FU-01/02/04** file-upload: validate dropped files against `accept` (friendly sun-toned nudge); simulated/real progress bar in the file card; KB/MB size formatting; upload failure = neutral meh sheet, file preserved.
- **SC-01** scorm: Back button; progress = furthest slide seen.

---

## Verification checklist (per fix)

1. Reproduce the issue in production at 320/390/768/desktop widths.
2. Open the same mechanic + scenario in `Exercise Playground.html`, confirm intended behavior.
3. Apply the fix; verify: touch (real device or DevTools touch emulation), keyboard-only run,
   screen-reader announcement where applicable, reduced-motion mode, RU strings (+30% length).
4. Confirm no answer is reachable in DOM (placeholders, ARIA, data attrs) before task end.
