/* ex-tables.jsx — VennDiagramV2 + VennElementsV2 + TwoWayTableV2 +
   TablePatternV2 + AreaModelV2 (batch 4 ports with audit fixes)

   VennDiagramV2:
   - VD-01 inputs ≥40px touch height, inputMode numeric
   - VD-03 typing clears that cell's red mark; correct cells lock on retry
   - VD-05 Enter checks when everything is filled

   VennElementsV2:
   - VE-01 pointer-event drag (HTML5 DnD never fires on touch) + tap-to-arm
   - VE-04 reveal uses human region names ("Both", "Neither"), not raw ids
   - VE-02 region hit zones enlarged + visible while dragging

   TwoWayTableV2:
   - TW-03 dangling "Hint · undefined" fixed (renders only when provided)
   - TW-06 correct cells lock on retry + partial count in the sheet
   - TW-01 inputMode numeric, typing clears marks, Enter advances blanks

   TablePatternV2:
   - TP-01 ANSWER LEAK: rule placeholder was the literal answer — now a
           neutral example placeholder
   - TP-02 rule matching: strips f(x)=/y=, accepts * for multiplication
   - TP-03 correct numbers lock on retry; "numbers right, rule wrong" keeps
           the cheaper message

   AreaModelV2:
   - AM-01 grid column ratios are clamped (a 20|3 split no longer makes a
           40px column at narrow widths)
   - AM-02 cell inputs ≥40px, inputMode numeric, typing clears marks
   - AM-04 correct cells lock green on retry
*/

const { useState: useStateT, useRef: useRefT, useMemo: useMemoT } = React;

/* shared: numeric input cell */
function numClean(s) { return s.replace(/[^0-9.\-]/g, "").slice(0, 8); }

/* ════════════════ VENN DIAGRAM (numbers) ════════════════ */
const VENN_POS = { a_only: { x: 120, y: 130 }, intersection: { x: 210, y: 130 }, b_only: { x: 300, y: 130 }, neither: { x: 380, y: 225 } };
const VENN_REGIONS = ["a_only", "intersection", "b_only", "neither"];

