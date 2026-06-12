/* ex-special2.jsx — ArithmeticPuzzleV2 + BubbleSheetV2 + MapPinDropV2 +
   FileUploadV2 + ScormPackageV2 (batch 6 ports with audit fixes)

   ArithmeticPuzzleV2:
   - AP-01 bank numbers tracked by INDEX — duplicate values no longer
           grey out together / become unusable
   - AP-02 tap a filled slot to clear it back to the bank
   - AP-03 retry locks correct rows, clears wrong ones (family contract)
   - AP-04 structured reveal

   BubbleSheetV2:
   - BS-01 options grid auto-fits (4-across crushed at 320)
   - BS-02 kept-correct picks lock visibly green during retry

   MapPinDropV2:
   - MP-02 misses give a compass hint ("try further north-east")
   - MP-03 percent-coordinates line replaced with kid copy
   - MP-05 reveal draws the target pin + a dashed tolerance ring

   FileUploadV2:
   - FU-01 dropped files are validated against `accept` — friendly
           neutral notice, not silence (click-path already filtered)
   - FU-02 simulated upload progress bar; FU-04 sizes format as KB/MB
   - FU-05 drop zone is a real button (keyboard + SR operable)

   ScormPackageV2:
   - SC-01 Back button — children re-read; forward-only was hostile
*/

const { useState: useStateZ, useRef: useRefZ, useEffect: useEffectZ } = React;

