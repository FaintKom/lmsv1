// q-fullscreen.jsx — widescreen fullscreen variants for Robot 2D, World 3D, SCORM
// Triggered in the real product via a "Open fullscreen" button; here rendered
// directly inside a 1280×720 artboard with explorer-app chrome.

const { useState: useStateF, useEffect: useEffectF, useRef: useRefF } = React;

// ─── Fullscreen shell (top bar w/ exit, course breadcrumb, progress) ─
function FullscreenShell({ breadcrumb, title, progress = 50, hearts = 4, streak = 7, children, sidebar }) {
  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: "var(--paper)",
      fontFamily: "var(--font-sans)",
      color: "var(--ink-900)",
      overflow: "hidden",
    }}>
      {/* top bar */}
      <div style={{
        height: 56,
        display: "flex", alignItems: "center", gap: 18,
        padding: "0 20px",
        borderBottom: "1px solid var(--ink-100)",
        background: "var(--paper-2)",
        flexShrink: 0,
      }}>
        <button
          title="Exit fullscreen (Esc)"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "transparent", border: "none",
            padding: "6px 12px 6px 6px", borderRadius: 10,
            color: "var(--ink-500)", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13,
            cursor: "pointer",
          }}
        >
          <span style={{
            width: 28, height: 28, borderRadius: 999,
            background: "var(--ink-50)", color: "var(--ink-700)",
            display: "grid", placeItems: "center",
          }}><Icon.X s={14} /></span>
          Exit
        </button>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
            color: "var(--ink-400)", textTransform: "uppercase", fontWeight: 700,
          }}>{breadcrumb}</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink-900)" }}>{title}</div>
        </div>
        {/* lesson nav */}
        <div style={{ display: "flex", gap: 4 }}>
          <button style={iconBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
          <button style={iconBtn}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>
        </div>
        <div style={{ width: 180, height: 10, background: "var(--ink-100)", borderRadius: 999, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: "linear-gradient(180deg, var(--green-400), var(--green-600))",
            borderRadius: 999,
          }} />
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--coral-700)", background: "var(--coral-50)", padding: "4px 10px 4px 6px", borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          <Icon.Flame s={13} />{streak}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--coral-700)", background: "var(--coral-50)", padding: "4px 10px 4px 6px", borderRadius: 999, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>
          <Icon.Heart s={13} filled />{hearts}
        </span>
      </div>
      {/* body */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {sidebar && (
          <div style={{
            width: 280,
            background: "var(--paper-2)",
            borderRight: "1px solid var(--ink-100)",
            display: "flex", flexDirection: "column",
            flexShrink: 0,
            overflow: "auto",
          }}>{sidebar}</div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
const iconBtn = {
  width: 32, height: 32, borderRadius: 8,
  background: "var(--ink-50)", border: "none", color: "var(--ink-500)",
  display: "grid", placeItems: "center", cursor: "pointer",
};

// ─── ROBOT 2D · FULLSCREEN ────────────────────────────────────────
// Designed for big programs — supports `repeat N [...]` blocks for
// loops, plus a compact rendering once the program is long. The block
// list scrolls; nested blocks are indented with a bracket on the left.
function Robot2DFullscreen() {
  const SIZE = 8;
  const START = { r: 7, c: 0, dir: 1 };
  const GOAL = { r: 0, c: 7 };
  const COINS = [{ r: 5, c: 2 }, { r: 3, c: 4 }, { r: 1, c: 6 }];
  const WALLS = ["3,3", "4,3", "5,5"];

  // Block tree — each forward/turn is a leaf, repeat has children[]
  const MK = (type, extra = {}) => ({ id: Math.random().toString(36).slice(2), type, ...extra });
  const [tree, setTree] = useStateF([
    MK("repeat", { n: 4, children: [
      MK("forward", { n: 1 }),
      MK("turn-right"),
      MK("forward", { n: 2 }),
      MK("turn-left"),
    ]}),
    MK("forward", { n: 3 }),
    MK("turn-right"),
    MK("repeat", { n: 2, children: [
      MK("forward", { n: 2 }),
      MK("turn-left"),
    ]}),
    MK("forward", { n: 4 }),
  ]);
  const [compact, setCompact] = useStateF(false);
  const [selectedId, setSelectedId] = useStateF(null); // which repeat to add into
  const [robot, setRobot] = useStateF(START);
  const [collected, setCollected] = useStateF({});
  const [running, setRunning] = useStateF(false);
  const [status, setStatus] = useStateF(null);
  const { fire, layer } = useConfetti();
  const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];

  // count leaves (for stats)
  const countSteps = (nodes) => nodes.reduce((s, b) => {
    if (b.type === "repeat") return s + b.n * countSteps(b.children);
    if (b.type === "forward") return s + b.n;
    return s + 1;
  }, 0);
  const programSteps = countSteps(tree);
  const blockCount = (nodes) => nodes.reduce((s, b) => s + 1 + (b.type === "repeat" ? blockCount(b.children) : 0), 0);
  const totalBlocks = blockCount(tree);

  // flatten tree into executable instructions
  const flatten = (nodes) => {
    const out = [];
    for (const b of nodes) {
      if (b.type === "repeat") {
        for (let i = 0; i < b.n; i++) out.push(...flatten(b.children));
      } else out.push(b);
    }
    return out;
  };

  const run = async () => {
    if (running) return;
    setRunning(true);
    let r = START.r, c = START.c, dir = START.dir;
    const got = {};
    setRobot({ r, c, dir }); setCollected({});
    const ops = flatten(tree);
    for (const b of ops) {
      if (b.type === "forward") {
        for (let i = 0; i < (b.n || 1); i++) {
          await new Promise((res) => setTimeout(res, 140));
          const nr = Math.max(0, Math.min(SIZE - 1, r + DR[dir]));
          const nc = Math.max(0, Math.min(SIZE - 1, c + DC[dir]));
          if (!WALLS.includes(`${nr},${nc}`)) { r = nr; c = nc; }
          const coinHit = COINS.findIndex((co) => co.r === r && co.c === c);
          if (coinHit >= 0) got[coinHit] = true;
          setRobot({ r, c, dir }); setCollected({ ...got });
        }
      } else if (b.type === "turn-right") { await new Promise((res) => setTimeout(res, 100)); dir = (dir + 1) % 4; setRobot({ r, c, dir }); }
      else if (b.type === "turn-left") { await new Promise((res) => setTimeout(res, 100)); dir = (dir + 3) % 4; setRobot({ r, c, dir }); }
    }
    setRunning(false);
    const won = r === GOAL.r && c === GOAL.c;
    const allCoins = Object.keys(got).length === COINS.length;
    if (won && allCoins) { setStatus("win"); fire(); } else setStatus("lose");
  };
  const reset = () => { setRobot(START); setCollected({}); setStatus(null); };

  // tree edits
  const removeNode = (id, nodes = tree) => {
    const out = nodes.filter((n) => n.id !== id).map((n) =>
      n.type === "repeat" ? { ...n, children: removeNode(id, n.children) } : n
    );
    return out;
  };
  const updateNode = (id, patch, nodes = tree) => nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    if (n.type === "repeat") return { ...n, children: updateNode(id, patch, n.children) };
    return n;
  });
  const addInto = (parentId, t) => {
    const block = MK(t, t === "forward" ? { n: 1 } : t === "repeat" ? { n: 2, children: [] } : {});
    if (parentId == null) { setTree([...tree, block]); return; }
    setTree(tree.map(function add(n) {
      if (n.id === parentId && n.type === "repeat") return { ...n, children: [...n.children, block] };
      if (n.type === "repeat") return { ...n, children: n.children.map(add) };
      return n;
    }));
  };

  const BLOCK = {
    forward: { label: "move", color: "var(--green-500)", shadow: "var(--green-700)", glyph: "↑" },
    "turn-right": { label: "turn →", color: "var(--sun-400)", shadow: "var(--sun-500)", dark: true, glyph: "↻" },
    "turn-left": { label: "turn ←", color: "var(--sun-400)", shadow: "var(--sun-500)", dark: true, glyph: "↺" },
    repeat: { label: "repeat", color: "var(--coral-500)", shadow: "var(--coral-700)", glyph: "⟳" },
  };

  // ─── tree renderer ───
  const renderNodes = (nodes, depth = 0) => (
    <>
      {nodes.map((b) => {
        const meta = BLOCK[b.type];
        if (compact && b.type !== "repeat") {
          return (
            <div key={b.id} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: meta.color, color: meta.dark ? "var(--ink-900)" : "#fff",
              padding: "4px 8px", borderRadius: 6,
              fontSize: 11, fontWeight: 800, fontFamily: "var(--font-mono)",
              boxShadow: `0 2px 0 0 ${meta.shadow}`,
              marginLeft: depth * 18, marginRight: 4, marginBottom: 4,
            }}>
              {meta.glyph}{b.type === "forward" ? b.n : ""}
              <button onClick={() => setTree(removeNode(b.id))} style={{
                background: "transparent", border: "none", padding: 0, marginLeft: 2,
                color: "inherit", opacity: 0.6, cursor: "pointer", fontSize: 11,
              }}>×</button>
            </div>
          );
        }
        if (b.type === "repeat") {
          const isSel = selectedId === b.id;
          return (
            <div key={b.id} style={{ marginLeft: depth * 18, marginBottom: 4 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: meta.color, color: "#fff",
                padding: "8px 12px", borderTopLeftRadius: 10, borderTopRightRadius: 10,
                borderBottomLeftRadius: b.children.length === 0 ? 10 : 0,
                borderBottomRightRadius: b.children.length === 0 ? 10 : 0,
                fontWeight: 700, fontSize: 12,
                boxShadow: `0 2px 0 0 ${meta.shadow}`,
              }}>
                <span style={{ fontFamily: "var(--font-mono)", opacity: 0.8 }}>{meta.glyph}</span>
                repeat
                <input
                  type="number" min={1} max={20} value={b.n}
                  onChange={(e) => setTree(updateNode(b.id, { n: Math.max(1, Math.min(20, +e.target.value || 1)) }))}
                  disabled={running}
                  style={{
                    width: 38, padding: "2px 4px", marginLeft: 2,
                    background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 4,
                    color: "#fff", fontFamily: "var(--font-mono)", fontWeight: 800, textAlign: "center",
                  }}
                />
                × times
                <button
                  onClick={() => setSelectedId(isSel ? null : b.id)}
                  style={{
                    background: isSel ? "#fff" : "rgba(255,255,255,0.25)",
                    color: isSel ? "var(--coral-700)" : "#fff",
                    border: "none", borderRadius: 4,
                    padding: "2px 8px", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 800,
                    cursor: "pointer", marginLeft: 4,
                  }}
                >+ inside</button>
                <button onClick={() => setTree(removeNode(b.id))} disabled={running}
                  style={{ background: "rgba(0,0,0,0.2)", border: "none", width: 18, height: 18, borderRadius: 999, color: "#fff", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon.X s={10} /></button>
              </div>
              {b.children.length > 0 && (
                <div style={{
                  borderLeft: `3px solid ${meta.color}`,
                  marginLeft: 0,
                  padding: "6px 0 6px 12px",
                  background: "rgba(255,122,92,0.04)",
                  borderBottomLeftRadius: 10,
                  borderBottomRightRadius: 0,
                }}>
                  {renderNodes(b.children, 0)}
                </div>
              )}
              {isSel && (
                <div style={{ marginLeft: 12, marginTop: 4, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {["forward", "turn-right", "turn-left"].map((t) => {
                    const m = BLOCK[t];
                    return (
                      <button key={t} onClick={() => addInto(b.id, t)} disabled={running}
                        style={{
                          background: m.color, color: m.dark ? "var(--ink-900)" : "#fff",
                          padding: "4px 10px", borderRadius: 6, border: "none",
                          fontSize: 11, fontWeight: 700, cursor: "pointer",
                          boxShadow: `0 2px 0 0 ${m.shadow}`,
                        }}>+ {m.label}</button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }
        // leaf block
        return (
          <div key={b.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            background: meta.color, color: meta.dark ? "var(--ink-900)" : "#fff",
            padding: "8px 12px", borderRadius: 10,
            boxShadow: `0 2px 0 0 ${meta.shadow}`,
            fontWeight: 700, fontSize: 12,
            marginLeft: depth * 18, marginBottom: 4,
          }}>
            <span style={{ fontFamily: "var(--font-mono)", opacity: 0.7, fontSize: 10, width: 12 }}>{meta.glyph}</span>
            <span style={{ flex: 1 }}>{meta.label}</span>
            {b.type === "forward" && (
              <input
                type="number" min={1} max={9} value={b.n}
                onChange={(e) => setTree(updateNode(b.id, { n: Math.max(1, Math.min(9, +e.target.value || 1)) }))}
                disabled={running}
                style={{
                  width: 32, padding: "2px 4px",
                  background: "rgba(255,255,255,0.25)", border: "none", borderRadius: 4,
                  color: "inherit", fontFamily: "var(--font-mono)", fontWeight: 800, textAlign: "center", fontSize: 12,
                }}
              />
            )}
            <button onClick={() => setTree(removeNode(b.id))} disabled={running}
              style={{ background: "rgba(0,0,0,0.2)", border: "none", width: 16, height: 16, borderRadius: 999, color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}><Icon.X s={8} /></button>
          </div>
        );
      })}
    </>
  );

  const sidebar = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--ink-100)" }}>
        <div className="gp-eyebrow">MISSION · LEVEL 12</div>
        <h3 style={{ margin: "4px 0 6px", fontWeight: 800, fontSize: 16 }}>Loop your way to the flag</h3>
        <p style={{ margin: 0, fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>
          Use <b style={{ color: "var(--coral-700)" }}>repeat</b> blocks instead of stacking many moves.
          They keep big programs readable.
        </p>
        <div style={{
          marginTop: 10, padding: "8px 10px",
          background: "var(--ink-50)", borderRadius: 8,
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8,
        }}>
          <div>
            <div className="gp-eyebrow" style={{ fontSize: 9 }}>BLOCKS</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16, color: "var(--ink-900)", marginTop: 2 }}>{totalBlocks}</div>
          </div>
          <div>
            <div className="gp-eyebrow" style={{ fontSize: 9 }}>STEPS RUN</div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16, color: "var(--green-700)", marginTop: 2 }}>{programSteps}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "12px 18px", flex: 1, overflow: "auto", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div className="gp-eyebrow">Palette · top level</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {["forward", "turn-right", "turn-left", "repeat"].map((t) => {
            const m = BLOCK[t];
            return (
              <button key={t} onClick={() => addInto(null, t)} disabled={running}
                style={{
                  background: m.color, color: m.dark ? "var(--ink-900)" : "#fff",
                  padding: "10px 14px", borderRadius: 10, border: "none",
                  boxShadow: `0 3px 0 0 ${m.shadow}`,
                  fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13,
                  cursor: "pointer", textAlign: "left",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, opacity: 0.8 }}>{m.glyph}</span>
                + {m.label}{t === "forward" ? " forward" : t === "repeat" ? " (loop)" : ""}
              </button>
            );
          })}
        </div>
        <div className="gp-eyebrow" style={{ marginBottom: 8, marginTop: 16 }}>Coins · {Object.keys(collected).length}/{COINS.length}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {COINS.map((_, i) => (
            <span key={i} style={{
              width: 22, height: 22, borderRadius: 999,
              background: collected[i] ? "var(--sun-400)" : "var(--ink-100)",
              boxShadow: collected[i] ? "inset 0 -2px 0 var(--sun-500)" : "none",
              transition: "all 200ms",
            }} />
          ))}
        </div>
      </div>
      <div style={{ padding: 14, borderTop: "1px solid var(--ink-100)", display: "flex", gap: 8 }}>
        <button onClick={reset} className="gp-btn ghost" style={{ flex: 1, padding: "10px 12px", fontSize: 12 }}>Reset</button>
        <button onClick={run} disabled={running} className="gp-btn" style={{ flex: 2, padding: "10px 12px", fontSize: 12 }}>
          <Icon.Play s={12} />{running ? "Running…" : "Run program"}
        </button>
      </div>
    </div>
  );

  return (
    <FullscreenShell breadcrumb="ROBOT CLUB · MISSION 4 · LEVEL 12 / 24" title="Loop your way to the flag" progress={62} hearts={5} streak={11} sidebar={sidebar}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "linear-gradient(180deg, var(--green-50), var(--paper))", display: "grid", gridTemplateColumns: "1fr 380px" }}>
        {layer}
        {/* center grid */}
        <div style={{ display: "grid", placeItems: "center", padding: 24, overflow: "hidden" }}>
          <div style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 18,
            padding: 14,
            boxShadow: "var(--shadow-md)",
          }}>
            {Array.from({ length: SIZE }, (_, r) => (
              <div key={r} style={{ display: "flex" }}>
                {Array.from({ length: SIZE }, (_, c) => {
                  const isGoal = r === GOAL.r && c === GOAL.c;
                  const coinIdx = COINS.findIndex((co) => co.r === r && co.c === c);
                  const hasCoin = coinIdx >= 0 && !collected[coinIdx];
                  const isRobot = robot.r === r && robot.c === c;
                  const isWall = WALLS.includes(`${r},${c}`);
                  return (
                    <div key={c} style={{
                      width: 48, height: 48, margin: 3,
                      background: isWall ? "var(--ink-700)" : isGoal ? "var(--green-100)" : (r + c) % 2 === 0 ? "var(--ink-50)" : "var(--paper)",
                      borderRadius: 8,
                      display: "grid", placeItems: "center",
                      position: "relative",
                      boxShadow: isWall ? "inset 0 -3px 0 var(--ink-900)" : "none",
                    }}>
                      {isGoal && !isRobot && <span style={{ fontSize: 24 }}>🏁</span>}
                      {hasCoin && <span style={{
                        width: 22, height: 22, borderRadius: 999,
                        background: "var(--sun-400)", boxShadow: "inset 0 -3px 0 var(--sun-500)",
                      }} />}
                      {isRobot && (
                        <div style={{
                          width: 36, height: 36, background: "var(--green-600)",
                          borderRadius: 10, display: "grid", placeItems: "center",
                          transform: `rotate(${robot.dir * 90}deg)`,
                          transition: "transform 150ms",
                          color: "#fff", fontSize: 14, fontWeight: 800,
                          boxShadow: "inset 0 -3px 0 var(--green-700)",
                        }}>▲</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* right column · program tree */}
        <div style={{
          borderLeft: "1px solid var(--ink-100)",
          background: "var(--paper-2)",
          display: "flex", flexDirection: "column", minHeight: 0,
        }}>
          <div style={{
            padding: "10px 16px",
            borderBottom: "1px solid var(--ink-100)",
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--ink-50)",
          }}>
            <span className="gp-eyebrow">PROGRAM · {totalBlocks} BLOCKS</span>
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, fontSize: 11 }}>
              <button
                onClick={() => setCompact(false)}
                style={{
                  background: !compact ? "var(--ink-900)" : "transparent",
                  color: !compact ? "#fff" : "var(--ink-500)",
                  border: "none", padding: "3px 10px", borderRadius: 6,
                  fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, cursor: "pointer",
                }}>FULL</button>
              <button
                onClick={() => setCompact(true)}
                style={{
                  background: compact ? "var(--ink-900)" : "transparent",
                  color: compact ? "#fff" : "var(--ink-500)",
                  border: "none", padding: "3px 10px", borderRadius: 6,
                  fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 10, cursor: "pointer",
                }}>COMPACT</button>
            </span>
          </div>
          <div style={{
            flex: 1, overflow: "auto", padding: "12px 16px",
            minHeight: 0,
          }}>
            {tree.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--ink-400)", fontSize: 13 }}>
                Add blocks from the palette →
              </div>
            ) : compact ? (
              <div style={{ lineHeight: 1.7 }}>{renderNodes(tree, 0)}</div>
            ) : (
              renderNodes(tree, 0)
            )}
          </div>
        </div>
        {/* status overlay */}
        {status && (
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(10,26,16,0.55)",
            display: "grid", placeItems: "center",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{
              background: "var(--paper-2)", borderRadius: 18,
              padding: "28px 36px", textAlign: "center",
              boxShadow: "var(--shadow-lg)",
              maxWidth: 360,
            }} className="gp-pop">
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: status === "win" ? "var(--green-600)" : "var(--coral-500)",
                color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 14px",
              }}>{status === "win" ? <Icon.Check s={32} /> : <Icon.XThick s={32} />}</div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 20 }}>
                {status === "win" ? "Mission complete!" : "Try again"}
              </h3>
              <p style={{ margin: "6px 0 18px", fontSize: 13, color: "var(--ink-500)" }}>
                {status === "win" ? `Ran ${programSteps} steps using only ${totalBlocks} blocks.` : "Robot didn't make it. Check your loops and turns."}
              </p>
              <button onClick={reset} className="gp-btn" style={{ padding: "10px 22px" }}>
                {status === "win" ? "Continue" : "Try again"}
              </button>
            </div>
          </div>
        )}
      </div>
    </FullscreenShell>
  );
}

