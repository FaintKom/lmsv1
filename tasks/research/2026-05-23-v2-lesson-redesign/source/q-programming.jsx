// q-programming.jsx — programming family
// CodeChallenge, WebEditor, Robot2D, World3D

const { useState: useStateP, useRef: useRefP, useEffect: useEffectP, useMemo: useMemoP } = React;

// ─── 16. CODE CHALLENGE ───────────────────────────────────────────
function CodeChallengeExerciseV2() {
  const PROBLEM = {
    title: "Two Sum",
    desc: "Given an array of integers and a target, return the indices of the two numbers that add up to the target.",
    starter: `def two_sum(nums, target):\n    # write your solution\n    pass`,
    examples: [
      { input: "[2, 7, 11, 15], target = 9", output: "[0, 1]" },
      { input: "[3, 2, 4], target = 6", output: "[1, 2]" },
    ],
    tests: [
      { id: 1, name: "small", passed: true, time: 12 },
      { id: 2, name: "duplicates", passed: true, time: 9 },
      { id: 3, name: "negatives", passed: false, time: 14, expected: "[0, 3]", actual: "[]" },
      { id: 4, name: "large input", passed: false, time: 240, hidden: true },
    ],
  };
  const [code, setCode] = useStateP(PROBLEM.starter);
  const [tab, setTab] = useStateP("output");
  const [running, setRunning] = useStateP(false);
  const [submitted, setSubmitted] = useStateP(false);
  const [fb, setFb] = useStateP(null);
  const { fire, layer } = useConfetti();

  const run = () => {
    setRunning(true); setTab("output");
    setTimeout(() => setRunning(false), 500);
  };
  const submit = () => {
    setRunning(true); setTab("tests");
    setTimeout(() => {
      setRunning(false); setSubmitted(true);
      const passed = PROBLEM.tests.filter((t) => t.passed).length;
      const total = PROBLEM.tests.length;
      if (passed === total) { setFb({ kind: "ok", msg: `${passed}/${total} tests passed.` }); fire(); }
      else setFb({ kind: "no", msg: `${passed}/${total} tests passed.`, explain: "Check the negative-numbers case." });
    }, 700);
  };
  const cont = () => { setFb(null); setSubmitted(false); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={6} step={6} totalSteps={12}
        eyebrow="PYTHON · ARRAYS"
        title={PROBLEM.title}
        feedback={fb}
        canCheck={!running && code.trim().length > 0}
        onCheck={submit}
        onContinue={cont}
        checkLabel="Submit"
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 14, height: "100%", minHeight: 320 }}>
          {/* Left — problem + examples */}
          <div style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            padding: 18,
            fontSize: 13.5,
            lineHeight: 1.55,
            overflowY: "auto",
          }}>
            <p style={{ margin: "0 0 14px 0", color: "var(--ink-700)" }}>{PROBLEM.desc}</p>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>Examples</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PROBLEM.examples.map((ex, i) => (
                <div key={i} style={{ background: "var(--ink-50)", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-500)" }}>Input:</div>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-900)" }}>{ex.input}</code>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-500)", marginTop: 6 }}>Output:</div>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-900)" }}>{ex.output}</code>
                </div>
              ))}
            </div>
          </div>
          {/* Right — editor + output */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select style={{
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 10,
                padding: "6px 10px",
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--ink-700)",
              }}>
                <option>Python 3</option>
                <option>JavaScript</option>
                <option>Go</option>
              </select>
              <button
                onClick={run}
                disabled={running}
                style={{
                  background: "var(--paper-2)",
                  border: "2px solid var(--ink-200)",
                  borderRadius: 10,
                  padding: "6px 12px",
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink-700)",
                  cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              ><Icon.Play s={12} /> Run</button>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)" }}>
                solution.py
              </span>
            </div>
            <div style={{
              flex: "1 1 200px",
              minHeight: 0,
              background: "#1a2a1f",
              borderRadius: 12,
              padding: 14,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.55,
              color: "#d4f1c4",
              overflow: "auto",
              position: "relative",
            }}>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                style={{
                  width: "100%", height: "100%",
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  color: "#d4f1c4",
                  fontFamily: "inherit",
                  fontSize: "inherit",
                  lineHeight: "inherit",
                }}
              />
            </div>
            {/* output / tests panel */}
            <div style={{
              background: "var(--ink-50)",
              borderRadius: 12,
              border: "2px solid var(--ink-100)",
              minHeight: 110,
              maxHeight: 150,
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", borderBottom: "1px solid var(--ink-100)" }}>
                {["output", "tests"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: "8px 14px",
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: tab === t ? "var(--green-700)" : "var(--ink-400)",
                      borderBottom: tab === t ? "2px solid var(--green-600)" : "2px solid transparent",
                    }}
                  >{t}{t === "tests" && submitted ? ` · ${PROBLEM.tests.filter((tc)=>tc.passed).length}/${PROBLEM.tests.length}` : ""}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 10, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {tab === "output" ? (
                  running ? <span style={{ color: "var(--ink-400)" }}>Running…</span>
                  : <span style={{ color: "var(--ink-500)" }}>{"> "}Press Run to test.</span>
                ) : !submitted ? (
                  <span style={{ color: "var(--ink-400)" }}>Submit to run all test cases.</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {PROBLEM.tests.map((t) => (
                      <div key={t.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "4px 8px",
                        background: t.passed ? "var(--green-50)" : "var(--coral-50)",
                        borderRadius: 6,
                        color: t.passed ? "var(--green-800)" : "var(--coral-700)",
                      }}>
                        <span style={{
                          width: 14, height: 14, borderRadius: 999, background: t.passed ? "var(--green-600)" : "var(--coral-500)",
                          display: "grid", placeItems: "center", color: "#fff",
                        }}>{t.passed ? <Icon.Check s={10} /> : <Icon.XThick s={10} />}</span>
                        <span style={{ flex: 1 }}>{t.hidden ? "Hidden test" : `Test ${t.id} · ${t.name}`}</span>
                        <span style={{ opacity: 0.7 }}>{t.time}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 17. WEB EDITOR (HTML/CSS/JS w/ live preview) ─────────────────
function WebEditorExerciseV2() {
  const [tab, setTab] = useStateP("html");
  const [html, setHtml] = useStateP(`<button class="btn">Click me</button>`);
  const [css, setCss] = useStateP(`.btn {\n  background: #0a8754;\n  color: #fff;\n  border: none;\n  padding: 12px 24px;\n  border-radius: 14px;\n  font-size: 15px;\n  font-weight: 700;\n  cursor: pointer;\n  box-shadow: 0 4px 0 0 #07683f;\n}`);
  const [fb, setFb] = useStateP(null);
  const { fire, layer } = useConfetti();
  const code = { html, css, js: "" };
  const srcDoc = `<html><head><style>${code.css}</style></head><body style="display:grid;place-items:center;height:100vh;background:#fafbf6;margin:0">${code.html}</body></html>`;

  const check = () => {
    const ok = /background\s*:\s*#0a8754/i.test(css) && /padding\s*:/.test(css) && /<button/i.test(html);
    if (ok) { setFb({ kind: "ok", msg: "All requirements met!" }); fire(); }
    else setFb({ kind: "no", msg: "Check the requirements panel." });
  };
  const cont = () => setFb(null);
  const reqs = [
    { text: "Has a <button> element", ok: /<button/i.test(html) },
    { text: "Brand green background", ok: /background\s*:\s*#0a8754/i.test(css) },
    { text: "Has padding & border-radius", ok: /padding\s*:/.test(css) && /border-radius/i.test(css) },
  ];

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={2} step={5} totalSteps={12}
        eyebrow="HTML/CSS · STYLING"
        title="Build a brand button"
        feedback={fb}
        canCheck={true}
        onCheck={check}
        onContinue={cont}
        checkLabel="Submit"
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, height: "100%" }}>
          {/* code panel */}
          <div style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--ink-100)" }}>
              {["html", "css", "js"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: "10px 16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12, fontWeight: 700,
                    cursor: "pointer",
                    color: tab === t ? "var(--green-700)" : "var(--ink-400)",
                    borderBottom: tab === t ? "2px solid var(--green-600)" : "2px solid transparent",
                    textTransform: "lowercase",
                  }}>{t}</button>
              ))}
              <span style={{ marginLeft: "auto", padding: "10px 12px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)" }}>
                {tab}.{tab === "js" ? "js" : tab}
              </span>
            </div>
            <textarea
              value={tab === "html" ? html : tab === "css" ? css : ""}
              onChange={(e) => {
                if (tab === "html") setHtml(e.target.value);
                else if (tab === "css") setCss(e.target.value);
              }}
              spellCheck={false}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                padding: 14,
                fontFamily: "var(--font-mono)",
                fontSize: 12.5,
                lineHeight: 1.55,
                background: "#1a2a1f",
                color: "#d4f1c4",
                resize: "none",
              }}
            />
          </div>
          {/* preview + reqs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
            <div style={{
              flex: 1,
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              overflow: "hidden",
              minHeight: 0,
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--ink-100)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--coral-300)" }} />
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--sun-300)" }} />
                <span style={{ width: 10, height: 10, borderRadius: 999, background: "var(--green-300)" }} />
                <span style={{ marginLeft: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)" }}>preview</span>
              </div>
              <iframe srcDoc={srcDoc} style={{ flex: 1, border: "none", width: "100%", background: "var(--paper)" }} />
            </div>
            <div style={{
              background: "var(--paper-2)",
              border: "2px solid var(--ink-100)",
              borderRadius: 14,
              padding: 12,
              display: "flex", flexDirection: "column", gap: 6,
            }}>
              <div className="gp-eyebrow">Requirements</div>
              {reqs.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                  <span style={{
                    width: 16, height: 16, borderRadius: 999,
                    background: r.ok ? "var(--green-600)" : "var(--ink-200)",
                    color: "#fff",
                    display: "grid", placeItems: "center",
                  }}><Icon.Check s={10} /></span>
                  <span style={{ color: r.ok ? "var(--green-800)" : "var(--ink-500)", fontWeight: r.ok ? 700 : 500 }}>{r.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 18. ROBOT 2D (Blockly-style grid) ────────────────────────────
function Robot2DExerciseV2() {
  const SIZE = 6;
  const START = { r: 5, c: 0, dir: 1 }; // dir 0=N 1=E 2=S 3=W
  const GOAL = { r: 0, c: 5 };
  const COINS = [{ r: 3, c: 2 }, { r: 1, c: 4 }];
  const [robot, setRobot] = useStateP(START);
  const [collected, setCollected] = useStateP({});
  const [blocks, setBlocks] = useStateP([
    { id: 1, type: "forward", n: 3 },
    { id: 2, type: "turn-right" },
    { id: 3, type: "forward", n: 5 },
  ]);
  const [running, setRunning] = useStateP(false);
  const [fb, setFb] = useStateP(null);
  const { fire, layer } = useConfetti();

  const DR = [-1, 0, 1, 0], DC = [0, 1, 0, -1];

  const run = async () => {
    if (running) return;
    setRunning(true);
    let r = START.r, c = START.c, dir = START.dir;
    const got = {};
    setRobot({ r, c, dir });
    setCollected({});
    for (const b of blocks) {
      if (b.type === "forward") {
        for (let i = 0; i < (b.n || 1); i++) {
          await new Promise((res) => setTimeout(res, 250));
          r = Math.max(0, Math.min(SIZE - 1, r + DR[dir]));
          c = Math.max(0, Math.min(SIZE - 1, c + DC[dir]));
          const coinHit = COINS.findIndex((co) => co.r === r && co.c === c);
          if (coinHit >= 0) got[coinHit] = true;
          setRobot({ r, c, dir });
          setCollected({ ...got });
        }
      } else if (b.type === "turn-right") {
        await new Promise((res) => setTimeout(res, 150));
        dir = (dir + 1) % 4; setRobot({ r, c, dir });
      } else if (b.type === "turn-left") {
        await new Promise((res) => setTimeout(res, 150));
        dir = (dir + 3) % 4; setRobot({ r, c, dir });
      }
    }
    setRunning(false);
    const won = r === GOAL.r && c === GOAL.c;
    const coinsAll = Object.keys(got).length === COINS.length;
    if (won && coinsAll) { setFb({ kind: "ok", msg: "Reached the goal with all coins!" }); fire(); }
    else if (won) setFb({ kind: "no", msg: "Reached the goal — but you missed a coin.", explain: "Collect all coins on the way." });
    else setFb({ kind: "no", msg: "Robot didn't reach the goal.", explain: `Goal is at row ${GOAL.r}, col ${GOAL.c}.` });
  };

  const cont = () => {
    setFb(null); setRobot(START); setCollected({});
  };

  const addBlock = (t) => {
    if (running || fb) return;
    setBlocks([...blocks, { id: Date.now(), type: t, ...(t === "forward" ? { n: 1 } : {}) }]);
  };
  const removeBlock = (id) => {
    if (running || fb) return;
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const BLOCK_LABEL = {
    forward: { label: "move forward", color: "var(--green-500)", shadow: "var(--green-700)" },
    "turn-right": { label: "turn right", color: "var(--sun-400)", shadow: "var(--sun-500)" },
    "turn-left": { label: "turn left", color: "var(--sun-400)", shadow: "var(--sun-500)" },
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={5}
        eyebrow="ROBOT · LEVEL 4"
        title="Drive the robot to the goal"
        feedback={fb}
        canCheck={blocks.length > 0 && !running}
        onCheck={run}
        onContinue={cont}
        checkLabel={running ? "Running…" : "Run"}
        showSkip={false}
      >
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, height: "100%" }}>
          {/* grid */}
          <div style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            padding: 8,
            alignSelf: "start",
          }}>
            {Array.from({ length: SIZE }, (_, r) => (
              <div key={r} style={{ display: "flex" }}>
                {Array.from({ length: SIZE }, (_, c) => {
                  const isGoal = r === GOAL.r && c === GOAL.c;
                  const coinIdx = COINS.findIndex((co) => co.r === r && co.c === c);
                  const hasCoin = coinIdx >= 0 && !collected[coinIdx];
                  const isRobot = robot.r === r && robot.c === c;
                  return (
                    <div key={c} style={{
                      width: 40, height: 40, margin: 2,
                      background: isGoal ? "var(--green-100)" : (r + c) % 2 === 0 ? "var(--ink-50)" : "var(--paper)",
                      borderRadius: 6,
                      display: "grid", placeItems: "center",
                      position: "relative",
                    }}>
                      {isGoal && !isRobot && <span style={{ fontSize: 22 }}>🏁</span>}
                      {hasCoin && <span style={{
                        width: 18, height: 18, borderRadius: 999,
                        background: "var(--sun-400)",
                        boxShadow: "inset 0 -2px 0 var(--sun-500)",
                      }} />}
                      {isRobot && (
                        <div style={{
                          width: 30, height: 30,
                          background: "var(--green-600)",
                          borderRadius: 8,
                          display: "grid", placeItems: "center",
                          transform: `rotate(${robot.dir * 90}deg)`,
                          transition: "transform 150ms, top 250ms, left 250ms",
                          color: "#fff",
                        }}>▲</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* block editor */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>Your program</div>
            <div style={{
              flex: 1,
              background: "var(--ink-50)",
              borderRadius: 12,
              padding: 10,
              minHeight: 140,
              display: "flex", flexDirection: "column", gap: 6,
              overflow: "auto",
              marginBottom: 12,
            }}>
              {blocks.length === 0 ? (
                <span style={{ color: "var(--ink-400)", fontSize: 13, textAlign: "center", padding: 20 }}>
                  Drag blocks here ↓
                </span>
              ) : blocks.map((b, i) => {
                const meta = BLOCK_LABEL[b.type];
                return (
                  <div key={b.id} style={{
                    background: meta.color,
                    color: b.type.includes("turn") ? "var(--ink-900)" : "#fff",
                    padding: "10px 14px",
                    borderRadius: 10,
                    boxShadow: `0 3px 0 0 ${meta.shadow}`,
                    fontFamily: "var(--font-sans)",
                    fontWeight: 700, fontSize: 13,
                    display: "flex", alignItems: "center", gap: 10,
                  }}>
                    <span style={{
                      fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.7,
                      width: 18, textAlign: "center",
                    }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>
                      {meta.label}
                      {b.type === "forward" && (
                        <input
                          type="number" min={1} max={9} value={b.n}
                          onChange={(e) => setBlocks(blocks.map((bl) => bl.id === b.id ? { ...bl, n: Math.max(1, Math.min(9, +e.target.value || 1)) } : bl))}
                          disabled={running || !!fb}
                          style={{
                            width: 36, marginLeft: 6,
                            background: "rgba(255,255,255,0.3)",
                            border: "none", borderRadius: 4,
                            color: "inherit", textAlign: "center",
                            fontFamily: "var(--font-mono)", fontWeight: 700,
                            padding: "2px 4px",
                          }}
                        /> 
                      )}
                      {b.type === "forward" && <span> step{b.n > 1 ? "s" : ""}</span>}
                    </span>
                    <button
                      onClick={() => removeBlock(b.id)}
                      disabled={running || !!fb}
                      style={{
                        background: "rgba(0,0,0,0.15)", border: "none",
                        width: 22, height: 22, borderRadius: 999,
                        color: "inherit", cursor: "pointer",
                        display: "grid", placeItems: "center",
                      }}><Icon.X s={12} /></button>
                  </div>
                );
              })}
            </div>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>Block palette</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["forward", "turn-right", "turn-left"].map((t) => {
                const meta = BLOCK_LABEL[t];
                return (
                  <button
                    key={t}
                    onClick={() => addBlock(t)}
                    disabled={running || !!fb}
                    style={{
                      background: meta.color,
                      color: t.includes("turn") ? "var(--ink-900)" : "#fff",
                      padding: "8px 14px",
                      borderRadius: 10,
                      border: "none",
                      boxShadow: `0 3px 0 0 ${meta.shadow}`,
                      fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 12,
                      cursor: "pointer",
                    }}
                  >+ {meta.label}</button>
                );
              })}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 19. WORLD 3D (isometric placeholder) ─────────────────────────
function World3DExerciseV2() {
  // Visual: isometric grid w/ a few blocks. User clicks "move N/E/S/W" buttons
  // to shift a character toward a flag. Simplified — focus is on visual upgrade.
  const SIZE = 5;
  const START = { r: 4, c: 0 };
  const GOAL = { r: 0, c: 4 };
  const [pos, setPos] = useStateP(START);
  const [steps, setSteps] = useStateP(0);
  const [fb, setFb] = useStateP(null);
  const { fire, layer } = useConfetti();

  const move = (dr, dc) => {
    if (fb) return;
    const r = Math.max(0, Math.min(SIZE - 1, pos.r + dr));
    const c = Math.max(0, Math.min(SIZE - 1, pos.c + dc));
    if (r === pos.r && c === pos.c) return;
    setPos({ r, c });
    setSteps(steps + 1);
    if (r === GOAL.r && c === GOAL.c) {
      setTimeout(() => { setFb({ kind: "ok", msg: `Reached the goal in ${steps + 1} steps.` }); fire(); }, 200);
    }
  };
  const cont = () => { setFb(null); setPos(START); setSteps(0); };

  // isometric projection
  const TILE = 38;
  const projX = (r, c) => (c - r) * TILE * 0.85;
  const projY = (r, c) => (c + r) * TILE * 0.5;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={5}
        eyebrow="3D WORLD · LEVEL 2"
        title="Walk to the flag"
        feedback={fb}
        canCheck={false}
        onCheck={() => {}}
        onContinue={cont}
        showSkip={false}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 18 }}>
          <div style={{
            background: "linear-gradient(180deg, #d4f1c4 0%, #ecf9e7 100%)",
            border: "2px solid var(--ink-100)",
            borderRadius: 18,
            position: "relative",
            height: 360,
            overflow: "hidden",
          }}>
            <svg viewBox="-200 -40 400 320" style={{ width: "100%", height: "100%" }}>
              {/* sky */}
              <defs>
                <linearGradient id="tileGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8fd770"/>
                  <stop offset="100%" stopColor="#6bc44d"/>
                </linearGradient>
              </defs>
              {/* tiles in correct paint order (back to front) */}
              {Array.from({ length: SIZE }, (_, r) =>
                Array.from({ length: SIZE }, (_, c) => {
                  const x = projX(r, c), y = projY(r, c);
                  const isGoal = r === GOAL.r && c === GOAL.c;
                  return (
                    <g key={`${r},${c}`} transform={`translate(${x}, ${y})`}>
                      <polygon
                        points={`0,-${TILE*0.5} ${TILE*0.85},0 0,${TILE*0.5} -${TILE*0.85},0`}
                        fill={isGoal ? "url(#tileGrad)" : (r + c) % 2 === 0 ? "#b6e69e" : "#8fd770"}
                        stroke="#0a8754" strokeWidth="0.5" opacity="0.95"
                      />
                      {/* side faces for depth */}
                      <polygon
                        points={`-${TILE*0.85},0 0,${TILE*0.5} 0,${TILE*0.5+6} -${TILE*0.85},6`}
                        fill="#07683f" opacity="0.5"
                      />
                      <polygon
                        points={`${TILE*0.85},0 0,${TILE*0.5} 0,${TILE*0.5+6} ${TILE*0.85},6`}
                        fill="#054d2f" opacity="0.6"
                      />
                      {isGoal && (
                        <g transform={`translate(0, ${-26})`}>
                          <rect x="-1" y="-20" width="2" height="20" fill="#1a2a1f"/>
                          <polygon points="1,-20 18,-14 1,-8" fill="#ff7a5c"/>
                        </g>
                      )}
                    </g>
                  );
                })
              )}
              {/* character */}
              <g transform={`translate(${projX(pos.r, pos.c)}, ${projY(pos.r, pos.c) - 28})`} style={{ transition: "transform 240ms cubic-bezier(0.2,0.8,0.2,1)" }}>
                <ellipse cx="0" cy="32" rx="14" ry="4" fill="rgba(0,0,0,0.3)"/>
                <rect x="-10" y="0" width="20" height="30" rx="6" fill="#0a8754"/>
                <circle cx="0" cy="-6" r="9" fill="#ffd84d"/>
                <circle cx="-3" cy="-7" r="1.5" fill="#1a2a1f"/>
                <circle cx="3" cy="-7" r="1.5" fill="#1a2a1f"/>
              </g>
            </svg>
            <div style={{
              position: "absolute", bottom: 10, left: 10,
              padding: "4px 10px", borderRadius: 999,
              background: "rgba(10,26,16,0.7)", color: "#fff",
              fontFamily: "var(--font-mono)", fontWeight: 500, fontSize: 11,
            }}>STEPS · {steps}</div>
          </div>
          {/* d-pad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 56px)", gridTemplateRows: "repeat(3, 56px)", gap: 6, alignSelf: "center" }}>
            <div /><DPadBtn dir="N" onClick={() => move(-1, 0)} /><div />
            <DPadBtn dir="W" onClick={() => move(0, -1)} /><div /><DPadBtn dir="E" onClick={() => move(0, 1)} />
            <div /><DPadBtn dir="S" onClick={() => move(1, 0)} /><div />
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
function DPadBtn({ dir, onClick }) {
  const arrows = { N: "↑", S: "↓", E: "→", W: "←" };
  return (
    <button
      onClick={onClick}
      style={{
        background: "var(--paper-2)",
        border: "none",
        borderRadius: 14,
        boxShadow: "0 4px 0 0 var(--ink-200)",
        cursor: "pointer",
        fontSize: 22, fontWeight: 800,
        color: "var(--ink-700)",
        transition: "transform 100ms, box-shadow 100ms",
      }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = "0 2px 0 0 var(--ink-200)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 0 0 var(--ink-200)"; }}
    >{arrows[dir]}</button>
  );
}

Object.assign(window, {
  CodeChallengeExerciseV2, WebEditorExerciseV2,
  Robot2DExerciseV2, World3DExerciseV2,
});