/* ════════════════ ARITHMETIC PUZZLE ════════════════ */
function ArithmeticPuzzleV2({ equations, bank, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  /* filled[i] = bank INDEX (AP-01) */
  const [filled, setFilled] = useStateZ(() => equations.map(() => null));
  const [lockedOk, setLockedOk] = useStateZ(() => equations.map(() => false));
  const [active, setActive] = useStateZ(0);
  const [feedback, setFeedback] = useStateZ(null);
  const [attemptsLeft, setAttemptsLeft] = useStateZ(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateZ(0);
  const [lostHeart, setLostHeart] = useStateZ(false);
  const [streak, setStreak] = useStateZ(initialStreak);
  const { fire, layer } = useConfetti();

  const usedIdx = filled.filter((v) => v !== null);
  const valueOf = (slot) => (slot === null ? null : bank[slot]);

  const pick = (bi) => {
    if (feedback || usedIdx.includes(bi) || lockedOk[active]) return;
    const nf = filled.slice();
    nf[active] = bi;
    setFilled(nf);
    const nextEmpty = nf.findIndex((v, i) => v === null && !lockedOk[i]);
    if (nextEmpty >= 0) setActive(nextEmpty);
  };

  const clearRow = (i) => {
    if (feedback || lockedOk[i] || filled[i] === null) return;
    const nf = filled.slice();
    nf[i] = null;
    setFilled(nf);
    setActive(i);
  };

  const handleCheck = () => {
    const flags = equations.map((e, i) => valueOf(filled[i]) === e.answer);
    if (flags.every(Boolean)) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "All " + equations.length + " equations, first try!" : "Got it!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    const okCount = flags.filter(Boolean).length;
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here are the answers", correctList: equations.map((e) => [e.cells.join(" ").replace("_", "▢"), String(e.answer)]) });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (remaining === 1 ? "Some are off — 1 try left" : "Some are off — " + remaining + " tries left"),
        explain: okCount > 0 ? okCount + " of " + equations.length + " are right — locked in green, wrong ones go back to the bank." : undefined,
      });
    }
  };

  const handleRetry = () => {
    /* AP-03 */
    const flags = equations.map((e, i) => valueOf(filled[i]) === e.answer);
    setLockedOk(flags);
    setFilled((f) => f.map((v, i) => (flags[i] ? v : null)));
    setFeedback(null);
    const firstBad = flags.findIndex((x) => !x);
    if (firstBad >= 0) setActive(firstBad);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const allFilled = filled.every((v, i) => v !== null || lockedOk[i]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Fill the missing numbers"}
        feedback={feedback} canCheck={allFilled}
        checkHint="Fill every blank first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {equations.map((e, i) => {
              const v = valueOf(filled[i]);
              const isLocked = lockedOk[i];
              return (
                <div key={i}
                  onClick={() => !feedback && !isLocked && setActive(i)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "12px 16px",
                    background: isLocked ? "var(--green-25)" : "var(--paper-2)",
                    border: "2px solid " + (isLocked ? "var(--green-300)" : active === i && !feedback ? "var(--green-500)" : "var(--ink-100)"),
                    borderRadius: 14,
                    cursor: feedback || isLocked ? "default" : "pointer",
                    fontFamily: "var(--font-mono)", fontSize: "clamp(17px, 5cqw, 22px)", fontWeight: 700,
                    justifyContent: "center",
                    transition: "border-color 150ms, background 200ms",
                  }}>
                  {e.cells.map((cell, j) => {
                    if (cell !== "_") return <span key={j} style={{ padding: "0 5px" }}>{cell}</span>;
                    const isCorrect = (feedback && v === e.answer) || isLocked;
                    const isWrong = feedback && v !== e.answer;
                    return (
                      <button key={j} type="button"
                        onClick={(ev) => { ev.stopPropagation(); clearRow(i); }}
                        disabled={!!feedback || isLocked || v === null}
                        aria-label={v === null ? "Empty blank" : "Filled with " + v + ". Tap to remove"}
                        style={{
                          display: "inline-grid", placeItems: "center",
                          width: 50, height: 40, borderRadius: 8,
                          fontFamily: "inherit", fontSize: "inherit", fontWeight: 800,
                          background: isCorrect ? "var(--green-50)" : isWrong ? "var(--err-bg)" : v == null ? "var(--ink-50)" : "var(--green-50)",
                          border: "2px solid " + (isCorrect ? "var(--green-500)" : isWrong ? "var(--err-border)" : v == null ? "var(--ink-200)" : "var(--green-500)"),
                          color: isWrong ? "var(--err-fg)" : v == null ? "var(--ink-300)" : "var(--green-800)",
                          cursor: v !== null && !feedback && !isLocked ? "pointer" : "default",
                          animation: isWrong ? "fb-shake calc(.4s * var(--mdur)) ease both" : undefined,
                        }}>
                        {v == null ? "?" : v}
                      </button>
                    );
                  })}
                  {isLocked && <span aria-hidden="true" style={{ color: "var(--green-600)", marginLeft: 4 }}>✓</span>}
                </div>
              );
            })}
          </div>
          <div className="gp-eyebrow" style={{ marginTop: 18, marginBottom: 8, textAlign: "center" }}>Number bank · tap to place</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {bank.map((n, bi) => {
              const used = usedIdx.includes(bi);
              return (
                <button key={bi} type="button" onClick={() => pick(bi)} disabled={used || !!feedback}
                  className={"gp-tile " + (used ? "locked" : "")}
                  style={{ width: 54, height: 54, fontFamily: "var(--font-mono)", fontSize: 21, fontWeight: 800, opacity: used ? 0.3 : 1 }}>
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ BUBBLE SHEET ════════════════ */
function BubbleSheetV2({ questions, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [ans, setAns] = useStateZ({});
  const [keptOk, setKeptOk] = useStateZ({});
  const [feedback, setFeedback] = useStateZ(null);
  const [attemptsLeft, setAttemptsLeft] = useStateZ(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateZ(0);
  const [lostHeart, setLostHeart] = useStateZ(false);
  const [streak, setStreak] = useStateZ(initialStreak);
  const [revealCorrect, setRevealCorrect] = useStateZ(false);
  const { fire, layer } = useConfetti();

  const allAnswered = questions.every((q) => ans[q.n] != null);
  const score = questions.filter((q) => ans[q.n] === q.correct).length;

  const handleCheck = () => {
    if (score === questions.length) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Perfect score — " + score + " / " + questions.length + "!" : "Got there — " + score + " / " + questions.length + "!" });
      setStreak((s) => s + 1);
      setRevealCorrect(true);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: score + " / " + questions.length + " correct", explain: "Out of tries — the right bubbles are shown in green." });
      setStreak(0);
      setRevealCorrect(true);
    } else {
      setFeedback({ kind: "no", msg: score + " / " + questions.length + " correct", explain: "Your right answers will stay locked — fix the empty ones. " + remaining + (remaining === 1 ? " try left." : " tries left.") });
    }
  };

  const handleRetry = () => {
    const kept = {};
    for (const q of questions) {
      if (ans[q.n] === q.correct) kept[q.n] = ans[q.n];
    }
    setAns(kept);
    setKeptOk(kept); /* BS-02 */
    setFeedback(null);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", score, total: questions.length, attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const locked = !!feedback;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Answer the whole sheet, then check"}
        feedback={feedback} canCheck={allAnswered}
        checkHint="Answer every question first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600, margin: "0 auto" }}>
          {questions.map((q) => {
            const isKept = keptOk[q.n] != null && !locked;
            return (
              <div key={q.n} style={{
                background: "var(--paper-2)",
                border: "2px solid " + (isKept ? "var(--green-200)" : "var(--ink-100)"),
                borderRadius: 14, padding: "14px 18px",
                transition: "border-color 200ms",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{
                    width: 26, height: 26, borderRadius: 999,
                    background: isKept ? "var(--green-600)" : "var(--ink-50)",
                    color: isKept ? "#fff" : "var(--ink-500)",
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12, flexShrink: 0,
                    transition: "background 200ms",
                  }}>{isKept ? "✓" : q.n}</span>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, flex: 1 }}>{q.q}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(108px, 1fr))", gap: 6, marginLeft: 36 }}>
                  {q.opts.map((opt, i) => {
                    const picked = ans[q.n] === i;
                    const isCorrect = revealCorrect && i === q.correct;
                    const isWrongPick = revealCorrect && picked && i !== q.correct;
                    const keptLock = isKept && picked;
                    let bg = "var(--paper-2)", color = "var(--ink-700)", border = "var(--ink-200)", bubbleBg = "var(--paper-2)", bubbleColor = "var(--ink-500)";
                    if (isCorrect || keptLock) { bg = "var(--green-50)"; color = "var(--green-800)"; border = "var(--green-500)"; bubbleBg = "var(--green-600)"; bubbleColor = "#fff"; }
                    else if (isWrongPick) { bg = "var(--err-bg)"; color = "var(--err-fg)"; border = "var(--err-border)"; bubbleBg = "var(--err-border)"; bubbleColor = "#fff"; }
                    else if (picked) { bg = "var(--ink-50)"; color = "var(--ink-900)"; border = "var(--ink-900)"; bubbleBg = "var(--ink-900)"; bubbleColor = "#fff"; }
                    return (
                      <button key={i} type="button"
                        onClick={() => !locked && !isKept && setAns({ ...ans, [q.n]: i })}
                        disabled={locked || isKept}
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          padding: "9px 10px", minHeight: 42,
                          background: bg, border: "2px solid " + border, borderRadius: 10,
                          cursor: locked || isKept ? "default" : "pointer",
                          transition: "all 120ms", textAlign: "left",
                        }}>
                        <span style={{ width: 26, height: 26, borderRadius: "50%", background: bubbleBg, color: bubbleColor, border: "2px solid " + border, fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 11, display: "grid", placeItems: "center", flexShrink: 0 }}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span style={{ color, fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 13.5 }}>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ MAP PIN ════════════════ */
function MapPinIcon({ s = 32 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 4.9 7 13 7 13s7-8.1 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"></path>
    </svg>
  );
}

function MapPinDropV2({ target, tolerance = 6, mapContent, correctHint, aspectRatio = "1.4 / 1", eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [pin, setPin] = useStateZ(null);
  const [feedback, setFeedback] = useStateZ(null);
  const [attemptsLeft, setAttemptsLeft] = useStateZ(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateZ(0);
  const [lostHeart, setLostHeart] = useStateZ(false);
  const [streak, setStreak] = useStateZ(initialStreak);
  const mapRef = useRefZ(null);
  const { fire, layer } = useConfetti();

  const drop = (e) => {
    if (feedback || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    setPin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const dist = pin ? Math.hypot(pin.x - target.x, pin.y - target.y) : Infinity;

  /* MP-02 compass hint */
  const compass = () => {
    if (!pin) return "";
    const dx = target.x - pin.x, dy = target.y - pin.y;
    const ns = Math.abs(dy) > 3 ? (dy < 0 ? "north" : "south") : "";
    const ew = Math.abs(dx) > 3 ? (dx > 0 ? "east" : "west") : "";
    const dir = ns && ew ? ns + "-" + ew : ns || ew;
    return dir ? "Try further " + dir + "." : "You're very close — tiny nudge!";
  };

  const handleCheck = () => {
    if (dist <= tolerance) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Right on target!" : "Found it!" });
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
      setFeedback({ kind: "no", msg: "Off by a bit — the green pin shows the spot", correct: correctHint });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "Not quite — 1 try left" : "Not quite — " + remaining + " tries left", explain: compass() });
    }
  };

  const handleRetry = () => setFeedback(null);
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak, pin });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const showTarget = feedback && feedback.kind === "no" && attemptsLeft <= 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Drop the pin on the spot"}
        feedback={feedback} canCheck={!!pin}
        checkHint="Tap the map to drop your pin"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div
          ref={mapRef}
          onClick={drop}
          role="button" tabIndex={0}
          aria-label="Map. Tap to place your pin."
          style={{
            position: "relative", width: "100%", maxWidth: 540, margin: "0 auto",
            aspectRatio,
            background: "linear-gradient(180deg, #cce7ff 0%, #b3d9ff 100%)",
            borderRadius: 18, border: "2px solid var(--ink-100)",
            cursor: feedback ? "default" : "crosshair", overflow: "hidden",
          }}>
          {mapContent}
          {pin && (
            <div style={{
              position: "absolute", left: pin.x + "%", top: pin.y + "%",
              transform: "translate(-50%, -100%)", pointerEvents: "none",
              color: feedback ? (feedback.kind === "ok" ? "var(--green-600)" : "var(--coral-500)") : "var(--coral-500)",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
              transition: "color 200ms, left 150ms, top 150ms",
            }}>
              <MapPinIcon />
            </div>
          )}
          {showTarget && (
            <React.Fragment>
              {/* MP-05: tolerance ring + target pin */}
              <div style={{
                position: "absolute", left: target.x + "%", top: target.y + "%",
                width: (tolerance * 2) + "%", aspectRatio: "1",
                transform: "translate(-50%, -50%)",
                border: "2.5px dashed var(--green-500)", borderRadius: "50%",
                pointerEvents: "none", opacity: 0.7,
              }}></div>
              <div style={{ position: "absolute", left: target.x + "%", top: target.y + "%", transform: "translate(-50%, -100%)", pointerEvents: "none", color: "var(--green-600)" }}>
                <MapPinIcon />
              </div>
            </React.Fragment>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--ink-400)", fontWeight: 600 }}>
          {!pin ? "tap anywhere on the map" : feedback ? "" : "tap again to move your pin, then hit Check"}
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ FILE UPLOAD ════════════════ */
function fmtSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(1) + " KB";
}

function FileUploadV2({ accept = ".pdf,.docx,.txt", maxLabel, onSubmit, eyebrow, title, dropLabel, streak: initialStreak = 0, onQuit, onFinish }) {
  const [file, setFile] = useStateZ(null);
  const [feedback, setFeedback] = useStateZ(null);
  const [hover, setHover] = useStateZ(false);
  const [submitting, setSubmitting] = useStateZ(false);
  const [progress, setProgress] = useStateZ(0);
  const [typeNotice, setTypeNotice] = useStateZ(null);
  const [streak, setStreak] = useStateZ(initialStreak);
  const inputRef = useRefZ(null);
  const progTimer = useRefZ(null);
  const { fire, layer } = useConfetti();

  useEffectZ(() => () => clearInterval(progTimer.current), []);

  const acceptList = accept.split(",").map((s) => s.trim().toLowerCase());
  const validate = (f) => {
    const ext = "." + (f.name.split(".").pop() || "").toLowerCase();
    return acceptList.includes(ext);
  };

  const takeFile = (f) => {
    if (!f) return;
    if (!validate(f)) {
      /* FU-01 */
      setTypeNotice("That's a " + (f.name.split(".").pop() || "?").toUpperCase() + " file — this task wants " + acceptList.join(" / "));
      setTimeout(() => setTypeNotice(null), 3500);
      return;
    }
    setTypeNotice(null);
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || submitting) return;
    setSubmitting(true);
    setProgress(0);
    /* FU-02 simulated progress */
    progTimer.current = setInterval(() => {
      setProgress((p) => Math.min(92, p + 8 + Math.random() * 14));
    }, 120);
    try {
      const submitter = onSubmit || (async () => ({ ok: true, msg: "Uploaded — your teacher will review it", explain: "You'll get feedback within 48 hours." }));
      const r = await submitter(file);
      clearInterval(progTimer.current);
      setProgress(100);
      setTimeout(() => {
        setFeedback({ kind: r.ok ? "ok" : "meh", msg: r.msg, explain: r.explain });
        if (r.ok) { setStreak((s) => s + 1); fire(); }
      }, 250);
    } catch {
      clearInterval(progTimer.current);
      setFeedback({ kind: "meh", msg: "Hmm, the upload didn't go through", explain: "Check your connection and try again — your file is still here." });
    } finally {
      setTimeout(() => setSubmitting(false), 260);
    }
  };

  const handleRetry = () => setFeedback(null);
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", file: file ? { name: file.name, size: file.size } : undefined, streak });

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        streak={streak} hearts={0} maxHearts={0} hideStats={false}
        eyebrow={eyebrow} title={title || "Hand in your work"}
        feedback={feedback}
        canCheck={!!file && !submitting} checking={submitting}
        checkLabel="Submit" checkHint="Pick a file first"
        showSkip={false}
        onCheck={handleSubmit} onContinue={handleContinue}
        onRetry={feedback && feedback.kind === "meh" ? handleRetry : undefined}
        onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <button
            type="button"
            onClick={() => !feedback && inputRef.current && inputRef.current.click()}
            onDragOver={(e) => { e.preventDefault(); setHover(true); }}
            onDragLeave={() => setHover(false)}
            onDrop={(e) => {
              e.preventDefault();
              setHover(false);
              if (!feedback) takeFile(e.dataTransfer.files && e.dataTransfer.files[0]);
            }}
            disabled={!!feedback}
            aria-label={file ? "Chosen file: " + file.name + ". Tap to choose another." : "Choose a file to upload"}
            style={{
              width: "100%", padding: "40px 24px",
              background: hover ? "var(--green-50)" : "var(--paper-2)",
              border: "3px dashed " + (hover ? "var(--green-500)" : typeNotice ? "var(--sun-500)" : "var(--ink-200)"),
              borderRadius: 18, textAlign: "center",
              cursor: feedback ? "default" : "pointer",
              transition: "all 150ms", fontFamily: "inherit",
            }}>
            <span style={{ width: 64, height: 64, background: typeNotice ? "var(--sun-100)" : "var(--green-50)", borderRadius: "50%", margin: "0 auto 14px", display: "grid", placeItems: "center", color: typeNotice ? "var(--sun-700)" : "var(--green-700)", transition: "background 200ms" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4m0 0 4 4m-4-4-4 4"></path><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"></path></svg>
            </span>
            <span style={{ display: "block", fontWeight: 700, fontSize: 16.5, color: typeNotice ? "var(--sun-700)" : "var(--ink-900)" }}>
              {typeNotice || (file ? file.name : (dropLabel || "Drop your file here, or tap to browse"))}
            </span>
            <span style={{ display: "block", fontSize: 13, color: "var(--ink-400)", marginTop: 6, fontWeight: 500 }}>
              {file ? fmtSize(file.size) + " · ready to submit" : (maxLabel || accept.replaceAll(",", " · ") + " · max 25 MB")}
            </span>
            <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}
              onChange={(e) => takeFile(e.target.files && e.target.files[0])} />
          </button>

          {file && (
            <div style={{ marginTop: 14, padding: 12, background: "var(--green-25)", borderRadius: 12, display: "flex", alignItems: "center", gap: 12, border: "2px solid var(--green-200)", position: "relative", overflow: "hidden" }}>
              {submitting && (
                <span style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: progress + "%", background: "var(--green-100)", transition: "width 150ms ease", zIndex: 0 }}></span>
              )}
              <span style={{ width: 38, height: 38, borderRadius: 8, background: "var(--green-600)", color: "#fff", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 11, position: "relative", flex: "none" }}>
                {(file.name.split(".").pop() || "FILE").toUpperCase().slice(0, 4)}
              </span>
              <span style={{ flex: 1, minWidth: 0, position: "relative" }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</span>
                <span style={{ display: "block", fontSize: 11, color: "var(--ink-500)", fontFamily: "var(--font-mono)" }}>
                  {submitting ? "uploading… " + Math.round(progress) + "%" : fmtSize(file.size)}
                </span>
              </span>
              <button type="button"
                onClick={(e) => { e.stopPropagation(); if (!feedback && !submitting) setFile(null); }}
                disabled={!!feedback || submitting}
                aria-label="Remove file"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-500)", width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", position: "relative", flex: "none" }}>
                ✕
              </button>
            </div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ SCORM ════════════════ */
const SCORM_BG = ["var(--green-500)", "var(--sun-400)", "var(--coral-500)", "var(--green-700)"];

function ScormPackageV2({ slides, finalScore = 92, scoreMax = 100, packageName = "module.zip", version, eyebrow, title, streak: initialStreak = 0, onQuit, onFinish }) {
  const [idx, setIdx] = useStateZ(0);
  const [maxSeen, setMaxSeen] = useStateZ(0);
  const [done, setDone] = useStateZ(false);
  const [feedback, setFeedback] = useStateZ(null);
  const [streak, setStreak] = useStateZ(initialStreak);
  const { fire, layer } = useConfetti();

  const progress = done ? 100 : Math.round((maxSeen / Math.max(1, slides.length)) * 100);

  const advance = () => {
    if (feedback) return;
    if (idx >= slides.length - 1) {
      setDone(true);
      setFeedback({ kind: "ok", msg: "Module complete — score " + finalScore + " / " + scoreMax + " reported!" });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    setIdx(idx + 1);
    setMaxSeen((m) => Math.max(m, idx + 1));
  };
  const back = () => { if (!feedback && idx > 0) setIdx(idx - 1); }; /* SC-01 */

  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", score: feedback && feedback.kind === "ok" ? finalScore : 0, streak });

  const slide = slides[idx];

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hideStats
        eyebrow={eyebrow || version}
        title={title || "Work through the module"}
        feedback={feedback}
        canCheck={false} instant instantLabel={"slide " + (idx + 1) + " of " + slides.length}
        showSkip={false}
        onCheck={() => {}} onContinue={handleContinue} onQuit={onQuit}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          <div style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--ink-100)", display: "flex", alignItems: "center", gap: 8, background: "var(--ink-50)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-500)" }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--green-500)" }}></span>
              SCORM PLAYER · {progress}%
              <span style={{ marginLeft: "auto", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{packageName}</span>
            </div>
            <div style={{ padding: 28, minHeight: 270, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16, background: "var(--paper)" }}>
              {!done && slide ? (
                <React.Fragment>
                  <div style={{ width: 76, height: 76, borderRadius: 16, background: SCORM_BG[idx % SCORM_BG.length], boxShadow: "0 6px 0 0 rgba(0,0,0,0.15)", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 30 }}>
                    {idx + 1}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="gp-eyebrow">slide {idx + 1} of {slides.length}</div>
                    <h3 style={{ margin: "6px 0 0", fontSize: 19, fontWeight: 800 }}>{slide.title}</h3>
                    <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 8, maxWidth: 320, fontWeight: 500 }}>
                      The real module's slide content renders here from the SCORM package.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={back} disabled={idx === 0} className="gp-btn ghost" style={{ padding: "10px 18px", fontSize: 13 }}>
                      ← Back
                    </button>
                    <button type="button" onClick={advance} className="gp-btn" style={{ padding: "10px 24px", fontSize: 13 }}>
                      {idx >= slides.length - 1 ? "Finish" : "Next →"}
                    </button>
                  </div>
                </React.Fragment>
              ) : (
                <React.Fragment>
                  <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--green-600)", display: "grid", placeItems: "center", color: "#fff", fontSize: 36, fontWeight: 800 }}>✓</div>
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--green-800)" }}>Module complete!</h3>
                    <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6 }}>Score {finalScore} / {scoreMax} reported to your teacher.</p>
                  </div>
                </React.Fragment>
              )}
            </div>
            <div style={{ height: 6, background: "var(--ink-100)", position: "relative" }}>
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: progress + "%", background: "var(--green-500)", transition: "width 250ms" }}></div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { ArithmeticPuzzleV2, BubbleSheetV2, MapPinDropV2, FileUploadV2, ScormPackageV2 });
