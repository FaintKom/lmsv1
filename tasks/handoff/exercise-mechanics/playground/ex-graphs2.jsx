/* ex-graphs2.jsx — ScatterPlotV2 + FunctionMachineV2 + ProbabilityWheelV2 +
   EquationBalanceV2 (batch 5 ports with audit fixes)

   ScatterPlotV2:
   - SP-01 mouse events → pointer events (upstream was the THIRD
           touch-broken mechanic: onMouseDown/Move only)
   - SP-02 handles are keyboard-movable (arrows, 0.5 step)
   - SP-03 viewBox-responsive, panel stacks below on narrow

   FunctionMachineV2:
   - FM-01 type=number → sanitised text + inputMode=decimal; Enter feeds
   - FM-02 rule matching strips y= and * (consistent with TablePattern)
   - FM-04 duplicate-input nudge ("you already tried 2 — try a new number")

   ProbabilityWheelV2:
   - PW-01 20 spins × 1.5s was 30+ seconds of mandatory tapping. Added
           "spin ×5" fast mode: one short animation, five tallies. Single
           spins stay for the first feel.
   - PW-02 pick row explains itself before it's unlocked

   EquationBalanceV2:
   - EB-01 op buttons are GENERATED from the scale state (upstream
           hardcoded "−4" — dead button on most configurations)
   - EB-03 Undo — one wrong op no longer ruins the attempt
   - EB-04 disabled ÷ explains why (weights don't split evenly)
   - EB-02 Check requires ≥1 move
*/

const { useState: useStateY, useRef: useRefY, useEffect: useEffectY } = React;

/* ════════════════ SCATTER PLOT ════════════════ */
const SPW = 380, SPH = 280;
const SP_PAD = { l: 36, r: 16, t: 16, b: 36 };
const SP_PW = SPW - SP_PAD.l - SP_PAD.r;
const SP_PH = SPH - SP_PAD.t - SP_PAD.b;

