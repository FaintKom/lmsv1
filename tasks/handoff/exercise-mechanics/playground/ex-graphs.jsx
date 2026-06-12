/* ex-graphs.jsx — GridAxes + CoordinatePlaneV2 + FunctionGraphV2 +
   GraphTransformV2 + InequalityGraphV2 (batch 5 ports with audit fixes)

   Shared (GX):
   - GX-01 SVGs are viewBox-only (width 100%) and the side panel stacks
           below the plot in narrow containers (.gx-layout) — upstream
           hardcoded width=380 + a fixed 200px column
   - GX-03 free-Check removed family-wide: Check unlocks after the child
           actually interacts (move a point / touch a slider / pick a side)

   CoordinatePlaneV2:
   - CP-01 points start spread along the bottom edge, not stacked at (0,0)
   - CP-03 keyboard: Tab to a point, arrows move it one unit
   - CP-04 structured reveal list
   - CP-06 partial feedback: "2 of 3 points are right — they lock green"

   FunctionGraphV2:
   - FG-03 wrong-attempt hint says WHICH dial is off (slope vs intercept),
           not which way — guidance without giving it away

   GraphTransformV2 / InequalityGraphV2:
   - IG-03 negative-b reveal rendered "+ -3" — proper sign formatting
   - IG-04 partial feedback counts how many of the 4 settings are right
*/

const { useState: useStateX, useRef: useRefX, useMemo: useMemoX } = React;

const GX_SIZE = 380;
const GX_PAD = 36;

function GridAxes({ range, size, pad }) {
  const scale = (size - pad * 2) / (range * 2);
  const toX = (v) => pad + (v + range) * scale;
  const toY = (v) => pad + (range - v) * scale;
  /* label thinning for big ranges */
  const every = range > 8 ? 2 : 1;
  return (
    <g>
      {Array.from({ length: range * 2 + 1 }, (_, i) => {
        const v = -range + i;
        if (v === 0) return null;
        return (
          <g key={v}>
            <line x1={toX(v)} y1={pad} x2={toX(v)} y2={size - pad} stroke="var(--ink-100)" strokeWidth="1"></line>
            <line x1={pad} y1={toY(v)} x2={size - pad} y2={toY(v)} stroke="var(--ink-100)" strokeWidth="1"></line>
          </g>
        );
      })}
      <line x1={pad} y1={toY(0)} x2={size - pad} y2={toY(0)} stroke="var(--ink-500)" strokeWidth="1.5"></line>
      <line x1={toX(0)} y1={pad} x2={toX(0)} y2={size - pad} stroke="var(--ink-500)" strokeWidth="1.5"></line>
      <polygon points={(size - pad) + "," + toY(0) + " " + (size - pad - 8) + "," + (toY(0) - 5) + " " + (size - pad - 8) + "," + (toY(0) + 5)} fill="var(--ink-500)"></polygon>
      <polygon points={toX(0) + "," + pad + " " + (toX(0) - 5) + "," + (pad + 8) + " " + (toX(0) + 5) + "," + (pad + 8)} fill="var(--ink-500)"></polygon>
      {Array.from({ length: range * 2 + 1 }, (_, i) => {
        const v = -range + i;
        if (v === 0 || v % every !== 0) return null;
        return (
          <g key={"t" + v}>
            <text x={toX(v)} y={toY(0) + 16} fontSize="11" fontFamily="var(--font-mono)" textAnchor="middle" fill="var(--ink-500)">{v}</text>
            <text x={toX(0) - 8} y={toY(v) + 4} fontSize="11" fontFamily="var(--font-mono)" textAnchor="end" fill="var(--ink-500)">{v}</text>
          </g>
        );
      })}
      <text x={toX(0) - 8} y={toY(0) + 16} fontSize="11" fontFamily="var(--font-mono)" textAnchor="end" fill="var(--ink-500)">0</text>
    </g>
  );
}

