// journal-matrix.jsx — two takes on the attendance register (students × dates).
// Cells are click-to-cycle (П→О→Н→У) to show editing happens in the matrix
// itself, not only in a detail panel. Load after admin-shell.jsx.

const JM = { useS: React.useState, useM: React.useMemo };

function useGrid(seed) {
  const dates = window.DATES;
  const students = window.STUDENTS_3A;
  const init = window.useMemoSafe ? null : null;
  const [grid, setGrid] = React.useState(() => window.makeGrid(students, dates, seed));
  const cycle = (r, c) => setGrid((g) => {
    const order = window.ST_ORDER;
    const next = order[(order.indexOf(g[r][c]) + 1) % order.length];
    return g.map((row, ri) => ri !== r ? row : row.map((v, ci) => ci !== c ? v : next));
  });
  return { grid, cycle, dates, students };
}

function Legend({ compact }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: compact ? 10 : 14, flexWrap: "wrap" }}>
      {window.ST_ORDER.map((k) => {
        const s = window.ST[k];
        return (
          <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ink-500)", fontWeight: 600 }}>
            <span style={{ width: 16, height: 16, borderRadius: 5, background: s.cell, color: s.text, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{s.k}</span>
            {s.label}
          </span>
        );
      })}
    </div>
  );
}

function pct(row) { return Math.round(row.filter((v) => v === "present" || v === "late").length / row.length * 100); }

// risk side-panel: average attendance + students below threshold
function RiskPanel({ grid, students }) {
  const rows = students.map((name, r) => {
    const absent = grid[r].filter((v) => v === "absent").length;
    const late = grid[r].filter((v) => v === "late").length;
    return { name, r, p: pct(grid[r]), absent, late };
  });
  const avg = Math.round(rows.reduce((a, x) => a + x.p, 0) / rows.length);
  const atRisk = [...rows].filter((x) => x.p < 85).sort((a, b) => a.p - b.p).slice(0, 6);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
      <window.Card pad={16}>
        <window.Eyebrow>Средняя явка</window.Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: avg >= 85 ? "var(--green-700)" : "var(--sun-700)", letterSpacing: "-0.02em" }}>{avg}%</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-400)" }}>за период</span>
        </div>
      </window.Card>
      <window.Card pad={16} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
          <window.Icon.AlertTriangle s={15} style={{ color: "var(--coral-500)" }} />
          <span style={{ fontSize: 13, fontWeight: 800 }}>В зоне риска</span>
          <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--ink-400)" }}>&lt; 85%</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
          {atRisk.map((x) => (
            <div key={x.r} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: "var(--coral-50)", color: "var(--coral-700)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{x.name.charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-400)", fontWeight: 600 }}>{x.absent} пропуск.{x.late ? ` · ${x.late} опозд.` : ""}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--coral-700)" }}>{x.p}%</span>
            </div>
          ))}
        </div>
      </window.Card>
    </div>
  );
}

