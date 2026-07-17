// pacing.jsx — "движение группы по программе" (план VS факт).
// Flow: board over ALL groups → click a group → its course timeline (scope &
// sequence with drift). Back button returns to the board.

function expectedPos(g) {
  if (g.status === "behind") return Math.min(g.total, g.covered + (g.drift || 1));
  if (g.status === "ahead") return Math.max(0, g.covered - 1);
  return g.covered;
}

// per-group topic list (real names for Math 3A, themed names elsewhere)
const TOPIC_NAMES = {
  py1: ["Переменные", "Типы данных", "Ввод/вывод", "Условия", "Циклы while", "Циклы for", "Списки", "Словари", "Функции", "Строки", "Файлы", "Модули", "Классы", "Исключения", "Мини-проект"],
  en1: ["Present Simple", "Past Simple", "Future", "Present Perfect", "Модальные", "Артикли", "Предлоги", "Условные", "Пассив", "Косвенная речь", "Фразовые глаголы", "Повторение"],
  rob: ["Детали и сборка", "Моторы", "Программа-блоки", "Движение", "Датчики", "Цикл и логика", "Линия", "Препятствия", "Соревнование", "Защита проекта"],
  chs: ["Доска и фигуры", "Ходы фигур", "Шах и мат", "Дебют", "Развитие", "Рокировка", "Тактика: вилка", "Связка", "Миттельшпиль", "Размен", "Эндшпиль", "Пешечный", "Турнир", "Разбор партий"],
  des: ["Основы композиции", "Сетки", "Цвет", "Типографика", "Иконки", "Figma база", "Компоненты", "Прототип", "UX-паттерны", "Мобильное", "Портфолио", "Защита"],
};
function buildTopics(group) {
  if (group.id === "m3a") return window.CURRICULUM;
  const names = TOPIC_NAMES[group.id] || [];
  return Array.from({ length: group.total }, (_, i) => {
    const pos = i + 1;
    const t = { pos, title: names[i] || `Тема ${pos}`, lessons: 1 + (i % 3 === 0 ? 1 : 0) };
    if (pos < group.covered) return { ...t, done: true };
    if (pos === group.covered) return { ...t, current: true };
    if (pos === group.covered + 1) return { ...t, next: true, title: group.next || t.title };
    return t;
  });
}