function GxSlider({ label, v, setV, min, max, step, disabled, onFirstTouch }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span className="gp-eyebrow">{label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--green-700)", fontSize: 13 }}>{v}</span>
      </div>
      <input type="range" className="gx-slider" min={min} max={max} step={step} value={v} disabled={disabled}
        aria-label={label}
        onChange={(e) => { setV(parseFloat(e.target.value)); onFirstTouch && onFirstTouch(); }} />
    </div>
  );
}

const signed = (n) => (n >= 0 ? "+ " + n : "− " + Math.abs(n));

/* ════════════════ COORDINATE PLANE ════════════════ */
const CP_COLORS = ["var(--green-600)", "var(--coral-500)", "#3b82f6", "#a855f7"];

function CoordinatePlaneV2({ targets, range = 6, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const scale = (GX_SIZE - GX_PAD * 2) / (range * 2);
  const toX = (v) => GX_PAD + (v + range) * scale;
  const toY = (v) => GX_PAD + (range - v) * scale;

  /* CP-01: spread starts along the bottom */
  const [pts, setPts] = useStateX(() => targets.map((_, i) => ({ x: -range + 1 + i * 2, y: -range + 1 })));
  const [lockedOk, setLockedOk] = useStateX([]);
  const [drag, setDrag] = useStateX(null);
  const [moved, setMoved] = useStateX(false);
  const [feedback, setFeedback] = useStateX(null);
  const [attemptsLeft, setAttemptsLeft] = useStateX(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateX(0);
  const [lostHeart, setLostHeart] = useStateX(false);
  const [streak, setStreak] = useStateX(initialStreak);
  const svgRef = useRefX(null);
  const { fire, layer } = useConfetti();

  const svgPoint = (e) => {
    const svg = svgRef.current;
    const r = svg.getBoundingClientRect();
    const sx = GX_SIZE / r.width;
    return { px: (e.clientX - r.left) * sx, py: (e.clientY - r.top) * sx };
  };

  const onPointDown = (i) => (e) => {
    if (feedback || lockedOk.includes(i)) return;
    svgRef.current && svgRef.current.setPointerCapture(e.pointerId);
    setDrag(i);
  };
  const onMove = (e) => {
    if (drag === null || feedback) return;
    const { px, py } = svgPoint(e);
    const x = Math.max(-range, Math.min(range, Math.round((px - GX_PAD) / scale - range)));
    const y = Math.max(-range, Math.min(range, Math.round(range - (py - GX_PAD) / scale)));
    setPts((ps) => ps.map((p, i) => (i === drag ? { x, y } : p)));
    setMoved(true);
  };
  const keyMovePt = (i, dx, dy) => {
    if (feedback || lockedOk.includes(i)) return;
    setPts((ps) => ps.map((p, j) => (j === i ? { x: Math.max(-range, Math.min(range, p.x + dx)), y: Math.max(-range, Math.min(range, p.y + dy)) } : p)));
    setMoved(true);
  };

  const handleCheck = () => {
    setDrag(null);
    const okFlags = targets.map((t, i) => pts[i].x === t.x && pts[i].y === t.y);
    if (okFlags.every(Boolean)) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "All " + targets.length + " points, spot on!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    const okCount = okFlags.filter(Boolean).length;
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here are the points", correctList: targets.map((tg) => [tg.label, "(" + tg.x + ", " + tg.y + ")"]) });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? "Some points are off — 1 try left" : "Some points are off — " + remaining + " tries left"),
        explain: okCount > 0 ? okCount + " of " + targets.length + " are right — they lock in place. Dashed rings show where the others belong." : "Dashed rings show roughly where to look.",
      });
    }
  };

  const handleRetry = () => {
    setLockedOk(targets.map((t, i) => (pts[i].x === t.x && pts[i].y === t.y ? i : -1)).filter((i) => i >= 0));
    setFeedback(null);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Drag each point home"}
        feedback={feedback} canCheck={moved && !feedback}
        checkHint="Move the points first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg ref={svgRef} viewBox={"0 0 " + GX_SIZE + " " + GX_SIZE} className="gx-svg interactive"
            onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
            <GridAxes range={range} size={GX_SIZE} pad={GX_PAD}></GridAxes>
            {drag !== null && (
              <g>
                <line x1={toX(pts[drag].x)} y1={toY(0)} x2={toX(pts[drag].x)} y2={toY(pts[drag].y)} stroke={CP_COLORS[drag % CP_COLORS.length]} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6"></line>
                <line x1={toX(0)} y1={toY(pts[drag].y)} x2={toX(pts[drag].x)} y2={toY(pts[drag].y)} stroke={CP_COLORS[drag % CP_COLORS.length]} strokeWidth="1.5" strokeDasharray="3 4" opacity="0.6"></line>
                <rect x={toX(pts[drag].x) - 26} y={toY(pts[drag].y) - 44} width="52" height="22" rx="6" fill="var(--ink-900)"></rect>
                <text x={toX(pts[drag].x)} y={toY(pts[drag].y) - 29} textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="var(--font-mono)">{pts[drag].x},{pts[drag].y}</text>
              </g>
            )}
            {feedback && feedback.kind === "no" && targets.map((tg, i) =>
              pts[i].x !== tg.x || pts[i].y !== tg.y ? (
                <circle key={"t" + i} className="fb-target-ring" cx={toX(tg.x)} cy={toY(tg.y)} r="12" fill="none" stroke={CP_COLORS[i % CP_COLORS.length]} strokeWidth="2" strokeDasharray="3 3"></circle>
              ) : null
            )}
            {pts.map((p, i) => {
              const tg = targets[i];
              const here = p.x === tg.x && p.y === tg.y;
              const isOk = (feedback && here) || lockedOk.includes(i);
              const isNo = feedback && !here;
              const fill = isOk ? "var(--green-600)" : isNo ? "var(--coral-500)" : CP_COLORS[i % CP_COLORS.length];
              return (
                <g key={i}
                  className={"fb-pt" + (drag === i ? " grabbed" : "") + (isOk ? " ok" : "")}
                  tabIndex={feedback || lockedOk.includes(i) ? -1 : 0}
                  role="button"
                  aria-label={"Point " + tg.label + " at (" + p.x + ", " + p.y + "). Target (" + tg.x + ", " + tg.y + "). Arrow keys move it."}
                  onPointerDown={onPointDown(i)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowLeft") { e.preventDefault(); keyMovePt(i, -1, 0); }
                    if (e.key === "ArrowRight") { e.preventDefault(); keyMovePt(i, 1, 0); }
                    if (e.key === "ArrowUp") { e.preventDefault(); keyMovePt(i, 0, 1); }
                    if (e.key === "ArrowDown") { e.preventDefault(); keyMovePt(i, 0, -1); }
                  }}
                  style={{ cursor: feedback ? "default" : undefined }}>
                  <circle className="body" cx={toX(p.x)} cy={toY(p.y)} r="14" fill={fill} stroke="#fff" strokeWidth="2"></circle>
                  <text x={toX(p.x)} y={toY(p.y) + 5} fontSize="13" fontFamily="var(--font-mono)" textAnchor="middle" fill="#fff" fontWeight="800" style={{ pointerEvents: "none" }}>{tg.label}</text>
                </g>
              );
            })}
          </svg>
          <div>
            <div className="gp-eyebrow" style={{ marginBottom: 10 }}>Place these points</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {targets.map((tg, i) => {
                const p = pts[i];
                const here = p.x === tg.x && p.y === tg.y;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10,
                    background: "var(--paper-2)",
                    border: "2px solid " + (feedback || lockedOk.includes(i) ? (here ? "var(--green-300)" : "var(--err-border)") : "var(--ink-100)"),
                    transition: "border-color 200ms",
                  }}>
                    <span style={{ width: 26, height: 26, borderRadius: "50%", background: CP_COLORS[i % CP_COLORS.length], color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 12, flex: "none" }}>{tg.label}</span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700 }}>({tg.x}, {tg.y})</span>
                    <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: here ? "var(--green-700)" : "var(--ink-400)" }}>now ({p.x},{p.y})</span>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, color: "var(--ink-300)", letterSpacing: "0.06em", textTransform: "uppercase", lineHeight: 1.7 }}>
              drag a point — or tab to it and use arrows
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ FUNCTION GRAPH ════════════════ */
function FunctionGraphV2({ target, range = 6, mStep = 0.5, bStep = 1, tolerance = 0.1, eyebrow, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const scale = (GX_SIZE - GX_PAD * 2) / (range * 2);
  const toX = (v) => GX_PAD + (v + range) * scale;
  const toY = (v) => GX_PAD + (range - v) * scale;

  const [m, setM] = useStateX(0);
  const [b, setB] = useStateX(0);
  const [touched, setTouched] = useStateX(false);
  const [feedback, setFeedback] = useStateX(null);
  const [attemptsLeft, setAttemptsLeft] = useStateX(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateX(0);
  const [lostHeart, setLostHeart] = useStateX(false);
  const [streak, setStreak] = useStateX(initialStreak);
  const { fire, layer } = useConfetti();

  const linePath = (mm, bb) => "M " + toX(-range) + " " + toY(mm * -range + bb) + " L " + toX(range) + " " + toY(mm * range + bb);

  const handleCheck = () => {
    const mOk = Math.abs(m - target.m) <= tolerance;
    const bOk = Math.abs(b - target.b) <= tolerance;
    if (mOk && bOk) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "The lines match — first try!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — the line was", correct: "y = " + target.m + "x " + signed(target.b) });
      setStreak(0);
    } else {
      /* FG-03: name the dial, not the direction */
      const hint = !mOk && !bOk ? "Both dials need work — check the tilt and where it crosses the y-axis."
        : !mOk ? "The tilt (slope) is off — the crossing point looks right."
        : "The tilt is right — check where your line crosses the y-axis.";
      setFeedback({ kind: "no", msg: remaining === 1 ? "Not matching — 1 try left" : "Not matching — " + remaining + " tries left", explain: hint });
    }
  };

  const handleRetry = () => setFeedback(null);
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={<span>Match the line · <span className="gp-mark" style={{ fontFamily: "var(--font-mono)", fontSize: 18 }}>y = {target.m}x {signed(target.b)}</span></span>}
        feedback={feedback} canCheck={touched && !feedback}
        checkHint="Move the sliders first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg viewBox={"0 0 " + GX_SIZE + " " + GX_SIZE} className="gx-svg">
            <GridAxes range={range} size={GX_SIZE} pad={GX_PAD}></GridAxes>
            <path d={linePath(target.m, target.b)} stroke="var(--coral-500)" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.6"></path>
            <path d={linePath(m, b)} stroke="var(--green-600)" strokeWidth="3" fill="none" style={{ transition: "d 120ms" }}></path>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <GxSlider label="slope · m" v={m} setV={setM} min={-5} max={5} step={mStep} disabled={!!feedback} onFirstTouch={() => setTouched(true)} />
            <GxSlider label="intercept · b" v={b} setV={setB} min={-5} max={5} step={bStep} disabled={!!feedback} onFirstTouch={() => setTouched(true)} />
            <div style={{ padding: 12, background: "var(--ink-50)", borderRadius: 10, fontFamily: "var(--font-mono)", textAlign: "center", fontSize: 16, fontWeight: 700 }}>
              y = {m}x {signed(b)}
            </div>
            <div style={{ padding: 10, background: "var(--coral-50)", borderRadius: 10, display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--coral-700)" }}>
              <span style={{ width: 14, height: 0, borderTop: "2.5px dashed var(--coral-500)", display: "inline-block" }}></span>
              target line
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ GRAPH TRANSFORM ════════════════ */
function GraphTransformV2({ target, range = 6, tolerance = 0.1, eyebrow, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const scale = (GX_SIZE - GX_PAD * 2) / (range * 2);
  const toX = (v) => GX_PAD + (v + range) * scale;
  const toY = (v) => GX_PAD + (range - v) * scale;

  const [h, setH] = useStateX(0);
  const [v, setV] = useStateX(0);
  const [a, setA] = useStateX(1);
  const [touched, setTouched] = useStateX(false);
  const [feedback, setFeedback] = useStateX(null);
  const [attemptsLeft, setAttemptsLeft] = useStateX(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateX(0);
  const [lostHeart, setLostHeart] = useStateX(false);
  const [streak, setStreak] = useStateX(initialStreak);
  const { fire, layer } = useConfetti();

  const pathStr = (hh, vv, aa) => {
    const pts = [];
    for (let x = -range; x <= range; x += 0.1) {
      const y = aa * (x - hh) * (x - hh) + vv;
      if (y >= -range && y <= range) pts.push([x, y]);
    }
    return pts.map(([x, y], i) => (i === 0 ? "M" : "L") + " " + toX(x) + " " + toY(y)).join(" ");
  };

  const handleCheck = () => {
    const oks = [Math.abs(h - target.h) <= tolerance, Math.abs(v - target.v) <= tolerance, Math.abs(a - target.a) <= tolerance];
    if (oks.every(Boolean)) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Curves overlap — beautiful!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — the curve was", correct: "y = " + target.a + "(x − " + target.h + ")² " + signed(target.v) });
      setStreak(0);
    } else {
      const names = ["slide (h)", "lift (v)", "stretch (a)"];
      const offNames = names.filter((_, i) => !oks[i]);
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "Not aligned — 1 try left" : "Not aligned — " + remaining + " tries left",
        explain: "Check: " + offNames.join(" and ") + ".",
      });
    }
  };

  const handleRetry = () => setFeedback(null);
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={<span>Slide & stretch to match the <span className="gp-mark">dashed</span> curve</span>}
        feedback={feedback} canCheck={touched && !feedback}
        checkHint="Move the sliders first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg viewBox={"0 0 " + GX_SIZE + " " + GX_SIZE} className="gx-svg">
            <GridAxes range={range} size={GX_SIZE} pad={GX_PAD}></GridAxes>
            <path d={pathStr(target.h, target.v, target.a)} stroke="var(--coral-500)" strokeWidth="2" strokeDasharray="4 4" fill="none" opacity="0.6"></path>
            <path d={pathStr(h, v, a)} stroke="var(--green-600)" strokeWidth="3" fill="none"></path>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <GxSlider label="slide · h" v={h} setV={setH} min={-5} max={5} step={1} disabled={!!feedback} onFirstTouch={() => setTouched(true)} />
            <GxSlider label="lift · v" v={v} setV={setV} min={-5} max={5} step={1} disabled={!!feedback} onFirstTouch={() => setTouched(true)} />
            <GxSlider label="stretch · a" v={a} setV={setA} min={0.5} max={3} step={0.5} disabled={!!feedback} onFirstTouch={() => setTouched(true)} />
            <div style={{ padding: 12, background: "var(--ink-50)", borderRadius: 10, fontFamily: "var(--font-mono)", textAlign: "center", fontSize: 14, fontWeight: 700 }}>
              y = {a}(x {h >= 0 ? "− " + h : "+ " + (-h)})² {signed(v)}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ INEQUALITY GRAPH ════════════════ */
const IG_OPS = [">", ">=", "<", "<="];
const igSym = (o) => (o === ">=" ? "≥" : o === "<=" ? "≤" : o);

function InequalityGraphV2({ target, range = 6, eyebrow, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const scale = (GX_SIZE - GX_PAD * 2) / (range * 2);
  const toX = (v) => GX_PAD + (v + range) * scale;
  const toY = (v) => GX_PAD + (range - v) * scale;

  const [m, setM] = useStateX(0);
  const [b, setB] = useStateX(0);
  const [op, setOp] = useStateX(">=");
  const [side, setSide] = useStateX(null);
  const [feedback, setFeedback] = useStateX(null);
  const [attemptsLeft, setAttemptsLeft] = useStateX(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateX(0);
  const [lostHeart, setLostHeart] = useStateX(false);
  const [streak, setStreak] = useStateX(initialStreak);
  const { fire, layer } = useConfetti();

  const linePath = "M " + toX(-range) + " " + toY(m * -range + b) + " L " + toX(range) + " " + toY(m * range + b);
  const dashed = op === ">" || op === "<";
  const shading = side === "above"
    ? "M " + toX(-range) + " " + toY(m * -range + b) + " L " + toX(range) + " " + toY(m * range + b) + " L " + toX(range) + " " + toY(range) + " L " + toX(-range) + " " + toY(range) + " Z"
    : side === "below"
      ? "M " + toX(-range) + " " + toY(m * -range + b) + " L " + toX(range) + " " + toY(m * range + b) + " L " + toX(range) + " " + toY(-range) + " L " + toX(-range) + " " + toY(-range) + " Z"
      : "";
  const correctSide = target.op.includes(">") ? "above" : "below";

  const handleCheck = () => {
    const oks = [m === target.m, b === target.b, op === target.op, side === correctSide];
    if (oks.every(Boolean)) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "The region matches — first try!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      /* IG-03: proper sign */
      setFeedback({ kind: "no", msg: "Out of tries — it was", correct: "y " + igSym(target.op) + " " + target.m + "x " + signed(target.b) });
      setStreak(0);
    } else {
      /* IG-04: count right settings */
      const names = ["slope", "intercept", "the symbol", "the shaded side"];
      const offNames = names.filter((_, i) => !oks[i]);
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "Not quite — 1 try left" : "Not quite — " + remaining + " tries left",
        explain: (4 - offNames.length) + " of 4 settings are right. Check " + offNames.join(", ") + ".",
      });
    }
  };

  const handleRetry = () => setFeedback(null);
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={<span>Graph <span className="gp-mark" style={{ fontFamily: "var(--font-mono)" }}>y {igSym(target.op)} {target.m}x {signed(target.b)}</span></span>}
        feedback={feedback} canCheck={!!side && !feedback}
        checkHint="Shade a side first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg viewBox={"0 0 " + GX_SIZE + " " + GX_SIZE} className="gx-svg">
            <GridAxes range={range} size={GX_SIZE} pad={GX_PAD}></GridAxes>
            {side && <path d={shading} fill="var(--green-300)" opacity="0.35"></path>}
            <path d={linePath} stroke="var(--green-700)" strokeWidth="2.5" strokeDasharray={dashed ? "5 4" : "0"} fill="none"></path>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <GxSlider label="slope · m" v={m} setV={setM} min={-3} max={3} step={1} disabled={!!feedback} />
            <GxSlider label="intercept · b" v={b} setV={setB} min={-5} max={5} step={1} disabled={!!feedback} />
            <div>
              <span className="gp-eyebrow" style={{ marginBottom: 4, display: "block" }}>symbol</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                {IG_OPS.map((o) => (
                  <button key={o} type="button" onClick={() => !feedback && setOp(o)}
                    aria-pressed={op === o}
                    style={{
                      padding: "8px 0", borderRadius: 8, minHeight: 36,
                      background: op === o ? "var(--ink-900)" : "var(--paper-2)",
                      color: op === o ? "#fff" : "var(--ink-700)",
                      border: "2px solid " + (op === o ? "var(--ink-900)" : "var(--ink-200)"),
                      cursor: feedback ? "default" : "pointer",
                      fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14,
                      transition: "background 120ms, color 120ms",
                    }}>
                    {igSym(o)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="gp-eyebrow" style={{ marginBottom: 4, display: "block" }}>shade which side</span>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {["above", "below"].map((s) => (
                  <button key={s} type="button" onClick={() => !feedback && setSide(s)}
                    aria-pressed={side === s}
                    style={{
                      padding: "10px 0", borderRadius: 8, minHeight: 40,
                      background: side === s ? "var(--green-600)" : "var(--paper-2)",
                      color: side === s ? "#fff" : "var(--ink-700)",
                      border: "2px solid " + (side === s ? "var(--green-700)" : "var(--ink-200)"),
                      cursor: feedback ? "default" : "pointer",
                      fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13,
                      transition: "background 120ms, color 120ms",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { GridAxes, GxSlider, CoordinatePlaneV2, FunctionGraphV2, GraphTransformV2, InequalityGraphV2 });