function ScatterPlotV2({ points, target, xMax = 10, yMax = 12, mTolerance = 0.3, bTolerance = 1.0, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const toX = (v) => SP_PAD.l + (v / xMax) * SP_PW;
  const toY = (v) => SP_PAD.t + SP_PH - (v / yMax) * SP_PH;

  const [start, setStart] = useStateY({ x: 0, y: 1 });
  const [end, setEnd] = useStateY({ x: xMax, y: yMax - 1 });
  const [drag, setDrag] = useStateY(null);
  const [touched, setTouched] = useStateY(false);
  const [feedback, setFeedback] = useStateY(null);
  const [attemptsLeft, setAttemptsLeft] = useStateY(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateY(0);
  const [lostHeart, setLostHeart] = useStateY(false);
  const [streak, setStreak] = useStateY(initialStreak);
  const svgRef = useRefY(null);
  const { fire, layer } = useConfetti();

  const m = (end.y - start.y) / (end.x - start.x || 0.001);
  const b = start.y - m * start.x;

  const svgCoords = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    const sx = SPW / r.width;
    const px = (e.clientX - r.left) * sx;
    const py = (e.clientY - r.top) * sx;
    return {
      x: Math.max(0, Math.min(xMax, ((px - SP_PAD.l) / SP_PW) * xMax)),
      y: Math.max(0, Math.min(yMax, yMax - ((py - SP_PAD.t) / SP_PH) * yMax)),
    };
  };

  /* SP-01: pointer events with capture */
  const onHandleDown = (k) => (e) => {
    if (feedback) return;
    svgRef.current && svgRef.current.setPointerCapture(e.pointerId);
    setDrag(k);
    setTouched(true);
  };
  const onMove = (e) => {
    if (!drag || feedback) return;
    const c = svgCoords(e);
    const snapped = { x: Math.round(c.x * 2) / 2, y: Math.round(c.y * 2) / 2 };
    if (drag === "start") setStart(snapped);
    else setEnd(snapped);
  };
  const keyMoveHandle = (k, dx, dy) => {
    if (feedback) return;
    const upd = (p) => ({ x: Math.max(0, Math.min(xMax, p.x + dx)), y: Math.max(0, Math.min(yMax, p.y + dy)) });
    if (k === "start") setStart(upd); else setEnd(upd);
    setTouched(true);
  };

  const handleCheck = () => {
    if (Math.abs(m - target.m) <= mTolerance && Math.abs(b - target.b) <= bTolerance) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Great line of fit!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    const explain = "Aim for roughly the same number of dots above and below your line.";
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — a good fit was", correct: "y ≈ " + target.m + "x + " + target.b, explain });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "The line doesn't fit yet — 1 try left" : "The line doesn't fit yet — " + remaining + " tries left", explain });
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
        eyebrow={eyebrow} title={title || "Fit a line through the dots"}
        feedback={feedback} canCheck={touched && !feedback}
        checkHint="Drag the green handles first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="gx-layout">
          <svg ref={svgRef} viewBox={"0 0 " + SPW + " " + SPH} className="gx-svg interactive"
            onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
            {Array.from({ length: xMax + 1 }, (_, i) => (
              <line key={"vx" + i} x1={toX(i)} y1={SP_PAD.t} x2={toX(i)} y2={SP_PAD.t + SP_PH} stroke="var(--ink-100)" strokeWidth="1"></line>
            ))}
            {Array.from({ length: yMax + 1 }, (_, i) => (
              <line key={"vy" + i} x1={SP_PAD.l} y1={toY(i)} x2={SP_PAD.l + SP_PW} y2={toY(i)} stroke="var(--ink-100)" strokeWidth="1"></line>
            ))}
            <line x1={SP_PAD.l} y1={toY(0)} x2={SP_PAD.l + SP_PW} y2={toY(0)} stroke="var(--ink-500)" strokeWidth="1.5"></line>
            <line x1={SP_PAD.l} y1={SP_PAD.t} x2={SP_PAD.l} y2={toY(0)} stroke="var(--ink-500)" strokeWidth="1.5"></line>
            {Array.from({ length: Math.floor(xMax / 2) + 1 }, (_, i) => i * 2).map((v) => (
              <text key={"xl" + v} x={toX(v)} y={toY(0) + 16} fontSize="11" textAnchor="middle" fill="var(--ink-500)" fontFamily="var(--font-mono)">{v}</text>
            ))}
            {Array.from({ length: Math.floor(yMax / 2) + 1 }, (_, i) => i * 2).map((v) => (
              <text key={"yl" + v} x={SP_PAD.l - 8} y={toY(v) + 4} fontSize="11" textAnchor="end" fill="var(--ink-500)" fontFamily="var(--font-mono)">{v}</text>
            ))}
            <line x1={toX(start.x)} y1={toY(start.y)} x2={toX(end.x)} y2={toY(end.y)} stroke="var(--green-600)" strokeWidth="2.5"></line>
            {points.map((p, i) => (
              <circle key={i} cx={toX(p.x)} cy={toY(p.y)} r="4.5" fill="var(--coral-500)" stroke="var(--paper-2)" strokeWidth="1"></circle>
            ))}
            {[["start", start], ["end", end]].map(([k, pt]) => (
              <g key={k}
                className={"fb-pt" + (drag === k ? " grabbed" : "")}
                tabIndex={feedback ? -1 : 0} role="button"
                aria-label={(k === "start" ? "Left" : "Right") + " handle at (" + pt.x + ", " + pt.y + "). Arrow keys move it."}
                onPointerDown={onHandleDown(k)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") { e.preventDefault(); keyMoveHandle(k, -0.5, 0); }
                  if (e.key === "ArrowRight") { e.preventDefault(); keyMoveHandle(k, 0.5, 0); }
                  if (e.key === "ArrowUp") { e.preventDefault(); keyMoveHandle(k, 0, 0.5); }
                  if (e.key === "ArrowDown") { e.preventDefault(); keyMoveHandle(k, 0, -0.5); }
                }}
                style={{ cursor: feedback ? "default" : undefined }}>
                <circle className="body" cx={toX(pt.x)} cy={toY(pt.y)} r="11" fill="var(--green-600)" stroke="var(--paper-2)" strokeWidth="3"></circle>
              </g>
            ))}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ padding: 12, background: "var(--ink-50)", borderRadius: 10, textAlign: "center" }}>
              <div className="gp-eyebrow">your line</div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, marginTop: 4 }}>
                y = {m.toFixed(2)}x {b >= 0 ? "+ " + b.toFixed(1) : "− " + Math.abs(b).toFixed(1)}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-500)", lineHeight: 1.5, fontWeight: 500 }}>
              Drag either green handle so the line passes through the middle of the dot cloud.
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ FUNCTION MACHINE ════════════════ */
const normRuleFM = (s) => s.trim().toLowerCase().replace(/\s+/g, "").replace(/\*/g, "").replace(/^f\(x\)=/, "").replace(/^y=/, "");

