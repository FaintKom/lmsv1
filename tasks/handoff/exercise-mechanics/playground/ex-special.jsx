/* ex-special.jsx — CodeChallengeV2 + Robot2DV2 (batch 6 ports with audit fixes)

   CodeChallengeV2:
   - CC-01 Tab key indents (2 spaces) instead of throwing focus out of the
           editor — the single worst papercut for a code surface
   - CC-05 failing tests show expected vs actual (types carried the data,
           UI never rendered it)
   - CC-02 split panes stack on narrow containers
   - playground provides a tiny simulated runner so Run/Submit work live

   Robot2DV2:
   - RB-01 wall bumps are visible: the robot shakes, a "bonk!" chip pops,
           and the run aborts with a helpful message (upstream silently
           clamped — "forward 9" just slid along the wall)
   - RB-04 the currently-executing block highlights as the program runs
   - RB-03 forward-step count uses big +/− steppers, not a 36px number input
   - RB-02 grid cells size with the container; panels stack on narrow
*/

const { useState: useStateS, useRef: useRefS, useEffect: useEffectS } = React;

/* ════════════════ CODE CHALLENGE ════════════════ */
function CodeChallengeV2({ problem, languages, onRun, onSubmit, eyebrow, hint, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const langs = languages || [problem.language || "Python 3"];
  const [code, setCode] = useStateS(problem.starter);
  const [language, setLanguage] = useStateS(langs[0]);
  const [tab, setTab] = useStateS("output");
  const [running, setRunning] = useStateS(false);
  const [output, setOutput] = useStateS("");
  const [results, setResults] = useStateS(null);
  const [feedback, setFeedback] = useStateS(null);
  const [attemptsLeft, setAttemptsLeft] = useStateS(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateS(0);
  const [lostHeart, setLostHeart] = useStateS(false);
  const [streak, setStreak] = useStateS(initialStreak);
  const { fire, layer } = useConfetti();

  /* CC-01: Tab indents */
  const onEditorKey = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.currentTarget;
    const s = ta.selectionStart, eN = ta.selectionEnd;
    const next = code.slice(0, s) + "  " + code.slice(eN);
    setCode(next);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
  };

  const handleRun = async () => {
    if (!onRun || running) return;
    setRunning(true);
    setTab("output");
    try {
      const stdout = await onRun(code, language);
      setOutput(stdout);
    } catch (err) {
      setOutput(String(err));
    } finally {
      setRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!onSubmit || running) return;
    setRunning(true);
    setTab("tests");
    try {
      const r = await onSubmit(code, language);
      setResults(r);
      const passed = r.filter((t) => t.passed).length;
      const total = r.length;
      if (passed === total) {
        setFeedback({ kind: "ok", msg: usedAttempts === 0 ? passed + " / " + total + " tests passed — clean!" : "All " + total + " passing!" });
        setStreak((s) => s + 1);
        fire();
      } else {
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        setUsedAttempts((u) => u + 1);
        setLostHeart(true);
        setTimeout(() => setLostHeart(false), 500);
        if (remaining <= 0) {
          setFeedback({ kind: "no", msg: passed + " / " + total + " tests passed", explain: hint || "Out of tries — compare expected vs actual in the failing tests." });
          setStreak(0);
        } else {
          setFeedback({ kind: "no", msg: passed + " / " + total + " tests passed", explain: "The failing tests show what they expected. " + remaining + (remaining === 1 ? " try left." : " tries left.") });
        }
      }
    } finally {
      setRunning(false);
    }
  };

  const handleRetry = () => setFeedback(null);
  const handleContinue = () => {
    const passed = (results || []).filter((t) => t.passed).length;
    onFinish && onFinish({ correct: feedback && feedback.kind === "ok", passed, total: results ? results.length : 0, attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  };
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const passedCount = (results || []).filter((t) => t.passed).length;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={problem.title}
        feedback={feedback} canCheck={!running && code.trim().length > 0} checking={running && tab === "tests"}
        checkLabel="Submit" checkHint="Write some code first"
        onCheck={handleSubmit} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="cc-grid">
          {/* problem */}
          <div style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14, padding: 18, fontSize: 13.5, lineHeight: 1.55, overflowY: "auto", maxHeight: 420 }}>
            <p style={{ margin: "0 0 14px", color: "var(--ink-700)", fontWeight: 500 }}>{problem.desc}</p>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>Examples</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {problem.examples.map((ex, i) => (
                <div key={i} style={{ background: "var(--ink-50)", borderRadius: 8, padding: 10 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-500)" }}>input</div>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{ex.input}</code>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-500)", marginTop: 6 }}>output</div>
                  <code style={{ fontFamily: "var(--font-mono)", fontSize: 13 }}>{ex.output}</code>
                </div>
              ))}
            </div>
          </div>
          {/* editor + panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={!!feedback}
                aria-label="Language"
                style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 10, padding: "7px 10px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink-700)", minHeight: 36 }}>
                {langs.map((l) => <option key={l}>{l}</option>)}
              </select>
              <button type="button" onClick={handleRun} disabled={running || !onRun || !!feedback}
                style={{ background: "var(--paper-2)", border: "2px solid var(--ink-200)", borderRadius: 10, padding: "7px 14px", fontSize: 12, fontWeight: 700, color: "var(--ink-700)", cursor: running ? "default" : "pointer", display: "inline-flex", alignItems: "center", gap: 6, minHeight: 36 }}>
                {running && tab === "output" ? <span className="gp-spin" style={{ borderColor: "var(--ink-200)", borderTopColor: "var(--ink-500)" }}></span> : "▶"} Run
              </button>
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)" }}>{problem.filename || "solution.py"}</span>
            </div>
            <div style={{ flex: "1 1 180px", minHeight: 160, background: "#1a2a1f", borderRadius: 12, padding: 14 }}>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={onEditorKey}
                spellCheck={false} autoCapitalize="none" autoCorrect="off"
                disabled={!!feedback}
                aria-label="Code editor"
                style={{ width: "100%", height: "100%", minHeight: 140, background: "transparent", border: "none", outline: "none", resize: "none", color: "#d4f1c4", fontFamily: "var(--font-mono)", fontSize: 13, lineHeight: 1.55 }}
              ></textarea>
            </div>
            <div style={{ background: "var(--ink-50)", borderRadius: 12, border: "2px solid var(--ink-100)", minHeight: 110, maxHeight: 190, overflow: "hidden", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", borderBottom: "1px solid var(--ink-100)" }}>
                {["output", "tests"].map((tb) => (
                  <button key={tb} type="button" onClick={() => setTab(tb)}
                    style={{
                      background: "transparent", border: "none", padding: "9px 14px",
                      fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, cursor: "pointer",
                      color: tab === tb ? "var(--green-700)" : "var(--ink-400)",
                      borderBottom: tab === tb ? "2px solid var(--green-600)" : "2px solid transparent",
                    }}>
                    {tb}{tb === "tests" && results ? " · " + passedCount + "/" + results.length : ""}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 10, fontFamily: "var(--font-mono)", fontSize: 12 }}>
                {tab === "output" ? (
                  running ? <span style={{ color: "var(--ink-400)" }}>running…</span>
                    : output ? <pre style={{ margin: 0, whiteSpace: "pre-wrap", color: "var(--ink-700)" }}>{output}</pre>
                    : <span style={{ color: "var(--ink-500)" }}>&gt; press Run to test your code</span>
                ) : !results ? (
                  <span style={{ color: "var(--ink-400)" }}>Submit to run the tests</span>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {results.map((r) => (
                      <div key={r.id} style={{ padding: "5px 8px", background: r.passed ? "var(--green-50)" : "var(--coral-50)", borderRadius: 6, color: r.passed ? "var(--green-800)" : "var(--coral-700)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ width: 14, height: 14, borderRadius: 999, background: r.passed ? "var(--green-600)" : "var(--coral-500)", display: "grid", placeItems: "center", color: "#fff", fontSize: 9, fontWeight: 800, flex: "none" }}>{r.passed ? "✓" : "✕"}</span>
                          <span style={{ flex: 1 }}>{r.hidden ? "Hidden test" : "Test " + r.id + " · " + r.name}</span>
                          {r.time != null && <span style={{ opacity: 0.7 }}>{r.time}ms</span>}
                        </div>
                        {/* CC-05: expected vs actual */}
                        {!r.passed && !r.hidden && r.expected != null && (
                          <div style={{ marginTop: 3, marginLeft: 22, fontSize: 11.5 }}>
                            expected <b>{r.expected}</b> · got <b>{r.actual == null ? "nothing" : r.actual}</b>
                          </div>
                        )}
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

/* ════════════════ ROBOT 2D ════════════════ */
const RB_DR = [-1, 0, 1, 0];
const RB_DC = [0, 1, 0, -1];
const RB_META = {
  forward: { label: "move forward", color: "var(--green-500)", shadow: "var(--green-700)", light: false },
  "turn-right": { label: "turn right ↻", color: "var(--sun-400)", shadow: "var(--sun-500)", light: true },
  "turn-left": { label: "turn left ↺", color: "var(--sun-400)", shadow: "var(--sun-500)", light: true },
};

function Robot2DV2({ size = 6, start, goal, coins = [], paletteBlocks = ["forward", "turn-right", "turn-left"], starter = [], eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [robot, setRobot] = useStateS(start);
  const [collected, setCollected] = useStateS({});
  const [blocks, setBlocks] = useStateS(starter);
  const [running, setRunning] = useStateS(false);
  const [activeBlock, setActiveBlock] = useStateS(null); // RB-04
  const [bonk, setBonk] = useStateS(false); // RB-01
  const [feedback, setFeedback] = useStateS(null);
  const [attemptsLeft, setAttemptsLeft] = useStateS(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateS(0);
  const [lostHeart, setLostHeart] = useStateS(false);
  const [streak, setStreak] = useStateS(initialStreak);
  const aliveRef = useRefS(true);
  const { fire, layer } = useConfetti();

  useEffectS(() => () => { aliveRef.current = false; }, []);
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  const loseRound = (msg, explain) => {
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg, explain: explain + " The goal is at row " + (goal.r + 1) + ", column " + (goal.c + 1) + "." });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: msg + " — " + remaining + (remaining === 1 ? " try left" : " tries left"), explain });
    }
  };

  const runProgram = async () => {
    if (running) return;
    setRunning(true);
    let r = start.r, c = start.c, dir = start.dir;
    const got = {};
    setRobot({ r, c, dir });
    setCollected({});
    let crashed = false;
    for (let bi = 0; bi < blocks.length && !crashed; bi++) {
      const b = blocks[bi];
      if (!aliveRef.current) return;
      setActiveBlock(b.id);
      if (b.type === "forward") {
        for (let i = 0; i < (b.n || 1); i++) {
          await sleep(250);
          if (!aliveRef.current) return;
          const nr = r + RB_DR[dir], nc = c + RB_DC[dir];
          if (nr < 0 || nr >= size || nc < 0 || nc >= size) {
            /* RB-01: visible bump + abort */
            setBonk(true);
            setTimeout(() => setBonk(false), 600);
            crashed = true;
            break;
          }
          r = nr; c = nc;
          const coinIdx = coins.findIndex((co) => co.r === r && co.c === c);
          if (coinIdx >= 0) got[coinIdx] = true;
          setRobot({ r, c, dir });
          setCollected({ ...got });
        }
      } else {
        await sleep(150);
        if (!aliveRef.current) return;
        dir = b.type === "turn-right" ? (dir + 1) % 4 : (dir + 3) % 4;
        setRobot({ r, c, dir });
      }
    }
    setActiveBlock(null);
    setRunning(false);
    if (crashed) {
      loseRound("Bonk! The robot hit the wall", "The program kept going past the edge — count the squares again.");
      return;
    }
    const reachedGoal = r === goal.r && c === goal.c;
    const allCoins = Object.keys(got).length === coins.length;
    if (reachedGoal && allCoins) {
      setFeedback({ kind: "ok", msg: coins.length > 0 ? "Goal reached, every coin collected!" : "The robot made it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    loseRound(
      reachedGoal ? "Reached the goal — but missed a coin" : "The robot didn't reach the goal",
      reachedGoal ? "Plan a route that walks over every coin on the way." : "Watch where it ended up and adjust your blocks."
    );
  };

  const handleRetry = () => { setRobot(start); setCollected({}); setFeedback(null); };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", reachedGoal: robot.r === goal.r && robot.c === goal.c, coinsCollected: Object.keys(collected).length, total: coins.length, attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });

  const addBlock = (t) => {
    if (running || feedback) return;
    setBlocks((bs) => [...bs, { id: Date.now() + Math.random(), type: t, ...(t === "forward" ? { n: 1 } : {}) }]);
  };
  const removeBlock = (id) => {
    if (running || feedback) return;
    setBlocks((bs) => bs.filter((b) => b.id !== id));
  };
  const setSteps = (id, delta) => {
    if (running || feedback) return;
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, n: Math.max(1, Math.min(9, (b.n || 1) + delta)) } : b)));
  };

  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Program the robot to the flag"}
        feedback={feedback} canCheck={blocks.length > 0 && !running} checking={running}
        checkLabel={running ? "Running…" : "▶ Run"} checkHint="Add some blocks first"
        showSkip={false}
        onCheck={runProgram} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="cc-grid" style={{ gap: 16 }}>
          {/* grid */}
          <div className={bonk ? "rb-bonk" : ""} style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14, padding: 8, alignSelf: "start", position: "relative", maxWidth: 300, margin: "0 auto", width: "100%" }}>
            {bonk && <span className="tile-chip no" style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", zIndex: 5 }}>BONK!</span>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(" + size + ", 1fr)", gap: 4 }}>
              {Array.from({ length: size * size }, (_, idx) => {
                const r = Math.floor(idx / size), c = idx % size;
                const isGoal = r === goal.r && c === goal.c;
                const coinIdx = coins.findIndex((co) => co.r === r && co.c === c);
                const hasCoin = coinIdx >= 0 && !collected[coinIdx];
                const isRobot = robot.r === r && robot.c === c;
                return (
                  <div key={idx} style={{
                    aspectRatio: "1", borderRadius: 6,
                    background: isGoal ? "var(--green-100)" : (r + c) % 2 === 0 ? "var(--ink-50)" : "var(--paper)",
                    display: "grid", placeItems: "center", minWidth: 0,
                  }}>
                    {isGoal && !isRobot && <span style={{ fontSize: "clamp(14px, 4cqw, 22px)" }} aria-label="goal" role="img">🏁</span>}
                    {hasCoin && <span style={{ width: "42%", aspectRatio: "1", borderRadius: 999, background: "var(--sun-400)", boxShadow: "inset 0 -2px 0 var(--sun-500)" }} aria-label="coin" role="img"></span>}
                    {isRobot && (
                      <div style={{
                        width: "72%", aspectRatio: "1", background: "var(--green-600)", borderRadius: "22%",
                        display: "grid", placeItems: "center",
                        transform: "rotate(" + robot.dir * 90 + "deg)",
                        transition: "transform 150ms",
                        color: "#fff", fontSize: "clamp(10px, 3cqw, 16px)",
                        boxShadow: "0 2px 0 var(--green-800)",
                      }} aria-label="robot" role="img">▲</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* editor */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>Your program</div>
            <div style={{ flex: 1, background: "var(--ink-50)", borderRadius: 12, padding: 10, minHeight: 120, maxHeight: 240, display: "flex", flexDirection: "column", gap: 6, overflow: "auto", marginBottom: 12 }}>
              {blocks.length === 0 ? (
                <span style={{ color: "var(--ink-400)", fontSize: 13, textAlign: "center", padding: 20, fontWeight: 600 }}>Tap blocks below to add ↓</span>
              ) : (
                blocks.map((b, i) => {
                  const meta = RB_META[b.type];
                  const isActive = activeBlock === b.id;
                  return (
                    <div key={b.id} style={{
                      background: meta.color, color: meta.light ? "var(--ink-900)" : "#fff",
                      padding: "9px 12px", borderRadius: 10,
                      boxShadow: isActive ? "0 0 0 3px var(--ink-900), 0 3px 0 0 " + meta.shadow : "0 3px 0 0 " + meta.shadow,
                      fontWeight: 700, fontSize: 13,
                      display: "flex", alignItems: "center", gap: 8,
                      transition: "box-shadow 150ms, transform 150ms",
                      transform: isActive ? "scale(1.02)" : "none",
                    }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.7, width: 16, textAlign: "center", flex: "none" }}>{i + 1}</span>
                      <span style={{ flex: 1, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {meta.label}
                        {b.type === "forward" && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {/* RB-03 steppers */}
                            <button type="button" onClick={() => setSteps(b.id, -1)} disabled={running || !!feedback || (b.n || 1) <= 1}
                              aria-label="Fewer steps"
                              style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "rgba(0,0,0,0.18)", color: "inherit", fontWeight: 800, cursor: "pointer", display: "grid", placeItems: "center" }}>−</button>
                            <span style={{ fontFamily: "var(--font-mono)", minWidth: 16, textAlign: "center" }}>{b.n || 1}</span>
                            <button type="button" onClick={() => setSteps(b.id, 1)} disabled={running || !!feedback || (b.n || 1) >= 9}
                              aria-label="More steps"
                              style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: "rgba(0,0,0,0.18)", color: "inherit", fontWeight: 800, cursor: "pointer", display: "grid", placeItems: "center" }}>+</button>
                            <span>step{(b.n || 1) > 1 ? "s" : ""}</span>
                          </span>
                        )}
                      </span>
                      <button type="button" onClick={() => removeBlock(b.id)} disabled={running || !!feedback}
                        aria-label="Remove block"
                        style={{ background: "rgba(0,0,0,0.15)", border: "none", width: 24, height: 24, borderRadius: 999, color: "inherit", cursor: "pointer", display: "grid", placeItems: "center", flex: "none", fontWeight: 800 }}>✕</button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>Block palette</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {paletteBlocks.map((t) => {
                const meta = RB_META[t];
                return (
                  <button key={t} type="button" onClick={() => addBlock(t)} disabled={running || !!feedback}
                    style={{
                      background: meta.color, color: meta.light ? "var(--ink-900)" : "#fff",
                      padding: "10px 14px", borderRadius: 10, border: "none",
                      boxShadow: "0 3px 0 0 " + meta.shadow,
                      fontWeight: 700, fontSize: 12.5, cursor: running || feedback ? "default" : "pointer",
                      minHeight: 40,
                    }}>
                    + {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { CodeChallengeV2, Robot2DV2 });
