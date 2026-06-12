// admin-shell.jsx — admin/coordinator chrome for the Journal module +
// shared primitives + a coherent demo dataset (Russian school).
// Reuses GrassLMS tokens + window.Icon. Load AFTER shell.jsx + cabinet-icons.jsx.

const { useState: useS, useMemo: useM, useRef: useR, useEffect: useE } = React;

// ── extra icons not in the base set ────────────────────────────────
Object.assign(window.Icon, {
  ChevronLeft: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
  Users: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Building: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01"/></svg>,
  CalendarRange: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 15h2M14 15h2"/></svg>,
  Route: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>,
  Video: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4Z"/></svg>,
  Pin: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.4"/></svg>,
});

// ── primitives ─────────────────────────────────────────────────────
function Card({ children, style, pad = 20, className = "" }) {
  return <div className={className} style={{ background: "var(--paper-2)", border: "1px solid var(--ink-100)", borderRadius: 16, boxShadow: "var(--shadow-sm)", padding: pad, ...style }}>{children}</div>;
}
function Eyebrow({ children, style }) {
  return <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--ink-400)", ...style }}>{children}</div>;
}
function Pill({ children, bg, fg, style }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: bg, color: fg, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, lineHeight: 1.3, ...style }}>{children}</span>;
}
// status tokens for attendance
const ST = {
  present: { k: "П", label: "Присутствовал", cell: "var(--green-100)", text: "var(--green-800)", dot: "var(--green-600)" },
  late:    { k: "О", label: "Опоздал",        cell: "var(--sun-100)",   text: "var(--sun-700)",   dot: "var(--sun-500)" },
  absent:  { k: "Н", label: "Отсутствовал",   cell: "var(--coral-50)",  text: "var(--coral-700)", dot: "var(--coral-500)" },
  excused: { k: "У", label: "Уважительная",   cell: "var(--ink-100)",   text: "var(--ink-500)",   dot: "var(--ink-300)" },
};
const ST_ORDER = ["present", "late", "absent", "excused"];

