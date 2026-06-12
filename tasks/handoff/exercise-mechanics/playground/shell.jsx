/* shell.jsx — GrassLMS LessonShell (playground port, with audit fixes)
   Fixes over upstream lesson-shell.tsx:
   - hearts render as ICON ROW (filled/empty) when max ≤ 5  (FIX-04)
   - feedback sheet: role="status" aria-live announcement    (A11Y-01)
   - third feedback kind "meh" — neutral network/notice sheet (FIX-06)
   - Skip hidden (not disabled) when no handler              (UX-06)
   - Check button: checking spinner + blocked-press nudge w/ hint (FIX-08/09)
   - structured answer reveal list (`correctList`)           (FIX-10)
   - confetti falls full container height                    (FIX-05)
*/

const { useState, useCallback, useMemo, useRef, useEffect } = React;

/* ── icons ─────────────────────────────────────────────── */
const Ico = {
  X: ({ s = 16 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>
  ),
  Heart: ({ s = 14, filled = true }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>
  ),
  Flame: ({ s = 14 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 9 9 11 11 11c-.5-2 1-3 1-5 0-2-1-3-1-3s1.5.5 1 4Zm-2 8.5C9 11 8 12.5 8 14a4 4 0 0 0 8 0c0-2-1.5-3-2.5-3-.5 1 .5 2-.5 3-.5.5-1 .5-1.5 0-1-1 0-2-1.5-3.5Z"></path></svg>
  ),
  CheckThick: ({ s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5L20 7"></path></svg>
  ),
  XThick: ({ s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"></path></svg>
  ),
  Wifi: ({ s = 20 }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12a10 10 0 0 1 14 0"></path><path d="M8.5 15.5a5 5 0 0 1 7 0"></path><circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none"></circle></svg>
  ),
};

/* ── confetti ──────────────────────────────────────────── */
const CONFETTI_COLORS = ["var(--green-500)", "var(--sun-400)", "var(--coral-500)", "var(--green-300)", "var(--sun-300)"];

function ConfettiBurst() {
  const pieces = useMemo(
    () => Array.from({ length: 36 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 200,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      shape: i % 3,
    })),
    []
  );
  return (
    <React.Fragment>
      {pieces.map((p, i) => (
        <span key={i} style={{ left: p.left + "%", background: p.color, borderRadius: p.shape === 0 ? "2px" : p.shape === 1 ? "50%" : "0", animationDelay: p.delay + "ms" }}></span>
      ))}
    </React.Fragment>
  );
}

function useConfetti() {
  const [bursts, setBursts] = useState([]);
  const fire = useCallback(() => {
    if (window.__gpConfettiOff) return; // Tweaks kill-switch
    const id = Math.random();
    setBursts((bs) => [...bs, id]);
    setTimeout(() => setBursts((bs) => bs.filter((b) => b !== id)), 1800);
  }, []);
  const layer = (
    <div className="gp-confetti" style={{ containerType: "size" }}>
      {bursts.map((id) => <ConfettiBurst key={id} />)}
    </div>
  );
  return { fire, layer };
}

/* ── flyClone (verbatim port of fb-motion.ts) ──────────── */
function flyClone(fromEl, toEl, done) {
  if (!fromEl || !toEl) { done && done(); return; }
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const el = fromEl.cloneNode(true);
  el.classList.add("fb-flyer");
  el.style.left = a.left + "px";
  el.style.top = a.top + "px";
  el.style.width = a.width + "px";
  el.style.height = a.height + "px";
  el.style.margin = "0";
  el.style.transition = "transform .32s cubic-bezier(.3,.9,.4,1.1), opacity .32s";
  document.body.appendChild(el);
  el.getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const sc = Math.min(1, (b.width - 8) / a.width);
  el.style.transform = "translate(" + dx + "px," + dy + "px) scale(" + sc + ")";
  window.setTimeout(() => { el.remove(); done && done(); }, 330);
}

/* ── hearts pill: icon row when small pool ─────────────── */
function HeartsPill({ hearts, maxHearts, lostHeart }) {
  const iconMode = maxHearts <= 5;
  return (
    <span className={"lf-hearts " + (lostHeart ? "gp-heart-loss" : "")} aria-label={hearts + " of " + maxHearts + " tries left"} role="img">
      {iconMode ? (
        Array.from({ length: maxHearts }, (_, i) => {
          const filled = i < hearts;
          const justLost = lostHeart && i === hearts;
          return (
            <span key={i} className={"hrt " + (filled ? "" : "empty") + (justLost ? " popping" : "")}>
              <Ico.Heart s={14} filled={filled} />
            </span>
          );
        })
      ) : (
        <React.Fragment><Ico.Heart s={14} filled={true} />{hearts}</React.Fragment>
      )}
    </span>
  );
}

/* ── feedback sheet ────────────────────────────────────── */
function FeedbackSheet({ feedback, onContinue, onRetry }) {
  const kind = feedback.kind; // 'ok' | 'no' | 'meh'
  const ok = kind === "ok";
  const meh = kind === "meh";
  const canRetry = !ok && !!onRetry;
  const tone = ok ? "correct" : meh ? "notice" : "wrong";
  const Icon = ok ? Ico.CheckThick : meh ? Ico.Wifi : Ico.XThick;
  return (
    <div className={"lf-bottom sheet " + tone}>
      {/* A11Y-01: announce the result */}
      <div className="lf-fb-row" role="status" aria-live="assertive">
        <span className={"lf-fb-icon " + (ok ? "ok" : meh ? "meh" : "no")}><Icon /></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className={"lf-fb-text " + (ok ? "ok" : meh ? "meh" : "no")}>
            {feedback.msg || (ok ? "Nicely done!" : canRetry ? "Try again" : "Not quite")}
          </div>
          {feedback.correct && !ok && !canRetry && (
            <div className="lf-fb-correct">Answer: <b>{feedback.correct}</b></div>
          )}
          {feedback.correctList && !ok && !canRetry && (
            <ul className="lf-reveal">
              {feedback.correctList.map((row, i) => (
                <li key={i}><b>{row[0]}</b><span className="arr">→</span>{row[1]}</li>
              ))}
            </ul>
          )}
          {feedback.explain && <div className="lf-fb-sub">{feedback.explain}</div>}
        </div>
        <button
          className={"gp-btn cta " + (ok ? "" : meh ? "ink" : "coral")}
          onClick={canRetry ? onRetry : onContinue}
          style={{ padding: "14px 30px" }}
        >
          {canRetry ? (meh ? "Retry" : "Try again") : "Continue"}
        </button>
      </div>
    </div>
  );
}

/* ── shell ─────────────────────────────────────────────── */
function LessonShell({
  hearts = 5, maxHearts = 5, streak = 0, hideStats = false,
  step, totalSteps, progress,
  eyebrow, title, children,
  feedback, canCheck, onCheck, onContinue, onRetry,
  checkLabel = "Check", checkHint = "Pick an answer first",
  checking = false,
  showSkip = true, onSkip,
  lostHeart = false, onQuit,
  instant = false, instantLabel,
}) {
  const hasStep = typeof step === "number" && typeof totalSteps === "number";
  const fill = hasStep ? (step / totalSteps) * 100 : progress;
  const showBar = hasStep || typeof progress === "number";
  const [nudge, setNudge] = useState(false);
  const [hint, setHint] = useState(false);
  const hintTimer = useRef(null);

  // FIX-09: pressing a not-ready Check wiggles + explains instead of dead-clicking
  const handleCheckPress = () => {
    if (checking) return;
    if (!canCheck) {
      setNudge(true);
      setHint(true);
      clearTimeout(hintTimer.current);
      setTimeout(() => setNudge(false), 450);
      hintTimer.current = setTimeout(() => setHint(false), 1800);
      return;
    }
    setHint(false);
    onCheck();
  };
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  return (
    <div className="lf-shell">
      <div className="lf-top">
        <button className="lf-close" aria-label="Quit lesson" onClick={onQuit}><Ico.X /></button>
        {showBar ? (
          <React.Fragment>
            <div className="lf-progress" role="progressbar" aria-valuenow={hasStep ? step : Math.round(fill)} aria-valuemax={hasStep ? totalSteps : 100} aria-label="Lesson progress">
              <div className="lf-progress-fill" style={{ width: fill + "%" }}></div>
            </div>
            {hasStep && <span className="lf-steplabel">{step} / {totalSteps}</span>}
          </React.Fragment>
        ) : (
          <div style={{ flex: 1 }}></div>
        )}
        {!hideStats && (
          <React.Fragment>
            <span className={"lf-streak" + (streak > 0 ? " lit" : "")} aria-label={"Streak: " + streak} role="img">
              <Ico.Flame s={14} />{streak}
            </span>
            <HeartsPill hearts={hearts} maxHearts={maxHearts} lostHeart={lostHeart} />
          </React.Fragment>
        )}
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
        <FeedbackSheet feedback={feedback} onContinue={onContinue} onRetry={onRetry} />
      ) : (
        <div className="lf-bottom" style={{ background: "var(--paper)" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* UX-06: hide Skip entirely when there is nothing to skip to */}
            {showSkip && onSkip && (
              <button className="gp-btn ghost" style={{ padding: "12px 22px" }} onClick={onSkip}>Skip</button>
            )}
            {instant ? (
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-300)" }}>
                {instantLabel}
              </span>
            ) : (
              <span style={{ marginLeft: "auto", position: "relative" }}>
                {hint && !canCheck && <span className="gp-checkhint">{checkHint}</span>}
                <button
                  className={"gp-btn" + (nudge ? " nudge" : "")}
                  style={{ padding: "14px 36px" }}
                  aria-disabled={!canCheck || checking}
                  onClick={handleCheckPress}
                >
                  {checking && <span className="gp-spin" aria-hidden="true"></span>}
                  {checking ? "Checking…" : checkLabel}
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── shared helpers for mechanics ──────────────────────── */
function shuffleArr(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Simulated server grader factory (Tweaks: off | slow | flaky).
   Returns null (local grading) or an async fn mirroring V2GradeFn. */
function makeServerSim(mode, localGrade) {
  if (!mode || mode === "off") return null;
  return async (answer) => {
    await new Promise((r) => setTimeout(r, mode === "slow" ? 1600 : 700));
    if (mode === "flaky" && Math.random() < 0.6) {
      throw new Error("network");
    }
    return localGrade(answer);
  };
}

Object.assign(window, {
  Ico, LessonShell, FeedbackSheet, HeartsPill,
  useConfetti, flyClone, shuffleArr, makeServerSim,
});
