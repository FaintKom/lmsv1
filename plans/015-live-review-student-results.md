# 015 — Live lesson review: student sees their own results (S7)

- **Status**: DONE (verified 2026-08-03) — shipped with the live-review work
  before this plan was written up. `lesson-review.tsx` renders the "My results"
  card for `!teacherView`, and the backend goes further than the plan asked:
  `_own_results_only()` in `live_lessons/router.py` strips other students' rows
  and class attendance server-side, so the payload itself never carries them.
  All three i18n keys exist in the six locales.
- **Commit**: a01d106
- **Severity**: MEDIUM (UX gap from the 2026-08-02 audit)
- **Category**: live lessons
- **Estimated scope**: 1 component (~60 lines), no backend change

## Problem

After a live lesson ends, the student review
(`frontend/src/components/live/lesson-review.tsx`, rendered WITHOUT
`teacherView`) shows the board snapshot and scene timeline, but NOT the
student's own exercise outcomes. The class-wide Results grid is
teacher-only by design (`teacherView` prop gates it) — students currently
get no personal summary at all.

The data already exists: `lesson.summary.results` is a list of
`{exercise_id, title, students: [{id, name, attempts, passed, score}]}`
(built by `_lesson_results()` in `backend/app/live_lessons/service.py`).
The state endpoint returns the full lesson (with summary) to MEMBERS as
well as the teacher — verify this by reading the state endpoint in
`backend/app/live_lessons/router.py`; if summary is teacher-gated there,
STOP and report (backend change would be needed and must be reviewed).

The current student's id is available the same way the lesson page gets it —
read `frontend/src/app/(dashboard)/lesson/[lessonId]/page.tsx` for how it
identifies the user (auth store: `useAuthStore((s) => s.user)`).

## Target

In `lesson-review.tsx`, when NOT `teacherView` and
`lesson.summary?.results?.length > 0`, render a "My results" card between
the board snapshot and the timeline:

- Card chrome: `rounded-lg border border-border bg-paper-2 p-6 shadow-sm`.
- Title row: `.eyebrow` label with i18n key `live.myResults`.
- One row per exercise in `summary.results` where
  `students.some(s => s.id === currentUserId)`:
  - exercise `title` (text-sm font-bold text-text)
  - the student's own entry: passed → `bg-green-100 text-green-800` pill
    with score `%`; failed → `bg-clay-50 text-clay-700` pill; attempts
    count in `text-xs text-text-muted tabular-nums`
    (i18n `live.attemptsN` with `{n}`).
- If the student appears in NO exercise: show one muted line
  `live.noAttempted` instead of an empty card.
- NEVER render other students' entries in student mode.

i18n — add to ALL SIX locales (`frontend/src/lib/i18n/locales/*.ts`):

| key | en | ru |
|---|---|---|
| `live.myResults` | My results | Мои результаты |
| `live.attemptsN` | {n} attempts | Попыток: {n} |
| `live.noAttempted` | You didn't submit any tasks this lesson. | В этом уроке ты не отправлял решений. |

es: Mis resultados / Intentos: {n} / No enviaste tareas en esta lección. ·
tr: Sonuçlarım / Deneme: {n} / Bu derste görev göndermedin. ·
de: Meine Ergebnisse / Versuche: {n} / Du hast in dieser Stunde keine
Aufgaben abgegeben. · uk: Мої результати / Спроб: {n} / На цьому уроці ти
не надсилав рішень.

## Repo conventions to follow

- The teacher Results grid inside the same file is the layout exemplar —
  reuse its row/pill styling, filtered to one student.
- `useTranslation()` for all strings; keys in all six locales in the SAME
  edit (CI parity test).
- Auth: `useAuthStore((s) => s.user)` from `@/stores/auth-store`.

## Steps

1. Read `lesson-review.tsx` fully; locate the `teacherView` gate and the
   Results grid.
2. Add the student-mode "My results" block per Target.
3. Add the 3 keys ×6 locales.
4. Verification.

## Boundaries

- No backend changes (STOP-condition above if summary turns out gated).
- Do NOT show class aggregates or other students' names in student mode.
- Do NOT alter the teacher view.

## Verification

- **Mechanical**: `npx tsc --noEmit && npm test` green (parity test
  covers locales).
- **Feel check**: run a short live lesson (teacher starts, student submits
  one exercise, teacher ends): student review shows "My results" with the
  score pill; a student who submitted nothing sees the muted line; teacher
  review unchanged.
- **Done when**: student sees exactly their own outcomes, nothing else.