function FunctionMachineV2({ rule, ruleAccepted, ruleDisplay, sampleInputs = [1, 2, 5, 10], eyebrow, title, minRuns = 3, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [input, setInput] = useStateY("");
  const [history, setHistory] = useStateY([]);
  const [running, setRunning] = useStateY(false);
  const [lastOut, setLastOut] = useStateY(null);
  const [dupNudge, setDupNudge] = useStateY(false);
  const [guess, setGuess] = useStateY("");
  const [feedback, setFeedback] = useStateY(null);
  const [attemptsLeft, setAttemptsLeft] = useStateY(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateY(0);
  const [lostHeart, setLostHeart] = useStateY(false);
  const [streak, setStreak] = useStateY(initialStreak);
  const timer = useRefY(null);
  const logRef = useRefY(null);
  const { fire, layer } = useConfetti();

  useEffectY(() => () => clearTimeout(timer.current), []);
  useEffectY(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [history]);

  const acceptedNorm = ruleAccepted.map(normRuleFM);

  const runOne = (xRaw) => {
    if (feedback || running) return;
    const x = typeof xRaw === "number" ? xRaw : parseFloat(xRaw);
    if (!Number.isFinite(x)) return;
    if (history.some((h) => h.x === x)) {
      /* FM-04 */
      setDupNudge(true);
      setTimeout(() => setDupNudge(false), 1600);
      setInput("");
      return;
    }
    setRunning(true);
    setLastOut(null);
    timer.current = setTimeout(() => {
      const y = rule(x);
      setHistory((h) => [...h, { x, y }]);
      setLastOut(y);
      setRunning(false);
      setInput("");
    }, 600);
  };

  const handleCheck = () => {
    if (acceptedNorm.includes(normRuleFM(guess))) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Rule cracked, first try!" : "Got it!", explain: ruleDisplay });
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
      setFeedback({ kind: "no", msg: "Out of tries — the rule was", correct: ruleDisplay });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "That's not the rule — 1 try left" : "That's not the rule — " + remaining + " tries left",
        explain: "Feed a few more numbers — try 0, or two numbers next to each other.",
      });
    }
  };

  const handleRetry = () => setFeedback(null);
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const canCheck = history.length >= minRuns && guess.trim().length > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Crack the machine's secret rule"}
        feedback={feedback} canCheck={canCheck}
        checkHint={history.length < minRuns ? "Feed the machine " + minRuns + "+ numbers first" : "Type your rule guess first"}
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="gx-layout" style={{ maxWidth: 640 }}>
          {/* machine */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              background: "var(--sun-50)", border: "2px solid var(--sun-300)", borderRadius: 999,
              padding: "10px 16px", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 18,
              minWidth: 120, textAlign: "center",
              transition: "transform 600ms ease, opacity 600ms",
              transform: running ? "translateY(46px) scale(.8)" : "none",
              opacity: running ? 0 : 1,
            }}>
              x = {input || "?"}
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-400)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 4v14m0 0 -5-5m5 5 5-5"></path></svg>
            <div style={{
              width: "min(220px, 100%)", padding: "26px 24px",
              background: "var(--green-600)", color: "#fff",
              border: "3px solid var(--green-700)", borderRadius: 18,
              textAlign: "center", fontWeight: 800, fontSize: 16,
              letterSpacing: "0.08em", textTransform: "uppercase",
              boxShadow: "0 6px 0 var(--green-800)",
            }}>
              {running ? "computing…" : "f(x) = ???"}
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-400)" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 4v14m0 0 -5-5m5 5 5-5"></path></svg>
            <div style={{
              background: lastOut !== null ? "var(--coral-50)" : "var(--ink-50)",
              border: "2px solid " + (lastOut !== null ? "var(--coral-300)" : "var(--ink-200)"),
              borderRadius: 999, padding: "10px 16px",
              fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 18,
              minWidth: 120, textAlign: "center",
              color: lastOut !== null ? "var(--coral-700)" : "var(--ink-400)",
              animation: lastOut !== null ? "fb-pop calc(.35s * var(--mdur)) cubic-bezier(.34,1.56,.64,1) both" : "none",
            }}>
              y = {lastOut !== null ? lastOut : "?"}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", position: "relative" }}>
              {dupNudge && <span className="gp-checkhint" style={{ right: "auto", left: 0 }}>already tried that one!</span>}
              <input
                type="text" inputMode="decimal"
                value={input}
                disabled={running || !!feedback}
                aria-label="Number to feed the machine"
                onChange={(e) => setInput(e.target.value.replace(/[^0-9.\-]/g, "").slice(0, 6))}
                onKeyDown={(e) => { if (e.key === "Enter" && input.trim() !== "") runOne(input); }}
                placeholder="x"
                style={{ width: 80, padding: "10px 10px", borderRadius: 10, border: "2px solid var(--ink-200)", fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 700, textAlign: "center", background: "var(--paper-2)", outline: "none", minHeight: 44 }}
              />
              <button type="button" onClick={() => runOne(input)} disabled={running || !!feedback || input.trim() === ""} className="gp-btn" style={{ padding: "10px 18px", fontSize: 13 }}>
                Feed it
              </button>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-400)", alignSelf: "center" }}>try</span>
              {sampleInputs.map((n) => (
                <button key={n} type="button" onClick={() => runOne(n)} disabled={running || !!feedback}
                  className="gp-tile"
                  style={{ padding: "6px 12px", fontSize: 12, fontFamily: "var(--font-mono)", borderRadius: 999, opacity: history.some((h) => h.x === n) ? 0.35 : 1 }}>
                  {n}
                </button>
              ))}
            </div>
          </div>
          {/* history + guess */}
          <div>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>What went in & out · {history.length} / {minRuns}+</div>
            <div ref={logRef} style={{
              background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 12,
              padding: 8, minHeight: 90, maxHeight: 170, overflowY: "auto",
              fontFamily: "var(--font-mono)", fontSize: 13, marginBottom: 14,
            }}>
              {history.length === 0 ? (
                <div style={{ color: "var(--ink-400)", fontSize: 11, textAlign: "center", padding: 12 }}>feed some numbers to see what comes out</div>
              ) : (
                history.map((hh, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 6px", animation: "fb-pop calc(.25s * var(--mdur)) ease both" }}>
                    <span style={{ color: "var(--sun-700)" }}>x={hh.x}</span>
                    <span style={{ color: "var(--ink-300)" }}>→</span>
                    <span style={{ color: "var(--coral-700)" }}>y={hh.y}</span>
                  </div>
                ))
              )}
            </div>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>So what is f(x)?</div>
            <input
              className="gp-input"
              value={guess}
              disabled={!!feedback}
              aria-label="Your rule guess"
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canCheck && !feedback) handleCheck(); }}
              placeholder="f(x) = …"
              style={{ fontFamily: "var(--font-mono)", textAlign: "center", fontSize: 14 }}
            />
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ PROBABILITY WHEEL ════════════════ */
const PW_SIZE = 320, PW_R = 140, PW_C = PW_SIZE / 2;