// ── admin shell (sidebar + main) ───────────────────────────────────
function AdminShell({ active = "journal", children, role = "Координатор", scroll = true, onNav }) {
  const NAV = [
    { key: "today",    label: "Сегодня",      I: window.Icon.LayoutDashboard },
    { key: "journal",  label: "Журнал",        I: window.Icon.ClipboardList },
    { key: "pacing",   label: "Программа",      I: window.Icon.Route },
    { key: "schedule", label: "Расписание",     I: window.Icon.CalendarRange },
    { key: "rooms",    label: "Кабинеты",       I: window.Icon.Building },
  ];
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: "var(--paper)", fontFamily: "var(--font-sans)", color: "var(--ink-900)", overflow: "hidden" }}>
      <aside style={{ width: 200, flexShrink: 0, background: "var(--ink-900)", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: "var(--green-500)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 17, position: "relative" }}>
            g<span style={{ position: "absolute", bottom: 4, right: 5, width: 4, height: 4, borderRadius: 999, background: "var(--sun-400)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", letterSpacing: "-0.01em" }}>GrassLMS</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)" }}>Администрирование</div>
          </div>
        </div>
        <nav style={{ flex: 1, overflow: "auto", padding: "12px 12px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)", padding: "0 10px 8px" }}>Журнал</div>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((it) => {
              const a = it.key === active;
              return (
                <li key={it.key}>
                  <a onClick={() => onNav && onNav(it.key)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: 9, background: a ? "var(--green-600)" : "transparent", color: a ? "#fff" : "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
                    <it.I s={17} sw={2} /><span>{it.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 8px" }}>
            <div style={{ width: 28, height: 28, borderRadius: 999, background: "var(--green-400)", color: "var(--green-900)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12 }}>А</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Анна Кравцова</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "rgba(255,255,255,0.5)" }}>{role}</div>
            </div>
          </div>
        </div>
      </aside>
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: scroll ? "auto" : "hidden" }}>
        {children}
      </main>
    </div>
  );
}

// page header inside main
function PageHead({ title, sub, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, padding: "22px 26px 0" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</h1>
        {sub && <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-500)" }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

// generic select-looking control (display only)
function FauxSelect({ children, icon, active }) {
  return (
    <button style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--ink-100)", background: active ? "var(--green-50)" : "var(--paper-2)", color: active ? "var(--green-800)" : "var(--ink-700)", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
      {icon}{children}
      <window.Icon.ChevronRight s={13} style={{ transform: "rotate(90deg)", opacity: 0.5 }} />
    </button>
  );
}

// ── DEMO DATA ───────────────────────────────────────────────────────
const ROOMS = [
  { id: "r7",  name: "Каб. 7",  kind: "offline", cap: 24, site: "Корпус А", color: "var(--green-500)" },
  { id: "r2",  name: "Каб. 2",  kind: "offline", cap: 20, site: "Корпус А", color: "var(--green-400)" },
  { id: "r5",  name: "Каб. 5",  kind: "offline", cap: 18, site: "Корпус А", color: "var(--sun-400)" },
  { id: "lab", name: "Лаб. 1",  kind: "offline", cap: 12, site: "Корпус Б", color: "var(--coral-500)" },
  { id: "z1",  name: "Zoom-1",  kind: "online",  cap: 30, site: "Онлайн",   color: "var(--info)" },
  { id: "z2",  name: "Zoom-2",  kind: "online",  cap: 30, site: "Онлайн",   color: "#7c5cff" },
];

const STUDENTS_3A = ["Алёна Петрова", "Максим Орлов", "Лиза Чен", "Тимур Хан", "Соня Маркова", "Дима Луч", "Катя Белова", "Артём Гиль", "Нина Краб", "Олег Серый", "Вера Линд", "Паша Тон"];

// deterministic attendance grid for a group across N dates
function makeGrid(students, dates, seed = 1) {
  let x = seed * 9301 + 49297;
  const rnd = () => (x = (x * 9301 + 49297) % 233280) / 233280;
  return students.map(() => dates.map(() => {
    const v = rnd();
    if (v > 0.88) return "absent";
    if (v > 0.80) return "late";
    if (v > 0.76) return "excused";
    return "present";
  }));
}

const DATES = [
  { d: "02.06", topic: "Дроби — введение", wd: "Пн" },
  { d: "04.06", topic: "Эквив. дроби", wd: "Ср" },
  { d: "06.06", topic: "Сравнение дробей", wd: "Пт" },
  { d: "09.06", topic: "Сложение дробей", wd: "Пн" },
  { d: "11.06", topic: "Вычитание", wd: "Ср" },
  { d: "13.06", topic: "Смешанные числа", wd: "Пт" },
  { d: "16.06", topic: "Десятичные", wd: "Пн" },
  { d: "18.06", topic: "Округление", wd: "Ср" },
];

// curriculum topics for Math 3A course
const CURRICULUM = [
  { pos: 1,  title: "Натуральные числа",   lessons: 2, done: true,  date: "12.05" },
  { pos: 2,  title: "Разряды и классы",     lessons: 2, done: true,  date: "16.05" },
  { pos: 3,  title: "Сложение / вычитание", lessons: 3, done: true,  date: "23.05" },
  { pos: 4,  title: "Умножение",            lessons: 2, done: true,  date: "28.05" },
  { pos: 5,  title: "Деление",              lessons: 2, done: true,  date: "30.05" },
  { pos: 6,  title: "Делители и кратные",   lessons: 2, done: true,  date: "02.06" },
  { pos: 7,  title: "Дроби — введение",     lessons: 2, current: true, date: "06.06" },
  { pos: 8,  title: "Эквивалентные дроби",  lessons: 2, next: true },
  { pos: 9,  title: "Сравнение дробей",     lessons: 2 },
  { pos: 10, title: "Десятичные дроби",     lessons: 3 },
  { pos: 11, title: "Проценты",             lessons: 2 },
  { pos: 12, title: "Итоговый проект",      lessons: 1 },
];

// groups for pacing board + scheduler
const GROUPS = [
  { id: "m3a",  name: "Математика 3А",  teacher: "Е. Орлова",  room: "r7",  kind: "offline", covered: 7,  total: 12, status: "ontrack", next: "Эквивалентные дроби", color: "var(--green-500)" },
  { id: "py1",  name: "Python Junior",  teacher: "И. Соколов", room: "lab", kind: "offline", covered: 4,  total: 15, status: "behind",  next: "Циклы while", drift: 2, color: "var(--coral-500)" },
  { id: "en1",  name: "Английский B1",  teacher: "М. Лебедева",room: "r2",  kind: "offline", covered: 11, total: 12, status: "ahead",   next: "Повторение", color: "var(--sun-400)" },
  { id: "rob",  name: "Робототехника",  teacher: "Д. Ким",     room: "lab", kind: "offline", covered: 5,  total: 10, status: "ontrack", next: "Датчики", color: "var(--green-400)" },
  { id: "chs",  name: "Шахматы 2",      teacher: "А. Гущин",   room: "r5",  kind: "offline", covered: 6,  total: 14, status: "behind",  next: "Эндшпиль", drift: 1, color: "var(--ink-400)" },
  { id: "des",  name: "Дизайн онлайн",  teacher: "К. Реш",     room: "z1",  kind: "online",  covered: 8,  total: 12, status: "ontrack", next: "Типографика", color: "var(--info)" },
];
const STATUS_META = {
  ontrack: { label: "Идёт ровно", bg: "var(--green-50)",  fg: "var(--green-800)", bar: "var(--green-600)", dot: "var(--green-600)" },
  behind:  { label: "Отстаёт",    bg: "var(--coral-50)",  fg: "var(--coral-700)", bar: "var(--coral-500)", dot: "var(--coral-500)" },
  ahead:   { label: "Опережает",  bg: "var(--sun-50)",    fg: "var(--sun-700)",   bar: "var(--sun-500)",   dot: "var(--sun-500)" },
};

// week schedule blocks: day(0=Mon..5=Sat), start hour, duration(h), group id, room
const WEEK_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const SCHEDULE = [
  { day: 0, start: 9,  dur: 1, g: "m3a", room: "r7" },
  { day: 0, start: 13, dur: 1.5, g: "en1", room: "r2" },
  { day: 0, start: 15, dur: 1, g: "des", room: "z1" },
  { day: 1, start: 10, dur: 1.5, g: "py1", room: "lab" },
  { day: 1, start: 11, dur: 1, g: "rob", room: "lab" },   // overlaps py1 in Лаб.1 → пересечение
  { day: 1, start: 16, dur: 1, g: "chs", room: "r5" },
  { day: 2, start: 9,  dur: 1, g: "m3a", room: "r7" },
  { day: 2, start: 13, dur: 1.5, g: "en1", room: "r2" },
  { day: 3, start: 10, dur: 1, g: "py1", room: "lab" },
  { day: 3, start: 15, dur: 1, g: "des", room: "z1" },
  { day: 4, start: 9,  dur: 1, g: "m3a", room: "r7" },
  { day: 4, start: 11, dur: 1, g: "rob", room: "lab" },
  { day: 4, start: 13, dur: 1.5, g: "en1", room: "r2" },
  { day: 5, start: 10, dur: 2, g: "chs", room: "r5" },
];

const groupById = (id) => GROUPS.find((g) => g.id === id);
const roomById = (id) => ROOMS.find((r) => r.id === id);

// ── TODAY agenda + rosters + per-student activity ──────────────────
const TODAY_LABEL = "Понедельник · 2 июня 2026";
const TODAY_SESSIONS = [
  { id: "s1", time: "09:00–10:00", gid: "m3a", topic: "Дроби — введение",   present: 11, total: 12, held: true },
  { id: "s2", time: "10:00–11:30", gid: "py1", topic: "Циклы while",        total: 12, held: false },
  { id: "s3", time: "11:30–12:30", gid: "rob", topic: "Датчики",            total: 8,  held: false },
  { id: "s4", time: "13:00–14:30", gid: "en1", topic: "Present Perfect",     present: 9, total: 10, held: true },
  { id: "s5", time: "15:00–16:00", gid: "des", topic: "Типографика",         total: 14, held: false },
];

const ROSTERS = {
  m3a: STUDENTS_3A,
  py1: ["Гриша Ким", "Соня Лю", "Ваня Рог", "Аня Цой", "Лёва Дин", "Маша Б.", "Игорь П.", "Даша Н."],
  rob: ["Костя Лав", "Юля Мин", "Рома Сей", "Тимур О.", "Влад К.", "Ника Р."],
  en1: ["Алина В.", "Борис Ч.", "Вера С.", "Глеб М.", "Даша Е.", "Егор Т.", "Жанна П.", "Зоя Л.", "Иван Ф.", "Ким А."],
  des: ["Лана О.", "Марк В.", "Ника Ш.", "Олег Б.", "Полина К.", "Рита Д.", "Стас Ю.", "Тоня Г."],
};

// exercise result meta
const RES = {
  done:    { label: "пройдено", dot: "var(--ink-300)",   bg: "var(--ink-50)",    fg: "var(--ink-500)" },
  correct: { label: "верно",     dot: "var(--green-600)", bg: "var(--green-50)",  fg: "var(--green-800)" },
  partial: { label: "частично",  dot: "var(--sun-500)",   bg: "var(--sun-50)",    fg: "var(--sun-700)" },
  wrong:   { label: "ошибка",     dot: "var(--coral-500)", bg: "var(--coral-50)",  fg: "var(--coral-700)" },
  skipped: { label: "пропущено", dot: "var(--ink-200)",   bg: "var(--ink-50)",    fg: "var(--ink-400)" },
};

// templated lessons for a student's day (deterministic variety by name)
function buildStudentDay(name) {
  let seed = 0; for (const ch of (name || "x")) seed += ch.charCodeAt(0);
  const rnd = (i) => ((seed * 9301 + i * 49297) % 233280) / 233280;
  const v = (i, partialName) => {
    const x = rnd(i);
    if (x > 0.86) return "wrong";
    if (x > 0.66) return "partial";
    return "correct";
  };
  const mathEx = [
    { title: "Что такое дробь?",          type: "Теория",    result: "done" },
    { title: "Определи дробь по картинке", type: "Выбор",     result: v(1), items: "5/5" },
    { title: "Заштрихуй 3/4",             type: "Интерактив", result: v(2), items: "3/3" },
    { title: "Сравни дроби",              type: "Ввод",      result: v(3), items: "3/5" },
    { title: "Мини-тест по теме",          type: "Тест",      result: v(4), items: "8/10" },
  ];
  const enEx = [
    { title: "Грамматика: Present Perfect", type: "Теория", result: "done" },
    { title: "Послушай и выбери",           type: "Аудио",  result: v(5), items: "4/4" },
    { title: "Составь предложение",         type: "Слова",  result: v(6), items: "3/4" },
    { title: "Переведи фразы",              type: "Ввод",   result: v(7), items: "2/3" },
  ];
  const skip = rnd(9) > 0.8; // sometimes skipped the 2nd lesson
  const lessons = [
    { gid: "m3a", time: "09:00–10:00", topic: "Дроби — введение", attendance: "present", ex: mathEx },
    { gid: "en1", time: "13:00–14:30", topic: "Present Perfect", attendance: skip ? "absent" : "present", ex: skip ? [] : enEx },
  ];
  return lessons;
}
// score a lesson's exercises
function lessonStats(ex) {
  const graded = ex.filter((e) => e.items);
  let got = 0, max = 0;
  graded.forEach((e) => { const [a, b] = e.items.split("/").map(Number); got += a; max += b; });
  return { done: ex.length, correctPct: max ? Math.round(got / max * 100) : null, got, max };
}

Object.assign(window, {
  AdminShell, PageHead, Card, Eyebrow, Pill, FauxSelect,
  ST, ST_ORDER, ROOMS, STUDENTS_3A, makeGrid, DATES, CURRICULUM,
  GROUPS, STATUS_META, WEEK_DAYS, HOURS, SCHEDULE, groupById, roomById,
  TODAY_LABEL, TODAY_SESSIONS, ROSTERS, RES, buildStudentDay, lessonStats,
});
