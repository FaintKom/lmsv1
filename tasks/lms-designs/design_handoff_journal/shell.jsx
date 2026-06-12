// shell.jsx — lesson chrome + feedback + confetti
// Wraps every exercise to provide the consistent "Duolingo-style" frame:
// progress bar + hearts + streak on top, exercise body in middle,
// correct/wrong feedback sheet on bottom that swaps in after a check.

const { useState, useEffect, useRef, useMemo, useCallback, createContext, useContext } = React;

// ─── icons (inline SVGs, lucide-style stroke-2) ────────────────────
const Icon = {
  X: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Heart: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill={p.filled?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  Flame: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 9 9 11 11 11c-.5-2 1-3 1-5 0-2-1-3-1-3s1.5.5 1 4Zm-2 8.5C9 11 8 12.5 8 14a4 4 0 0 0 8 0c0-2-1.5-3-2.5-3-.5 1 .5 2-.5 3-.5.5-1 .5-1.5 0-1-1 0-2-1.5-3.5Z"/></svg>,
  Check: (p) => <svg style={p.style} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>,
  XThick: (p) => <svg style={p.style} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Volume: (p) => <svg style={p.style} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4Zm6 2.5a5 5 0 0 1 0 9m-3-12a9 9 0 0 1 0 15"/></svg>,
  Mic: (p) => <svg style={p.style} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3"/></svg>,
  Lightbulb: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.5c1 1 2 2 2 3.5h4c0-1.5 1-2.5 2-3.5A7 7 0 0 0 12 2Z"/></svg>,
  Play: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="currentColor"><path d="M6 4v16l14-8Z"/></svg>,
  Grip: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>,
  Upload: (p) => <svg style={p.style} width={p.s||24} height={p.s||24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  MapPin: (p) => <svg style={p.style} width={p.s||20} height={p.s||20} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>,
  Flag: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 22V4"/><path d="M4 4h13l-2 5 2 5H4"/></svg>,
  Search: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>,
  HardHat: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h20"/><path d="M4 18v-2a8 8 0 0 1 16 0v2"/><path d="M10 10V7a2 2 0 0 1 4 0v3"/><path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1"/></svg>,
  AlertTriangle: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.86a2 2 0 0 1 3.4 0l8.16 13.59A2 2 0 0 1 20.16 20H3.84a2 2 0 0 1-1.71-2.55Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>,
  Footprints: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v-2.4a3 3 0 1 1 6 0v2.5a4 4 0 0 1-.41 1.79l-.59 1.21a1 1 0 0 1-1.79 0l-.59-1.21A4 4 0 0 1 6.2 16"/><path d="M14 16v-2.4a3 3 0 1 1 6 0v2.5a4 4 0 0 1-.41 1.79l-.59 1.21a1 1 0 0 1-1.79 0l-.59-1.21A4 4 0 0 1 16.2 16"/><path d="M5 22h4"/><path d="M15 22h4"/></svg>,
  Target: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>,
  Coin: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5"/></svg>,
};

// ─── shell with chrome ─────────────────────────────────────────────
// progress contract:
//   step + totalSteps → bar fills (step/totalSteps) AND shows "N / M" label
//   progress (legacy %) → bar fills, no label
//   neither → bar hidden (use for standalone practice without lesson sequence)
function LessonShell({ hearts = 4, maxHearts = 5, streak = 7, hideStats = false, step, totalSteps, progress, eyebrow, title, children, feedback, onCheck, onContinue, canCheck = true, checkLabel = "Check", showSkip = true, lostHeart = false }) {
  const hasStep = typeof step === "number" && typeof totalSteps === "number";
  const fill = hasStep ? (step / totalSteps) * 100 : progress;
  const showBar = hasStep || typeof progress === "number";
  return (
    <div className="lf-shell">
      <div className="lf-top">
        <button className="lf-close" aria-label="Quit">
          <Icon.X />
        </button>
        {showBar ? (
          <>
            <div className="lf-progress">
              <div className="lf-progress-fill" style={{ width: `${fill}%` }} />
            </div>
            {hasStep && (
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
                color: "var(--ink-500)", fontVariantNumeric: "tabular-nums",
                flexShrink: 0,
              }}>{step} / {totalSteps}</span>
            )}
          </>
        ) : (
          <div style={{ flex: 1 }} />
        )}
        <span className="lf-streak" style={{ display: hideStats ? "none" : undefined }}><Icon.Flame s={14} />{streak}</span>
        <span className={"lf-hearts " + (lostHeart ? "gp-heart-loss" : "")} style={{ display: hideStats ? "none" : undefined }}>
          <Icon.Heart s={14} filled />{hearts}
        </span>
      </div>

      <div style={{ flex: 1, padding: "22px 24px 16px", overflow: "auto", display: "flex", flexDirection: "column" }}>
        {(eyebrow || title) && (
          <div style={{ marginBottom: 18 }}>
            {eyebrow && <div className="gp-eyebrow">{eyebrow}</div>}
            {title && <h2 className="gp-title">{title}</h2>}
          </div>
        )}
        <div style={{ flex: 1 }}>{children}</div>
      </div>

      {feedback ? (
        <FeedbackSheet feedback={feedback} onContinue={onContinue} />
      ) : (
        <div className="lf-bottom" style={{ background: "var(--paper)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {showSkip && (
              <button className="gp-btn ghost" style={{ padding: "12px 22px" }} disabled>
                Skip
              </button>
            )}
            <button
              className="gp-btn"
              style={{ marginLeft: "auto", padding: "14px 36px" }}
              disabled={!canCheck}
              onClick={onCheck}
            >
              {checkLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackSheet({ feedback, onContinue }) {
  const ok = feedback.kind === "ok";
  return (
    <div className={"lf-bottom " + (ok ? "correct" : "wrong")}>
      <div className="lf-fb-row">
        <span className={"lf-fb-icon " + (ok ? "ok" : "no")}>
          {ok ? <Icon.Check /> : <Icon.XThick />}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={"lf-fb-text " + (ok ? "ok" : "no")}>
            {feedback.msg || (ok ? "Nicely done!" : "Not quite")}
          </div>
          {feedback.correct && !ok && (
            <div className="lf-fb-correct">Answer: <b>{feedback.correct}</b></div>
          )}
          {feedback.explain && (
            <div className="lf-fb-sub">{feedback.explain}</div>
          )}
        </div>
        <button className={"gp-btn " + (ok ? "" : "coral")} onClick={onContinue} style={{ padding: "14px 30px" }}>
          Continue
        </button>
      </div>
    </div>
  );
}

// ─── confetti ──────────────────────────────────────────────────────
function useConfetti() {
  const [bursts, setBursts] = useState([]);
  const fire = useCallback(() => {
    const id = Math.random();
    setBursts((bs) => [...bs, id]);
    setTimeout(() => setBursts((bs) => bs.filter((b) => b !== id)), 1500);
  }, []);
  const layer = (
    <div className="gp-confetti">
      {bursts.map((id) => <ConfettiBurst key={id} />)}
    </div>
  );
  return { fire, layer };
}

function ConfettiBurst() {
  const pieces = useMemo(() => {
    const colors = ["var(--green-500)", "var(--sun-400)", "var(--coral-500)", "var(--green-300)", "var(--sun-300)"];
    return Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 200,
      color: colors[i % colors.length],
      shape: i % 3,
    }));
  }, []);
  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            left: p.left + "%",
            background: p.color,
            borderRadius: p.shape === 0 ? "2px" : p.shape === 1 ? "50%" : "0",
            animationDelay: p.delay + "ms",
          }}
        />
      ))}
    </>
  );
}

// ─── shuffle/util ──────────────────────────────────────────────────
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// expose globals
Object.assign(window, {
  Icon, LessonShell, FeedbackSheet, useConfetti, ConfettiBurst, shuffle,
});
