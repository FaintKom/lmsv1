/* ex-math2.jsx — EquationSolverV2 + MathStepwiseV2 (batch 2 ports with audit fixes)

   EquationSolverV2:
   - ES-01 hearts wired in (upstream had none — wrong picks were free, so
           brute-forcing every option was the optimal strategy). A wrong
           pick costs a heart and eliminates that option; at 0 hearts the
           task ends with the full solution chain revealed.
   - ES-02 uses the shared fb-shake (upstream re-declared its own keyframes)
   - ES-04 step progress in the top bar ("2 / 3")
   - chain rows pop in (.fb-chainrow.fresh)

   MathStepwiseV2:
   - MS-01 on retry, correct lines lock (were editable — easy to break a
           good line by accident)
   - MS-02 numeric equivalence: "x=5.0" matches "x=5" (norm + value compare)
   - MS-03 real <label> elements tied to inputs
   - MS-05 structured reveal list instead of a run-on string
*/

const { useState: useStateN, useRef: useRefN } = React;

/* ════════════════ EQUATION SOLVER ════════════════ */
function EquationSolverV2({ initial, steps, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [chain, setChain] = useStateN([{ left: initial.left, right: initial.right, op: null }]);
  const [shake, setShake] = useStateN(null);
  const [eliminated, setEliminated] = useStateN([]); // option ids eliminated at the current step
  const [step, setStep] = useStateN(0);
  const [wrongAttempts, setWrongAttempts] = useStateN(0);
  const [attemptsLeft, setAttemptsLeft] = useStateN(maxAttemptsPerTask);
  const [lostHeart, setLostHeart] = useStateN(false);
  const [feedback, setFeedback] = useStateN(null);
  const [streak, setStreak] = useStateN(initialStreak);
  const { fire, layer } = useConfetti();

  const revealChain = () => {
    const rows = [];
    steps.forEach((s, i) => {
      const okOpt = s.options.find((o) => o.ok);
      rows.push(["Step " + (i + 1), okOpt ? okOpt.label : "?"]);
    });
    return rows;
  };

  const pick = (opt) => {
    if (feedback) return;
    if (!opt.ok || !opt.after) {
      /* ES-01: wrong pick costs a heart + eliminates the option */
      setShake(opt.id);
      setWrongAttempts((w) => w + 1);
      setEliminated((els) => [...els, opt.id]);
      setLostHeart(true);
      setTimeout(() => { setShake(null); setLostHeart(false); }, 500);
      const remaining = attemptsLeft - 1;
      setAttemptsLeft(remaining);
      if (remaining <= 0) {
        setTimeout(() => {
          setFeedback({ kind: "no", msg: "Out of tries — here's how it's solved", correctList: revealChain() });
          setStreak(0);
        }, 450);
      }
      return;
    }
    setEliminated([]);
    setChain((c) => [...c, { left: opt.after.left, right: opt.after.right, op: opt.label }]);
    if (step === steps.length - 1) {
      setTimeout(() => {
        setFeedback({ kind: "ok", msg: wrongAttempts === 0 ? "Solved it — flawless!" : "Solved it!" });
        setStreak((s) => s + 1);
        fire();
      }, 300);
    } else {
      setStep(step + 1);
    }
  };

  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", wrongAttempts, streak });

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        step={Math.min(step + 1, steps.length)} totalSteps={steps.length}
        eyebrow={eyebrow} title={title || "Solve it step by step"}
        feedback={feedback}
        canCheck={false} instant={true} instantLabel="pick the right move at each step"
        showSkip={false}
        onCheck={() => {}} onContinue={handleContinue} onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18 }}>
            {chain.map((row, i) => (
              <div key={i}>
                {row.op && <div className="fb-chainop">↓ {row.op}</div>}
                <div className={"fb-chainrow" + (i === chain.length - 1 && i > 0 ? " fresh" : "") + (i === chain.length - 1 && feedback && feedback.kind === "ok" ? " final" : "")}>
                  {row.left} = {row.right}
                </div>
              </div>
            ))}
          </div>
          {!feedback && step < steps.length && (
            <React.Fragment>
              <div style={{ textAlign: "center", marginBottom: 10, fontSize: 14, color: "var(--ink-700)", fontWeight: 600 }}>
                {steps[step].label}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {steps[step].options.map((opt) => {
                  const isElim = eliminated.includes(opt.id);
                  return (
                    <button key={opt.id} type="button"
                      onClick={() => !isElim && pick(opt)}
                      disabled={isElim}
                      className={"gp-tile" + (shake === opt.id ? " wrong" : isElim ? " eliminated" : "")}
                      style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontSize: 16 }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          )}
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ MATH STEPWISE ════════════════ */
const normStep = (s) => s.replace(/\s+/g, "").toLowerCase();
/* MS-02: numeric equivalence — "x=5.0" ≡ "x=5", "0.5" ≡ ".5" */
function stepsMatch(got, expected) {
  const a = normStep(got), b = normStep(expected);
  if (a === b) return true;
  const numEq = (x, y) => {
    const nx = parseFloat(x), ny = parseFloat(y);
    return Number.isFinite(nx) && Number.isFinite(ny) && Math.abs(nx - ny) < 1e-9;
  };
  if (numEq(a, b)) return true;
  // "x=5.0" vs "x=5": compare sides
  const pa = a.split("="), pb = b.split("=");
  if (pa.length === 2 && pb.length === 2) {
    const sideEq = (s1, s2) => s1 === s2 || numEq(s1, s2);
    return (sideEq(pa[0], pb[0]) && sideEq(pa[1], pb[1])) || (sideEq(pa[0], pb[1]) && sideEq(pa[1], pb[0]));
  }
  return false;
}

function MathStepwiseV2({ problem, steps, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [values, setValues] = useStateN(() => steps.map(() => ""));
  const [lockedOk, setLockedOk] = useStateN(() => steps.map(() => false)); // MS-01
  const [feedback, setFeedback] = useStateN(null);
  const [attemptsLeft, setAttemptsLeft] = useStateN(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateN(0);
  const [lostHeart, setLostHeart] = useStateN(false);
  const [streak, setStreak] = useStateN(initialStreak);
  const { fire, layer } = useConfetti();
  const inputRefs = useRefN([]);

  const allFilled = values.every((v) => v.trim().length > 0);

  const handleCheck = () => {
    const okFlags = steps.map((s, i) => stepsMatch(values[i], s.expected));
    if (okFlags.every(Boolean)) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Every line correct — first try!" : "Got it!" });
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
      setFeedback({ kind: "no", msg: "Out of tries — here's the working", correctList: steps.map((s) => [s.label, s.expected]) });
      setStreak(0);
    } else {
      const okCount = okFlags.filter(Boolean).length;
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "Check the red lines — 1 try left" : "Check the red lines — " + remaining + " tries left",
        explain: okCount > 0 ? okCount + " of " + steps.length + " lines are right — they're locked in green." : undefined,
      });
    }
  };

  const handleRetry = () => {
    /* MS-01: lock the lines that are already right */
    const flags = steps.map((s, i) => stepsMatch(values[i], s.expected));
    setLockedOk(flags);
    setFeedback(null);
    const firstBad = flags.findIndex((f) => !f);
    setTimeout(() => { if (firstBad >= 0 && inputRefs.current[firstBad]) inputRefs.current[firstBad].focus(); }, 60);
  };

  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const finalReveal = feedback && feedback.kind === "no" && !canRetry;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Show your working"}
        feedback={feedback} canCheck={allFilled}
        checkHint="Fill in every line first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          {problem && <div className="fb-formula" style={{ marginBottom: 16 }}>{problem}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {steps.map((s, i) => {
              const isOk = !!feedback && stepsMatch(values[i], s.expected);
              const state = feedback ? (isOk ? " ok" : " no") : lockedOk[i] ? " ok" : "";
              const inputId = "ms-step-" + i;
              return (
                <div key={i} className="fb-step-row">
                  <label className="fb-step-label" htmlFor={inputId}>{s.label}</label>
                  <input
                    id={inputId}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    className={"fb-step-input" + state}
                    value={values[i]}
                    onChange={(e) => {
                      const next = values.slice();
                      next[i] = e.target.value;
                      setValues(next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      if (i < steps.length - 1) { if (inputRefs.current[i + 1]) inputRefs.current[i + 1].focus(); }
                      else if (allFilled && !feedback) handleCheck();
                    }}
                    disabled={!!feedback || lockedOk[i]}
                    placeholder={s.hint}
                  />
                  {(finalReveal || (feedback && feedback.kind === "ok")) && (
                    <span style={{ width: 22, color: isOk ? "var(--green-600)" : "var(--coral-500)", fontWeight: 800 }} aria-hidden="true">
                      {isOk ? "✓" : "✕"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-300)", textAlign: "center" }}>
            enter jumps to the next line
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { EquationSolverV2, MathStepwiseV2 });
