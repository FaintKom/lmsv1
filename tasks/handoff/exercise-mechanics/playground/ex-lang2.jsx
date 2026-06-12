/* ex-lang2.jsx — DialogueV2 + ReadingV2 + CrosswordV2 (batch 3 ports with audit fixes)

   DialogueV2:
   - DG-01 history scrolls via scrollTop (upstream used scrollIntoView)
   - DG-02 typing indicator (3 bouncing dots) before the partner replies
   - DG-03 no answer leak on retry; eliminated replies stay struck out
   - DG-04 my wrong bubble shakes coral, then returns to choices
   - DG-05 aria-live on the chat log

   ReadingV2:
   - RD-01 passage stacks ABOVE questions in narrow containers (CSS .rd-grid)
   - RD-02 passage panel keeps its own scroll with a fade cue; questions stay put
   - RD-03 multi-question flow with per-question hearts + step progress
   - RD-04 eliminated options + no leak (family discipline)

   CrosswordV2:
   - CW-01 typing auto-advances along the active word; Backspace walks back
   - CW-02 arrow keys move the caret; tapping a crossing cell toggles direction
   - CW-03 correct letters lock green on retry; "N letters right" partials
   - CW-04 active clue highlighted; tapping a clue jumps to its first cell
   - CW-05 reveal fills missing letters in dashed green, not coral noise
*/

const { useState: useStateH, useRef: useRefH, useMemo: useMemoH, useEffect: useEffectH } = React;