function pwArc(startAngle, endAngle) {
  const sr = ((startAngle - 90) * Math.PI) / 180;
  const er = ((endAngle - 90) * Math.PI) / 180;
  const x1 = PW_C + PW_R * Math.cos(sr), y1 = PW_C + PW_R * Math.sin(sr);
  const x2 = PW_C + PW_R * Math.cos(er), y2 = PW_C + PW_R * Math.sin(er);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return "M " + PW_C + " " + PW_C + " L " + x1 + " " + y1 + " A " + PW_R + " " + PW_R + " 0 " + large + " 1 " + x2 + " " + y2 + " Z";
}

function ProbabilityWheelV2({ segments, targetSpins = 20, eyebrow, title, maxAttemptsPerTask = 2, streak: initialStreak = 0, onQuit, onFinish }) {
  const [angle, setAngle] = useStateY(0);
  const [spins, setSpins] = useStateY(0);
  const [spinning, setSpinning] = useStateY(false);
  const [tally, setTally] = useStateY(() => Object.fromEntries(segments.map((s) => [s.label, 0])));
  const [pick, setPick] = useStateY(null);
  const [feedback, setFeedback] = useStateY(null);
  const [attemptsLeft, setAttemptsLeft] = useStateY(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateY(0);
  const [lostHeart, setLostHeart] = useStateY(false);
  const [streak, setStreak] = useStateY(initialStreak);
  const timerRef = useRefY(null);
  const { fire, layer } = useConfetti();

  useEffectY(() => () => clearTimeout(timerRef.current), []);

  const totalWeight = segments.reduce((sum, s) => sum + (s.weight || 1), 0);
  let runningDeg = 0;
  const arcs = segments.map((s) => {
    const span = ((s.weight || 1) / totalWeight) * 360;
    const start = runningDeg;
    runningDeg += span;
    return { ...s, start, end: runningDeg };
  });

  const drawOne = () => {
    const r = Math.random() * totalWeight;
    let acc = 0;
    for (let i = 0; i < segments.length; i++) {
      acc += segments[i].weight || 1;
      if (r < acc) return i;
    }
    return segments.length - 1;
  };

  const spin = (count) => {
    if (spinning || feedback) return;
    const n = Math.min(count, targetSpins - spins);
    if (n <= 0) return;
    setSpinning(true);
    const results = Array.from({ length: n }, drawOne);
    const lastIdx = results[results.length - 1];
    const winner = arcs[lastIdx];
    const winnerCenter = (winner.start + winner.end) / 2;
    const extraTurns = n > 1 ? 2 : 4 + Math.floor(Math.random() * 3);
    const dur = n > 1 ? 800 : 1500;
    setAngle((prev) => prev + extraTurns * 360 + (360 - winnerCenter) - (prev % 360));
    timerRef.current = setTimeout(() => {
      setTally((t) => {
        const nt = { ...t };
        results.forEach((idx) => { nt[segments[idx].label] = (nt[segments[idx].label] || 0) + 1; });
        return nt;
      });
      setSpins((s) => s + n);
      setSpinning(false);
    }, dur);
  };

  const reachedTarget = spins >= targetSpins;
  const heaviest = segments.reduce((max, s) => ((s.weight || 1) > (max.weight || 1) ? s : max));

  const handleCheck = () => {
    if (!pick) return;
    const maxCount = Math.max(...Object.values(tally));
    const winners = Object.entries(tally).filter(([, c]) => c === maxCount).map(([l]) => l);
    if (winners.includes(pick)) {
      setFeedback({
        kind: "ok",
        msg: "Right — " + pick + " came up most (" + maxCount + " of " + spins + ")!",
        explain: heaviest.label !== pick ? "Fun twist: the biggest slice is " + heaviest.label + " — luck wobbles in small experiments!" : "It's also the biggest slice — frequency follows size when you spin enough.",
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
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "The most frequent was " + winners.join(" / ") + " (" + maxCount + " times)" });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "Check the tally bars — 1 try left" : "Check the tally bars — " + remaining + " tries left", explain: "The longest bar wins." });
    }
  };

  const handleRetry = () => setFeedback(null);
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak, tally });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow}
        title={title || <span>Spin {targetSpins} times — which slice wins <span className="gp-mark">most often</span>?</span>}
        feedback={feedback} canCheck={reachedTarget && !!pick}
        checkHint={!reachedTarget ? "Finish your " + targetSpins + " spins first" : "Pick the most frequent slice"}
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="gx-layout" style={{ maxWidth: 640 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative", width: "min(320px, 100%)" }}>
              <div style={{ position: "absolute", top: -2, left: "50%", marginLeft: -10, width: 20, height: 22, background: "var(--ink-900)", clipPath: "polygon(50% 100%, 0 0, 100% 0)", zIndex: 2 }}></div>
              <svg viewBox={"0 0 " + PW_SIZE + " " + PW_SIZE} style={{
                width: "100%", marginTop: 14,
                transform: "rotate(" + angle + "deg)",
                transition: spinning ? "transform " + (spins + 1 > 1 ? 800 : 1500) + "ms cubic-bezier(0.15, 0.65, 0.2, 1)" : "none",
                filter: "drop-shadow(0 4px 0 var(--ink-200))",
              }}>
                {arcs.map((a) => (
                  <g key={a.label}>
                    <path d={pwArc(a.start, a.end)} fill={a.color} stroke="var(--paper-2)" strokeWidth="2"></path>
                    <text
                      x={PW_C + PW_R * 0.6 * Math.cos((((a.start + a.end) / 2 - 90) * Math.PI) / 180)}
                      y={PW_C + PW_R * 0.6 * Math.sin((((a.start + a.end) / 2 - 90) * Math.PI) / 180)}
                      textAnchor="middle" dominantBaseline="middle"
                      fontWeight="800" fontSize="14" fill="#fff" fontFamily="var(--font-sans)"
                      style={{ pointerEvents: "none" }}>
                      {a.label}
                    </text>
                  </g>
                ))}
                <circle cx={PW_C} cy={PW_C} r="10" fill="var(--ink-900)"></circle>
              </svg>
            </div>
            <div className="pw-spinbtns">
              <button type="button" onClick={() => spin(1)} disabled={spinning || reachedTarget || !!feedback} className="gp-btn" style={{ padding: "10px 22px", fontSize: 13 }}>
                {spinning ? "Spinning…" : reachedTarget ? "Done!" : "Spin"}
              </button>
              {/* PW-01: bulk spins */}
              {!reachedTarget && spins >= 3 && (
                <button type="button" onClick={() => spin(5)} disabled={spinning || !!feedback} className="gp-btn ghost" style={{ padding: "10px 16px", fontSize: 13 }}>
                  ×5 quick
                </button>
              )}
            </div>
          </div>
          <div>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>Spins · {spins} / {targetSpins}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {segments.map((s) => {
                const count = tally[s.label] || 0;
                const pct = spins > 0 ? (count / spins) * 100 : 0;
                const isPicked = pick === s.label;
                return (
                  <button key={s.label} type="button"
                    onClick={() => !feedback && reachedTarget && setPick(s.label)}
                    disabled={!reachedTarget || !!feedback}
                    aria-pressed={isPicked}
                    style={{
                      position: "relative", textAlign: "left",
                      padding: "10px 12px", borderRadius: 10, minHeight: 40,
                      background: isPicked ? "var(--green-50)" : "var(--paper-2)",
                      border: "2px solid " + (isPicked ? "var(--green-500)" : "var(--ink-100)"),
                      cursor: reachedTarget && !feedback ? "pointer" : "default",
                      overflow: "hidden", fontFamily: "var(--font-mono)",
                      fontSize: 13, fontWeight: 600,
                      transition: "border-color 150ms, background 150ms",
                    }}>
                    <span style={{ position: "absolute", inset: 0, width: pct + "%", background: s.color, opacity: 0.18, pointerEvents: "none", transition: "width 250ms ease" }}></span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, position: "relative" }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, background: s.color }}></span>
                      {s.label}
                    </span>
                    <span style={{ float: "right", fontSize: 11, color: "var(--ink-500)", position: "relative", fontVariantNumeric: "tabular-nums" }}>{count}</span>
                  </button>
                );
              })}
            </div>
            {/* PW-02: explain the locked picker */}
            <div style={{ marginTop: 10, fontSize: 12, fontWeight: 600, color: reachedTarget && !pick ? "var(--sun-700)" : "var(--ink-400)" }}>
              {reachedTarget
                ? (pick ? "Now hit Check!" : "Pick the slice that came up most ↑")
                : "Spin first — then you'll pick the winner here."}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ EQUATION BALANCE ════════════════ */
