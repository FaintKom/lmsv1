# GrassLMS — Module "Journal" (pages & functionality)

_Status: Phase 1 shipped to prod. Phase 2 (Curriculum) planned, not started._
_Prototype: `journal-prototype.html` in this folder (open in a browser)._

---

## ✅ DONE — Phase 1 (live on prod)

### `/admin/journal` — unified module (teacher + admin/methodist), 4 tabs

#### Tab "Today" (default) — daily agenda
- All lessons for the date across EVERY course (from the schedule), sorted by time.
- Row: time · course · 📍room / 🎥 online · **inline topic field** (saves on blur) · attendance `● 18/20` or `○ not marked` · "Take attendance" button · "Join" (online).
- Date stepper (‹ ›, Today).
- Admin/methodist filters: course + teacher (whole org). Teacher sees own courses only.
- One `/journal/today` request, no N+1.

#### Tab "Register" — attendance matrix (read-only)
- Course picker → table students × dates, cell color = status (P/L/A/E), header = date + topic, Σ present/total.
- Export CSV.
- Marking happens in Today/detail (matrix = overview/history).

#### Tab "Rooms" — room board (admin)
- Grid rooms × time for the date; occupied cell green with course; **conflict red + ⚠**; utilization % column.
- Date stepper, legend.

#### Tab "⚙ Setup" — configuration (admin)
- Weekly timetable: course slots (day · time · **room dropdown** · 🎥 online · delete) + "Add slot"; on room overlap → **409 clash → "Save anyway"** (force); "Generate journal days" (date range).
- Rooms (organization): list (name · capacity · site) + add/edit/delete; controls hidden for non-managers.

### Session detail (slide-over, not a standalone page)
- Held toggle · topic · notes · attendance (mark-all + P/L/A/E segments) · "Activity that day" (student names link to their profile) · Save.

### Student (kept as-is, read-only)
- `/schedule` — own weekly timetable (+ Join online).
- `/attendance` — own attendance record.

### Removed (folded into Journal)
- `/admin/schedule`, `/admin/attendance` → 404.

### Backend (Phase 1)
- `rooms` table + CRUD; `schedule_slots.room_id` + clash detection (409 / `?force=true`).
- `GET /journal/today`, `GET /journal/room-board`.
- 516 backend tests, 64 frontend tests, ruff/tsc/build clean.

---

## 🔜 NEEDED

### Phase 2 — Curriculum ("are topics on track?") — NOT started
New "Curriculum" tab in Journal (admin):
- **scope & sequence model**: ordered planned topics/units per course (+ target pacing/dates) — NEW DB entity.
- link a session's actual topic → planned topic.
- **pacing board**: course × progress bar (e.g. 7/20), badge on-track / behind / ahead, next topic.
- scope-&-sequence expand per course (covered / when / what's next).
- detail panel hint: "planned topic vs actual".

### Small tails
- **Methodist teacher filter** (Today): currently empty (`/admin/users` is admin-only) — needs an org-members source methodists can call.
- **Register editable** (v2): mark directly in matrix cells, not only Today/detail.
- **Rooms**: no capacity warning (students > capacity) or multi-site filter yet (clash works; rest optional).

---

## Commits (Phase 1)
- `a94d0a6` — backend: rooms + clash + /journal/today + room-board
- `e4b8de9` — frontend core: Today + Register + session detail + nav fold
- `69e0e1b` — frontend admin: Rooms board + Setup + remove old pages