// ── board (all groups) ─────────────────────────────────────────────
function PacingBoard({ onOpen, onNav }) {
  const groups = window.GROUPS;
  const counts = { ontrack: 0, behind: 0, ahead: 0 };
  groups.forEach((g) => counts[g.status]++);
  const KPIS = [
    { k: "ontrack", label: "Идут ровно", v: counts.ontrack, I: window.Icon.CheckCircle },
    { k: "behind",  label: "Отстают",    v: counts.behind,  I: window.Icon.AlertTriangle },
    { k: "ahead",   label: "Опережают",  v: counts.ahead,   I: window.Icon.TrendingUp },
  ];
  return (
    <window.AdminShell active="pacing" onNav={onNav}>
      <window.PageHead title="Программа · движение групп"
        sub="План программы VS реально пройденные темы"
        right={
          <div style={{ display: "flex", gap: 8 }}>
            <window.FauxSelect icon={<window.Icon.Building s={14} />}>Все филиалы</window.FauxSelect>
            <window.FauxSelect icon={<window.Icon.Filter s={14} />}>Все курсы</window.FauxSelect>
          </div>
        } />
      <div style={{ padding: "16px 26px 26px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
          {KPIS.map((x) => {
            const m = window.STATUS_META[x.k];
            return (
              <window.Card key={x.k} pad={16} style={{ display: "flex", alignItems: "center", gap: 13 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: m.bg, color: m.fg, display: "grid", placeItems: "center", flexShrink: 0 }}><x.I s={20} /></div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.02em" }}>{x.v}</div>
                  <window.Eyebrow style={{ marginTop: 3 }}>{x.label}</window.Eyebrow>
                </div>
              </window.Card>
            );
          })}
        </div>
        <window.Card pad={0}>
          <div style={{ display: "grid", gridTemplateColumns: "230px 1fr 150px 116px 28px", gap: 0, padding: "11px 20px", borderBottom: "1.5px solid var(--ink-100)", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ink-400)", fontFamily: "var(--font-mono)" }}>
            <span>Группа</span><span>Прогресс по темам</span><span>Следующая тема</span><span style={{ textAlign: "right" }}>Статус</span><span></span>
          </div>
          {groups.map((g, i) => {
            const m = window.STATUS_META[g.status];
            const exp = expectedPos(g);
            const coveredPct = g.covered / g.total * 100;
            const expPct = exp / g.total * 100;
            return (
              <div key={g.id} onClick={() => onOpen(g.id)} className="pacing-row" style={{ display: "grid", gridTemplateColumns: "230px 1fr 150px 116px 28px", gap: 0, alignItems: "center", padding: "14px 20px", borderTop: i ? "1px solid var(--ink-50)" : "none", cursor: "pointer", transition: "background 120ms" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ink-50)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                  <div style={{ width: 8, height: 34, borderRadius: 4, background: g.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-400)", fontWeight: 600 }}>{g.teacher} · {g.kind === "online" ? "онлайн" : window.roomById(g.room).name}</div>
                  </div>
                </div>
                <div style={{ paddingRight: 28 }}>
                  <div style={{ position: "relative", height: 12, borderRadius: 999, background: "var(--ink-100)" }}>
                    <div style={{ width: coveredPct + "%", height: "100%", borderRadius: 999, background: m.bar }} />
                    <div title="План на сегодня" style={{ position: "absolute", top: -4, left: `calc(${expPct}% - 1px)`, width: 2, height: 20, background: "var(--ink-700)", borderRadius: 2 }}>
                      <div style={{ position: "absolute", top: -5, left: -3, width: 8, height: 8, borderRadius: 999, background: "var(--ink-700)" }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-500)", fontFamily: "var(--font-mono)" }}>{g.covered} / {g.total} тем</span>
                    {g.status === "behind" && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--coral-700)" }}>отстаёт на {g.drift}</span>}
                    {g.status === "ahead" && <span style={{ fontSize: 11, fontWeight: 700, color: "var(--sun-700)" }}>опережает</span>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 600, paddingRight: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.next}</div>
                <div style={{ textAlign: "right" }}>
                  <window.Pill bg={m.bg} fg={m.fg}><span style={{ width: 6, height: 6, borderRadius: 999, background: m.dot }} />{m.label}</window.Pill>
                </div>
                <div style={{ display: "grid", placeItems: "center", color: "var(--ink-300)" }}><window.Icon.ChevronRight s={16} /></div>
              </div>
            );
          })}
        </window.Card>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 11.5, color: "var(--ink-400)" }}>
          <window.Icon.Route s={14} /> Нажмите на группу — откроется её лента программы курса. Метка
          <span style={{ display: "inline-flex", alignItems: "center" }}><span style={{ width: 2, height: 12, background: "var(--ink-700)" }} /><span style={{ width: 7, height: 7, borderRadius: 999, background: "var(--ink-700)", marginLeft: -4 }} /></span>
          — план на сегодня.
        </div>
      </div>
    </window.AdminShell>
  );
}

// ── timeline (one course / group) ──────────────────────────────────
function PacingTimeline({ group, onBack, onNav }) {
  const g = window.groupById(group);
  const m = window.STATUS_META[g.status];
  const topics = buildTopics(g);
  const totalLessons = topics.reduce((a, t) => a + t.lessons, 0);
  const doneLessons = topics.filter((t) => t.done || t.current).reduce((a, t) => a + t.lessons, 0);
  const currentTopic = topics.find((t) => t.current);
  const note = {
    ontrack: { I: window.Icon.CheckCircle, c: "var(--green-600)", bg: "var(--green-25)", bd: "var(--green-100)", fg: "var(--green-800)", txt: "Фактические темы занятий совпадают с планом — дрейфа нет." },
    behind: { I: window.Icon.AlertTriangle, c: "var(--coral-500)", bg: "var(--coral-50)", bd: "var(--coral-300)", fg: "var(--coral-700)", txt: `Группа отстаёт от плана на ${g.drift || 1} тем. Стоит уплотнить ближайшие занятия или назначить добор.` },
    ahead: { I: window.Icon.TrendingUp, c: "var(--sun-500)", bg: "var(--sun-50)", bd: "var(--sun-300)", fg: "var(--sun-700)", txt: "Группа идёт с опережением плана — можно добавить углублённые темы." },
  }[g.status];
  return (
    <window.AdminShell active="pacing" onNav={onNav}>
      <window.PageHead title={`Программа · ${g.name}`}
        sub="Scope & sequence · план тем и фактическое прохождение"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <window.Pill bg={m.bg} fg={m.fg}><span style={{ width: 6, height: 6, borderRadius: 999, background: m.dot }} />{m.label}</window.Pill>
          </div>
        } />
      <div style={{ padding: "12px 26px 26px" }}>
        {/* back */}
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px 6px 8px", borderRadius: 9, border: "1px solid var(--ink-100)", background: "var(--paper-2)", color: "var(--ink-500)", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
          <window.Icon.ChevronLeft s={15} /> Все группы
        </button>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
          {[
            { l: "Пройдено тем", v: `${g.covered} / ${g.total}` },
            { l: "Текущая тема", v: currentTopic ? currentTopic.title : "—", small: true },
            { l: "Занятий пройдено", v: `${doneLessons} / ${totalLessons}` },
            { l: "Темп", v: m.label, tone: g.status },
          ].map((x, i) => (
            <window.Card key={i} pad={15}>
              <window.Eyebrow>{x.l}</window.Eyebrow>
              <div style={{ fontSize: x.small ? 15 : 24, fontWeight: 800, marginTop: 4, letterSpacing: "-0.01em", color: x.tone ? window.STATUS_META[x.tone].fg : "var(--ink-900)", lineHeight: 1.1 }}>{x.v}</div>
            </window.Card>
          ))}
        </div>
        <window.Card pad={20}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Лента программы</span>
            <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--ink-500)", fontWeight: 600 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--green-500)" }} />пройдено</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--sun-400)" }} />сейчас</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 4, border: "2px dashed var(--green-300)" }} />следующая</span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--ink-100)" }} />впереди</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "stretch", marginBottom: 8 }}>
            {topics.map((t) => {
              const w = (t.lessons / totalLessons) * 100;
              let bg = "var(--ink-50)", fg = "var(--ink-400)", border = "1px solid var(--ink-100)";
              if (t.done) { bg = "var(--green-500)"; fg = "#fff"; border = "none"; }
              if (t.current) { bg = "var(--sun-400)"; fg = "var(--ink-900)"; border = "none"; }
              if (t.next) { bg = "var(--green-25)"; fg = "var(--green-800)"; border = "2px dashed var(--green-300)"; }
              return (
                <div key={t.pos} style={{ width: w + "%", minWidth: 0 }}>
                  <div style={{ height: 54, borderRadius: 10, background: bg, color: fg, border, padding: "8px 9px", display: "flex", flexDirection: "column", justifyContent: "space-between", overflow: "hidden", position: "relative" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{String(t.pos).padStart(2, "0")}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.title}</span>
                    {t.current && <div style={{ position: "absolute", top: -7, right: 6, width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "7px solid var(--sun-500)" }} />}
                  </div>
                  <div style={{ textAlign: "center", marginTop: 5, fontSize: 9.5, fontFamily: "var(--font-mono)", color: t.done ? "var(--green-700)" : "var(--ink-300)", fontWeight: 600 }}>{t.date || "—"}</div>
                </div>
              );
            })}
          </div>
          <div style={{ position: "relative", height: 26, marginTop: 4 }}>
            <div style={{ position: "absolute", left: `${(doneLessons / totalLessons) * 100}%`, top: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 2, height: 8, background: "var(--ink-700)" }} />
              <window.Pill bg="var(--ink-900)" fg="#fff" style={{ fontSize: 10 }}>сегодня</window.Pill>
            </div>
          </div>
        </window.Card>
        <window.Card pad={14} style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 11, background: note.bg, border: `1px solid ${note.bd}` }}>
          <note.I s={18} style={{ color: note.c, flexShrink: 0 }} />
          <span style={{ fontSize: 12.5, color: note.fg, fontWeight: 600 }}>{note.txt}</span>
        </window.Card>
      </div>
    </window.AdminShell>
  );
}

// ── flow wrapper: board ⇄ timeline ─────────────────────────────────
function PacingFlow({ onNav }) {
  const [sel, setSel] = React.useState(null);
  return sel
    ? <PacingTimeline group={sel} onBack={() => setSel(null)} onNav={onNav} />
    : <PacingBoard onOpen={setSel} onNav={onNav} />;
}

Object.assign(window, { PacingFlow, PacingBoard, PacingTimeline });