// ─── WORLD 3D · FULLSCREEN ────────────────────────────────────────
function World3DFullscreen() {
  const SIZE = 6;
  const START = { r: 5, c: 0 };
  const GOAL = { r: 0, c: 5 };
  const [pos, setPos] = useStateF(START);
  const [steps, setSteps] = useStateF(0);
  const [status, setStatus] = useStateF(null);
  const { fire, layer } = useConfetti();

  const move = (dr, dc) => {
    if (status) return;
    const r = Math.max(0, Math.min(SIZE - 1, pos.r + dr));
    const c = Math.max(0, Math.min(SIZE - 1, pos.c + dc));
    if (r === pos.r && c === pos.c) return;
    setPos({ r, c }); setSteps(steps + 1);
    if (r === GOAL.r && c === GOAL.c) { setStatus("win"); fire(); }
  };
  const reset = () => { setPos(START); setSteps(0); setStatus(null); };

  // isometric projection
  const TILE = 56;
  const projX = (r, c) => (c - r) * TILE * 0.86;
  const projY = (r, c) => (c + r) * TILE * 0.5;

  const sidebar = (
    <div style={{ padding: "18px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="gp-eyebrow">3D WORLD · LEVEL 2</div>
      <h3 style={{ margin: "4px 0 8px", fontWeight: 800, fontSize: 16 }}>Walk to the flag</h3>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>
        Move the explorer using the directional pad. Try to take the fewest steps possible.
      </p>
      <div style={{ marginTop: 22, padding: 16, background: "var(--ink-50)", borderRadius: 12 }}>
        <div className="gp-eyebrow">Telemetry</div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Stat label="Steps" v={steps} accent="var(--green-600)" />
          <Stat label="Goal dist" v={Math.abs(pos.r - GOAL.r) + Math.abs(pos.c - GOAL.c)} accent="var(--sun-700)" />
          <Stat label="Position" v={`${pos.r},${pos.c}`} mono />
          <Stat label="Best" v="—" mono />
        </div>
      </div>
      <div style={{ flex: 1 }} />
      <button onClick={reset} className="gp-btn ghost" style={{ padding: "10px 0", fontSize: 13 }}>Reset position</button>
    </div>
  );

  return (
    <FullscreenShell breadcrumb="EXPLORER · CHAPTER 1 · LEVEL 2 / 5" title="3D Walk" progress={28} hearts={5} streak={3} sidebar={sidebar}>
      <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #d4f1c4 0%, #ecf9e7 60%, #fafbf6 100%)" }}>
        {layer}
        <svg viewBox="-300 -60 600 460" style={{ width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8fd770"/>
              <stop offset="100%" stopColor="#6bc44d"/>
            </linearGradient>
            <radialGradient id="sky" cx="50%" cy="20%" r="60%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.5)"/>
              <stop offset="100%" stopColor="rgba(255,255,255,0)"/>
            </radialGradient>
          </defs>
          <rect x="-300" y="-60" width="600" height="460" fill="url(#sky)"/>
          {Array.from({ length: SIZE }, (_, r) =>
            Array.from({ length: SIZE }, (_, c) => {
              const x = projX(r, c), y = projY(r, c);
              const isGoal = r === GOAL.r && c === GOAL.c;
              const fill = isGoal ? "url(#tg2)" : (r + c) % 2 === 0 ? "#b6e69e" : "#8fd770";
              return (
                <g key={`${r},${c}`} transform={`translate(${x}, ${y})`}>
                  <polygon points={`0,-${TILE*0.5} ${TILE*0.86},0 0,${TILE*0.5} -${TILE*0.86},0`} fill={fill} stroke="#0a8754" strokeWidth="0.5"/>
                  <polygon points={`-${TILE*0.86},0 0,${TILE*0.5} 0,${TILE*0.5+8} -${TILE*0.86},8`} fill="#07683f" opacity="0.5"/>
                  <polygon points={`${TILE*0.86},0 0,${TILE*0.5} 0,${TILE*0.5+8} ${TILE*0.86},8`} fill="#054d2f" opacity="0.6"/>
                  {isGoal && (
                    <g transform={`translate(0, ${-36})`}>
                      <rect x="-1" y="-26" width="2" height="26" fill="#1a2a1f"/>
                      <polygon points="1,-26 22,-18 1,-10" fill="#ff7a5c"/>
                    </g>
                  )}
                </g>
              );
            })
          )}
          <g transform={`translate(${projX(pos.r, pos.c)}, ${projY(pos.r, pos.c) - 40})`} style={{ transition: "transform 240ms cubic-bezier(0.2,0.8,0.2,1)" }}>
            <ellipse cx="0" cy="42" rx="20" ry="6" fill="rgba(0,0,0,0.3)"/>
            <rect x="-14" y="0" width="28" height="42" rx="8" fill="#0a8754"/>
            <rect x="-14" y="0" width="28" height="12" rx="8" fill="#054d2f"/>
            <circle cx="0" cy="-10" r="13" fill="#ffd84d"/>
            <circle cx="-4" cy="-12" r="2" fill="#1a2a1f"/>
            <circle cx="4" cy="-12" r="2" fill="#1a2a1f"/>
            <path d="M -3 -7 Q 0 -5 3 -7" stroke="#1a2a1f" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          </g>
        </svg>
        {/* d-pad bottom right */}
        <div style={{
          position: "absolute", bottom: 24, right: 24,
          display: "grid", gridTemplateColumns: "repeat(3, 64px)", gridTemplateRows: "repeat(3, 64px)", gap: 6,
        }}>
          <div /><DPadKey arrow="↑" onClick={() => move(-1, 0)} /><div />
          <DPadKey arrow="←" onClick={() => move(0, -1)} /><div /><DPadKey arrow="→" onClick={() => move(0, 1)} />
          <div /><DPadKey arrow="↓" onClick={() => move(1, 0)} /><div />
        </div>
        {/* steps badge */}
        <div style={{
          position: "absolute", top: 18, left: 18,
          padding: "8px 14px", borderRadius: 999,
          background: "rgba(10,26,16,0.75)", color: "#fff",
          fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 12,
          letterSpacing: "0.06em",
        }}>STEPS · {steps}</div>

        {status === "win" && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(10,26,16,0.55)", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }}>
            <div className="gp-pop" style={{ background: "var(--paper-2)", borderRadius: 18, padding: "26px 36px", textAlign: "center", boxShadow: "var(--shadow-lg)" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green-600)", color: "#fff", display: "grid", placeItems: "center", margin: "0 auto 14px" }}>
                <Icon.Check s={32} />
              </div>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: 20 }}>Reached the flag!</h3>
              <p style={{ margin: "6px 0 16px", color: "var(--ink-500)" }}>You did it in <b style={{ color: "var(--ink-900)" }}>{steps}</b> steps.</p>
              <button onClick={reset} className="gp-btn">Continue</button>
            </div>
          </div>
        )}
      </div>
    </FullscreenShell>
  );
}

function Stat({ label, v, accent = "var(--ink-900)", mono = true }) {
  return (
    <div>
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em",
        textTransform: "uppercase", color: "var(--ink-400)", fontWeight: 700,
      }}>{label}</div>
      <div style={{
        fontFamily: mono ? "var(--font-mono)" : "var(--font-sans)",
        fontSize: 17, fontWeight: 800, color: accent, marginTop: 2,
        fontVariantNumeric: "tabular-nums",
      }}>{v}</div>
    </div>
  );
}
function DPadKey({ arrow, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--paper-2)", border: "none", borderRadius: 14,
        boxShadow: "0 4px 0 0 var(--ink-200)",
        cursor: "pointer", fontSize: 24, fontWeight: 800, color: "var(--ink-700)",
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = "0 2px 0 0 var(--ink-200)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 0 0 var(--ink-200)"; }}
    >{arrow}</button>
  );
}

