/* ex-math.jsx — NumericInputV2 + McMathV2 + NumberLineV2 (batch 2 ports with audit fixes)

   NumericInputV2:
   - NI-01 number pad keys ≥48px with press physics (were ~37px high)
   - NI-02 minus key — negative answers were impossible to enter on the pad
   - NI-03 input sanitised: one decimal point, digits only, leading minus;
           comma accepted as decimal separator (RU keyboards)
   - NI-04 aria labels on the answer field and pad keys
   - NI-06 hint card pulses after the first wrong attempt

   McMathV2:
   - MM-01 answer no longer leaks while retries remain (upstream marked the
           correct tile green on every feedback, same family bug as TrueFalse)
   - MM-04 keyboard 1–9 selection · MM-05 eliminated picks stay struck out
   - MM-03 options grid collapses to one column in narrow containers

   NumberLineV2:
   - NL-01 keyboard path: marker is a real slider (role=slider, ←/→ step,
           Home/End to the ends)
   - NL-02 tick labels thin out automatically when they would collide
   - NL-03 start position never equals the answer (was midpoint — free win
           whenever the target sat in the middle)
   - NL-04 Check requires touching the marker first (was always enabled)
*/

const { useState: useStateM, useEffect: useEffectM, useRef: useRefM, useMemo: useMemoM } = React;

/* ════════════════ NUMERIC INPUT ════════════════ */
const PAD_KEYS_M = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "−"];

function sanitizeNum(s) {
  let out = "";
  let hasDot = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i] === "," ? "." : s[i];
    if (ch >= "0" && ch <= "9") out += ch;
    else if (ch === "." && !hasDot) { out += "."; hasDot = true; }
    else if ((ch === "-" || ch === "−") && out === "") out += "-";
  }
  return out.slice(0, 12);
}

