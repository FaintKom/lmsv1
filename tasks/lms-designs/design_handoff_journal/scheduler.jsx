// scheduler.jsx — week planner (calendar grid) + room board with clash detection.
// Clashes are computed from data: same room + same day + overlapping time.

// ── clash detection (matches DATA_MODEL §2.1 interval rule) ────────
function computeClashes(schedule) {
  const clash = new Set();
  for (let i = 0; i < schedule.length; i++)
    for (let j = i + 1; j < schedule.length; j++) {
      const a = schedule[i], b = schedule[j];
      if (a.day === b.day && a.room === b.room && a.start < b.start + b.dur && b.start < a.start + a.dur) { clash.add(i); clash.add(j); }
    }
  return clash;
}
// greedy lane assignment within a day so overlapping blocks sit side-by-side
function layoutDay(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start);
  const cols = [];
  sorted.forEach((b) => {
    let placed = false;
    for (let c = 0; c < cols.length; c++) { if (cols[c] <= b.start + 1e-6) { b._lane = c; cols[c] = b.start + b.dur; placed = true; break; } }
    if (!placed) { b._lane = cols.length; cols.push(b.start + b.dur); }
  });
  sorted.forEach((b) => (b._lanes = cols.length));
  return sorted;
}

// ── VARIANT — week planner ─────────────────────────────────────────
function SchedulerWeek({ onNav }) {
  const ROW_H = 52;
  const sched = window.SCHEDULE.map((s, i) => ({ ...s, _i: i }));
  const clash = computeClashes(window.SCHEDULE);
  const nClash = clash.size / 2;
  return (
    <window.AdminShell active="schedule" scroll={false} onNav={onNav}>
      <window.PageHead title="Расписание · неделя"
        sub="2–7 июня 2026 · шаблон на все группы"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button style={btnIcon}><window.Icon.ChevronLeft s={16} /></button>
              <button style={{ ...btnIcon, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>Сегодня</button>
              <button style={btnIcon}><window.Icon.ChevronLeft s={16} style={{ transform: "rotate(180deg)" }} /></button>
            </div>
            <window.FauxSelect icon={<window.Icon.Filter s={14} />}>Все курсы</window.FauxSelect>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 11, border: "none", background: "var(--green-600)", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 0 0 var(--green-700)" }}>
              <window.Icon.Plus s={15} sw={2.5} />Занятие
            </button>
          </div>
        } />
      <div style={{ padding: "10px 26px 0", flexShrink: 0 }}>
        {nClash > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 11, background: "var(--coral-50)", border: "1px solid var(--coral-300)", marginBottom: 12 }}>
            <window.Icon.AlertTriangle s={17} style={{ color: "var(--coral-500)" }} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--coral-700)" }}>Найдено пересечение кабинетов: {nClash}</span>
            <span style={{ fontSize: 12, color: "var(--coral-700)" }}>Лаб. 1 · вторник — Python Junior и Робототехника в одно время</span>
            <button style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--coral-700)", background: "var(--paper-2)", border: "1px solid var(--coral-300)", borderRadius: 8, padding: "5px 11px", cursor: "pointer" }}>Показать →</button>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--ink-400)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 2 }}>Группы:</span>
          {window.GROUPS.map((g) => (
            <span key={g.id} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px 4px 8px", borderRadius: 999, background: "var(--paper-2)", border: "1px solid var(--ink-100)", fontSize: 11.5, fontWeight: 700, color: "var(--ink-700)" }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: g.color }} />{g.name}
            </span>
          ))}
        </div>
      </div>
      <div style={{ padding: "0 26px 20px", flex: 1, minHeight: 0, overflow: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "46px repeat(6, 1fr)", border: "1px solid var(--ink-100)", borderRadius: 14, overflow: "hidden", background: "var(--paper-2)" }}>
          {/* header row */}
          <div style={{ borderBottom: "1.5px solid var(--ink-100)", background: "var(--ink-50)" }} />
          {window.WEEK_DAYS.map((d, i) => (
            <div key={d} style={{ borderBottom: "1.5px solid var(--ink-100)", borderLeft: "1px solid var(--ink-50)", background: "var(--ink-50)", padding: "10px 0", textAlign: "center" }}>
              <div style={{ fontSize: 12.5, fontWeight: 800 }}>{d}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-400)", fontWeight: 600 }}>{2 + i}.06</div>
            </div>
          ))}
          {/* time gutter */}
          <div>
            {window.HOURS.map((h) => (
              <div key={h} style={{ height: ROW_H, padding: "3px 6px 0", textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-400)", fontWeight: 600 }}>{h}:00</div>
            ))}
          </div>
          {/* day columns */}
          {window.WEEK_DAYS.map((d, di) => {
            const items = layoutDay(sched.filter((s) => s.day === di));
            return (
              <div key={di} style={{ position: "relative", borderLeft: "1px solid var(--ink-50)", height: window.HOURS.length * ROW_H }}>
                {window.HOURS.map((h, hi) => (<div key={h} style={{ position: "absolute", top: hi * ROW_H, left: 0, right: 0, height: ROW_H, borderTop: hi ? "1px solid var(--ink-50)" : "none" }} />))}
                {items.map((s) => {
                  const g = window.groupById(s.g); const room = window.roomById(s.room);
                  const isClash = clash.has(s._i);
                  const laneW = 100 / s._lanes;
                  return (
                    <div key={s._i} style={{
                      position: "absolute",
                      top: (s.start - window.HOURS[0]) * ROW_H + 2,
                      height: s.dur * ROW_H - 4,
                      left: `calc(${s._lane * laneW}% + 3px)`, width: `calc(${laneW}% - 6px)`,
                      background: isClash ? "var(--coral-50)" : `color-mix(in srgb, ${g.color} 16%, var(--paper-2))`,
                      borderRadius: 8, padding: "5px 7px", overflow: "hidden",
                      borderLeft: `4px solid ${isClash ? "var(--coral-500)" : g.color}`,
                      boxShadow: isClash ? "0 0 0 1.5px var(--coral-500)" : "0 1px 3px rgba(10,26,16,.08), inset 0 0 0 1px var(--ink-100)",
                      cursor: "pointer",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {isClash && <window.Icon.AlertTriangle s={11} style={{ color: "var(--coral-500)", flexShrink: 0 }} />}
                        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2, fontSize: 9.5, color: isClash ? "var(--coral-700)" : "var(--ink-400)", fontWeight: 600 }}>
                        {room.kind === "online" ? <window.Icon.Video s={10} /> : <window.Icon.Pin s={10} />}
                        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{room.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </window.AdminShell>
  );
}
const btnIcon = { width: 32, height: 32, borderRadius: 9, border: "1px solid var(--ink-100)", background: "var(--paper-2)", color: "var(--ink-500)", display: "grid", placeItems: "center", cursor: "pointer" };

// ── VARIANT — room board (rooms × time, one day) ───────────────────
function RoomBoard({ onNav }) {
  const day = 1; // вторник — has the clash
  const sched = window.SCHEDULE.map((s, i) => ({ ...s, _i: i })).filter((s) => s.day === day);
  const clash = computeClashes(window.SCHEDULE);
  const slots = window.HOURS;
  return (
    <window.AdminShell active="rooms" onNav={onNav}>
      <window.PageHead title="Кабинеты · вторник 3 июня"
        sub="Занятость кабинетов и онлайн-комнат · детектор пересечений"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <window.Pill bg="var(--coral-50)" fg="var(--coral-700)"><window.Icon.AlertTriangle s={12} />пересечение</window.Pill>
            <window.FauxSelect icon={<window.Icon.Building s={14} />}>Все филиалы</window.FauxSelect>
          </div>
        } />
      <div style={{ padding: "18px 26px 26px" }}>
        <window.Card pad={0} style={{ overflow: "hidden" }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "var(--ink-500)", borderBottom: "1.5px solid var(--ink-100)", width: 130 }}>Кабинет</th>
                {slots.map((h) => (<th key={h} style={{ padding: "9px 0", fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, color: "var(--ink-400)", borderBottom: "1.5px solid var(--ink-100)", borderLeft: "1px solid var(--ink-50)" }}>{h}</th>))}
                <th style={{ padding: "9px 10px", fontSize: 11, fontWeight: 700, color: "var(--ink-500)", borderBottom: "1.5px solid var(--ink-100)", borderLeft: "1.5px solid var(--ink-100)", width: 64 }}>Загрузка</th>
              </tr>
            </thead>
            <tbody>
              {window.ROOMS.map((room) => {
                const inRoom = sched.filter((s) => s.room === room.id);
                const usedH = inRoom.reduce((a, s) => a + s.dur, 0);
                const util = Math.round(usedH / slots.length * 100);
                return (
                  <tr key={room.id}>
                    <td style={{ padding: "0 14px", borderBottom: "1px solid var(--ink-50)", height: 46 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 3, background: room.color, flexShrink: 0 }} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 4 }}>
                            {room.kind === "online" && <window.Icon.Video s={11} style={{ color: "var(--info)" }} />}{room.name}
                          </div>
                          <div style={{ fontSize: 9.5, color: "var(--ink-400)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{room.site} · {room.cap} мест</div>
                        </div>
                      </div>
                    </td>
                    {slots.map((h, hi) => {
                      const here = inRoom.filter((s) => s.start <= h && h < s.start + s.dur);
                      const startsHere = inRoom.find((s) => Math.floor(s.start) === h);
                      const isClash = here.some((s) => clash.has(s._i));
                      if (here.length === 0) return <td key={h} style={{ borderBottom: "1px solid var(--ink-50)", borderLeft: "1px solid var(--ink-50)" }} />;
                      // render label only at first hour of occupancy
                      return (
                        <td key={h} style={{ borderBottom: "1px solid var(--ink-50)", borderLeft: "1px solid var(--ink-50)", padding: 2 }}>
                          <div style={{ height: 34, borderRadius: 7, background: isClash ? "var(--coral-50)" : "var(--green-50)", border: isClash ? "1.5px solid var(--coral-500)" : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 3, padding: "0 4px", overflow: "hidden" }}>
                            {startsHere && <>
                              {isClash && <window.Icon.AlertTriangle s={11} style={{ color: "var(--coral-500)", flexShrink: 0 }} />}
                              <span style={{ fontSize: 9.5, fontWeight: 800, color: isClash ? "var(--coral-700)" : "var(--green-800)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{here.map((s) => window.groupById(s.g).name.split(" ")[0]).join(" / ")}</span>
                            </>}
                          </div>
                        </td>
                      );
                    })}
                    <td style={{ borderBottom: "1px solid var(--ink-50)", borderLeft: "1.5px solid var(--ink-100)", textAlign: "center" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: util > 40 ? "var(--green-700)" : "var(--ink-400)" }}>{util}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </window.Card>
        <p style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 12 }}>Красная ячейка = двойное бронирование (одна комната, пересекающееся время). Правый столбец — загрузка кабинета за день.</p>
      </div>
    </window.AdminShell>
  );
}

Object.assign(window, { SchedulerWeek, RoomBoard, computeClashes });
