// q-math.jsx — math family
// MathStepwise, NumericInput, EquationBalance, NumberLine, VisualFractions, MultipleChoiceMath

const { useState: useStateM, useRef: useRefM, useEffect: useEffectM } = React;

// ─── 20. MATH STEPWISE (show your work, line by line) ─────────────
function MathStepwiseExerciseV2() {
  const PROBLEM = "Solve for x:  2x + 6 = 14";
  const SOLUTION_STEPS = [
    { label: "Step 1", expected: "2x = 8", hint: "Subtract 6 from both sides" },
    { label: "Step 2", expected: "x = 4", hint: "Divide both sides by 2" },
  ];
  const [steps, setSteps] = useStateM(["", ""]);
  const [results, setResults] = useStateM([null, null]);
  const [fb, setFb] = useStateM(null);
  const { fire, layer } = useConfetti();

  const normalize = (s) => s.replace(/\s+/g, "").toLowerCase();

  const checkStep = (i) => {
    const ok = normalize(steps[i]) === normalize(SOLUTION_STEPS[i].expected);
    const nr = results.slice(); nr[i] = ok; setResults(nr);
    return ok;
  };

  const check = () => {
    const ok1 = checkStep(0); const ok2 = checkStep(1);
    if (ok1 && ok2) { setFb({ kind: "ok", msg: "Both steps correct!", explain: "Subtract 6, then divide by 2." }); fire(); }
    else setFb({ kind: "no", msg: "Check the highlighted steps.", correct: "Step 1: 2x = 8 · Step 2: x = 4" });
  };
  const cont = () => { setFb(null); setSteps(["",""]); setResults([null,null]); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={9} step={5} totalSteps={12}
        eyebrow="ALGEBRA · LINEAR EQUATIONS"
        title="Show your work"
        feedback={fb}
        canCheck={steps.every((s) => s.trim().length > 0)}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 28, fontWeight: 700,
            padding: "18px 24px",
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            marginBottom: 16,
            color: "var(--ink-900)",
          }}>{PROBLEM}</div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {SOLUTION_STEPS.map((s, i) => {
              const isOk = results[i] === true;
              const isNo = results[i] === false;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ink-500)",
                    fontWeight: 700,
                    width: 60,
                  }}>{s.label}</span>
                  <input
                    type="text"
                    value={steps[i]}
                    onChange={(e) => { const ns = steps.slice(); ns[i] = e.target.value; setSteps(ns); }}
                    disabled={!!fb}
                    placeholder={s.hint}
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: 12,
                      border: "2px solid " + (isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-100)"),
                      fontFamily: "var(--font-mono)",
                      fontSize: 16, fontWeight: 600,
                      background: isOk ? "var(--green-50)" : isNo ? "var(--coral-50)" : "var(--paper-2)",
                    }}
                  />
                  {fb && (
                    <span style={{ width: 22, color: isOk ? "var(--green-600)" : "var(--coral-500)" }}>
                      {isOk ? <Icon.Check s={20} /> : <Icon.XThick s={20} />}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 21. NUMERIC INPUT (math template) ────────────────────────────
function NumericInputExerciseV2() {
  const PROBLEM = "What is 15% of 80?";
  const CORRECT = 12;
  const EXAMPLE = { q: "What is 10% of 50?", work: "10% × 50 = 0.10 × 50", a: 5 };
  const [val, setVal] = useStateM("");
  const [fb, setFb] = useStateM(null);
  const [showExample, setShowExample] = useStateM(false);
  const { fire, layer } = useConfetti();

  const check = () => {
    const n = parseFloat(val);
    if (Math.abs(n - CORRECT) < 0.001) { setFb({ kind: "ok", msg: "Right." }); fire(); }
    else setFb({ kind: "no", msg: "Not quite.", correct: String(CORRECT), explain: "15% × 80 = 0.15 × 80 = 12" });
  };
  const cont = () => { setFb(null); setVal(""); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={4} step={4} totalSteps={12}
        eyebrow="PERCENTAGES · QUICK MATH"
        title="What number is it?"
        feedback={fb}
        canCheck={val.length > 0}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 380, margin: "0 auto", textAlign: "center" }}>
          {/* worked example panel */}
          <div style={{
            background: "var(--sun-50)",
            border: "2px solid var(--sun-300)",
            borderRadius: 12,
            padding: showExample ? "12px 16px" : "8px 14px",
            marginBottom: 14,
            textAlign: "left",
            transition: "all 200ms",
          }}>
            <button
              onClick={() => setShowExample(!showExample)}
              style={{
                background: "transparent", border: "none", padding: 0,
                fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 12,
                letterSpacing: "0.04em", color: "var(--sun-700)",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                width: "100%", justifyContent: "space-between",
              }}
            >
              <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Icon.Lightbulb s={14} /> Example
              </span>
              <span style={{ color: "var(--ink-400)" }}>{showExample ? "−" : "+"}</span>
            </button>
            {showExample && (
              <div style={{ marginTop: 8, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-700)", lineHeight: 1.5 }}>
                <div style={{ color: "var(--ink-500)" }}>{EXAMPLE.q}</div>
                <div style={{ marginTop: 2 }}>{EXAMPLE.work} = <b style={{ color: "var(--green-700)" }}>{EXAMPLE.a}</b></div>
              </div>
            )}
          </div>

          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 26, fontWeight: 700,
            padding: "20px 16px",
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            marginBottom: 14,
            color: "var(--ink-900)",
          }}>{PROBLEM}</div>
          <input
            type="number"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            disabled={!!fb}
            placeholder="?"
            className={"gp-input " + (fb ? (fb.kind === "ok" ? "correct" : "wrong") : "")}
            style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 24, fontWeight: 700, padding: "10px 16px" }}
          />
          {/* number pad */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 12, maxWidth: 220, marginLeft: "auto", marginRight: "auto" }}>
            {["7","8","9","4","5","6","1","2","3",".","0","⌫"].map((k) => (
              <button
                key={k}
                onClick={() => {
                  if (fb) return;
                  if (k === "⌫") setVal(val.slice(0, -1));
                  else setVal(val + k);
                }}
                style={{
                  padding: "8px 0",
                  borderRadius: 10,
                  background: "var(--paper-2)",
                  border: "none",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700, fontSize: 17,
                  color: "var(--ink-900)",
                  cursor: "pointer",
                  boxShadow: "0 2px 0 0 var(--ink-100)",
                }}
              >{k}</button>
            ))}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 22. EQUATION BALANCE (scale metaphor) ────────────────────────
