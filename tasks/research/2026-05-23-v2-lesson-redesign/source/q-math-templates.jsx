// q-math-templates.jsx — 11 interactive math templates
// ArithmeticPuzzle · CardSort · CoordinatePlane · EquationSolver · FunctionGraph
// GraphTransform · InequalityGraph · ScatterPlot · TablePattern · TwoWayTable · VennDiagram

const { useState: useStateT, useRef: useRefT, useEffect: useEffectT, useMemo: useMemoT, useCallback: useCallbackT } = React;

// ─── shared grid axis renderer used by graph templates ────────────
function GridAxes({ range, size, pad, showOrigin = true, ticks = true }) {
  const scale = (size - pad * 2) / (range * 2);
  const toX = (v) => pad + (v + range) * scale;
  const toY = (v) => pad + (range - v) * scale;
  return (
    <>
      {/* grid lines */}
      {Array.from({ length: range * 2 + 1 }, (_, i) => {
        const v = -range + i;
        return (
          <g key={v}>
            <line x1={toX(v)} y1={pad} x2={toX(v)} y2={size - pad} stroke="var(--ink-100)" strokeWidth={v === 0 ? 0 : 1}/>
            <line x1={pad} y1={toY(v)} x2={size - pad} y2={toY(v)} stroke="var(--ink-100)" strokeWidth={v === 0 ? 0 : 1}/>
          </g>
        );
      })}
      {/* axes */}
      <line x1={pad} y1={toY(0)} x2={size - pad} y2={toY(0)} stroke="var(--ink-500)" strokeWidth="1.5"/>
      <line x1={toX(0)} y1={pad} x2={toX(0)} y2={size - pad} stroke="var(--ink-500)" strokeWidth="1.5"/>
      {/* arrows */}
      <polygon points={`${size - pad},${toY(0)} ${size - pad - 8},${toY(0) - 5} ${size - pad - 8},${toY(0) + 5}`} fill="var(--ink-500)"/>
      <polygon points={`${toX(0)},${pad} ${toX(0) - 5},${pad + 8} ${toX(0) + 5},${pad + 8}`} fill="var(--ink-500)"/>
      {/* tick labels */}
      {ticks && Array.from({ length: range * 2 + 1 }, (_, i) => {
        const v = -range + i;
        if (v === 0) return null;
        return (
          <g key={v}>
            <text x={toX(v)} y={toY(0) + 16} fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle" fill="var(--ink-500)">{v}</text>
            <text x={toX(0) - 8} y={toY(v) + 4} fontSize="11" fontFamily="var(--font-mono)" textAnchor="end" fill="var(--ink-500)">{v}</text>
          </g>
        );
      })}
      {showOrigin && <text x={toX(0) - 8} y={toY(0) + 16} fontSize="11" fontFamily="var(--font-mono)" textAnchor="end" fill="var(--ink-500)">0</text>}
    </>
  );
}