function NumericInputV2({ problem, correct, tolerance = 0.001, example, explain, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [val, setVal] = useStateM("");
  const [inputState, setInputState] = useStateM("");
  const [feedback, setFeedback] = useStateM(null);
  const [attemptsLeft, setAttemptsLeft] = useStateM(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateM(0);
  const [lostHeart, setLostHeart] = useStateM(false);
  const [streak, setStreak] = useStateM(initialStreak);
  const [showExample, setShowExample] = useStateM(false);
  const [hintNudge, setHintNudge] = useStateM(false);
  const { fire, layer } = useConfetti();

  const type = (next) => { setVal(sanitizeNum(next)); setInputState(""); };

  const padPress = (k) => {
    if (feedback) return;
    if (k === "−") type(val.startsWith("-") ? val.slice(1) : "-" + val); // NI-02 sign toggle
    else type(val + k);
  };

  const handleCheck = () => {
    const n = parseFloat(val); // already dot-normalised (NI-03)
    if (Number.isFinite(n) && Math.abs(n - correct) <= tolerance) {
      setInputState("ok");
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Exactly right!" : "Got it!", explain });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    setInputState("no");
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (example) { setHintNudge(true); setTimeout(() => setHintNudge(false), 3300); } // NI-06
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here's the answer", correct: String(correct), explain });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "Not quite — 1 try left" : "Not quite — " + remaining + " tries left", explain: example ? "Psst — the example might help." : undefined });
      setTimeout(() => setInputState(""), 700);
    }
  };

  const handleRetry = () => { setFeedback(null); setInputState(""); };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Type the answer"}
        feedback={feedback} canCheck={val.length > 0 && val !== "-"}
        checkHint="Type a number first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 380, margin: "0 auto", textAlign: "center" }}>
          {example && (
            <div className={"fb-hintcard" + (hintNudge ? " nudge" : "")}>
              <button type="button" onClick={() => setShowExample(!showExample)} aria-expanded={showExample}>
                <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>💡 See an example</span>
                <span style={{ color: "var(--ink-400)" }}>{showExample ? "−" : "+"}</span>
              </button>
              {showExample && (
                <div className="body">
                  <div style={{ color: "var(--ink-500)" }}>{example.q}</div>
                  <div style={{ marginTop: 2 }}>{example.work} = <b style={{ color: "var(--green-700)" }}>{example.a}</b></div>
                </div>
              )}
            </div>
          )}

          <div className="fb-formula" style={{ marginBottom: 14 }}>{problem}</div>
          <input
            type="text" inputMode="decimal"
            value={val}
            aria-label="Your answer"
            onChange={(e) => type(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && val.length > 0 && val !== "-" && !feedback) handleCheck(); }}
            disabled={!!feedback}
            placeholder="?"
            className={"fb-input " + inputState}
          />
          <div className="fb-pad">
            {PAD_KEYS_M.map((k) => (
              <button key={k} type="button" className={k === "." || k === "−" ? "alt" : ""}
                aria-label={k === "−" ? "Plus minus sign" : k === "." ? "Decimal point" : k}
                onClick={() => padPress(k)} disabled={!!feedback}>
                {k === "−" ? "±" : k}
              </button>
            ))}
            <button type="button" className="alt" style={{ gridColumn: "1 / -1" }} aria-label="Delete last digit"
              onClick={() => { if (!feedback) type(val.slice(0, -1)); }} disabled={!!feedback}>
              ⌫ delete
            </button>
          </div>
          <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-300)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            press enter to check
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ MC MATH ════════════════ */
function McMathV2({ prompt, expr, options, correct, explain, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [pick, setPick] = useStateM(null);
  const [eliminated, setEliminated] = useStateM([]);
  const [feedback, setFeedback] = useStateM(null);
  const [attemptsLeft, setAttemptsLeft] = useStateM(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateM(0);
  const [lostHeart, setLostHeart] = useStateM(false);
  const [streak, setStreak] = useStateM(initialStreak);
  const { fire, layer } = useConfetti();

  /* MM-04 keyboard */
  useEffectM(() => {
    const onKey = (e) => {
      if (feedback) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= options.length && !eliminated.includes(n - 1)) setPick(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, eliminated, options.length]);

  const handleCheck = () => {
    if (pick === correct) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Right you are!" : "Got it!", explain });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setEliminated((els) => [...els, pick]); // MM-05
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here's the answer", correct: options[correct], explain });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "Not quite — 1 try left" : "Not quite — " + remaining + " tries left" });
    }
  };

  const handleRetry = () => { setPick(null); setFeedback(null); };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Pick the right value"}
        feedback={feedback} canCheck={pick !== null}
        checkHint="Pick an answer first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 14, padding: "20px 22px", marginBottom: 18, textAlign: "center" }}>
            {prompt && <span style={{ fontSize: 15, color: "var(--ink-500)" }}>{prompt}</span>}
            <div style={{ fontFamily: "'Times New Roman', serif", fontSize: "clamp(26px, 8cqw, 36px)", fontWeight: 600, color: "var(--ink-900)", marginTop: prompt ? 6 : 0 }}>
              {expr}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }} role="radiogroup" aria-label="Answer options">
            {options.map((opt, i) => {
              const failedOut = feedback && feedback.kind === "no" && attemptsLeft <= 0;
              let state = "";
              if (feedback) {
                /* MM-01: reveal only on success or once the task is over */
                if (i === correct && (feedback.kind === "ok" || failedOut)) state = "correct";
                else if (i === pick && feedback.kind === "no") state = "wrong";
                else if (eliminated.includes(i)) state = "eliminated";
                else state = "locked";
              } else if (eliminated.includes(i)) state = "eliminated";
              else if (pick === i) state = "selected";
              const isElim = state === "eliminated";
              return (
                <button key={i} type="button" className={"gp-tile " + state}
                  role="radio" aria-checked={pick === i}
                  style={{ padding: "16px 18px", fontFamily: "'Times New Roman', serif", fontSize: 19, position: "relative" }}
                  disabled={!!feedback || isElim}
                  onClick={() => !feedback && !isElim && setPick(i)}>
                  {opt}
                  <span aria-hidden="true" style={{ position: "absolute", bottom: 4, right: 8, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-200)" }}>{i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ NUMBER LINE ════════════════ */
function NumberLineV2({ min, max, correct, step = 1, tolerance, prompt, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const tol = tolerance != null ? tolerance : step / 2;
  /* NL-03: never start on the answer */
  const initialPos = useMemoM(() => {
    let p = Math.round((min + max) / 2 / step) * step;
    if (Math.abs(p - correct) <= tol) {
      p = p + step <= max ? p + step : p - step;
    }
    return parseFloat(p.toFixed(4));
  }, []);
  const [pos, setPos] = useStateM(initialPos);
  const [moved, setMoved] = useStateM(false); // NL-04
  const [grabbed, setGrabbed] = useStateM(false);
  const [bubbleFlash, setBubbleFlash] = useStateM(false);
  const [markerState, setMarkerState] = useStateM("");
  const [feedback, setFeedback] = useStateM(null);
  const [attemptsLeft, setAttemptsLeft] = useStateM(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateM(0);
  const [lostHeart, setLostHeart] = useStateM(false);
  const [streak, setStreak] = useStateM(initialStreak);
  const [trackW, setTrackW] = useStateM(540);
  const trackRef = useRefM(null);
  const shakeTimer = useRefM(null);
  const flashTimer = useRefM(null);
  const { fire, layer } = useConfetti();

  useEffectM(() => {
    const ro = new ResizeObserver((es) => { for (const e of es) setTrackW(e.contentRect.width); });
    if (trackRef.current) ro.observe(trackRef.current);
    return () => { ro.disconnect(); clearTimeout(shakeTimer.current); clearTimeout(flashTimer.current); };
  }, []);

  const decimals = step < 1 ? 4 : 0;
  const flashBubble = () => {
    setBubbleFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setBubbleFlash(false), 900);
  };

  const setFromX = (clientX) => {
    if (feedback || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + frac * (max - min);
    const snapped = Math.round(raw / step) * step;
    setPos(parseFloat(snapped.toFixed(decimals)));
    setMoved(true);
  };

  /* NL-01 keyboard slider */
  const nudge = (dir) => {
    if (feedback) return;
    const next = parseFloat(Math.max(min, Math.min(max, pos + dir * step)).toFixed(decimals));
    setPos(next);
    setMoved(true);
    setMarkerState("");
    flashBubble();
  };

  const onMarkerDown = (e) => {
    if (feedback) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setGrabbed(true);
    setMarkerState("");
  };

  const handleCheck = () => {
    if (Math.abs(pos - correct) <= tol) {
      setMarkerState("ok");
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Placed it exactly right!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    setMarkerState("no");
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "You placed " + pos + " — here's the spot", correct: String(correct) });
      setStreak(0);
    } else {
      clearTimeout(shakeTimer.current);
      shakeTimer.current = setTimeout(() => setMarkerState(""), 700);
      const dirHint = pos < correct ? "try further right" : "try further left";
      setFeedback({ kind: "no", msg: (remaining === 1 ? "Not there — 1 try left" : "Not there — " + remaining + " tries left"), explain: "Hint: " + dirHint + "." });
    }
  };

  const handleRetry = () => { setMarkerState(""); setFeedback(null); };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak, placed: pos });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const showGhost = feedback && feedback.kind === "no" && attemptsLeft <= 0;

  const posFrac = (pos - min) / (max - min);
  const ghostFrac = (correct - min) / (max - min);
  const tickCount = Math.floor((max - min) / step) + 1;
  /* NL-02: thin labels when they'd collide (≈44px per label) */
  const labelEvery = Math.max(1, Math.ceil(tickCount / Math.max(2, Math.floor(trackW / 44))));

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || prompt || "Place the marker"}
        feedback={feedback} canCheck={moved && !feedback}
        checkHint="Move the marker first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 540, margin: "60px auto 0", padding: "0 28px" }}>
          <div
            ref={trackRef}
            onClick={(e) => { if (!feedback && !grabbed) { setFromX(e.clientX); setMarkerState(""); flashBubble(); } }}
            style={{ position: "relative", height: 96, cursor: feedback ? "default" : "pointer", userSelect: "none", touchAction: "none" }}
          >
            <div style={{ position: "absolute", top: 56, left: 0, right: 0, height: 4, background: "var(--ink-200)", borderRadius: 999 }}></div>
            {Array.from({ length: tickCount }, (_, i) => {
              const n = parseFloat((min + i * step).toFixed(4));
              const frac = (n - min) / (max - min);
              const isZero = n === 0;
              const isNear = Math.abs(n - pos) < 1e-6;
              const labelled = i % labelEvery === 0 || i === tickCount - 1 || isZero;
              return (
                <div key={i}
                  className={"fb-tick" + (isNear ? " near" : "") + (labelled ? "" : " sparse")}
                  style={{ position: "absolute", top: 50, left: (frac * 100) + "%", width: 2, height: 16, marginLeft: -1, background: isZero ? "var(--ink-700)" : "var(--ink-300)", borderRadius: 1, transformOrigin: "bottom" }}>
                  <span className="lbl" style={{ color: isNear ? "var(--green-700)" : isZero ? "var(--ink-900)" : "var(--ink-500)" }}>{n}</span>
                </div>
              );
            })}
            {showGhost && (
              <div style={{ position: "absolute", top: 18, left: (ghostFrac * 100) + "%", width: 46, height: 46, marginLeft: -23, borderRadius: 999, border: "2px dashed var(--green-500)", color: "var(--green-700)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 800, pointerEvents: "none" }}>
                {correct}
              </div>
            )}
            <div style={{ position: "absolute", top: 18, left: (posFrac * 100) + "%", marginLeft: -23, transition: grabbed ? "none" : "left 140ms ease" }}>
              <div className={"fb-marker-bubble" + (grabbed || bubbleFlash ? " show" : "")}>{pos}</div>
              <div
                className={"fb-marker" + (grabbed ? " grabbed" : "") + (markerState ? " " + markerState : "")}
                role="slider" tabIndex={feedback ? -1 : 0}
                aria-valuemin={min} aria-valuemax={max} aria-valuenow={pos}
                aria-label={"Marker at " + pos + ". Use arrow keys to move."}
                onPointerDown={onMarkerDown}
                onPointerMove={(e) => { if (grabbed) setFromX(e.clientX); }}
                onPointerUp={() => setGrabbed(false)}
                onPointerCancel={() => setGrabbed(false)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); nudge(-1); }
                  if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); nudge(1); }
                  if (e.key === "Home") { e.preventDefault(); setPos(min); setMoved(true); flashBubble(); }
                  if (e.key === "End") { e.preventDefault(); setPos(max); setMoved(true); flashBubble(); }
                }}
              >
                {pos}
              </div>
            </div>
          </div>
          <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--ink-300)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 8 }}>
            drag, tap the line, or use ← →
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { NumericInputV2, McMathV2, NumberLineV2 });
