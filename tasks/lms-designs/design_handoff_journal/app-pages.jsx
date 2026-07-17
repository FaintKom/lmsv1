// app-pages.jsx — cohesive prototype pages:
//   TodayAgenda      — daily agenda of all lessons (entry point)
//   SessionDetail    — slide-over: held + topic + attendance + activity
//   StudentActivity  — full page: what the student did today
// Load after admin-shell.jsx (uses window.* primitives + data).

const { useState: useState2 } = React;

// status dot for agenda
function AttBadge({ s }) {
  if (s.held && s.present != null) {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--green-700)" }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--green-600)" }} />{s.present}/{s.total}</span>;
  }
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--ink-400)" }}>
    <span style={{ width: 8, height: 8, borderRadius: 999, border: "2px solid var(--ink-300)" }} />не отмечено</span>;
}

// ── TODAY agenda ────────────────────────────────────────────────────
function TodayAgenda({ onNav, onOpenSession }) {
  const sessions = window.TODAY_SESSIONS;
  const marked = sessions.filter((s) => s.held && s.present != null).length;
  return (
    <window.AdminShell active="today" onNav={onNav}>
      <window.PageHead title="Сегодня"
        sub={window.TODAY_LABEL}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <button style={btnIcon2}><window.Icon.ChevronLeft s={16} /></button>
              <button style={{ ...btnIcon2, width: "auto", padding: "0 12px", fontSize: 12, fontWeight: 700 }}>Сегодня</button>
              <button style={btnIcon2}><window.Icon.ChevronLeft s={16} style={{ transform: "rotate(180deg)" }} /></button>
            </div>
            <window.FauxSelect icon={<window.Icon.Users s={14} />}>Все преподаватели</window.FauxSelect>
          </div>
        } />
      <div style={{ padding: "16px 26px 26px" }}>
        {/* mini stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {[
            { l: "Занятий сегодня", v: sessions.length, c: "var(--ink-900)" },
            { l: "Отмечено", v: marked, c: "var(--green-700)" },
            { l: "Ждут отметки", v: sessions.length - marked, c: "var(--coral-700)" },
          ].map((x) => (
            <window.Card key={x.l} pad={14} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <window.Eyebrow>{x.l}</window.Eyebrow>
              <span style={{ fontSize: 24, fontWeight: 800, color: x.c, letterSpacing: "-0.02em" }}>{x.v}</span>
            </window.Card>
          ))}
        </div>
        {/* agenda list */}
        <window.Card pad={0}>
          {sessions.map((s, i) => {
            const g = window.groupById(s.gid); const room = window.roomById(g.room);
            return (
              <div key={s.id} onClick={() => onOpenSession(s.id)} style={{ display: "grid", gridTemplateColumns: "84px minmax(150px,1.3fr) 116px minmax(120px,1fr) 132px", gap: 14, alignItems: "center", padding: "15px 20px", borderTop: i ? "1px solid var(--ink-50)" : "none", cursor: "pointer", transition: "background 120ms" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--ink-50)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: 700, color: "var(--ink-700)" }}>{s.time}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ width: 8, height: 36, borderRadius: 4, background: g.color, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-400)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{g.teacher}</div>
                  </div>
                </div>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: room.kind === "online" ? "var(--info)" : "var(--ink-500)" }}>
                  {room.kind === "online" ? <window.Icon.Video s={14} /> : <window.Icon.Pin s={14} />}{room.name}
                </span>
                <span style={{ fontSize: 12.5, color: "var(--ink-600)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.topic}</span>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12 }}>
                  <AttBadge s={s} />
                  <window.Icon.ChevronRight s={16} style={{ color: "var(--ink-300)" }} />
                </div>
              </div>
            );
          })}
        </window.Card>
        <p style={{ fontSize: 11.5, color: "var(--ink-400)", marginTop: 12 }}>Нажмите на занятие — откроется отметка посещаемости и активность урока.</p>
      </div>
    </window.AdminShell>
  );
}
const btnIcon2 = { width: 32, height: 32, borderRadius: 9, border: "1px solid var(--ink-100)", background: "var(--paper-2)", color: "var(--ink-500)", display: "grid", placeItems: "center", cursor: "pointer" };