// ── VARIANT A — dense classic register + risk panel ────────────────
function JournalMatrixA({ onNav }) {
  const { grid, cycle, dates, students } = useGrid(3);
  const colTotals = dates.map((_, c) => grid.filter((row) => row[c] === "present" || row[c] === "late").length);
  return (
    <window.AdminShell active="journal" onNav={onNav}>
      <window.PageHead title="Журнал · Математика 3А"
        sub="Посещаемость за период · 02–18 июня 2026"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <window.FauxSelect icon={<window.Icon.Users s={14} />} active>Математика 3А</window.FauxSelect>
            <window.FauxSelect icon={<window.Icon.Calendar s={14} />}>Июнь 2026</window.FauxSelect>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 10, border: "none", background: "var(--paper-2)", color: "var(--ink-700)", fontSize: 12.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 0 0 var(--ink-100), inset 0 0 0 1.5px var(--ink-100)" }}>
              <window.Icon.Download s={14} />CSV
            </button>
          </div>
        } />
      <div style={{ padding: "16px 26px 26px", flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 236px", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Legend />
          <span style={{ fontSize: 11.5, color: "var(--ink-400)" }}>Клик по ячейке — сменить статус</span>
        </div>
        <window.Card pad={0} style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%", fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, top: 0, zIndex: 3, background: "var(--paper-2)", textAlign: "left", padding: "12px 14px", fontSize: 11, fontWeight: 700, color: "var(--ink-500)", borderBottom: "1.5px solid var(--ink-100)", borderRight: "1.5px solid var(--ink-100)", minWidth: 170 }}>Студент</th>
                {dates.map((d, c) => (
                  <th key={c} style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--paper-2)", padding: "8px 4px", borderBottom: "1.5px solid var(--ink-100)", minWidth: 52 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-900)" }}>{d.d}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-400)", fontWeight: 600 }}>{d.wd}</div>
                  </th>
                ))}
                <th style={{ position: "sticky", top: 0, right: 0, zIndex: 3, background: "var(--paper-2)", padding: "8px 12px", borderBottom: "1.5px solid var(--ink-100)", borderLeft: "1.5px solid var(--ink-100)", fontSize: 11, fontWeight: 700, color: "var(--ink-500)" }}>Посещ.</th>
              </tr>
            </thead>
            <tbody>
              {students.map((name, r) => {
                const p = pct(grid[r]);
                return (
                  <tr key={r}>
                    <td style={{ position: "sticky", left: 0, zIndex: 1, background: "var(--paper-2)", padding: "0 14px", fontSize: 13, fontWeight: 600, color: "var(--ink-900)", borderRight: "1.5px solid var(--ink-100)", borderBottom: "1px solid var(--ink-50)", whiteSpace: "nowrap", height: 38 }}>{name}</td>
                    {grid[r].map((v, c) => {
                      const s = window.ST[v];
                      return (
                        <td key={c} style={{ padding: 3, textAlign: "center", borderBottom: "1px solid var(--ink-50)" }}>
                          <button onClick={() => cycle(r, c)} title={s.label} style={{ width: "100%", height: 30, border: "none", borderRadius: 7, cursor: "pointer", background: s.cell, color: s.text, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800 }}>{s.k}</button>
                        </td>
                      );
                    })}
                    <td style={{ position: "sticky", right: 0, background: "var(--paper-2)", padding: "0 12px", borderLeft: "1.5px solid var(--ink-100)", borderBottom: "1px solid var(--ink-50)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                        <div style={{ width: 42, height: 6, borderRadius: 999, background: "var(--ink-100)", overflow: "hidden" }}>
                          <div style={{ width: p + "%", height: "100%", background: p >= 85 ? "var(--green-600)" : p >= 70 ? "var(--sun-500)" : "var(--coral-500)" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "var(--ink-700)", minWidth: 30, textAlign: "right" }}>{p}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ position: "sticky", left: 0, background: "var(--ink-50)", padding: "9px 14px", fontSize: 11, fontWeight: 700, color: "var(--ink-500)", borderTop: "1.5px solid var(--ink-100)", borderRight: "1.5px solid var(--ink-100)" }}>Пришло из {students.length}</td>
                {colTotals.map((t, c) => (
                  <td key={c} style={{ background: "var(--ink-50)", textAlign: "center", padding: "9px 2px", borderTop: "1.5px solid var(--ink-100)", fontSize: 12, fontWeight: 800, color: t >= students.length - 1 ? "var(--green-700)" : t <= students.length - 3 ? "var(--coral-700)" : "var(--ink-700)" }}>{t}</td>
                ))}
                <td style={{ position: "sticky", right: 0, background: "var(--ink-50)", borderTop: "1.5px solid var(--ink-100)", borderLeft: "1.5px solid var(--ink-100)" }}></td>
              </tr>
            </tfoot>
          </table>
        </window.Card>
        </div>
        <RiskPanel grid={grid} students={students} />
      </div>
    </window.AdminShell>
  );
}

// ── VARIANT B — compact heatmap + risk panel ───────────────────────
function JournalMatrixB() {
  const { grid, cycle, dates, students } = useGrid(7);
  // per-student stats
  const rows = students.map((name, r) => {
    const absent = grid[r].filter((v) => v === "absent").length;
    const late = grid[r].filter((v) => v === "late").length;
    return { name, r, p: pct(grid[r]), absent, late };
  });
  const atRisk = [...rows].filter((x) => x.p < 80).sort((a, b) => a.p - b.p).slice(0, 4);
  const colP = dates.map((_, c) => Math.round(grid.filter((row) => row[c] === "present" || row[c] === "late").length / students.length * 100));
  return (
    <window.AdminShell active="journal">
      <window.PageHead title="Журнал · Математика 3А"
        sub="Тепловая карта посещаемости · 02–18 июня"
        right={<window.FauxSelect icon={<window.Icon.Users s={14} />} active>Математика 3А</window.FauxSelect>} />
      <div style={{ padding: "16px 26px 26px", flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "1fr 246px", gap: 16 }}>
        {/* heatmap */}
        <window.Card pad={0} style={{ overflow: "auto", minHeight: 0 }}>
          <table style={{ borderCollapse: "separate", borderSpacing: 0, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, top: 0, zIndex: 3, background: "var(--paper-2)", textAlign: "left", padding: "10px 14px", fontSize: 11, fontWeight: 700, color: "var(--ink-500)", borderBottom: "1.5px solid var(--ink-100)", minWidth: 150 }}>Студент</th>
                {dates.map((d, c) => (
                  <th key={c} style={{ position: "sticky", top: 0, background: "var(--paper-2)", padding: "8px 2px", borderBottom: "1.5px solid var(--ink-100)" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, color: "var(--ink-700)" }}>{d.d}</div>
                  </th>
                ))}
                <th style={{ position: "sticky", top: 0, right: 0, zIndex: 3, background: "var(--paper-2)", borderBottom: "1.5px solid var(--ink-100)", minWidth: 88 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ name, r, p }) => (
                <tr key={r}>
                  <td style={{ position: "sticky", left: 0, zIndex: 1, background: "var(--paper-2)", padding: "0 14px", fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", height: 34 }}>{name}</td>
                  {grid[r].map((v, c) => {
                    const s = window.ST[v];
                    return (
                      <td key={c} style={{ padding: 2, textAlign: "center" }}>
                        <button onClick={() => cycle(r, c)} title={s.label + " · " + dates[c].d} style={{ width: 24, height: 24, border: "none", borderRadius: 6, cursor: "pointer", background: s.cell, display: "inline-grid", placeItems: "center" }}>
                          <span style={{ width: 7, height: 7, borderRadius: 999, background: s.dot }} />
                        </button>
                      </td>
                    );
                  })}
                  <td style={{ position: "sticky", right: 0, background: "var(--paper-2)", padding: "0 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, justifyContent: "flex-end" }}>
                      <div style={{ width: 34, height: 5, borderRadius: 999, background: "var(--ink-100)", overflow: "hidden" }}><div style={{ width: p + "%", height: "100%", background: p >= 85 ? "var(--green-600)" : p >= 70 ? "var(--sun-500)" : "var(--coral-500)" }} /></div>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--ink-500)", minWidth: 26, textAlign: "right" }}>{p}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ position: "sticky", left: 0, background: "var(--ink-50)", padding: "8px 14px", fontSize: 10.5, fontWeight: 700, color: "var(--ink-500)", borderTop: "1.5px solid var(--ink-100)" }}>% явки</td>
                {colP.map((p, c) => (
                  <td key={c} style={{ background: "var(--ink-50)", borderTop: "1.5px solid var(--ink-100)", textAlign: "center", padding: "6px 2px" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, color: p >= 85 ? "var(--green-700)" : p >= 70 ? "var(--sun-700)" : "var(--coral-700)" }}>{p}</span>
                  </td>
                ))}
                <td style={{ position: "sticky", right: 0, background: "var(--ink-50)", borderTop: "1.5px solid var(--ink-100)" }}></td>
              </tr>
            </tfoot>
          </table>
        </window.Card>
        {/* side: summary + risk */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}>
          <window.Card pad={16}>
            <window.Eyebrow>Средняя явка</window.Eyebrow>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 34, fontWeight: 800, color: "var(--green-700)", letterSpacing: "-0.02em" }}>{Math.round(rows.reduce((a, x) => a + x.p, 0) / rows.length)}%</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-400)" }}>за период</span>
            </div>
          </window.Card>
          <window.Card pad={16} style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <window.Icon.AlertTriangle s={15} style={{ color: "var(--coral-500)" }} />
              <span style={{ fontSize: 13, fontWeight: 800 }}>В зоне риска</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
              {atRisk.map((x) => (
                <div key={x.r} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 999, background: "var(--coral-50)", color: "var(--coral-700)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{x.name.charAt(0)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.name}</div>
                    <div style={{ fontSize: 10.5, color: "var(--ink-400)", fontWeight: 600 }}>{x.absent} пропуск.{x.late ? ` · ${x.late} опозд.` : ""}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--coral-700)" }}>{x.p}%</span>
                </div>
              ))}
            </div>
            <Legend compact />
          </window.Card>
        </div>
      </div>
    </window.AdminShell>
  );
}

Object.assign(window, { JournalMatrixA, JournalMatrixB });