function EquationBalanceExerciseV2() {
  // Visual balance scale. Left side: 3 boxes (each = x) + 4 weights
  // Right side: 10 weights. Goal: isolate x by removing equal weights/boxes
  // from both sides. We model state as {leftX, leftW, rightX, rightW}.
  const [state, setState] = useStateM({ leftX: 3, leftW: 4, rightX: 0, rightW: 10 });
  const [moves, setMoves] = useStateM([]);
  const [fb, setFb] = useStateM(null);
  const { fire, layer } = useConfetti();

  const balanced = () => {
    // x must be isolated: 1 x on left, 0 on right, weight on right == 2 (x=2)
    return state.leftX === 1 && state.rightX === 0;
  };
  const isSolved = state.leftX === 1 && state.leftW === 0 && state.rightX === 0 && state.rightW === 2;

  const subtract = (kind) => {
    if (fb) return;
    const ns = { ...state };
    if (kind === "weight") {
      if (ns.leftW >= 1 && ns.rightW >= 1) { ns.leftW--; ns.rightW--; setMoves([...moves, "−1 weight"]); }
    } else if (kind === "x") {
      if (ns.leftX >= 1 && ns.rightX >= 1) { ns.leftX--; ns.rightX--; setMoves([...moves, "−1 x"]); }
    }
    setState(ns);
  };
  const divide = () => {
    if (fb || state.leftX === 0) return;
    // divide both sides by leftX (in whole numbers only)
    if (state.leftW % state.leftX === 0 && state.rightW % state.leftX === 0) {
      const f = state.leftX;
      setState({ leftX: 1, leftW: state.leftW / f, rightX: 0, rightW: state.rightW / f });
      setMoves([...moves, `÷${f}`]);
    }
  };

  const check = () => {
    if (isSolved) { setFb({ kind: "ok", msg: "x = 2 — balanced.", explain: "3x + 4 = 10  →  3x = 6  →  x = 2" }); fire(); }
    else setFb({ kind: "no", msg: "Not isolated yet.", explain: "Subtract 4 from both sides, then divide by 3." });
  };
  const cont = () => { setFb(null); setState({ leftX: 3, leftW: 4, rightX: 0, rightW: 10 }); setMoves([]); };

  // tilt: positive = right heavier
  const leftValue = state.leftX * 0 + state.leftW; // x unknown, treat as 0 for visual tilt only — actually balance is always at equilibrium
  // pretend always balanced visually since equation IS equal
  const tilt = 0;

  const renderItems = (kind, count, color, shadow) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", padding: 4 }}>
      {Array.from({ length: count }, (_, i) => (
        kind === "x" ? (
          <div key={i} style={{
            width: 28, height: 28, borderRadius: 6,
            background: color, color: "#fff",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 14,
            boxShadow: `inset 0 -3px 0 ${shadow}`,
          }}>x</div>
        ) : (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: "50%",
            background: color, boxShadow: `inset 0 -2px 0 ${shadow}`,
          }} />
        )
      ))}
    </div>
  );

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={11} step={7} totalSteps={12}
        eyebrow="ALGEBRA · BALANCE"
        title="Isolate x — keep both sides equal"
        feedback={fb}
        canCheck={true}
        onCheck={check}
        onContinue={cont}
        checkLabel="Check"
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          {/* equation display */}
          <div style={{
            textAlign: "center",
            fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700,
            color: "var(--ink-700)",
            marginBottom: 14,
          }}>
            {state.leftX > 0 && `${state.leftX > 1 ? state.leftX : ""}x`}
            {state.leftX > 0 && state.leftW > 0 && " + "}
            {state.leftW > 0 && `${state.leftW}`}
            {state.leftX === 0 && state.leftW === 0 && "0"}
            {"  =  "}
            {state.rightX > 0 && `${state.rightX > 1 ? state.rightX : ""}x`}
            {state.rightX > 0 && state.rightW > 0 && " + "}
            {`${state.rightW}`}
          </div>
          {/* balance visual */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            marginBottom: 12,
          }}>
            <div style={{
              background: "var(--green-50)",
              border: "2px solid var(--green-200)",
              borderRadius: 14,
              padding: 12,
              minHeight: 110,
              display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6,
            }}>
              <div className="gp-eyebrow">Left</div>
              {renderItems("x", state.leftX, "var(--green-600)", "var(--green-700)")}
              {renderItems("w", state.leftW, "var(--sun-400)", "var(--sun-500)")}
            </div>
            <div style={{
              background: "var(--sun-50)",
              border: "2px solid var(--sun-300)",
              borderRadius: 14,
              padding: 12,
              minHeight: 110,
              display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 6,
            }}>
              <div className="gp-eyebrow">Right</div>
              {renderItems("x", state.rightX, "var(--green-600)", "var(--green-700)")}
              {renderItems("w", state.rightW, "var(--sun-400)", "var(--sun-500)")}
            </div>
          </div>
          {/* fulcrum */}
          <div style={{
            height: 12,
            background: "var(--ink-700)",
            borderRadius: 999,
            marginBottom: 18,
            transform: `rotate(${tilt}deg)`,
            transformOrigin: "center",
            transition: "transform 300ms",
          }} />
          {/* ops */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              onClick={() => subtract("weight")}
              disabled={!!fb || state.leftW < 1 || state.rightW < 1}
              className="gp-tile"
              style={{ padding: "8px 14px", fontSize: 13, fontFamily: "var(--font-mono)" }}
            >−1 from both</button>
            <button
              onClick={() => { setState({...state, leftW: Math.max(0, state.leftW - 4), rightW: Math.max(0, state.rightW - 4)}); setMoves([...moves, "−4 from both"]); }}
              disabled={!!fb || state.leftW < 4 || state.rightW < 4}
              className="gp-tile"
              style={{ padding: "8px 14px", fontSize: 13, fontFamily: "var(--font-mono)" }}
            >−4 from both</button>
            <button
              onClick={() => subtract("x")}
              disabled={!!fb || state.leftX < 1 || state.rightX < 1}
              className="gp-tile"
              style={{ padding: "8px 14px", fontSize: 13, fontFamily: "var(--font-mono)" }}
            >−x from both</button>
            <button
              onClick={divide}
              disabled={!!fb || state.leftX < 2}
              className="gp-tile"
              style={{ padding: "8px 14px", fontSize: 13, fontFamily: "var(--font-mono)" }}
            >÷ {state.leftX || ""}</button>
          </div>
          {moves.length > 0 && (
            <div style={{ textAlign: "center", marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)" }}>
              {moves.join(" · ")}
            </div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 23. NUMBER LINE ──────────────────────────────────────────────
function NumberLineExerciseV2() {
  const MIN = -5, MAX = 5;
  const CORRECT = -2;
  const PROMPT = "Drag the marker to −2";
  const [pos, setPos] = useStateM(0);
  const [fb, setFb] = useStateM(null);
  const trackRef = useRefM(null);
  const { fire, layer } = useConfetti();

  const setFromX = (clientX) => {
    if (fb || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = MIN + t * (MAX - MIN);
    setPos(Math.round(raw));
  };

  const onMove = (e) => {
    if (e.buttons !== 1 && e.type !== "click") return;
    setFromX(e.clientX);
  };

  const check = () => {
    if (pos === CORRECT) { setFb({ kind: "ok", msg: "Marker placed exactly." }); fire(); }
    else setFb({ kind: "no", msg: `You placed it at ${pos}.`, correct: String(CORRECT) });
  };
  const cont = () => { setFb(null); setPos(0); };

  const posFrac = (pos - MIN) / (MAX - MIN);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={6} step={4} totalSteps={12}
        eyebrow="INTEGERS · NUMBER LINE"
        title={PROMPT}
        feedback={fb}
        canCheck={true}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 540, margin: "60px auto 0", padding: "0 28px" }}>
          <div
            ref={trackRef}
            onMouseDown={onMove}
            onMouseMove={onMove}
            onClick={onMove}
            style={{ position: "relative", height: 96, cursor: fb ? "default" : "pointer", userSelect: "none" }}
          >
            {/* axis */}
            <div style={{
              position: "absolute", top: 56, left: 0, right: 0, height: 4,
              background: "var(--ink-200)", borderRadius: 999,
            }} />
            {/* ticks */}
            {Array.from({ length: MAX - MIN + 1 }, (_, i) => {
              const n = MIN + i;
              const t = (n - MIN) / (MAX - MIN);
              return (
                <div key={n} style={{
                  position: "absolute", top: 50, left: `${t * 100}%`,
                  width: 2, height: 16,
                  marginLeft: -1,
                  background: n === 0 ? "var(--ink-700)" : "var(--ink-300)",
                  borderRadius: 1,
                }}>
                  <span style={{
                    position: "absolute", top: 22, left: "50%", transform: "translateX(-50%)",
                    fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                    color: n === 0 ? "var(--ink-900)" : "var(--ink-500)",
                  }}>{n}</span>
                </div>
              );
            })}
            {/* marker */}
            <div style={{
              position: "absolute", top: 18, left: `${posFrac * 100}%`,
              marginLeft: -22,
              transition: fb ? "none" : "left 120ms",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 999,
                background: fb ? (fb.kind === "ok" ? "var(--green-600)" : "var(--coral-500)") : "var(--green-600)",
                boxShadow: `0 4px 0 0 ${fb ? (fb.kind === "ok" ? "var(--green-700)" : "var(--coral-700)") : "var(--green-700)"}`,
                display: "grid", placeItems: "center",
                color: "#fff", fontWeight: 800, fontFamily: "var(--font-mono)", fontSize: 14,
              }}>{pos}</div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 24. VISUAL FRACTIONS ─────────────────────────────────────────
function VisualFractionsExerciseV2() {
  const PROBLEM = { numerator: 3, denominator: 8 };
  const [shaded, setShaded] = useStateM(new Set());
  const [fb, setFb] = useStateM(null);
  const { fire, layer } = useConfetti();

  const toggle = (i) => {
    if (fb) return;
    const ns = new Set(shaded);
    if (ns.has(i)) ns.delete(i); else ns.add(i);
    setShaded(ns);
  };

  const check = () => {
    if (shaded.size === PROBLEM.numerator) { setFb({ kind: "ok", msg: `That's ${PROBLEM.numerator}/${PROBLEM.denominator}.` }); fire(); }
    else setFb({ kind: "no", msg: `You shaded ${shaded.size}/${PROBLEM.denominator}.`, correct: `${PROBLEM.numerator}/${PROBLEM.denominator}` });
  };
  const cont = () => { setFb(null); setShaded(new Set()); };

  // pie / bar layout
  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={1} step={3} totalSteps={10}
        eyebrow="FRACTIONS · VISUAL"
        title={<>Tap to shade <span className="gp-mark" style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{PROBLEM.numerator}/{PROBLEM.denominator}</span></>}
        feedback={fb}
        canCheck={shaded.size > 0}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
          {/* pie */}
          <svg viewBox="-100 -100 200 200" style={{ width: 200, height: 200 }}>
            <circle cx="0" cy="0" r="85" fill="var(--paper-2)" stroke="var(--ink-200)" strokeWidth="2"/>
            {Array.from({ length: PROBLEM.denominator }, (_, i) => {
              const a0 = (i / PROBLEM.denominator) * Math.PI * 2 - Math.PI / 2;
              const a1 = ((i + 1) / PROBLEM.denominator) * Math.PI * 2 - Math.PI / 2;
              const isShaded = shaded.has(i);
              const x0 = Math.cos(a0) * 85, y0 = Math.sin(a0) * 85;
              const x1 = Math.cos(a1) * 85, y1 = Math.sin(a1) * 85;
              const large = a1 - a0 > Math.PI ? 1 : 0;
              return (
                <path
                  key={i}
                  d={`M 0 0 L ${x0} ${y0} A 85 85 0 ${large} 1 ${x1} ${y1} Z`}
                  fill={isShaded ? "var(--green-500)" : "transparent"}
                  stroke="var(--ink-300)"
                  strokeWidth="1.5"
                  onClick={() => toggle(i)}
                  style={{ cursor: fb ? "default" : "pointer", transition: "fill 150ms" }}
                />
              );
            })}
          </svg>
          {/* bar */}
          <div style={{ display: "flex", gap: 4, width: "100%", maxWidth: 400 }}>
            {Array.from({ length: PROBLEM.denominator }, (_, i) => (
              <div
                key={i}
                onClick={() => toggle(i)}
                style={{
                  flex: 1, height: 48,
                  background: shaded.has(i) ? "var(--green-500)" : "var(--paper-2)",
                  border: `2px solid ${shaded.has(i) ? "var(--green-600)" : "var(--ink-200)"}`,
                  borderRadius: 8,
                  cursor: fb ? "default" : "pointer",
                  transition: "all 150ms",
                }}
              />
            ))}
          </div>
          <div style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 28,
            fontWeight: 800,
            color: "var(--ink-900)",
            lineHeight: 1,
          }}>
            <span style={{ color: shaded.size === PROBLEM.numerator ? "var(--green-700)" : "var(--ink-900)" }}>
              {shaded.size}
            </span>
            <span style={{
              display: "block",
              width: 56,
              borderBottom: "3px solid var(--ink-900)",
              margin: "8px 0",
            }} />
            <span>{PROBLEM.denominator}</span>
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--ink-400)", marginTop: -8 }}>
            target · <b style={{ color: "var(--ink-700)" }}>{PROBLEM.numerator}/{PROBLEM.denominator}</b>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 25. MULTIPLE CHOICE MATH (with LaTeX-style display) ─────────
function MultipleChoiceMathExerciseV2() {
  const Q = {
    text: "Which expression is equivalent to ",
    expr: "(x + 3)²",
    options: ["x² + 6", "x² + 9", "x² + 6x + 9", "x² + 3x + 9"],
    correct: 2,
  };
  const [pick, setPick] = useStateM(null);
  const [fb, setFb] = useStateM(null);
  const { fire, layer } = useConfetti();

  const check = () => {
    if (pick === Q.correct) { setFb({ kind: "ok", msg: "Right — perfect square trinomial.", explain: "(x+3)² = x² + 2·3·x + 3² = x² + 6x + 9" }); fire(); }
    else setFb({ kind: "no", msg: "Don't forget the cross-term.", correct: Q.options[Q.correct] });
  };
  const cont = () => { setFb(null); setPick(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={7} step={8} totalSteps={12}
        eyebrow="ALGEBRA · EXPANSION"
        title="Which is equivalent?"
        feedback={fb}
        canCheck={pick !== null}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            padding: "20px 22px",
            marginBottom: 18,
            textAlign: "center",
          }}>
            <span style={{ fontSize: 16, color: "var(--ink-500)" }}>{Q.text}</span>
            <div style={{ fontFamily: "'Times New Roman', serif", fontSize: 36, fontWeight: 600, color: "var(--ink-900)", marginTop: 6 }}>
              {Q.expr}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {Q.options.map((opt, i) => {
              let state = "";
              if (fb) {
                if (i === Q.correct) state = "correct";
                else if (i === pick) state = "wrong";
                else state = "locked";
              } else if (pick === i) state = "selected";
              return (
                <button
                  key={i}
                  className={"gp-tile " + state}
                  style={{ padding: "16px 18px", fontFamily: "'Times New Roman', serif", fontSize: 19 }}
                  onClick={() => !fb && setPick(i)}
                >{opt}</button>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, {
  MathStepwiseExerciseV2, NumericInputExerciseV2,
  EquationBalanceExerciseV2, NumberLineExerciseV2,
  VisualFractionsExerciseV2, MultipleChoiceMathExerciseV2,
});