function ebSideText(x, w) {
  if (x === 0 && w === 0) return "0";
  const parts = [];
  if (x > 0) parts.push((x > 1 ? x : "") + "x");
  if (w > 0) parts.push(String(w));
  return parts.join(" + ");
}
const ebEq = (a, b) => a.leftX === b.leftX && a.leftW === b.leftW && a.rightX === b.rightX && a.rightW === b.rightW;

function EbItems({ kind, count, color, shadow }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", padding: 4 }}>
      {Array.from({ length: count }, (_, i) =>
        kind === "x" ? (
          <div key={i} className="fb-witem" style={{ width: 28, height: 28, borderRadius: 6, background: color, color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 14, boxShadow: "inset 0 -3px 0 " + shadow }}>x</div>
        ) : (
          <div key={i} className="fb-witem" style={{ width: 16, height: 16, borderRadius: "50%", background: color, boxShadow: "inset 0 -2px 0 " + shadow }}></div>
        )
      )}
    </div>
  );
}

function EquationBalanceV2({ initial, target, explain, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [state, setState] = useStateY(initial);
  const [stack, setStack] = useStateY([]); // EB-03 undo stack
  const [moves, setMoves] = useStateY([]);
  const [wobble, setWobble] = useStateY(false);
  const [feedback, setFeedback] = useStateY(null);
  const [attemptsLeft, setAttemptsLeft] = useStateY(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateY(0);
  const [lostHeart, setLostHeart] = useStateY(false);
  const [streak, setStreak] = useStateY(initialStreak);
  const wobbleTimer = useRefY(null);
  const { fire, layer } = useConfetti();

  useEffectY(() => () => clearTimeout(wobbleTimer.current), []);

  const atTarget = ebEq(state, target);

  const apply = (next, label) => {
    setStack((st) => [...st, state]);
    setState(next);
    setMoves((m) => [...m, label]);
    setWobble(true);
    clearTimeout(wobbleTimer.current);
    wobbleTimer.current = setTimeout(() => setWobble(false), 650);
  };

  const undo = () => {
    if (feedback || stack.length === 0) return;
    setState(stack[stack.length - 1]);
    setStack((st) => st.slice(0, -1));
    setMoves((m) => m.slice(0, -1));
  };

  /* EB-01: ops derived from state */
  const minW = Math.min(state.leftW, state.rightW);
  const divisible = state.leftX >= 2 && state.leftW % state.leftX === 0 && state.rightW % state.leftX === 0 && state.rightX === 0;
  const ops = [];
  if (minW >= 1) ops.push({ label: "− 1", run: () => apply({ ...state, leftW: state.leftW - 1, rightW: state.rightW - 1 }, "−1") });
  if (minW > 1) ops.push({ label: "− " + minW, run: () => apply({ ...state, leftW: state.leftW - minW, rightW: state.rightW - minW }, "−" + minW) });
  if (state.leftX >= 1 && state.rightX >= 1) ops.push({ label: "− x", run: () => apply({ ...state, leftX: state.leftX - 1, rightX: state.rightX - 1 }, "−x") });
  if (state.leftX >= 2) ops.push({
    label: "÷ " + state.leftX,
    disabled: !divisible,
    why: !divisible ? "the weights don't split evenly yet" : null,
    run: () => apply({ leftX: 1, leftW: state.leftW / state.leftX, rightX: 0, rightW: state.rightW / state.leftX }, "÷" + state.leftX),
  });

  const handleCheck = () => {
    if (atTarget) {
      setFeedback({ kind: "ok", msg: moves.length <= 3 ? "Balanced — clean solve!" : "Balanced!", explain });
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
      setFeedback({ kind: "no", msg: "x isn't alone yet — here's the idea", explain });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "x isn't alone yet — 1 try left" : "x isn't alone yet — " + remaining + " tries left", explain: "Goal: one x alone on the left, only weights on the right." });
    }
  };

  const handleRetry = () => { setState(initial); setStack([]); setMoves([]); setFeedback(null); };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak, moves });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Get x alone on the scale"}
        feedback={feedback} canCheck={moves.length > 0 && !feedback}
        checkHint="Make a move first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "clamp(16px, 4.6cqw, 19px)", fontWeight: 700, color: atTarget ? "var(--green-700)" : "var(--ink-700)", transition: "color 200ms", marginBottom: 14 }}>
            {ebSideText(state.leftX, state.leftW)}&nbsp;&nbsp;=&nbsp;&nbsp;{ebSideText(state.rightX, state.rightW)}
          </div>
          <div className={"fb-beam" + (wobble ? " wobble" : "")}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div className={"fb-pan" + (atTarget ? " glow" : "")} style={{ background: "var(--green-50)", border: "2px solid var(--green-200)", minHeight: 110 }}>
                <div className="gp-eyebrow">left</div>
                <EbItems kind="x" count={state.leftX} color="var(--green-600)" shadow="var(--green-700)" />
                <EbItems kind="w" count={state.leftW} color="var(--sun-400)" shadow="var(--sun-500)" />
              </div>
              <div className={"fb-pan" + (atTarget ? " glow" : "")} style={{ background: "var(--sun-50)", border: "2px solid var(--sun-300)", minHeight: 110 }}>
                <div className="gp-eyebrow">right</div>
                <EbItems kind="x" count={state.rightX} color="var(--green-600)" shadow="var(--green-700)" />
                <EbItems kind="w" count={state.rightW} color="var(--sun-400)" shadow="var(--sun-500)" />
              </div>
            </div>
            <div style={{ height: 10, background: "var(--ink-700)", borderRadius: 999, margin: "10px 40px 0" }}></div>
            <div style={{ width: 14, height: 22, background: "var(--ink-700)", borderRadius: "0 0 6px 6px", margin: "0 auto" }}></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 20 }}>
            {ops.map((op) => (
              <span key={op.label} style={{ position: "relative" }} title={op.why || undefined}>
                <button type="button" onClick={op.run} disabled={!!feedback || op.disabled}
                  className="gp-tile fb-op"
                  aria-label={op.label + (op.why ? " — " + op.why : "")}
                  style={{ padding: "10px 16px", fontSize: 14, fontFamily: "var(--font-mono)", minHeight: 42 }}>
                  {op.label}
                </button>
              </span>
            ))}
            <button type="button" onClick={undo} disabled={!!feedback || stack.length === 0}
              className="gp-tile fb-op"
              style={{ padding: "10px 16px", fontSize: 14, fontFamily: "var(--font-mono)", minHeight: 42, color: "var(--ink-500)" }}>
              ↩ undo
            </button>
          </div>
          {ops.some((o) => o.disabled && o.why) && (
            <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "var(--ink-400)", fontWeight: 500 }}>
              ÷ is sleeping: {ops.find((o) => o.why).why}
            </div>
          )}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginTop: 14, minHeight: 22 }}>
            {moves.map((mv, i) => <span key={i} className="fb-move-chip">{mv}</span>)}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { ScatterPlotV2, FunctionMachineV2, ProbabilityWheelV2, EquationBalanceV2 });