function VennDiagramV2({ setA, setB, total, given = {}, answers, prompt, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [vals, setVals] = useStateT({});
  const [results, setResults] = useStateT({});
  const [lockedOk, setLockedOk] = useStateT({});
  const [feedback, setFeedback] = useStateT(null);
  const [attemptsLeft, setAttemptsLeft] = useStateT(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateT(0);
  const [lostHeart, setLostHeart] = useStateT(false);
  const [streak, setStreak] = useStateT(initialStreak);
  const { fire, layer } = useConfetti();

  const blanks = Object.keys(answers);
  const allFilled = blanks.every((k) => (vals[k] || "").trim().length > 0);

  const handleCheck = () => {
    const res = {};
    let wrong = 0;
    for (const k of blanks) {
      const ok = parseFloat(vals[k] || "") === answers[k];
      res[k] = ok;
      if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? (total != null ? "All regions add up to " + total + "!" : "Every region is right!") : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    const okCount = blanks.length - wrong;
    if (remaining <= 0) {
      setFeedback({
        kind: "no",
        msg: "Out of tries — here are the regions",
        correctList: blanks.map((k) => [k === "a_only" ? "Only " + setA : k === "b_only" ? "Only " + setB : k === "intersection" ? "Both" : "Neither", String(answers[k])]),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (wrong === 1 ? "1 region is off" : wrong + " regions are off") + " — " + remaining + (remaining === 1 ? " try left" : " tries left"),
        explain: (okCount > 0 ? okCount + " locked in green. " : "") + (total != null ? "All regions must add up to " + total + "." : ""),
      });
    }
  };

  const handleRetry = () => {
    const locks = {};
    blanks.forEach((k) => { if (results[k]) locks[k] = true; });
    setLockedOk(locks);
    setResults({});
    setFeedback(null);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  const regionInput = (key) => {
    const pos = VENN_POS[key];
    const isGiven = given[key] != null;
    const isOk = results[key] === true || lockedOk[key];
    const isNo = results[key] === false;
    return (
      <foreignObject key={key} x={pos.x - 26} y={pos.y - 20} width="52" height="40" style={{ overflow: "visible" }}>
        {isGiven ? (
          <div style={{ width: 52, height: 40, borderRadius: 8, background: "rgba(255,255,255,0.95)", border: "2px solid var(--ink-200)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16, color: "var(--ink-900)" }}>
            {given[key]}
          </div>
        ) : (
          <input
            className={"tb-input" + (isOk ? " ok" : isNo ? " no" : "")}
            style={{ width: 52, height: 40, background: "rgba(255,255,255,0.95)" }}
            value={vals[key] || ""}
            disabled={!!feedback || lockedOk[key]}
            inputMode="numeric"
            aria-label={(key === "a_only" ? "Only " + setA : key === "b_only" ? "Only " + setB : key === "intersection" ? "Both sets" : "Neither set")}
            placeholder="?"
            onChange={(e) => {
              setVals({ ...vals, [key]: numClean(e.target.value) });
              if (results[key] === false) setResults((r) => { const nr = { ...r }; delete nr[key]; return nr; });
            }}
            onKeyDown={(e) => { if (e.key === "Enter" && allFilled && !feedback) handleCheck(); }}
          />
        )}
      </foreignObject>
    );
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Count every region"}
        feedback={feedback} canCheck={allFilled}
        checkHint="Fill every region first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <svg viewBox="0 0 420 260" style={{ width: "100%", background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14 }}>
            {total != null && (
              <text x="20" y="24" fontFamily="var(--font-mono)" fontSize="11" fill="var(--ink-500)" fontWeight="600" letterSpacing="0.08em">EVERYONE · {total}</text>
            )}
            <circle cx="160" cy="130" r="80" fill="var(--green-300)" opacity="0.5" stroke="var(--green-700)" strokeWidth="2"></circle>
            <circle cx="260" cy="130" r="80" fill="var(--sun-300)" opacity="0.5" stroke="var(--sun-700)" strokeWidth="2"></circle>
            <text x="100" y="40" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--green-800)" textAnchor="middle">{setA}</text>
            <text x="320" y="40" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--sun-700)" textAnchor="middle">{setB}</text>
            <text x="380" y="198" fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-500)" textAnchor="middle" fontWeight="700" letterSpacing="0.08em">NEITHER</text>
            {VENN_REGIONS.map(regionInput)}
          </svg>
          {prompt && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--ink-50)", borderRadius: 10, fontSize: 13.5, color: "var(--ink-700)", fontWeight: 500 }}>{prompt}</div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ VENN ELEMENTS (drag) ════════════════ */
const VE_ZONES = [
  { id: "a_only", label: "A only", x: 115, y: 135, w: 92, h: 90 },
  { id: "intersection", label: "Both", x: 210, y: 135, w: 64, h: 90 },
  { id: "b_only", label: "B only", x: 305, y: 135, w: 92, h: 90 },
  { id: "neither", label: "Neither", x: 378, y: 222, w: 80, h: 64 },
];
const VE_NAMES = { a_only: "A only", intersection: "Both", b_only: "B only", neither: "Neither" };

function VennElementsV2({ setA, setB, items, correct, hint, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [placed, setPlaced] = useStateT({});
  const [results, setResults] = useStateT({});
  const [lockedOk, setLockedOk] = useStateT({});
  const [drag, setDrag] = useStateT(null);
  const [armed, setArmed] = useStateT(null);
  const [feedback, setFeedback] = useStateT(null);
  const [attemptsLeft, setAttemptsLeft] = useStateT(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateT(0);
  const [lostHeart, setLostHeart] = useStateT(false);
  const [streak, setStreak] = useStateT(initialStreak);
  const start = useRefT({ x: 0, y: 0 });
  const zoneRefs = useRefT({});
  const { fire, layer } = useConfetti();

  const zoneAt = (x, y) => {
    for (const z of VE_ZONES) {
      const el = zoneRefs.current[z.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z.id;
    }
    return null;
  };

  const expected = (key) => correct[key] || "neither";

  const down = (key) => (e) => {
    if (feedback || lockedOk[key]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ key, dx: 0, dy: 0, over: null, moved: false });
  };
  const move = (e) => {
    if (!drag) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({ ...drag, dx, dy, over: zoneAt(e.clientX, e.clientY), moved: drag.moved || Math.hypot(dx, dy) > 6 });
  };
  const up = () => {
    if (!drag) return;
    const { key, over, moved } = drag;
    setDrag(null);
    if (!moved) {
      if (placed[key]) {
        setPlaced((p) => { const np = { ...p }; delete np[key]; return np; });
        setResults((r) => { const nr = { ...r }; delete nr[key]; return nr; });
      } else {
        setArmed((a) => (a === key ? null : key));
      }
      return;
    }
    setArmed(null);
    if (over) setPlaced((p) => ({ ...p, [key]: over }));
  };
  const zoneTap = (zid) => {
    if (!armed || feedback) return;
    const key = armed;
    setArmed(null);
    setPlaced((p) => ({ ...p, [key]: zid }));
  };

  const allPlaced = items.every((it) => placed[String(it)]);

  const handleCheck = () => {
    const res = {};
    let wrong = 0;
    items.forEach((it) => {
      const key = String(it);
      const ok = placed[key] === expected(key);
      res[key] = ok;
      if (!ok) wrong++;
    });
    setResults(res);
    if (wrong === 0) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Every item in its place!" : "Got it!" });
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
      /* VE-04: human names, structured */
      setFeedback({ kind: "no", msg: "Out of tries — here's where they go", correctList: items.map((it) => [String(it), VE_NAMES[expected(String(it))]]) });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (wrong === 1 ? "1 item is in the wrong region" : wrong + " items are in the wrong regions") + " — " + remaining + (remaining === 1 ? " try left" : " tries left"),
        explain: "Right ones lock in green; wrong ones hop back.",
      });
    }
  };

  const handleRetry = () => {
    const locks = {};
    const keep = {};
    items.forEach((it) => {
      const key = String(it);
      if (results[key]) { locks[key] = true; keep[key] = placed[key]; }
    });
    setLockedOk(locks);
    setPlaced(keep);
    setResults({});
    setFeedback(null);
  };
  const handleContinue = () => {
    const wrongCount = items.filter((it) => placed[String(it)] !== expected(String(it))).length;
    onFinish && onFinish({ correct: feedback && feedback.kind === "ok", wrongCount, attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  };
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const unplaced = items.filter((it) => !placed[String(it)]);

  const chip = (it, inZone) => {
    const key = String(it);
    const isDrag = drag !== null && drag.key === key;
    const isArmed = armed === key;
    const ok = results[key] === true || lockedOk[key];
    const no = results[key] === false;
    return (
      <button key={key}
        className={(isArmed ? "armed " : "") + (inZone ? "landed" : "")}
        onPointerDown={down(key)}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (placed[key]) { up(); } else setArmed((a) => (a === key ? null : key)); } }}
        aria-pressed={isArmed}
        aria-label={key + (inZone ? " in " + VE_NAMES[placed[key]] + (lockedOk[key] ? ", locked correct" : ". Tap to return") : isArmed ? " — now tap a region" : ". Tap to arm, then tap a region")}
        disabled={!!feedback || lockedOk[key]}
        style={{
          display: "inline-grid", placeItems: "center",
          minWidth: inZone ? 30 : 40, minHeight: inZone ? 30 : 40,
          padding: "0 9px", borderRadius: 999,
          background: ok ? "var(--green-500)" : no ? "var(--err-border)" : "var(--paper-2)",
          color: ok || no ? "#fff" : "var(--ink-900)",
          border: "2px solid " + (ok ? "var(--green-700)" : no ? "var(--err-fg)" : isArmed ? "var(--green-600)" : "var(--ink-300)"),
          boxShadow: isArmed ? "0 0 0 4px var(--green-100)" : inZone ? "none" : "0 2px 0 0 var(--ink-200)",
          fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: inZone ? 12.5 : 15,
          cursor: feedback || lockedOk[key] ? "default" : "grab",
          margin: 1, touchAction: "none", userSelect: "none",
          transform: isDrag && drag.moved ? "translate(" + drag.dx + "px, " + drag.dy + "px) scale(1.15)" : "none",
          zIndex: isDrag ? 40 : "auto", position: "relative",
          transition: isDrag ? "none" : "transform 200ms, background 150ms, border-color 150ms",
          animation: no ? "fb-shake calc(.4s * var(--mdur)) ease both" : undefined,
        }}>
        {it}
      </button>
    );
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Drag each item into " + setA + ", " + setB + ", both — or neither"}
        feedback={feedback} canCheck={allPlaced}
        checkHint="Place every item first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ position: "relative", width: "100%", aspectRatio: "420 / 260", background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14 }}>
            <svg viewBox="0 0 420 260" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <circle cx="160" cy="130" r="80" fill="var(--green-300)" opacity="0.42" stroke="var(--green-700)" strokeWidth="2"></circle>
              <circle cx="260" cy="130" r="80" fill="var(--sun-300)" opacity="0.42" stroke="var(--sun-700)" strokeWidth="2"></circle>
              <text x="100" y="38" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--green-800)" textAnchor="middle">A · {setA}</text>
              <text x="320" y="38" fontFamily="var(--font-sans)" fontWeight="800" fontSize="13" fill="var(--sun-700)" textAnchor="middle">B · {setB}</text>
              <text x="378" y="190" fontFamily="var(--font-mono)" fontSize="9" fill="var(--ink-500)" textAnchor="middle" fontWeight="700" letterSpacing="0.08em">NEITHER</text>
            </svg>
            {VE_ZONES.map((z) => {
              const isOver = drag !== null && drag.over === z.id;
              const isTarget = (!!armed || (drag !== null && drag.moved)) && !feedback;
              return (
                <div key={z.id}
                  ref={(el) => { zoneRefs.current[z.id] = el; }}
                  role={armed ? "button" : undefined}
                  tabIndex={armed ? 0 : -1}
                  aria-label={armed ? "Place “" + armed + "” in " + z.label : z.label}
                  onClick={() => zoneTap(z.id)}
                  onKeyDown={(e) => { if (armed && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); zoneTap(z.id); } }}
                  style={{
                    position: "absolute",
                    left: (z.x / 420) * 100 + "%", top: (z.y / 260) * 100 + "%",
                    transform: "translate(-50%, -50%)",
                    width: (z.w / 420) * 100 + "%", minHeight: z.h,
                    padding: 4,
                    background: isOver ? "rgba(255,255,255,0.9)" : isTarget ? "rgba(255,255,255,0.45)" : "transparent",
                    border: "2px dashed " + (isOver ? "var(--green-600)" : isTarget ? "var(--ink-300)" : "transparent"),
                    borderRadius: 12,
                    transition: "background 120ms, border-color 120ms",
                    display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center",
                    cursor: armed ? "pointer" : "default",
                  }}>
                  {items.filter((it) => placed[String(it)] === z.id).map((it) => chip(it, true))}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, padding: 10, background: "var(--ink-50)", borderRadius: 12, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", minHeight: 52 }}>
            {unplaced.length === 0 ? (
              <span style={{ fontSize: 11, color: "var(--ink-400)", padding: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>all placed — hit check!</span>
            ) : (
              unplaced.map((it) => chip(it, false))
            )}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-400)", textAlign: "center", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {hint || "drag — or tap an item, then tap its region"}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ TWO-WAY TABLE ════════════════ */
function TwoWayTableV2({ rowLabels, colLabels, cells, answers, hint, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [vals, setVals] = useStateT({});
  const [results, setResults] = useStateT({});
  const [lockedOk, setLockedOk] = useStateT({});
  const [feedback, setFeedback] = useStateT(null);
  const [attemptsLeft, setAttemptsLeft] = useStateT(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateT(0);
  const [lostHeart, setLostHeart] = useStateT(false);
  const [streak, setStreak] = useStateT(initialStreak);
  const { fire, layer } = useConfetti();
  const inputRefs = useRefT({});

  const blanks = [];
  for (let r = 0; r < cells.length; r++) for (let c = 0; c < cells[r].length; c++) if (cells[r][c] === null) blanks.push(r + "," + c);
  const allFilled = blanks.every((k) => (vals[k] || "").trim().length > 0);

  const handleCheck = () => {
    const res = {};
    let wrong = 0;
    for (const k of blanks) {
      const ok = parseFloat(vals[k] || "") === answers[k];
      res[k] = ok;
      if (!ok) wrong++;
    }
    setResults(res);
    if (wrong === 0) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Totals check out — first try!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    const okCount = blanks.length - wrong;
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here are the cells", correctList: blanks.map((k) => { const [r, c] = k.split(","); return [rowLabels[+r] + " × " + colLabels[+c], String(answers[k])]; }), explain: hint });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (wrong === 1 ? "1 cell is off" : wrong + " cells are off") + " — " + remaining + (remaining === 1 ? " try left" : " tries left"),
        explain: (okCount > 0 ? okCount + " of " + blanks.length + " locked in green. " : "") + (hint || ""),
      });
    }
  };

  const handleRetry = () => {
    const locks = {};
    blanks.forEach((k) => { if (results[k]) locks[k] = true; });
    setLockedOk(locks);
    setResults({});
    setFeedback(null);
    const firstBad = blanks.find((k) => !locks[k]);
    setTimeout(() => { if (firstBad && inputRefs.current[firstBad]) inputRefs.current[firstBad].focus(); }, 60);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  const cellHStyle = { padding: "10px 8px", textAlign: "center", background: "var(--ink-50)", color: "var(--ink-500)", borderRight: "1px solid var(--ink-100)", fontSize: 13 };
  const cellStyle = { padding: "10px 8px", textAlign: "center", color: "var(--ink-900)", borderRight: "1px solid var(--ink-100)" };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Fill in the missing cells"}
        feedback={feedback} canCheck={allFilled}
        checkHint="Fill every cell first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14, overflow: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(72px, 100px) repeat(" + colLabels.length + ", minmax(56px, 1fr))" }}>
            <div style={cellHStyle}></div>
            {colLabels.map((c, i) => (
              <div key={i} style={{ ...cellHStyle, fontWeight: 800, color: i === colLabels.length - 1 ? "var(--green-700)" : "var(--ink-500)" }}>{c}</div>
            ))}
            {rowLabels.map((r, ri) => (
              <React.Fragment key={ri}>
                <div style={{ ...cellHStyle, borderTop: "1px solid var(--ink-100)", fontWeight: 800, textAlign: "left", color: ri === rowLabels.length - 1 ? "var(--green-700)" : "var(--ink-700)" }}>{r}</div>
                {colLabels.map((_, ci) => {
                  const val = cells[ri][ci];
                  const key = ri + "," + ci;
                  const isTotal = ri === rowLabels.length - 1 || ci === colLabels.length - 1;
                  if (val !== null) {
                    return (
                      <div key={ci} style={{ ...cellStyle, borderTop: "1px solid var(--ink-100)", background: isTotal ? "var(--green-50)" : "var(--paper-2)", color: isTotal ? "var(--green-800)" : "var(--ink-900)", fontFamily: "var(--font-mono)", fontWeight: isTotal ? 800 : 600 }}>{val}</div>
                    );
                  }
                  const isOk = results[key] === true || lockedOk[key];
                  const isNo = results[key] === false;
                  return (
                    <div key={ci} style={{ ...cellStyle, borderTop: "1px solid var(--ink-100)", padding: 6 }}>
                      <input
                        ref={(el) => { inputRefs.current[key] = el; }}
                        className={"tb-input" + (isOk ? " ok" : isNo ? " no" : "")}
                        value={vals[key] || ""}
                        disabled={!!feedback || lockedOk[key]}
                        inputMode="numeric"
                        aria-label={rowLabels[ri] + ", " + colLabels[ci]}
                        placeholder="?"
                        onChange={(e) => {
                          setVals({ ...vals, [key]: numClean(e.target.value) });
                          if (results[key] === false) setResults((r2) => { const nr = { ...r2 }; delete nr[key]; return nr; });
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter") return;
                          const rest = blanks.filter((k) => k !== key && !lockedOk[k] && !(vals[k] || "").trim());
                          if (rest.length && inputRefs.current[rest[0]]) inputRefs.current[rest[0]].focus();
                          else if (allFilled && !feedback) handleCheck();
                        }}
                      />
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        {hint && (
          <p style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--ink-500)", fontWeight: 500 }}>Hint · {hint}</p>
        )}
      </LessonShell>
    </div>
  );
}

/* ════════════════ TABLE PATTERN ════════════════ */
const normRuleT = (s) => s.trim().toLowerCase().replace(/\s+/g, "").replace(/\*/g, "").replace(/^f\(x\)=/, "").replace(/^y=/, "");

function TablePatternV2({ xValues, yGiven, answers, ruleAccepted, ruleDisplay, ruleExample = "like: 3x − 2", eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [vals, setVals] = useStateT({});
  const [results, setResults] = useStateT({});
  const [lockedOk, setLockedOk] = useStateT({});
  const [rule, setRule] = useStateT("");
  const [ruleState, setRuleState] = useStateT("");
  const [feedback, setFeedback] = useStateT(null);
  const [attemptsLeft, setAttemptsLeft] = useStateT(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateT(0);
  const [lostHeart, setLostHeart] = useStateT(false);
  const [streak, setStreak] = useStateT(initialStreak);
  const { fire, layer } = useConfetti();

  const blankIndices = yGiven.map((y, i) => (y === null ? i : -1)).filter((i) => i >= 0);
  const allFilled = blankIndices.every((i) => (vals[i] || "").trim().length > 0) && rule.trim().length > 0;
  const acceptedNorm = ruleAccepted.map(normRuleT);

  const handleCheck = () => {
    const res = {};
    let wrong = 0;
    for (const i of blankIndices) {
      const ok = Math.abs(parseFloat(vals[i] || "") - answers[i]) < 0.001;
      res[i] = ok;
      if (!ok) wrong++;
    }
    setResults(res);
    const ruleOk = acceptedNorm.includes(normRuleT(rule));
    setRuleState(ruleOk ? "ok" : "no");
    if (wrong === 0 && ruleOk) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Pattern decoded, first try!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    const msg = wrong === 0
      ? "The numbers are right — the rule needs another look"
      : (wrong === 1 ? "1 number is off" : wrong + " numbers are off");
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries", correct: ruleDisplay });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: msg + " — " + remaining + (remaining === 1 ? " try left" : " tries left") });
    }
  };

  const handleRetry = () => {
    const locks = {};
    blankIndices.forEach((i) => { if (results[i]) locks[i] = true; });
    setLockedOk(locks);
    setResults({});
    if (ruleState === "no") setRuleState("");
    setFeedback(null);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  const cellHStyle = { padding: "10px 8px", textAlign: "center", background: "var(--ink-50)", color: "var(--ink-500)", borderRight: "1px solid var(--ink-100)" };
  const cellStyle = { padding: "10px 8px", textAlign: "center", color: "var(--ink-900)", borderRight: "1px solid var(--ink-100)" };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Crack the pattern"}
        feedback={feedback} canCheck={allFilled}
        checkHint="Fill the table and name the rule"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "56px repeat(" + xValues.length + ", 1fr)", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700 }}>
              <div style={cellHStyle}>x</div>
              {xValues.map((x) => <div key={x} style={cellHStyle}>{x}</div>)}
              <div style={{ ...cellHStyle, borderTop: "2px solid var(--ink-100)" }}>f(x)</div>
              {xValues.map((_, i) => {
                const y = yGiven[i];
                if (y !== null) return <div key={i} style={{ ...cellStyle, borderTop: "2px solid var(--ink-100)" }}>{y}</div>;
                const isOk = results[i] === true || lockedOk[i];
                const isNo = results[i] === false;
                return (
                  <div key={i} style={{ ...cellStyle, borderTop: "2px solid var(--ink-100)", padding: 4 }}>
                    <input
                      className={"tb-input" + (isOk ? " ok" : isNo ? " no" : "")}
                      value={vals[i] || ""}
                      disabled={!!feedback || lockedOk[i]}
                      inputMode="numeric" placeholder="?"
                      aria-label={"f of " + xValues[i]}
                      onChange={(e) => {
                        setVals({ ...vals, [i]: numClean(e.target.value) });
                        if (results[i] === false) setResults((r) => { const nr = { ...r }; delete nr[i]; return nr; });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="gp-eyebrow" style={{ marginBottom: 6 }}>What's the rule?</div>
          <input
            className={"gp-input " + (ruleState === "ok" ? "correct" : ruleState === "no" ? "wrong" : "")}
            value={rule}
            disabled={!!feedback}
            /* TP-01: example, NOT the answer */
            placeholder={ruleExample}
            aria-label="The pattern rule"
            style={{ fontFamily: "var(--font-mono)", textAlign: "center" }}
            onChange={(e) => { setRule(e.target.value); if (ruleState === "no") setRuleState(""); }}
            onKeyDown={(e) => { if (e.key === "Enter" && allFilled && !feedback) handleCheck(); }}
          />
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--ink-400)", textAlign: "center", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            “2x+1”, “f(x) = 2x + 1” and “y = 2x + 1” all work
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ AREA MODEL ════════════════ */
const AM_PAL = ["var(--green-50)", "var(--sun-50)", "var(--coral-50)", "var(--ink-50)"];

function AreaModelV2({ a, b, splits, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [cellVals, setCellVals] = useStateT({});
  const [total, setTotal] = useStateT("");
  const [results, setResults] = useStateT({});
  const [lockedOk, setLockedOk] = useStateT({});
  const [totalOk, setTotalOk] = useStateT(null);
  const [feedback, setFeedback] = useStateT(null);
  const [attemptsLeft, setAttemptsLeft] = useStateT(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateT(0);
  const [lostHeart, setLostHeart] = useStateT(false);
  const [streak, setStreak] = useStateT(initialStreak);
  const { fire, layer } = useConfetti();

  const expectedTotal = a * b;
  const expectedCell = (r, c) => splits.b[r] * splits.a[c];
  /* AM-01: clamp fr ratios so a 20|3 split doesn't crush the 3 column */
  const frA = useMemoT(() => {
    const min = Math.min(...splits.a), max = Math.max(...splits.a);
    return splits.a.map((n) => Math.max(1, Math.min(2.4, n / min)));
  }, [splits]);

  const allFilled = total.trim().length > 0 && splits.b.every((_, r) => splits.a.every((__, c) => (cellVals[r + "," + c] || "").trim().length > 0));

  const handleCheck = () => {
    const res = {};
    let wrong = 0;
    splits.b.forEach((_, r) => splits.a.forEach((__, c) => {
      const key = r + "," + c;
      const ok = parseFloat(cellVals[key] || "") === expectedCell(r, c);
      res[key] = ok;
      if (!ok) wrong++;
    }));
    setResults(res);
    const tOk = parseFloat(total) === expectedTotal;
    setTotalOk(tOk);
    if (wrong === 0 && tOk) {
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? a + " × " + b + " = " + expectedTotal + " — first try!" : "Got it!",
        explain: "Splitting " + a + " into " + splits.a.join(" + ") + " and " + b + " into " + splits.b.join(" + ") + " turns one hard multiply into " + (splits.a.length * splits.b.length) + " easy ones.",
      });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    const msg = !tOk && wrong === 0
      ? "Every box is right — just the final addition slipped"
      : (wrong === 1 ? "1 box is off" : wrong + " boxes are off");
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries", correct: a + " × " + b + " = " + expectedTotal });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: msg + " — " + remaining + (remaining === 1 ? " try left" : " tries left") });
    }
  };

  const handleRetry = () => {
    const locks = {};
    Object.keys(results).forEach((k) => { if (results[k]) locks[k] = true; });
    setLockedOk(locks);
    setResults({});
    if (totalOk === false) setTotalOk(null);
    setFeedback(null);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title || ("Fill the boxes for " + a + " × " + b)}
        feedback={feedback} canCheck={allFilled}
        checkHint="Fill every box and the total"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ overflowX: "auto", paddingBottom: 2 }}>
          <div style={{ minWidth: 44 + splits.a.length * 68 }}>
          <div style={{ display: "grid", gridTemplateColumns: "44px " + frA.map((f) => "minmax(64px, " + f + "fr)").join(" "), gap: 4, alignItems: "center", marginBottom: 4 }}>
            <div></div>
            {splits.a.map((n, c) => (
              <div key={c} style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16, color: "var(--green-700)" }}>{n}</div>
            ))}
          </div>
          {splits.b.map((bn, r) => (
            <div key={r} style={{ display: "grid", gridTemplateColumns: "44px " + frA.map((f) => "minmax(64px, " + f + "fr)").join(" "), gap: 4, marginBottom: 4, alignItems: "stretch" }}>
              <div style={{ display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 16, color: "var(--coral-700)" }}>{bn}</div>
              {splits.a.map((an, c) => {
                const key = r + "," + c;
                const isOk = results[key] === true || lockedOk[key];
                const isNo = results[key] === false;
                return (
                  <div key={key} style={{
                    background: isOk ? "var(--green-50)" : isNo ? "var(--err-bg)" : AM_PAL[(r + c) % AM_PAL.length],
                    border: "2px solid " + (isOk ? "var(--green-500)" : isNo ? "var(--err-border)" : "var(--ink-200)"),
                    borderRadius: 10, padding: 8,
                    minHeight: 64,
                    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 4,
                    animation: isNo ? "fb-shake calc(.4s * var(--mdur)) ease both" : undefined,
                    transition: "border-color 150ms, background 150ms",
                  }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-500)", fontWeight: 600, whiteSpace: "nowrap" }}>{bn} × {an}</div>
                    <input
                      className="tb-input"
                      style={{ border: "1px solid var(--ink-200)", background: "var(--paper)", maxWidth: 88 }}
                      value={cellVals[key] || ""}
                      disabled={!!feedback || lockedOk[key]}
                      inputMode="numeric" placeholder="?"
                      aria-label={bn + " times " + an}
                      onChange={(e) => {
                        setCellVals({ ...cellVals, [key]: numClean(e.target.value) });
                        if (results[key] === false) setResults((r2) => { const nr = { ...r2 }; delete nr[key]; return nr; });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          ))}
          </div>
          </div>
          <div style={{
            marginTop: 18, padding: 14, background: "var(--paper-2)",
            border: "2px solid " + (totalOk === true ? "var(--green-500)" : totalOk === false ? "var(--err-border)" : "var(--ink-100)"),
            borderRadius: 12, display: "flex", alignItems: "center", gap: 12, justifyContent: "center",
            transition: "border-color 150ms",
          }}>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "var(--ink-700)" }}>{a} × {b} =</span>
            <input
              className={"tb-input" + (totalOk === true ? " ok" : totalOk === false ? " no" : "")}
              style={{ width: 100 }}
              value={total}
              disabled={!!feedback}
              inputMode="numeric" placeholder="?"
              aria-label={"Total of " + a + " times " + b}
              onChange={(e) => { setTotal(numClean(e.target.value)); if (totalOk === false) setTotalOk(null); }}
              onKeyDown={(e) => { if (e.key === "Enter" && allFilled && !feedback) handleCheck(); }}
            />
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--ink-400)", textAlign: "center", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            each box = its row × its column · then add them all up
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { VennDiagramV2, VennElementsV2, TwoWayTableV2, TablePatternV2, AreaModelV2 });