// ─── 26. ARITHMETIC PUZZLE ─────────────────────────────────────────
function ArithmeticPuzzleExerciseV2() {
  // Three equations, each has one blank. Bank of numbers below — drag/tap into blank.
  const EQS = [
    { cells: ["7", "+", "_", "=", "12"], answer: 5 },
    { cells: ["3", "×", "_", "=", "18"], answer: 6 },
    { cells: ["_", "−", "4", "=", "9"], answer: 13 },
  ];
  const BANK = [4, 5, 6, 8, 9, 13];
  const [filled, setFilled] = useStateT([null, null, null]); // value per row
  const [active, setActive] = useStateT(0);
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();

  const pick = (n) => {
    if (fb) return;
    const nf = filled.slice(); nf[active] = n; setFilled(nf);
    // auto-advance to next empty
    const nextEmpty = nf.findIndex((v) => v === null);
    if (nextEmpty >= 0) setActive(nextEmpty);
  };
  const check = () => {
    const ok = EQS.every((e, i) => filled[i] === e.answer);
    if (ok) { setFb({ kind: "ok", msg: "All three correct." }); fire(); }
    else setFb({
      kind: "no",
      msg: "Some are off.",
      correct: EQS.map((e) => e.answer).join(" · "),
    });
  };
  const cont = () => { setFb(null); setFilled([null, null, null]); setActive(0); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={4} step={5} totalSteps={12}
        eyebrow="ARITHMETIC · PUZZLE"
        title="Find the missing number"
        feedback={fb}
        canCheck={filled.every((v) => v !== null)}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {EQS.map((e, i) => (
              <div key={i}
                onClick={() => !fb && setActive(i)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "12px 16px",
                  background: "var(--paper-2)",
                  border: `2px solid ${active === i && !fb ? "var(--green-500)" : "var(--ink-100)"}`,
                  borderRadius: 14, cursor: fb ? "default" : "pointer",
                  fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700,
                  color: "var(--ink-900)",
                  justifyContent: "center",
                }}>
                {e.cells.map((c, j) => {
                  if (c !== "_") return <span key={j} style={{ padding: "0 6px" }}>{c}</span>;
                  const v = filled[i];
                  const isCorrect = fb && v === e.answer;
                  const isWrong = fb && v !== e.answer;
                  return (
                    <span key={j} style={{
                      display: "inline-grid", placeItems: "center",
                      width: 48, height: 38,
                      borderRadius: 8,
                      background: isCorrect ? "var(--green-50)" : isWrong ? "var(--coral-50)" : v == null ? "var(--ink-50)" : "var(--green-50)",
                      border: `2px solid ${isCorrect ? "var(--green-500)" : isWrong ? "var(--coral-500)" : v == null ? "var(--ink-200)" : "var(--green-500)"}`,
                      color: isWrong ? "var(--coral-700)" : v == null ? "var(--ink-300)" : "var(--green-800)",
                    }}>{v ?? "?"}</span>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="gp-eyebrow" style={{ marginTop: 18, marginBottom: 8, textAlign: "center" }}>Number bank · tap to place</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {BANK.map((n) => {
              const used = filled.includes(n);
              return (
                <button key={n}
                  onClick={() => pick(n)}
                  className={"gp-tile " + (used ? "locked" : "")}
                  style={{ width: 56, height: 56, fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 800, opacity: used ? 0.3 : 1 }}
                >{n}</button>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 27. CARD SORT ─────────────────────────────────────────────────
function CardSortExerciseV2() {
  const CATS = [
    { id: "linear", label: "Linear", color: "var(--green-50)", border: "var(--green-300)", text: "var(--green-800)" },
    { id: "quadratic", label: "Quadratic", color: "var(--sun-50)", border: "var(--sun-400)", text: "var(--sun-700)" },
    { id: "exponential", label: "Exponential", color: "var(--coral-50)", border: "var(--coral-300)", text: "var(--coral-700)" },
  ];
  const CARDS = [
    { id: "c1", text: "y = 2x + 3", cat: "linear" },
    { id: "c2", text: "y = x² − 4", cat: "quadratic" },
    { id: "c3", text: "y = 3ˣ", cat: "exponential" },
    { id: "c4", text: "y = −5x", cat: "linear" },
    { id: "c5", text: "y = (x+1)²", cat: "quadratic" },
    { id: "c6", text: "y = 2·(1.5)ˣ", cat: "exponential" },
  ];
  const [placed, setPlaced] = useStateT({}); // {cardId: catId}
  const [hover, setHover] = useStateT(null);
  const [fb, setFb] = useStateT(null);
  const dragRef = useRefT(null);
  const { fire, layer } = useConfetti();

  const drop = (catId) => () => {
    if (!dragRef.current || fb) return;
    setPlaced({ ...placed, [dragRef.current]: catId });
    dragRef.current = null;
    setHover(null);
  };

  const allPlaced = CARDS.every((c) => placed[c.id]);
  const check = () => {
    const ok = CARDS.every((c) => placed[c.id] === c.cat);
    if (ok) { setFb({ kind: "ok", msg: "All sorted correctly!" }); fire(); }
    else {
      const wrong = CARDS.filter((c) => placed[c.id] !== c.cat).length;
      setFb({ kind: "no", msg: `${wrong} card${wrong === 1 ? "" : "s"} in the wrong column.` });
    }
  };
  const cont = () => { setFb(null); setPlaced({}); };

  const unsorted = CARDS.filter((c) => !placed[c.id]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={6} step={5} totalSteps={12}
        eyebrow="FUNCTIONS · CLASSIFICATION"
        title="Sort each equation into its family"
        feedback={fb}
        canCheck={allPlaced}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
            {CATS.map((c) => {
              const cards = CARDS.filter((cd) => placed[cd.id] === c.id);
              return (
                <div key={c.id}
                  onDragOver={(e) => { e.preventDefault(); setHover(c.id); }}
                  onDragLeave={() => setHover(null)}
                  onDrop={drop(c.id)}
                  style={{
                    minHeight: 150,
                    background: c.color,
                    border: `2px dashed ${hover === c.id ? c.border : "var(--ink-200)"}`,
                    borderRadius: 14,
                    padding: 10,
                    display: "flex", flexDirection: "column", gap: 6,
                    transition: "border-color 150ms",
                  }}>
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 11,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: c.text, fontWeight: 700,
                    marginBottom: 4,
                  }}>{c.label}</div>
                  {cards.map((cd) => {
                    const wrong = fb && placed[cd.id] !== cd.cat;
                    const ok = fb && placed[cd.id] === cd.cat;
                    return (
                      <span key={cd.id}
                        draggable
                        onDragStart={(e) => { dragRef.current = cd.id; e.dataTransfer.effectAllowed = "move"; }}
                        style={{
                          background: ok ? "var(--green-100)" : wrong ? "var(--coral-300)" : "var(--paper-2)",
                          padding: "8px 12px", borderRadius: 8,
                          fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600,
                          cursor: "grab",
                          boxShadow: "var(--shadow-sm)",
                          border: wrong ? "1.5px solid var(--coral-500)" : "1px solid transparent",
                          color: "var(--ink-900)",
                        }}>{cd.text}</span>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{
            background: "var(--paper-2)",
            borderRadius: 14, border: "2px solid var(--ink-100)",
            padding: 12, minHeight: 70,
            display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "center",
          }}>
            {unsorted.length === 0
              ? <span style={{ color: "var(--ink-400)", fontSize: 13 }}>All placed — hit Check.</span>
              : unsorted.map((cd) => (
                <span key={cd.id}
                  draggable
                  onDragStart={(e) => { dragRef.current = cd.id; e.dataTransfer.effectAllowed = "move"; }}
                  style={{
                    background: "var(--ink-50)",
                    padding: "10px 14px", borderRadius: 999,
                    fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 600,
                    cursor: "grab", color: "var(--ink-900)",
                    boxShadow: "0 2px 0 0 var(--ink-200)",
                  }}>{cd.text}</span>
              ))}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 28. COORDINATE PLANE ──────────────────────────────────────────
function CoordinatePlaneExerciseV2() {
  const TARGETS = [
    { x: 3, y: 2, label: "A" },
    { x: -2, y: 4, label: "B" },
    { x: -3, y: -3, label: "C" },
  ];
  const RANGE = 6;
  const SIZE = 380; const PAD = 36;
  const SCALE = (SIZE - PAD * 2) / (RANGE * 2);
  const toX = (v) => PAD + (v + RANGE) * SCALE;
  const toY = (v) => PAD + (RANGE - v) * SCALE;
  const fromX = (px) => Math.round((px - PAD) / SCALE - RANGE);
  const fromY = (px) => Math.round(RANGE - (px - PAD) / SCALE);

  const COLORS = ["var(--green-600)", "var(--coral-500)", "var(--info)"];
  const [pts, setPts] = useStateT(TARGETS.map(() => ({ x: 0, y: 0 })));
  const [drag, setDrag] = useStateT(null);
  const [fb, setFb] = useStateT(null);
  const svgRef = useRefT(null);
  const { fire, layer } = useConfetti();

  const onMove = (e) => {
    if (drag === null || !svgRef.current || fb) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = fromX(e.clientX - r.left);
    const y = fromY(e.clientY - r.top);
    const cx = Math.max(-RANGE, Math.min(RANGE, x));
    const cy = Math.max(-RANGE, Math.min(RANGE, y));
    const np = pts.slice(); np[drag] = { x: cx, y: cy }; setPts(np);
  };

  const check = () => {
    const ok = TARGETS.every((t, i) => pts[i].x === t.x && pts[i].y === t.y);
    if (ok) { setFb({ kind: "ok", msg: "All three points are spot on." }); fire(); }
    else setFb({ kind: "no", msg: "Some points are off.", correct: TARGETS.map((t) => `${t.label}(${t.x},${t.y})`).join(" · ") });
  };
  const cont = () => { setFb(null); setPts(TARGETS.map(() => ({ x: 0, y: 0 }))); };

  return (
    <div style={{ position: "relative", height: "100%" }} onMouseMove={onMove} onMouseUp={() => setDrag(null)}>
      {layer}
      <LessonShell
        hearts={4} streak={3} step={5} totalSteps={12}
        eyebrow="COORDINATE PLANE · POINTS"
        title="Place each point at its coordinates"
        feedback={fb}
        canCheck={true}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "grid", gridTemplateColumns: "auto 180px", gap: 18, justifyContent: "center", alignItems: "start" }}>
          <svg ref={svgRef} width={SIZE} height={SIZE} style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14, userSelect: "none" }}>
            <GridAxes range={RANGE} size={SIZE} pad={PAD} />
            {fb && fb.kind !== "ok" && TARGETS.map((t, i) => (
              <g key={"t" + i}>
                <circle cx={toX(t.x)} cy={toY(t.y)} r="12" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="2" strokeDasharray="3 2" opacity="0.4" className="gp-pop"/>
              </g>
            ))}
            {pts.map((p, i) => {
              const t = TARGETS[i];
              const isOk = fb && p.x === t.x && p.y === t.y;
              const isNo = fb && (p.x !== t.x || p.y !== t.y);
              const fill = isOk ? "var(--green-600)" : isNo ? "var(--coral-500)" : COLORS[i % COLORS.length];
              return (
                <g key={i}
                  onMouseDown={() => !fb && setDrag(i)}
                  style={{ cursor: fb ? "default" : "grab" }}>
                  <circle cx={toX(p.x)} cy={toY(p.y)} r="14" fill={fill}/>
                  <text x={toX(p.x)} y={toY(p.y) + 5} fontSize="13" fontFamily="var(--font-mono)" textAnchor="middle" fill="#fff" fontWeight="800">{t.label}</text>
                </g>
              );
            })}
          </svg>
          <div>
            <div className="gp-eyebrow" style={{ marginBottom: 10 }}>Place these points</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {TARGETS.map((t, i) => {
                const p = pts[i];
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", borderRadius: 10,
                    background: "var(--paper-2)", border: "2px solid var(--ink-100)",
                  }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: COLORS[i % COLORS.length],
                      color: "#fff", display: "grid", placeItems: "center",
                      fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 12,
                    }}>{t.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--ink-900)" }}>
                      ({t.x}, {t.y})
                    </span>
                    <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)" }}>
                      now ({p.x},{p.y})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 29. EQUATION SOLVER ───────────────────────────────────────────
function EquationSolverExerciseV2() {
  // Pick the right operation at each step. Wrong ones snap back with shake.
  const TARGET = { left: "2x + 5", right: "17", final: "x = 6" };
  const STEPS = [
    {
      label: "What gets rid of the +5?",
      options: [
        { id: "sub5", label: "subtract 5", ok: true, after: { left: "2x", right: "12" } },
        { id: "add5", label: "add 5" },
        { id: "div2", label: "divide by 2" },
      ],
    },
    {
      label: "Now isolate x.",
      options: [
        { id: "div2", label: "divide by 2", ok: true, after: { left: "x", right: "6" } },
        { id: "mul2", label: "multiply by 2" },
        { id: "sub2", label: "subtract 2" },
      ],
    },
  ];
  const [chain, setChain] = useStateT([{ left: TARGET.left, right: TARGET.right, op: null }]);
  const [shake, setShake] = useStateT(null);
  const [step, setStep] = useStateT(0);
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();

  const pick = (opt) => {
    if (fb) return;
    if (!opt.ok) {
      setShake(opt.id);
      setTimeout(() => setShake(null), 400);
      return;
    }
    const ne = STEPS[step];
    setChain([...chain, { left: opt.after.left, right: opt.after.right, op: opt.label }]);
    if (step === STEPS.length - 1) {
      setTimeout(() => { setFb({ kind: "ok", msg: "Solved!" }); fire(); }, 250);
    } else setStep(step + 1);
  };
  const cont = () => { setChain([{ left: TARGET.left, right: TARGET.right, op: null }]); setStep(0); setFb(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={5} step={6} totalSteps={12}
        eyebrow="ALGEBRA · GUIDED SOLVE"
        title="Pick the next move"
        feedback={fb}
        canCheck={false} onCheck={() => {}} onContinue={cont}
        showSkip={false}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* chain */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18 }}>
            {chain.map((row, i) => (
              <div key={i}>
                {row.op && (
                  <div style={{
                    fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)",
                    textAlign: "center", padding: "2px 0",
                    letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>↓ {row.op}</div>
                )}
                <div style={{
                  background: i === chain.length - 1 && fb ? "var(--green-50)" : "var(--paper-2)",
                  border: `2px solid ${i === chain.length - 1 && fb ? "var(--green-500)" : "var(--ink-100)"}`,
                  borderRadius: 14, padding: "12px 18px",
                  fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700,
                  color: "var(--ink-900)", textAlign: "center",
                  letterSpacing: "0.04em",
                }}>{row.left} = {row.right}</div>
              </div>
            ))}
          </div>
          {!fb && step < STEPS.length && (
            <>
              <div style={{ textAlign: "center", marginBottom: 10, fontSize: 14, color: "var(--ink-700)", fontWeight: 600 }}>
                {STEPS[step].label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {STEPS[step].options.map((opt) => (
                  <button key={opt.id}
                    onClick={() => pick(opt)}
                    className="gp-tile"
                    style={{
                      padding: "14px 18px", fontFamily: "var(--font-mono)", fontSize: 16,
                      animation: shake === opt.id ? "gp-shake 400ms" : "none",
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </LessonShell>
      <style>{`@keyframes gp-shake { 0% { transform: translateX(0); } 25% { transform: translateX(-6px); background: var(--coral-50); } 75% { transform: translateX(6px); background: var(--coral-50); } 100% { transform: translateX(0); } }`}</style>
    </div>
  );
}

// ─── 30. FUNCTION GRAPH ────────────────────────────────────────────
function FunctionGraphExerciseV2() {
  const RANGE = 6, SIZE = 380, PAD = 36;
  const SCALE = (SIZE - PAD * 2) / (RANGE * 2);
  const toX = (v) => PAD + (v + RANGE) * SCALE;
  const toY = (v) => PAD + (RANGE - v) * SCALE;
  const TARGET = { m: 2, b: -1 };
  const [m, setM] = useStateT(0);
  const [b, setB] = useStateT(0);
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();

  const linePath = (m, b) => {
    const xs = [-RANGE, RANGE];
    return `M ${toX(xs[0])} ${toY(m * xs[0] + b)} L ${toX(xs[1])} ${toY(m * xs[1] + b)}`;
  };

  const check = () => {
    if (Math.abs(m - TARGET.m) < 0.1 && Math.abs(b - TARGET.b) < 0.1) { setFb({ kind: "ok", msg: "Lines match!" }); fire(); }
    else setFb({ kind: "no", msg: "Lines don't match yet.", correct: `y = ${TARGET.m}x + ${TARGET.b}` });
  };
  const cont = () => { setFb(null); setM(0); setB(0); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={3} step={7} totalSteps={12}
        eyebrow="LINEAR FUNCTIONS · SLOPE-INTERCEPT"
        title={<>Match the line · <span className="gp-mark" style={{ fontFamily: "var(--font-mono)", fontSize: 18 }}>y = {TARGET.m}x {TARGET.b >= 0 ? "+ " + TARGET.b : "− " + Math.abs(TARGET.b)}</span></>}
        feedback={fb}
        canCheck={true}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "grid", gridTemplateColumns: "auto 200px", gap: 20, justifyContent: "center" }}>
          <svg width={SIZE} height={SIZE} style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14 }}>
            <GridAxes range={RANGE} size={SIZE} pad={PAD} />
            {/* target line — dashed */}
            <path d={linePath(TARGET.m, TARGET.b)} stroke="var(--coral-500)" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.6"/>
            {/* user line */}
            <path d={linePath(m, b)} stroke="var(--green-600)" strokeWidth="3" fill="none"/>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <SliderCtrl label="slope · m" v={m} setV={setM} min={-5} max={5} step={0.5} disabled={!!fb}/>
            <SliderCtrl label="intercept · b" v={b} setV={setB} min={-5} max={5} step={1} disabled={!!fb}/>
            <div style={{
              padding: 12, background: "var(--ink-50)", borderRadius: 10,
              fontFamily: "var(--font-mono)", textAlign: "center", fontSize: 16, fontWeight: 700, color: "var(--ink-900)",
            }}>y = {m}x {b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`}</div>
            <div style={{
              padding: 10, background: "var(--coral-50)", borderRadius: 10,
              display: "inline-flex", alignItems: "center", gap: 8,
              fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--coral-700)",
            }}>
              <span style={{ width: 14, height: 0, borderTop: "2.5px dashed var(--coral-500)", display: "inline-block" }} />
              target line
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}
function SliderCtrl({ label, v, setV, min, max, step, disabled }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="gp-eyebrow">{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--green-700)", fontSize: 13 }}>{v}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={v} disabled={disabled}
        onChange={(e) => setV(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: "var(--green-600)" }}/>
    </div>
  );
}

// ─── 31. GRAPH TRANSFORM ───────────────────────────────────────────
function GraphTransformExerciseV2() {
  const RANGE = 6, SIZE = 380, PAD = 36;
  const SCALE = (SIZE - PAD * 2) / (RANGE * 2);
  const toX = (v) => PAD + (v + RANGE) * SCALE;
  const toY = (v) => PAD + (RANGE - v) * SCALE;
  // parent: y = x². transform: y = a(x - h)² + v
  const TARGET = { h: 2, v: -1, a: 1 };
  const [h, setH] = useStateT(0);
  const [v, setV] = useStateT(0);
  const [a, setA] = useStateT(1);
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();

  const path = (h, v, a) => {
    const pts = [];
    for (let x = -RANGE; x <= RANGE; x += 0.1) {
      const y = a * (x - h) * (x - h) + v;
      if (y >= -RANGE && y <= RANGE) pts.push([x, y]);
    }
    if (pts.length === 0) return "";
    return pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${toX(x)} ${toY(y)}`).join(" ");
  };

  const check = () => {
    if (h === TARGET.h && v === TARGET.v && Math.abs(a - TARGET.a) < 0.1) { setFb({ kind: "ok", msg: "Curves overlap." }); fire(); }
    else setFb({ kind: "no", msg: "Not aligned yet.", correct: `y = ${TARGET.a}(x − ${TARGET.h})² + ${TARGET.v}` });
  };
  const cont = () => { setFb(null); setH(0); setV(0); setA(1); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={7} step={8} totalSteps={12}
        eyebrow="QUADRATICS · TRANSFORMATIONS"
        title={<>Transform y = x² to match the <span className="gp-mark">dashed</span> curve</>}
        feedback={fb}
        canCheck={true}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "grid", gridTemplateColumns: "auto 200px", gap: 20, justifyContent: "center" }}>
          <svg width={SIZE} height={SIZE} style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14 }}>
            <GridAxes range={RANGE} size={SIZE} pad={PAD} />
            <path d={path(TARGET.h, TARGET.v, TARGET.a)} stroke="var(--coral-500)" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.6"/>
            <path d={path(h, v, a)} stroke="var(--green-600)" strokeWidth="3" fill="none"/>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SliderCtrl label="horiz · h" v={h} setV={setH} min={-5} max={5} step={1} disabled={!!fb}/>
            <SliderCtrl label="vert · v" v={v} setV={setV} min={-5} max={5} step={1} disabled={!!fb}/>
            <SliderCtrl label="stretch · a" v={a} setV={setA} min={0.5} max={3} step={0.5} disabled={!!fb}/>
            <div style={{
              padding: 12, background: "var(--ink-50)", borderRadius: 10,
              fontFamily: "var(--font-mono)", textAlign: "center", fontSize: 14, fontWeight: 700,
              color: "var(--ink-900)",
            }}>y = {a}(x {h >= 0 ? `− ${h}` : `+ ${-h}`})² {v >= 0 ? `+ ${v}` : `− ${-v}`}</div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 32. INEQUALITY GRAPH ──────────────────────────────────────────
function InequalityGraphExerciseV2() {
  const RANGE = 6, SIZE = 380, PAD = 36;
  const SCALE = (SIZE - PAD * 2) / (RANGE * 2);
  const toX = (vv) => PAD + (vv + RANGE) * SCALE;
  const toY = (vv) => PAD + (RANGE - vv) * SCALE;
  const TARGET = { m: 1, b: 2, op: ">=" };

  const [m, setM] = useStateT(0);
  const [b, setB] = useStateT(0);
  const [op, setOp] = useStateT(">=");
  const [side, setSide] = useStateT(null); // 'above' | 'below'
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();

  const linePath = `M ${toX(-RANGE)} ${toY(m * -RANGE + b)} L ${toX(RANGE)} ${toY(m * RANGE + b)}`;
  const dashed = op === ">" || op === "<";
  const shading = side === "above" ?
    `M ${toX(-RANGE)} ${toY(m * -RANGE + b)} L ${toX(RANGE)} ${toY(m * RANGE + b)} L ${toX(RANGE)} ${toY(RANGE)} L ${toX(-RANGE)} ${toY(RANGE)} Z`
    : side === "below" ?
    `M ${toX(-RANGE)} ${toY(m * -RANGE + b)} L ${toX(RANGE)} ${toY(m * RANGE + b)} L ${toX(RANGE)} ${toY(-RANGE)} L ${toX(-RANGE)} ${toY(-RANGE)} Z`
    : "";

  const correctSide = TARGET.op.includes(">") ? "above" : "below";
  const check = () => {
    const ok = m === TARGET.m && b === TARGET.b && op === TARGET.op && side === correctSide;
    if (ok) { setFb({ kind: "ok", msg: "Region matches." }); fire(); }
    else setFb({ kind: "no", msg: "Not quite.", correct: `y ${TARGET.op} ${TARGET.m}x + ${TARGET.b}` });
  };
  const cont = () => { setFb(null); setM(0); setB(0); setOp(">="); setSide(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={5} step={8} totalSteps={12}
        eyebrow="LINEAR INEQUALITIES"
        title={<>Graph <span className="gp-mark" style={{ fontFamily: "var(--font-mono)" }}>y ≥ x + 2</span></>}
        feedback={fb}
        canCheck={!!side}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "grid", gridTemplateColumns: "auto 200px", gap: 20, justifyContent: "center" }}>
          <svg width={SIZE} height={SIZE} style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14 }}>
            <GridAxes range={RANGE} size={SIZE} pad={PAD} />
            {side && <path d={shading} fill="var(--green-300)" opacity="0.35"/>}
            <path d={linePath} stroke="var(--green-700)" strokeWidth="2.5" strokeDasharray={dashed ? "5 4" : "0"} fill="none"/>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SliderCtrl label="slope · m" v={m} setV={setM} min={-3} max={3} step={1} disabled={!!fb}/>
            <SliderCtrl label="intercept · b" v={b} setV={setB} min={-5} max={5} step={1} disabled={!!fb}/>
            <div>
              <span className="gp-eyebrow" style={{ marginBottom: 4, display: "block" }}>operator</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {[">", ">=", "<", "<="].map((o) => (
                  <button key={o}
                    onClick={() => !fb && setOp(o)}
                    style={{
                      padding: "6px 0", borderRadius: 8,
                      background: op === o ? "var(--ink-900)" : "var(--paper-2)",
                      color: op === o ? "#fff" : "var(--ink-700)",
                      border: "2px solid " + (op === o ? "var(--ink-900)" : "var(--ink-200)"),
                      cursor: fb ? "default" : "pointer",
                      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14,
                    }}>{o === ">=" ? "≥" : o === "<=" ? "≤" : o}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="gp-eyebrow" style={{ marginBottom: 4, display: "block" }}>shade which side</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {["above", "below"].map((s) => (
                  <button key={s}
                    onClick={() => !fb && setSide(s)}
                    style={{
                      padding: "8px 0", borderRadius: 8,
                      background: side === s ? "var(--green-600)" : "var(--paper-2)",
                      color: side === s ? "#fff" : "var(--ink-700)",
                      border: "2px solid " + (side === s ? "var(--green-700)" : "var(--ink-200)"),
                      cursor: fb ? "default" : "pointer",
                      fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13,
                    }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 33. SCATTER PLOT (best-fit line) ──────────────────────────────
function ScatterPlotExerciseV2() {
  const POINTS = [
    { x: 1, y: 2.2 }, { x: 2, y: 3.8 }, { x: 3, y: 5.1 }, { x: 4, y: 4.4 },
    { x: 5, y: 6.9 }, { x: 6, y: 7.6 }, { x: 7, y: 9.1 }, { x: 8, y: 9.8 },
  ];
  const TARGET = { m: 1.1, b: 1.0 };
  const X_MAX = 10, Y_MAX = 12;
  const SIZE_W = 380, SIZE_H = 280;
  const PAD = { l: 36, r: 16, t: 16, b: 36 };
  const PLOTW = SIZE_W - PAD.l - PAD.r;
  const PLOTH = SIZE_H - PAD.t - PAD.b;
  const toX = (v) => PAD.l + (v / X_MAX) * PLOTW;
  const toY = (v) => PAD.t + PLOTH - (v / Y_MAX) * PLOTH;
  const fromX = (px) => Math.max(0, Math.min(X_MAX, ((px - PAD.l) / PLOTW) * X_MAX));
  const fromY = (px) => Math.max(0, Math.min(Y_MAX, Y_MAX - ((px - PAD.t) / PLOTH) * Y_MAX));

  const [start, setStart] = useStateT({ x: 0, y: 1 });
  const [end, setEnd] = useStateT({ x: 10, y: 11 });
  const [drag, setDrag] = useStateT(null);
  const [fb, setFb] = useStateT(null);
  const svgRef = useRefT(null);
  const { fire, layer } = useConfetti();

  const m = (end.y - start.y) / (end.x - start.x || 0.001);
  const b = start.y - m * start.x;

  const onMove = (e) => {
    if (!drag || !svgRef.current || fb) return;
    const r = svgRef.current.getBoundingClientRect();
    const x = fromX(e.clientX - r.left);
    const y = fromY(e.clientY - r.top);
    if (drag === "start") setStart({ x, y });
    else setEnd({ x, y });
  };

  const check = () => {
    if (Math.abs(m - TARGET.m) < 0.3 && Math.abs(b - TARGET.b) < 1.0) { setFb({ kind: "ok", msg: "Great line of best fit." }); fire(); }
    else setFb({ kind: "no", msg: "Line doesn't fit well yet.", explain: `Best fit is near y ≈ ${TARGET.m}x + ${TARGET.b}` });
  };
  const cont = () => { setFb(null); setStart({ x: 0, y: 1 }); setEnd({ x: 10, y: 11 }); };

  return (
    <div style={{ position: "relative", height: "100%" }} onMouseMove={onMove} onMouseUp={() => setDrag(null)}>
      {layer}
      <LessonShell
        hearts={4} streak={6} step={8} totalSteps={12}
        eyebrow="STATISTICS · BEST FIT"
        title="Drag the line to fit the data"
        feedback={fb}
        canCheck={true}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "grid", gridTemplateColumns: "auto 180px", gap: 20, justifyContent: "center", alignItems: "start" }}>
          <svg ref={svgRef} width={SIZE_W} height={SIZE_H} style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14, userSelect: "none" }}>
            {/* gridlines */}
            {Array.from({ length: 11 }, (_, i) => (
              <line key={"vx" + i} x1={toX(i)} y1={PAD.t} x2={toX(i)} y2={PAD.t + PLOTH} stroke="var(--ink-100)" strokeWidth="1"/>
            ))}
            {Array.from({ length: 13 }, (_, i) => (
              <line key={"vy" + i} x1={PAD.l} y1={toY(i)} x2={PAD.l + PLOTW} y2={toY(i)} stroke="var(--ink-100)" strokeWidth="1"/>
            ))}
            {/* axes */}
            <line x1={PAD.l} y1={toY(0)} x2={PAD.l + PLOTW} y2={toY(0)} stroke="var(--ink-500)" strokeWidth="1.5"/>
            <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={toY(0)} stroke="var(--ink-500)" strokeWidth="1.5"/>
            {/* labels */}
            {[0, 2, 4, 6, 8, 10].map((v) => (
              <text key={"xl" + v} x={toX(v)} y={toY(0) + 16} fontSize="11" textAnchor="middle" fill="var(--ink-500)" fontFamily="var(--font-mono)">{v}</text>
            ))}
            {[0, 2, 4, 6, 8, 10, 12].map((v) => (
              <text key={"yl" + v} x={PAD.l - 8} y={toY(v) + 4} fontSize="11" textAnchor="end" fill="var(--ink-500)" fontFamily="var(--font-mono)">{v}</text>
            ))}
            {/* line */}
            <line x1={toX(start.x)} y1={toY(start.y)} x2={toX(end.x)} y2={toY(end.y)} stroke="var(--green-600)" strokeWidth="2.5"/>
            {/* points */}
            {POINTS.map((p, i) => (
              <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r="4.5" fill="var(--coral-500)" stroke="var(--paper-2)" strokeWidth="1"/>
            ))}
            {/* drag handles */}
            {[["start", start], ["end", end]].map(([k, pt]) => (
              <g key={k} onMouseDown={() => !fb && setDrag(k)} style={{ cursor: fb ? "default" : "grab" }}>
                <circle cx={toX(pt.x)} cy={toY(pt.y)} r="11" fill="var(--green-600)" stroke="var(--paper-2)" strokeWidth="3"/>
              </g>
            ))}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 12, background: "var(--ink-50)", borderRadius: 10, textAlign: "center" }}>
              <div className="gp-eyebrow">your line</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, marginTop: 4, color: "var(--ink-900)" }}>
                y = {m.toFixed(2)}x {b >= 0 ? `+ ${b.toFixed(1)}` : `− ${Math.abs(b).toFixed(1)}`}
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-500)", lineHeight: 1.5 }}>
              Drag either green handle to set where the line passes. Try to put it through the middle of the scatter.
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 34. TABLE PATTERN ─────────────────────────────────────────────
function TablePatternExerciseV2() {
  const X = [1, 2, 3, 4, 5, 6];
  // rule: f(x) = 2x + 1
  const Y_GIVEN = [3, 5, null, 9, null, 13];
  const ANSWERS = { 2: 7, 4: 11 };
  const [vals, setVals] = useStateT({});
  const [results, setResults] = useStateT({});
  const [rule, setRule] = useStateT("");
  const RULE_OK = ["2x+1", "2x + 1", "2*x+1", "f(x)=2x+1"];
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();

  const blanks = X.filter((_, i) => Y_GIVEN[i] === null);
  const allFilled = blanks.every((_, j) => (vals[X.indexOf(blanks[j])] || "").trim().length > 0);

  const check = () => {
    const res = {};
    let wrongCount = 0;
    for (let i = 0; i < X.length; i++) {
      if (Y_GIVEN[i] === null) {
        const n = parseFloat(vals[i] || "");
        const ok = Math.abs(n - ANSWERS[i]) < 0.001;
        res[i] = ok; if (!ok) wrongCount++;
      }
    }
    setResults(res);
    const ruleOk = RULE_OK.includes(rule.trim().replace(/\s+/g, "").toLowerCase().replace(/f\(x\)=/, ""));
    if (wrongCount === 0 && ruleOk) { setFb({ kind: "ok", msg: "Pattern decoded." }); fire(); }
    else if (wrongCount === 0) setFb({ kind: "no", msg: "Numbers correct — but the rule isn't right yet.", correct: "f(x) = 2x + 1" });
    else setFb({ kind: "no", msg: `${wrongCount} number${wrongCount === 1 ? "" : "s"} wrong.`, correct: "f(x) = 2x + 1" });
  };
  const cont = () => { setFb(null); setVals({}); setResults({}); setRule(""); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={2} step={6} totalSteps={12}
        eyebrow="PATTERNS · LINEAR RULE"
        title="Fill the blanks and name the rule"
        feedback={fb}
        canCheck={allFilled && rule.trim().length > 0}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
            <div style={{
              display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 1fr 1fr 1fr",
              fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
            }}>
              <div style={cellH}>x</div>
              {X.map((x) => <div key={x} style={cellH}>{x}</div>)}
              <div style={{ ...cellH, borderTop: "2px solid var(--ink-100)" }}>f(x)</div>
              {X.map((_, i) => {
                const y = Y_GIVEN[i];
                const v = vals[i] || "";
                const isOk = results[i] === true;
                const isNo = results[i] === false;
                if (y !== null) {
                  return <div key={i} style={{ ...cell, borderTop: "2px solid var(--ink-100)" }}>{y}</div>;
                }
                return (
                  <div key={i} style={{ ...cell, borderTop: "2px solid var(--ink-100)", padding: 4 }}>
                    <input
                      value={v}
                      disabled={!!fb}
                      onChange={(e) => setVals({ ...vals, [i]: e.target.value })}
                      placeholder="?"
                      style={{
                        width: "100%",
                        padding: "6px 4px", borderRadius: 6,
                        border: `2px solid ${isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-200)"}`,
                        background: isOk ? "var(--green-50)" : isNo ? "var(--coral-50)" : "var(--paper)",
                        fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700,
                        textAlign: "center", color: "var(--ink-900)",
                        outline: "none",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="gp-eyebrow" style={{ marginBottom: 6 }}>What's the rule?</div>
          <input
            value={rule} disabled={!!fb}
            onChange={(e) => setRule(e.target.value)}
            placeholder="f(x) = 2x + 1"
            className="gp-input"
            style={{ fontFamily: "var(--font-mono)", textAlign: "center" }}
          />
        </div>
      </LessonShell>
    </div>
  );
}
const cellH = { padding: "10px 8px", textAlign: "center", background: "var(--ink-50)", color: "var(--ink-500)", borderRight: "1px solid var(--ink-100)" };
const cell = { padding: "10px 8px", textAlign: "center", color: "var(--ink-900)", borderRight: "1px solid var(--ink-100)" };

// ─── 35. TWO-WAY TABLE ─────────────────────────────────────────────
function TwoWayTableExerciseV2() {
  const ROWS = ["Boys", "Girls", "Total"];
  const COLS = ["Soccer", "Basketball", "Total"];
  const CELLS = [
    [12, null, 25],
    [null, 10, 23],
    [20, null, 48],
  ];
  const ANSWERS = { "0,1": 13, "1,0": 13, "2,1": 23 };
  const [vals, setVals] = useStateT({});
  const [results, setResults] = useStateT({});
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();

  const blanks = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (CELLS[r][c] === null) blanks.push(`${r},${c}`);
  const allFilled = blanks.every((k) => (vals[k] || "").trim());

  const check = () => {
    const res = {};
    let wrong = 0;
    for (const k of blanks) {
      const n = parseFloat(vals[k] || "");
      const ok = n === ANSWERS[k]; res[k] = ok; if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) { setFb({ kind: "ok", msg: "Totals all check out." }); fire(); }
    else setFb({ kind: "no", msg: `${wrong} cell${wrong === 1 ? "" : "s"} wrong.`, explain: "Rows and columns each sum to the Total." });
  };
  const cont = () => { setFb(null); setVals({}); setResults({}); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={4} step={5} totalSteps={12}
        eyebrow="STATISTICS · TWO-WAY TABLE"
        title="Fill the missing cells"
        feedback={fb}
        canCheck={allFilled}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{
          maxWidth: 480, margin: "0 auto",
          background: "var(--paper-2)",
          border: "2px solid var(--ink-100)",
          borderRadius: 14, overflow: "hidden",
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "100px repeat(3, 1fr)",
          }}>
            <div style={cellH}></div>
            {COLS.map((c, i) => (
              <div key={i} style={{ ...cellH, fontWeight: 800, color: i === COLS.length - 1 ? "var(--green-700)" : "var(--ink-500)" }}>{c}</div>
            ))}
            {ROWS.map((r, ri) => (
              <React.Fragment key={ri}>
                <div style={{ ...cellH, borderTop: "1px solid var(--ink-100)", fontWeight: 800, textAlign: "left", color: ri === ROWS.length - 1 ? "var(--green-700)" : "var(--ink-700)" }}>{r}</div>
                {COLS.map((_, ci) => {
                  const val = CELLS[ri][ci];
                  const key = `${ri},${ci}`;
                  const v = vals[key] || "";
                  const isOk = results[key] === true;
                  const isNo = results[key] === false;
                  const isTotal = ri === ROWS.length - 1 || ci === COLS.length - 1;
                  if (val !== null) {
                    return <div key={ci} style={{
                      ...cell, borderTop: "1px solid var(--ink-100)",
                      background: isTotal ? "var(--green-50)" : "var(--paper-2)",
                      color: isTotal ? "var(--green-800)" : "var(--ink-900)",
                      fontFamily: "var(--font-mono)", fontWeight: isTotal ? 800 : 600,
                    }}>{val}</div>;
                  }
                  return (
                    <div key={ci} style={{ ...cell, borderTop: "1px solid var(--ink-100)", padding: 6 }}>
                      <input
                        value={v} disabled={!!fb}
                        onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
                        placeholder="?"
                        style={{
                          width: "100%", padding: "6px 4px", borderRadius: 6,
                          border: `2px solid ${isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-200)"}`,
                          background: isOk ? "var(--green-50)" : isNo ? "var(--coral-50)" : "var(--paper)",
                          fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700,
                          textAlign: "center", color: "var(--ink-900)", outline: "none",
                        }}
                      />
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        <p style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--ink-500)" }}>
          Hint · each row and column sums to its Total.
        </p>
      </LessonShell>
    </div>
  );
}

// ─── 36. VENN DIAGRAM ──────────────────────────────────────────────
// Three modes:
//   numbers   — count students per region (default)
//   elements  — drag items into regions (set-theory canonical)
//   text      — describe each region in words
function VennDiagramExerciseV2() {
  const CFG = {
    setA: "Math Club", setB: "Science Club", total: 40,
    given: { a_only: 12, intersection: 8 },
    answers: { b_only: 10, neither: 10 },
  };
  const [vals, setVals] = useStateT({});
  const [results, setResults] = useStateT({});
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();

  const blanks = Object.keys(CFG.answers);
  const allFilled = blanks.every((k) => (vals[k] || "").trim());
  const check = () => {
    const res = {};
    let wrong = 0;
    for (const k of blanks) {
      const n = parseFloat(vals[k] || "");
      const ok = n === CFG.answers[k]; res[k] = ok; if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) { setFb({ kind: "ok", msg: "Regions add up to 40." }); fire(); }
    else setFb({ kind: "no", msg: `${wrong} region${wrong === 1 ? "" : "s"} wrong.`, explain: "All four regions must sum to the total (40)." });
  };
  const cont = () => { setFb(null); setVals({}); setResults({}); };

  const regionInput = (key, x, y) => {
    const isGiven = CFG.given[key] != null;
    const v = isGiven ? CFG.given[key] : vals[key] || "";
    const isOk = results[key] === true;
    const isNo = results[key] === false;
    return (
      <foreignObject x={x - 22} y={y - 16} width="44" height="32" style={{ overflow: "visible" }}>
        {isGiven ? (
          <div style={{
            width: 44, height: 32, borderRadius: 8,
            background: "rgba(255,255,255,0.95)", border: "2px solid var(--ink-200)",
            display: "grid", placeItems: "center",
            fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16, color: "var(--ink-900)",
          }}>{v}</div>
        ) : (
          <input
            value={vals[key] || ""}
            disabled={!!fb}
            onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
            placeholder="?"
            style={{
              width: 44, height: 32,
              padding: 0, borderRadius: 8,
              border: `2px solid ${isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-200)"}`,
              background: isOk ? "var(--green-50)" : isNo ? "var(--coral-50)" : "rgba(255,255,255,0.95)",
              fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16,
              textAlign: "center", color: "var(--ink-900)", outline: "none",
            }}
          />
        )}
      </foreignObject>
    );
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={3} step={6} totalSteps={12}
        eyebrow="SETS · VENN · COUNT"
        title={<>40 students · {CFG.setA} ∪ {CFG.setB}</>}
        feedback={fb}
        canCheck={allFilled}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <svg viewBox="0 0 420 260" style={{ width: "100%", height: 240, background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14 }}>
            <text x="20" y="24" fontFamily="var(--font-mono)" fontSize="11" fill="var(--ink-500)" fontWeight="600" letterSpacing="0.08em">UNIVERSE · 40</text>
            <circle cx="160" cy="130" r="80" fill="var(--green-300)" opacity="0.5" stroke="var(--green-700)" strokeWidth="2"/>
            <circle cx="260" cy="130" r="80" fill="var(--sun-300)" opacity="0.5" stroke="var(--sun-700)" strokeWidth="2"/>
            <text x="100" y="40" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--green-800)" textAnchor="middle">{CFG.setA}</text>
            <text x="320" y="40" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--sun-700)" textAnchor="middle">{CFG.setB}</text>
            {regionInput("a_only", 120, 130)}
            {regionInput("intersection", 210, 130)}
            {regionInput("b_only", 300, 130)}
            {regionInput("neither", 380, 230)}
            <text x="380" y="218" fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-500)" textAnchor="middle" fontWeight="600">NEITHER</text>
          </svg>
          <div style={{ marginTop: 14, padding: 12, background: "var(--ink-50)", borderRadius: 10, fontSize: 13, color: "var(--ink-700)" }}>
            <b>Given:</b> 12 students are only in Math Club, 8 are in both. Total: 40. Fill in B-only and Neither.
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// Element-drag variant — drag specific items into the right region
function VennDiagramElementsExerciseV2() {
  const CFG = {
    setA: "Even", setB: "> 5",
    items: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    correct: {
      1: "neither", 2: "a_only", 3: "neither", 4: "a_only", 5: "neither",
      6: "intersection", 7: "b_only", 8: "intersection",
      9: "b_only", 10: "intersection",
    },
  };
  const REGIONS = [
    { id: "a_only", label: "Even only", x: 120, y: 130, w: 90 },
    { id: "intersection", label: "Both", x: 210, y: 130, w: 60 },
    { id: "b_only", label: ">5 only", x: 300, y: 130, w: 90 },
    { id: "neither", label: "Neither", x: 380, y: 215, w: 70 },
  ];
  const [placed, setPlaced] = useStateT({}); // item -> region
  const [results, setResults] = useStateT({});
  const [hover, setHover] = useStateT(null);
  const [fb, setFb] = useStateT(null);
  const dragRef = useRefT(null);
  const { fire, layer } = useConfetti();

  const drop = (rid) => (e) => {
    e.preventDefault();
    if (!dragRef.current || fb) return;
    setPlaced({ ...placed, [dragRef.current]: rid });
    dragRef.current = null;
    setHover(null);
  };

  const allPlaced = CFG.items.every((it) => placed[it]);
  const check = () => {
    const res = {};
    let wrong = 0;
    for (const it of CFG.items) {
      const ok = placed[it] === CFG.correct[it]; res[it] = ok; if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) { setFb({ kind: "ok", msg: "Every number's in its right region." }); fire(); }
    else setFb({ kind: "no", msg: `${wrong} in the wrong region.`, explain: "Even ∩ >5 = {6, 8, 10}." });
  };
  const cont = () => { setFb(null); setPlaced({}); setResults({}); };

  const unplaced = CFG.items.filter((it) => !placed[it]);

  // chip renderer (positioned absolutely over SVG regions via a wrapper)
  const chipsFor = (rid) => {
    const items = CFG.items.filter((it) => placed[it] === rid);
    return items.map((it) => {
      const ok = results[it] === true;
      const no = results[it] === false;
      return (
        <span key={it}
          draggable={!fb}
          onDragStart={(e) => { dragRef.current = it; e.dataTransfer.effectAllowed = "move"; }}
          onClick={() => !fb && setPlaced((p) => { const np = { ...p }; delete np[it]; return np; })}
          style={{
            display: "inline-grid", placeItems: "center",
            width: 28, height: 28, borderRadius: 999,
            background: ok ? "var(--green-500)" : no ? "var(--coral-500)" : "var(--paper-2)",
            color: ok || no ? "#fff" : "var(--ink-900)",
            border: `2px solid ${ok ? "var(--green-700)" : no ? "var(--coral-700)" : "var(--ink-300)"}`,
            fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 12,
            cursor: fb ? "default" : "grab",
            boxShadow: "var(--shadow-xs)",
            margin: 1,
          }}>{it}</span>
      );
    });
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={5} step={7} totalSteps={12}
        eyebrow="SETS · VENN · CLASSIFY"
        title={<>Drag each number into the right region · A = Even · B = greater than 5</>}
        feedback={fb}
        canCheck={allPlaced}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          {/* Venn container — relative-positioned, SVG underneath, drop zones above */}
          <div style={{
            position: "relative",
            width: "100%", aspectRatio: "420 / 260",
            background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14,
            overflow: "hidden",
          }}>
            <svg viewBox="0 0 420 260" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <text x="20" y="24" fontFamily="var(--font-mono)" fontSize="11" fill="var(--ink-500)" fontWeight="600" letterSpacing="0.08em">UNIVERSE</text>
              <circle cx="160" cy="130" r="80" fill="var(--green-300)" opacity="0.42" stroke="var(--green-700)" strokeWidth="2"/>
              <circle cx="260" cy="130" r="80" fill="var(--sun-300)" opacity="0.42" stroke="var(--sun-700)" strokeWidth="2"/>
              <text x="100" y="40" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--green-800)" textAnchor="middle">A · {CFG.setA}</text>
              <text x="320" y="40" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--sun-700)" textAnchor="middle">B · {CFG.setB}</text>
              <text x="380" y="205" fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-500)" textAnchor="middle" fontWeight="700" letterSpacing="0.08em">NEITHER</text>
            </svg>
            {/* drop zones (positioned by viewBox % so they scale) */}
            {REGIONS.map((r) => {
              const isHover = hover === r.id;
              const left = `${(r.x / 420) * 100}%`;
              const top = `${(r.y / 260) * 100}%`;
              return (
                <div key={r.id}
                  onDragOver={(e) => { e.preventDefault(); setHover(r.id); }}
                  onDragLeave={() => setHover(null)}
                  onDrop={drop(r.id)}
                  style={{
                    position: "absolute",
                    left, top,
                    transform: "translate(-50%, -50%)",
                    width: `${(r.w / 420) * 100}%`,
                    minHeight: 64,
                    padding: 4,
                    background: isHover ? "rgba(255,255,255,0.85)" : "transparent",
                    border: isHover ? "2px dashed var(--green-600)" : "2px dashed transparent",
                    borderRadius: 12,
                    transition: "background 120ms, border-color 120ms",
                    display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center",
                  }}>
                  {chipsFor(r.id)}
                </div>
              );
            })}
          </div>
          {/* bank */}
          <div style={{
            marginTop: 12, padding: 10,
            background: "var(--ink-50)", borderRadius: 12,
            display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center",
            minHeight: 48,
          }}>
            {unplaced.length === 0
              ? <span style={{ fontSize: 12, color: "var(--ink-400)", padding: 10 }}>All placed — hit Check.</span>
              : unplaced.map((it) => (
                <span key={it}
                  draggable
                  onDragStart={(e) => { dragRef.current = it; e.dataTransfer.effectAllowed = "move"; }}
                  style={{
                    display: "inline-grid", placeItems: "center",
                    width: 36, height: 36, borderRadius: 999,
                    background: "var(--paper-2)", color: "var(--ink-900)",
                    border: "2px solid var(--ink-200)",
                    fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 15,
                    cursor: "grab",
                    boxShadow: "0 2px 0 0 var(--ink-200)",
                  }}>{it}</span>
              ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-400)", textAlign: "center" }}>
            Drag from the bank into a region · click a placed item to send it back.
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// Text variant — describe each region in words
function VennDiagramTextExerciseV2() {
  const CFG = {
    setA: "Plays guitar", setB: "Sings",
    answers: {
      a_only: "Guitarists who don't sing",
      intersection: "Singer-guitarists",
      b_only: "Singers who don't play",
      neither: "Neither",
    },
  };
  const [vals, setVals] = useStateT({});
  const [results, setResults] = useStateT({});
  const [fb, setFb] = useStateT(null);
  const { fire, layer } = useConfetti();
  const normalize = (s) => s.toLowerCase().trim().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ");

  const keys = Object.keys(CFG.answers);
  const allFilled = keys.every((k) => (vals[k] || "").trim().length > 0);
  const check = () => {
    const res = {};
    let wrong = 0;
    for (const k of keys) {
      // accept rough match: must include the key terms (e.g., "guitar" + "not sing" for a_only)
      const got = normalize(vals[k] || "");
      const target = normalize(CFG.answers[k]);
      const terms = target.split(" ").filter((t) => t.length > 2);
      const matched = terms.filter((t) => got.includes(t)).length;
      const ok = matched >= Math.max(1, Math.floor(terms.length * 0.5));
      res[k] = ok; if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) { setFb({ kind: "ok", msg: "Good descriptions of each region." }); fire(); }
    else setFb({ kind: "no", msg: `${wrong} region${wrong === 1 ? "" : "s"} off.`, explain: Object.entries(CFG.answers).map(([k, v]) => `${k}: "${v}"`).join(" · ") });
  };
  const cont = () => { setFb(null); setVals({}); setResults({}); };

  const regionTextarea = (key, x, y, w = 92) => {
    const isOk = results[key] === true;
    const isNo = results[key] === false;
    return (
      <foreignObject x={x - w / 2} y={y - 24} width={w} height={48} style={{ overflow: "visible" }}>
        <textarea
          value={vals[key] || ""}
          disabled={!!fb}
          onChange={(e) => setVals({ ...vals, [key]: e.target.value })}
          placeholder="describe…"
          style={{
            width: "100%", height: 48,
            padding: 6, borderRadius: 8,
            border: `2px solid ${isOk ? "var(--green-500)" : isNo ? "var(--coral-500)" : "var(--ink-200)"}`,
            background: isOk ? "var(--green-50)" : isNo ? "var(--coral-50)" : "rgba(255,255,255,0.95)",
            fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 11,
            textAlign: "center", color: "var(--ink-900)", outline: "none",
            resize: "none", lineHeight: 1.2,
          }}
        />
      </foreignObject>
    );
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={4} step={7} totalSteps={12}
        eyebrow="SETS · VENN · LABEL"
        title="Describe each region in your own words"
        feedback={fb}
        canCheck={allFilled}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <svg viewBox="0 0 420 260" style={{ width: "100%", height: 260, background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14 }}>
            <circle cx="160" cy="130" r="80" fill="var(--green-300)" opacity="0.42" stroke="var(--green-700)" strokeWidth="2"/>
            <circle cx="260" cy="130" r="80" fill="var(--sun-300)" opacity="0.42" stroke="var(--sun-700)" strokeWidth="2"/>
            <text x="100" y="40" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--green-800)" textAnchor="middle">A · {CFG.setA}</text>
            <text x="320" y="40" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--sun-700)" textAnchor="middle">B · {CFG.setB}</text>
            {regionTextarea("a_only", 120, 130)}
            {regionTextarea("intersection", 210, 130, 70)}
            {regionTextarea("b_only", 300, 130)}
            {regionTextarea("neither", 380, 220, 76)}
          </svg>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, {
  GridAxes, SliderCtrl,
  ArithmeticPuzzleExerciseV2, CardSortExerciseV2, CoordinatePlaneExerciseV2,
  EquationSolverExerciseV2, FunctionGraphExerciseV2, GraphTransformExerciseV2,
  InequalityGraphExerciseV2, ScatterPlotExerciseV2, TablePatternExerciseV2,
  TwoWayTableExerciseV2, VennDiagramExerciseV2,
  VennDiagramElementsExerciseV2, VennDiagramTextExerciseV2,
});