/* ════════════════ DIALOGUE ════════════════ */
function DialogueV2({ partner, scenario, turns, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  /* turns: [{partner: "...", options: [{text, ok}...]} ...] */
  const [turnIdx, setTurnIdx] = useStateH(0);
  const [history, setHistory] = useStateH([]); // {who:'p'|'me', text, no?}
  const [typing, setTyping] = useStateH(true);
  const [shaking, setShaking] = useStateH(null);
  const [eliminated, setEliminated] = useStateH([]);
  const [feedback, setFeedback] = useStateH(null);
  const [attemptsLeft, setAttemptsLeft] = useStateH(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateH(0);
  const [lostHeart, setLostHeart] = useStateH(false);
  const [streak, setStreak] = useStateH(initialStreak);
  const { fire, layer } = useConfetti();
  const logRef = useRefH(null);
  const timers = useRefH([]);

  const turn = turns[turnIdx];

  /* DG-02: partner "types" then the bubble lands */
  useEffectH(() => {
    setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setHistory((h) => [...h, { who: "p", text: turns[turnIdx].partner, fresh: true }]);
    }, 900);
    timers.current.push(t);
    return () => clearTimeout(t);
  }, [turnIdx]);

  /* DG-01: scroll the log, not the page */
  useEffectH(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history, typing]);

  useEffectH(() => () => timers.current.forEach(clearTimeout), []);

  const pickReply = (i) => {
    if (feedback || typing || eliminated.includes(i)) return;
    const opt = turn.options[i];
    if (opt.ok) {
      setHistory((h) => [...h, { who: "me", text: opt.text, fresh: true }]);
      setEliminated([]);
      if (turnIdx + 1 < turns.length) {
        const t = setTimeout(() => setTurnIdx((x) => x + 1), 700);
        timers.current.push(t);
      } else {
        const t = setTimeout(() => {
          setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Smooth talker — perfect chat!" : "Conversation complete!" });
          setStreak((s) => s + 1);
          fire();
        }, 700);
        timers.current.push(t);
      }
      return;
    }
    /* wrong: my bubble lands, shakes, then lifts back out */
    setHistory((h) => [...h, { who: "me", text: opt.text, no: true, fresh: true }]);
    setShaking(i);
    setEliminated((e) => [...e, i]);
    setLostHeart(true);
    const t = setTimeout(() => {
      setShaking(null);
      setLostHeart(false);
      setHistory((h) => h.filter((b) => !b.no));
    }, 1100);
    timers.current.push(t);
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    if (remaining <= 0) {
      const t2 = setTimeout(() => {
        const okOpt = turn.options.find((o) => o.ok);
        setFeedback({ kind: "no", msg: "Out of tries — the best reply was", correct: okOpt && okOpt.text });
        setStreak(0);
      }, 1150);
      timers.current.push(t2);
    }
  };

  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts, streak });

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        step={Math.min(turnIdx + 1, turns.length)} totalSteps={turns.length}
        eyebrow={eyebrow} title={title || scenario}
        feedback={feedback}
        canCheck={false} instant={true} instantLabel="pick the best reply"
        showSkip={false}
        onCheck={() => {}} onContinue={handleContinue} onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", height: "100%" }}>
          <div ref={logRef} role="log" aria-live="polite"
            style={{ flex: "0 1 auto", overflowY: "auto", maxHeight: 280, paddingRight: 4, marginBottom: 16 }}>
            {history.map((b, i) => (
              <div key={i} className={"fb-bubble-row" + (b.who === "me" ? " me" : "") + (b.fresh ? " pop" : "")}>
                {b.who === "p" && <span className="fb-avatar" aria-hidden="true">{partner[0]}</span>}
                <span className={"fb-bubble" + (b.who === "me" ? " me" : "") + (b.no ? " no" : "")}>{b.text}</span>
              </div>
            ))}
            {typing && (
              <div className="fb-bubble-row pop">
                <span className="fb-avatar" aria-hidden="true">{partner[0]}</span>
                <span className="fb-bubble fb-typing" aria-label={partner + " is typing"}><i></i><i></i><i></i></span>
              </div>
            )}
          </div>
          {!feedback && !typing && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {turn.options.map((opt, i) => {
                const isElim = eliminated.includes(i);
                return (
                  <button key={i}
                    className={"gp-tile" + (shaking === i ? " wrong" : isElim ? " eliminated" : "")}
                    style={{ padding: "13px 18px", fontSize: 14.5, textAlign: "left", justifyContent: "flex-start" }}
                    disabled={isElim || shaking !== null}
                    onClick={() => pickReply(i)}>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ READING ════════════════ */
function ReadingV2({ passage, passageTitle, questions, eyebrow, maxAttemptsPerTask = 2, streak: initialStreak = 0, onQuit, onFinish }) {
  const [qIdx, setQIdx] = useStateH(0);
  const [pick, setPick] = useStateH(null);
  const [eliminated, setEliminated] = useStateH([]);
  const [feedback, setFeedback] = useStateH(null);
  const [attemptsLeft, setAttemptsLeft] = useStateH(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateH(0);
  const [lostHeart, setLostHeart] = useStateH(false);
  const [streak, setStreak] = useStateH(initialStreak);
  const [solved, setSolved] = useStateH(0);
  const { fire, layer } = useConfetti();

  const q = questions[qIdx];
  const correctIdx = q.options.findIndex((o) => o.ok);

  const handleCheck = () => {
    if (pick === correctIdx) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Sharp reading!" : "Got it!" });
      setStreak((s) => s + 1);
      setSolved((n) => n + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setEliminated((e) => [...e, pick]);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — the answer is", correct: q.options[correctIdx].text });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "Look back at the story — 1 try left" : "Look back at the story — " + remaining + " tries left" });
    }
  };

  const handleRetry = () => { setFeedback(null); setPick(null); };
  const handleContinue = () => {
    setFeedback(null); setPick(null); setEliminated([]);
    setAttemptsLeft(maxAttemptsPerTask); setUsedAttempts(0);
    if (qIdx + 1 < questions.length) setQIdx((i) => i + 1);
    else onFinish && onFinish({ correct: solved === questions.length, total: questions.length, correctEventually: solved, streak });
  };
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        step={qIdx + 1} totalSteps={questions.length}
        eyebrow={eyebrow} title={null}
        feedback={feedback} canCheck={pick !== null}
        checkHint="Pick an answer first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div className="rd-grid">
          <div style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 18, padding: "18px 20px", maxHeight: 340, overflowY: "auto" }}>
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>{passageTitle}</div>
            {passage.map((para, i) => (
              <p key={i} style={{ margin: "0 0 12px", fontSize: 15, lineHeight: 1.75, color: "var(--ink-700)", fontWeight: 500 }}>{para}</p>
            ))}
          </div>
          <div>
            <h2 className="gp-title" style={{ fontSize: 18, margin: "0 0 14px" }}>{q.question}</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} role="radiogroup" aria-label="Answer options">
              {q.options.map((opt, i) => {
                const failedOut = feedback && feedback.kind === "no" && attemptsLeft <= 0;
                let state = "";
                if (feedback) {
                  if (i === correctIdx && (feedback.kind === "ok" || failedOut)) state = "correct";
                  else if (i === pick && feedback.kind === "no") state = "wrong";
                  else if (eliminated.includes(i)) state = "eliminated";
                  else state = "locked";
                } else if (eliminated.includes(i)) state = "eliminated";
                else if (pick === i) state = "selected";
                const isElim = state === "eliminated";
                return (
                  <button key={i} className={"gp-tile " + state}
                    role="radio" aria-checked={pick === i}
                    style={{ justifyContent: "flex-start", textAlign: "left", padding: "13px 16px", fontSize: 14.5, width: "100%" }}
                    disabled={!!feedback || isElim}
                    onClick={() => !feedback && !isElim && setPick(i)}>
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ CROSSWORD ════════════════ */
/* words: [{word, clue, row, col, dir: 'a'|'d'}] — grid derived */
function CrosswordV2({ words, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const { cells, R, C, numbers } = useMemoH(() => {
    let maxR = 0, maxC = 0;
    words.forEach((w) => {
      const len = w.word.length;
      maxR = Math.max(maxR, w.row + (w.dir === "d" ? len : 1));
      maxC = Math.max(maxC, w.col + (w.dir === "a" ? len : 1));
    });
    const map = {};
    words.forEach((w, wi) => {
      [...w.word.toUpperCase()].forEach((ch, k) => {
        const r = w.row + (w.dir === "d" ? k : 0);
        const c = w.col + (w.dir === "a" ? k : 0);
        const key = r + "," + c;
        if (!map[key]) map[key] = { r, c, ch, words: [] };
        map[key].words.push(wi);
      });
    });
    const nums = {};
    let n = 1;
    words.slice().sort((a, b) => a.row - b.row || a.col - b.col).forEach((w) => {
      const key = w.row + "," + w.col;
      if (!nums[key]) nums[key] = n++;
    });
    return { cells: map, R: maxR, C: maxC, numbers: nums };
  }, [words]);

  const [letters, setLetters] = useStateH({});
  const [lockedCells, setLockedCells] = useStateH({});
  const [active, setActive] = useStateH({ wi: 0, k: 0 });
  const [feedback, setFeedback] = useStateH(null);
  const [attemptsLeft, setAttemptsLeft] = useStateH(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateH(0);
  const [lostHeart, setLostHeart] = useStateH(false);
  const [streak, setStreak] = useStateH(initialStreak);
  const [revealed, setRevealed] = useStateH(false);
  const { fire, layer } = useConfetti();
  const cellRefs = useRefH({});

  const keyOf = (wi, k) => {
    const w = words[wi];
    return (w.row + (w.dir === "d" ? k : 0)) + "," + (w.col + (w.dir === "a" ? k : 0));
  };
  const activeKey = keyOf(active.wi, active.k);

  const focusCell = (wi, k) => {
    setActive({ wi, k });
    const el = cellRefs.current[keyOf(wi, k)];
    if (el) { el.focus(); el.select && el.select(); }
  };

  const advance = (wi, k, dir) => {
    const len = words[wi].word.length;
    let nk = k + dir;
    while (nk >= 0 && nk < len && lockedCells[keyOf(wi, nk)]) nk += dir; /* skip locked */
    if (nk >= 0 && nk < len) focusCell(wi, nk);
  };

  const typeLetter = (key, val, wi, k) => {
    const ch = val.slice(-1).toUpperCase();
    if (!/^[A-ZА-ЯЁ]$/i.test(ch)) return;
    setLetters((ls) => ({ ...ls, [key]: ch }));
    advance(wi, k, 1); /* CW-01 */
  };

  const allFilled = Object.keys(cells).every((key) => lockedCells[key] || (letters[key] || "").length > 0);

  const handleCheck = () => {
    const wrongKeys = Object.keys(cells).filter((key) => (letters[key] || "") !== cells[key].ch && !lockedCells[key]);
    if (wrongKeys.length === 0) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Whole grid, first try!" : "Crossword complete!" });
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
      setRevealed(true); /* CW-05 */
      setFeedback({ kind: "no", msg: "Out of tries — missing letters shown", correctList: words.map((w) => [w.dir === "a" ? "→" : "↓", w.word.toUpperCase()]) });
      setStreak(0);
    } else {
      const total = Object.keys(cells).length;
      const right = total - wrongKeys.length;
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "Some letters are off — 1 try left" : "Some letters are off — " + remaining + " tries left",
        explain: right > 0 ? right + " of " + total + " letters are right — they'll lock in green." : undefined,
      });
    }
  };

  const handleRetry = () => {
    /* CW-03: lock correct cells */
    const locks = {};
    Object.keys(cells).forEach((key) => {
      if ((letters[key] || "") === cells[key].ch) locks[key] = true;
    });
    setLockedCells(locks);
    setFeedback(null);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  const activeWordKeys = useMemoH(() => {
    const w = words[active.wi];
    const s = new Set();
    for (let k = 0; k < w.word.length; k++) s.add(keyOf(active.wi, k));
    return s;
  }, [active, words]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Fill the crossword"}
        feedback={feedback} canCheck={allFilled}
        checkHint="Fill every cell first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
          <div className="cw-grid" role="group" aria-label="Crossword grid">
            {Array.from({ length: R }, (_, r) => (
              <div key={r} style={{ display: "flex" }}>
                {Array.from({ length: C }, (_, c) => {
                  const key = r + "," + c;
                  const cell = cells[key];
                  if (!cell) return <div key={c} className="cw-block" style={{ visibility: "hidden" }}></div>;
                  const locked = lockedCells[key];
                  const showReveal = revealed && (letters[key] || "") !== cell.ch;
                  const stateCls = feedback
                    ? ((letters[key] || "") === cell.ch || locked ? " ok" : showReveal ? " reveal" : " no")
                    : locked ? " ok" : "";
                  return (
                    <div key={c} className="cw-cell">
                      {numbers[key] && <span className="num">{numbers[key]}</span>}
                      <input
                        ref={(el) => { cellRefs.current[key] = el; }}
                        className={stateCls.trim() ? stateCls.trim() : undefined}
                        value={showReveal ? cell.ch : (letters[key] || "")}
                        aria-label={"Row " + (r + 1) + " column " + (c + 1)}
                        disabled={!!feedback || locked}
                        onFocus={() => {
                          const wi = cell.words.includes(active.wi) ? active.wi : cell.words[0];
                          const w = words[wi];
                          const k = w.dir === "a" ? c - w.col : r - w.row;
                          setActive({ wi, k });
                        }}
                        onClick={() => {
                          /* CW-02: tap a crossing cell again to switch direction */
                          if (cell.words.length > 1 && cell.words.includes(active.wi) && keyOf(active.wi, active.k) === key) {
                            const other = cell.words.find((wi) => wi !== active.wi);
                            const w = words[other];
                            setActive({ wi: other, k: w.dir === "a" ? c - w.col : r - w.row });
                          }
                        }}
                        onChange={(e) => typeLetter(key, e.target.value, active.wi, active.k)}
                        onKeyDown={(e) => {
                          const w = words[active.wi];
                          if (e.key === "Backspace" && !(letters[key] || "")) { e.preventDefault(); advance(active.wi, active.k, -1); }
                          else if (e.key === "Backspace") { setLetters((ls) => ({ ...ls, [key]: "" })); }
                          else if (e.key === "ArrowRight" && w.dir === "a") { e.preventDefault(); advance(active.wi, active.k, 1); }
                          else if (e.key === "ArrowLeft" && w.dir === "a") { e.preventDefault(); advance(active.wi, active.k, -1); }
                          else if (e.key === "ArrowDown" && w.dir === "d") { e.preventDefault(); advance(active.wi, active.k, 1); }
                          else if (e.key === "ArrowUp" && w.dir === "d") { e.preventDefault(); advance(active.wi, active.k, -1); }
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ flex: "1 1 200px", maxWidth: 280, minWidth: 180 }}>
            {["a", "d"].map((dir) => {
              const list = words.map((w, wi) => ({ ...w, wi })).filter((w) => w.dir === dir);
              if (!list.length) return null;
              return (
                <div key={dir} style={{ marginBottom: 14 }}>
                  <div className="gp-eyebrow" style={{ marginBottom: 6 }}>{dir === "a" ? "Across →" : "Down ↓"}</div>
                  {list.map((w) => {
                    const isActive = active.wi === w.wi && !feedback;
                    return (
                      <button key={w.wi}
                        onClick={() => focusCell(w.wi, 0)}
                        disabled={!!feedback}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          background: isActive ? "var(--green-50)" : "transparent",
                          border: "none", borderRadius: 8, padding: "6px 9px",
                          fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: isActive ? 800 : 600,
                          color: isActive ? "var(--green-800)" : "var(--ink-500)",
                          cursor: feedback ? "default" : "pointer",
                          transition: "background 120ms, color 120ms",
                        }}>
                        <b style={{ fontFamily: "var(--font-mono)", fontSize: 11, marginRight: 6 }}>{numbers[w.row + "," + w.col]}</b>
                        {w.clue}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { DialogueV2, ReadingV2, CrosswordV2 });