// ─── SCORM · FULLSCREEN ───────────────────────────────────────────
function SCORMFullscreen() {
  // Minimal chrome — SCORM modules own their own UI. We just show the LMS
  // wrapper above and let the embedded content take the whole frame.
  const SLIDES = [
    { title: "Identify hazards in the workplace", body: "Look for trip hazards, exposed wiring, and missing PPE. Take 30 seconds to scan before starting any task.", color: "var(--green-500)", art: "🔍" },
    { title: "Apply the right PPE", body: "Goggles for grinding. Gloves for chemicals. Hard hat in any zone marked overhead-work.", color: "var(--sun-400)", art: "🦺" },
    { title: "Report incidents immediately", body: "Every near-miss matters. Use the green report board or scan the QR on your badge.", color: "var(--coral-500)", art: "🚨" },
    { title: "Practice the evacuation drill", body: "Two routes, one rally point. Don't take the elevator, ever.", color: "var(--green-700)", art: "🏃" },
  ];
  const [i, setI] = useStateF(0);
  const [completed, setCompleted] = useStateF(false);
  const { fire, layer } = useConfetti();

  const next = () => {
    if (i === SLIDES.length - 1) { setCompleted(true); fire(); }
    else setI(i + 1);
  };

  const sidebar = (
    <div style={{ padding: "18px", display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="gp-eyebrow">SCORM 1.2 · SAFETY-101</div>
      <h3 style={{ margin: "4px 0 4px", fontWeight: 800, fontSize: 16 }}>Workplace safety basics</h3>
      <p style={{ margin: 0, fontSize: 12, color: "var(--ink-500)", lineHeight: 1.45 }}>
        45 min · 4 modules · score saved to LMS on completion
      </p>
      <div className="gp-eyebrow" style={{ marginTop: 22, marginBottom: 8 }}>Outline</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {SLIDES.map((s, idx) => {
          const done = idx < i || completed;
          const active = idx === i && !completed;
          return (
            <div key={idx} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8,
              background: active ? "var(--green-50)" : "transparent",
              fontWeight: active ? 700 : 500,
              fontSize: 12.5,
              color: active ? "var(--green-800)" : "var(--ink-700)",
            }}>
              <span style={{
                width: 18, height: 18, borderRadius: 999,
                background: done ? "var(--green-600)" : active ? "transparent" : "var(--ink-100)",
                border: active ? "2px solid var(--green-500)" : "none",
                display: "grid", placeItems: "center",
                color: "#fff", flexShrink: 0,
              }}>{done ? <Icon.Check s={10} /> : null}</span>
              <span>{idx + 1}. {s.title}</span>
            </div>
          );
        })}
      </div>
      <div style={{ flex: 1 }} />
      <div style={{
        padding: 12, background: "var(--ink-50)", borderRadius: 10,
        fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-500)",
      }}>
        cmi.core.lesson_status<br/>
        → {completed ? <b style={{ color: "var(--green-700)" }}>completed</b> : "incomplete"}
      </div>
    </div>
  );

  return (
    <FullscreenShell breadcrumb="COMPLIANCE · ANNUAL TRAINING · MODULE 3 / 6" title="Workplace safety basics" progress={completed ? 100 : (i / SLIDES.length) * 100} hearts={5} streak={4} sidebar={sidebar}>
      <div style={{ flex: 1, position: "relative", display: "flex", flexDirection: "column", background: "#fafbf6", overflow: "hidden" }}>
        {layer}
        {/* SCORM chrome strip */}
        <div style={{
          padding: "8px 18px",
          background: "var(--ink-50)",
          borderBottom: "1px solid var(--ink-100)",
          display: "flex", alignItems: "center", gap: 10,
          fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-500)",
          letterSpacing: "0.04em",
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: completed ? "var(--green-500)" : "var(--sun-400)" }} />
          SCORM 1.2 · {completed ? "COMPLETED · 92/100" : `IN PROGRESS · SLIDE ${i + 1} / ${SLIDES.length}`}
          <span style={{ marginLeft: "auto" }}>module-safety-101.zip</span>
        </div>
        {/* embedded content */}
        {!completed ? (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: 48, minHeight: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div className="gp-eyebrow">Slide {i + 1} of {SLIDES.length}</div>
              <h2 style={{ margin: "8px 0 18px", fontSize: 32, fontWeight: 800, lineHeight: 1.15, textWrap: "pretty" }}>
                {SLIDES[i].title}
              </h2>
              <p style={{ margin: 0, fontSize: 16, color: "var(--ink-500)", lineHeight: 1.55, maxWidth: 420 }}>
                {SLIDES[i].body}
              </p>
              <div style={{ marginTop: 28 }}>
                <button onClick={next} className="gp-btn" style={{ padding: "14px 32px" }}>
                  {i === SLIDES.length - 1 ? "Finish module" : "Next slide →"}
                </button>
              </div>
            </div>
            <div style={{
              borderRadius: 18,
              background: `linear-gradient(135deg, ${SLIDES[i].color}, var(--ink-700))`,
              display: "grid", placeItems: "center",
              boxShadow: "var(--shadow-md)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ fontSize: 140 }}>{SLIDES[i].art}</div>
              <div style={{
                position: "absolute", bottom: 16, right: 18,
                fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.5)", fontSize: 11, letterSpacing: "0.1em",
              }}>SLIDE · {i + 1}</div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
            <div className="gp-pop" style={{ textAlign: "center", maxWidth: 460 }}>
              <div style={{
                width: 96, height: 96, borderRadius: "50%",
                background: "var(--green-600)", color: "#fff",
                display: "grid", placeItems: "center", margin: "0 auto 18px",
                boxShadow: "var(--shadow-lg)",
              }}><Icon.Check s={48} /></div>
              <h2 style={{ margin: 0, fontWeight: 800, fontSize: 32, color: "var(--green-800)" }}>Module complete</h2>
              <p style={{ margin: "8px 0 22px", fontSize: 15, color: "var(--ink-500)" }}>
                Score <b style={{ color: "var(--ink-900)" }}>92 / 100</b> reported back to the LMS.
              </p>
              <button onClick={() => { setI(0); setCompleted(false); }} className="gp-btn ghost" style={{ marginRight: 10 }}>Review</button>
              <button className="gp-btn">Continue course</button>
            </div>
          </div>
        )}
        {/* progress strip */}
        <div style={{ height: 6, background: "var(--ink-100)" }}>
          <div style={{
            height: "100%",
            width: `${completed ? 100 : ((i + 1) / SLIDES.length) * 100}%`,
            background: "var(--green-600)",
            transition: "width 400ms",
          }} />
        </div>
      </div>
    </FullscreenShell>
  );
}

Object.assign(window, {
  FullscreenShell, Robot2DFullscreen, World3DFullscreen, SCORMFullscreen,
});