// ── SESSION DETAIL (slide-over) ────────────────────────────────────
function SessionDetail({ sessionId, onClose, onOpenStudent }) {
  const s = window.TODAY_SESSIONS.find((x) => x.id === sessionId);
  const g = window.groupById(s.gid); const room = window.roomById(g.room);
  const roster = window.ROSTERS[s.gid] || [];
  const [held, setHeld] = useState2(s.held);
  // attendance state per student
  const [att, setAtt] = useState2(() => roster.map((_, i) => {
    if (!s.held) return "present";
    const r = (i * 7 + 3) % 10; return r > 8 ? "absent" : r > 6 ? "late" : "present";
  }));
  const setAll = () => setAtt(roster.map(() => "present"));
  const cycle = (i) => setAtt((a) => a.map((v, j) => j !== i ? v : window.ST_ORDER[(window.ST_ORDER.indexOf(v) + 1) % window.ST_ORDER.length]));
  const presentCt = att.filter((v) => v === "present" || v === "late").length;

  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,26,16,0.35)", zIndex: 40 }} />
      <aside style={{ position: "absolute", top: 0, right: 0, height: "100%", width: 470, background: "var(--paper)", boxShadow: "var(--shadow-lg)", zIndex: 41, display: "flex", flexDirection: "column", fontFamily: "var(--font-sans)" }}>
        {/* header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--ink-100)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{g.name}</h2>
              <div style={{ fontSize: 12.5, color: "var(--ink-500)", marginTop: 3, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-mono)" }}>{s.time}</span> ·
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: room.kind === "online" ? "var(--info)" : "var(--ink-500)" }}>{room.kind === "online" ? <window.Icon.Video s={13} /> : <window.Icon.Pin s={13} />}{room.name}</span>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 999, border: "none", background: "var(--ink-50)", color: "var(--ink-500)", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 17 }}>✕</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "16px 22px" }}>
          {/* held + topic */}
          <label style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer", marginBottom: 12 }}>
            <span onClick={() => setHeld((h) => !h)} style={{ width: 38, height: 22, borderRadius: 999, background: held ? "var(--green-600)" : "var(--ink-200)", position: "relative", transition: "background 150ms", flexShrink: 0 }}>
              <span style={{ position: "absolute", top: 2, left: held ? 18 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", transition: "left 150ms" }} />
            </span>
            Занятие проведено
          </label>
          <window.Eyebrow style={{ marginBottom: 6 }}>Тема урока</window.Eyebrow>
          <input defaultValue={s.topic} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: "1.5px solid var(--ink-100)", fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--ink-900)", marginBottom: 18 }} />

          {/* attendance */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>Посещаемость</span>
              <span style={{ fontSize: 12, color: "var(--ink-400)", fontWeight: 600 }}>{presentCt}/{roster.length}</span>
            </div>
            <button onClick={setAll} style={{ fontSize: 11.5, fontWeight: 700, color: "var(--green-700)", background: "var(--green-50)", border: "none", borderRadius: 8, padding: "6px 11px", cursor: "pointer" }}>✓ Все присутствуют</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
            {roster.map((name, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                {window.ST_ORDER.map((k) => {
                  const sel = att[i] === k; const st = window.ST[k];
                  return (
                    <button key={k} onClick={() => setAtt((a) => a.map((v, j) => j === i ? k : v))} title={st.label}
                      style={{ width: 30, height: 28, borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, background: sel ? st.cell : "var(--paper-2)", color: sel ? st.text : "var(--ink-300)", boxShadow: sel ? "none" : "inset 0 0 0 1.5px var(--ink-100)" }}>{st.k}</button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* activity */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
            <window.Icon.Zap s={15} filled style={{ color: "var(--sun-500)" }} />
            <span style={{ fontSize: 14, fontWeight: 800 }}>Активность на уроке</span>
          </div>
          {held ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {roster.slice(0, 6).map((name, i) => {
                const st = window.lessonStats(window.buildStudentDay(name)[0].ex);
                return (
                  <button key={i} onClick={() => onOpenStudent(name)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 10, border: "1px solid var(--ink-100)", background: "var(--paper-2)", cursor: "pointer", textAlign: "left", width: "100%" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 999, background: "var(--green-50)", color: "var(--green-800)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 11, flexShrink: 0 }}>{name.charAt(0)}</div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)", fontWeight: 600 }}>{st.done} упр · {st.correctPct}%</span>
                    <window.Icon.ChevronRight s={14} style={{ color: "var(--ink-300)" }} />
                  </button>
                );
              })}
              <div style={{ fontSize: 11.5, color: "var(--ink-400)", padding: "4px 2px" }}>Нажмите на ученика — что он сделал за день →</div>
            </div>
          ) : (
            <div style={{ padding: 16, borderRadius: 10, background: "var(--ink-50)", fontSize: 12.5, color: "var(--ink-400)", textAlign: "center" }}>Отметьте занятие проведённым, чтобы увидеть активность.</div>
          )}
        </div>
        {/* footer */}
        <div style={{ borderTop: "1px solid var(--ink-100)", padding: "14px 22px", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "10px 18px", borderRadius: 11, border: "1px solid var(--ink-100)", background: "var(--paper-2)", fontSize: 13, fontWeight: 700, color: "var(--ink-600)", cursor: "pointer" }}>Отмена</button>
          <button onClick={onClose} style={{ padding: "10px 22px", borderRadius: 11, border: "none", background: "var(--green-600)", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 0 0 var(--green-700)" }}>Сохранить</button>
        </div>
      </aside>
    </>
  );
}

// ── STUDENT ACTIVITY (full page) ───────────────────────────────────
function StudentActivity({ student, onBack, onNav }) {
  const lessons = window.buildStudentDay(student);
  const attended = lessons.filter((l) => l.attendance === "present");
  let exDone = 0, got = 0, max = 0;
  attended.forEach((l) => { const st = window.lessonStats(l.ex); exDone += st.done; got += st.got; max += st.max; });
  const correctPct = max ? Math.round(got / max * 100) : 0;
  const timeMin = exDone * 4 + 6;
  const xp = got * 12;
  const KPIS = [
    { l: "Уроков посещено", v: `${attended.length}/${lessons.length}`, I: window.Icon.CheckCircle, c: "var(--green-700)", bg: "var(--green-50)" },
    { l: "Упражнений", v: exDone, I: window.Icon.ClipboardList, c: "var(--ink-700)", bg: "var(--ink-50)" },
    { l: "Верных ответов", v: correctPct + "%", I: window.Icon.Target, c: "var(--green-700)", bg: "var(--green-50)" },
    { l: "Время в системе", v: timeMin + " мин", I: window.Icon.Clock, c: "var(--ink-700)", bg: "var(--ink-50)" },
    { l: "Заработано XP", v: xp, I: window.Icon.Zap, c: "var(--sun-700)", bg: "var(--sun-100)" },
  ];
  // event feed (synthesized from first attended lesson)
  const events = [];
  const firstL = attended[0];
  if (firstL) {
    let t = parseInt(firstL.time.slice(0, 2)) * 60 + parseInt(firstL.time.slice(3, 5)) + 2;
    const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    events.push({ t: fmt(t), txt: `Вошёл в урок · ${window.groupById(firstL.gid).name}`, kind: "in" });
    firstL.ex.forEach((e) => { t += 3 + Math.floor(Math.random() * 4); events.push({ t: fmt(t), txt: e.title, kind: e.result }); });
  }

  return (
    <window.AdminShell active="today" onNav={onNav}>
      <div style={{ padding: "20px 26px 26px" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px 6px 8px", borderRadius: 9, border: "1px solid var(--ink-100)", background: "var(--paper-2)", color: "var(--ink-500)", fontSize: 12, fontWeight: 700, cursor: "pointer", marginBottom: 16 }}>
          <window.Icon.ChevronLeft s={15} /> Назад
        </button>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 999, background: "linear-gradient(135deg, var(--green-500), var(--green-700))", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 24, flexShrink: 0 }}>{student.charAt(0)}</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{student}</h1>
            <div style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 2 }}>Математика 3А · {window.TODAY_LABEL}</div>
          </div>
        </div>
        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 20 }}>
          {KPIS.map((x) => (
            <window.Card key={x.l} pad={15} style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: x.bg, color: x.c, display: "grid", placeItems: "center", flexShrink: 0 }}><x.I s={18} filled /></div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 21, fontWeight: 800, color: x.c, letterSpacing: "-0.02em", lineHeight: 1 }}>{x.v}</div>
                <window.Eyebrow style={{ marginTop: 3 }}>{x.l}</window.Eyebrow>
              </div>
            </window.Card>
          ))}
        </div>
        {/* two columns: lessons + event feed */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 16, alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            {lessons.map((l, li) => {
              const g = window.groupById(l.gid); const st = window.lessonStats(l.ex);
              const absent = l.attendance !== "present";
              return (
                <window.Card key={li} pad={0} style={{ overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: absent ? "none" : "1px solid var(--ink-50)", background: "var(--ink-50)" }}>
                    <span style={{ width: 8, height: 30, borderRadius: 4, background: g.color }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--ink-600)" }}>{l.time}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{g.name}</div>
                      <div style={{ fontSize: 12, color: "var(--ink-500)" }}>{l.topic}</div>
                    </div>
                    {absent
                      ? <window.Pill bg="var(--coral-50)" fg="var(--coral-700)"><span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--coral-500)" }} />Отсутствовал</window.Pill>
                      : <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--ink-500)" }}>{st.done} упр</span>
                          <window.Pill bg="var(--green-50)" fg="var(--green-800)">{st.correctPct}% верно</window.Pill>
                        </span>}
                  </div>
                  {!absent && (
                    <div style={{ padding: "8px 10px" }}>
                      {l.ex.map((e, ei) => {
                        const r = window.RES[e.result];
                        return (
                          <div key={ei} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 8px", borderTop: ei ? "1px solid var(--ink-50)" : "none" }}>
                            <span style={{ width: 9, height: 9, borderRadius: 999, background: r.dot, flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.title}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-400)", fontWeight: 600 }}>{e.type}</span>
                            {e.items && <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 700, color: "var(--ink-600)", minWidth: 30, textAlign: "right" }}>{e.items}</span>}
                            <window.Pill bg={r.bg} fg={r.fg} style={{ minWidth: 64, justifyContent: "center" }}>{r.label}</window.Pill>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {absent && <div style={{ padding: "16px 18px", fontSize: 12.5, color: "var(--ink-400)" }}>Пропуск занятия — активности нет.</div>}
                </window.Card>
              );
            })}
          </div>
          {/* event feed */}
          <window.Card pad={18}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
              <window.Icon.Clock s={15} style={{ color: "var(--ink-500)" }} />
              <span style={{ fontSize: 13, fontWeight: 800 }}>Лента событий</span>
            </div>
            <div style={{ position: "relative", paddingLeft: 18 }}>
              <div style={{ position: "absolute", left: 4, top: 4, bottom: 4, width: 2, background: "var(--ink-100)" }} />
              {events.map((ev, i) => {
                const r = ev.kind === "in" ? { dot: "var(--green-600)" } : (window.RES[ev.kind] || window.RES.done);
                return (
                  <div key={i} style={{ position: "relative", paddingBottom: 14 }}>
                    <span style={{ position: "absolute", left: -18, top: 2, width: 10, height: 10, borderRadius: 999, background: r.dot, border: "2px solid var(--paper-2)" }} />
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-400)", fontWeight: 600 }}>{ev.t}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-700)", marginTop: 1 }}>{ev.txt}</div>
                  </div>
                );
              })}
            </div>
          </window.Card>
        </div>
      </div>
    </window.AdminShell>
  );
}

Object.assign(window, { TodayAgenda, SessionDetail, StudentActivity });
