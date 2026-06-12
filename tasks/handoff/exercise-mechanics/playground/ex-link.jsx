/* ex-link.jsx — MatchingV2 + FillBlanksV2 (playground ports with audit fixes)

   MatchingV2 fixes:
   - MT-01 keyboard path: Tab to a tile, Enter/Space picks it, Enter on the
           other column pairs — same click-click semantics as the pointer
   - MT-02 column gap scales with container width (was fixed 80px)
   - MT-03 out-of-tries reveal is a structured list, not one long string
   - MT-04 attempts default 3 (was pairs.length — pill meaning drifted per task)

   FillBlanksV2 fixes:
   - FB-01 empty slots are visible wells with a readable placeholder
           (upstream rendered transparent text + a lone "·")
   - FB-02 aria-live announcements on place/remove
   - FB-03 server-sim support; network failure = neutral sheet, words stay
*/

const { useState: useStateL, useEffect: useEffectL, useRef: useRefL, useMemo: useMemoL } = React;

const DRAG_THRESHOLD = 6;

/* ════════════════ MATCHING ════════════════ */
function MatchingV2({ pairs, eyebrow, title, maxAttemptsPerTask, streak: initialStreak = 0, deferred = true, onQuit, onFinish }) {
  const maxAttempts = maxAttemptsPerTask != null ? maxAttemptsPerTask : Math.min(3, pairs.length); // MT-04
  const indices = pairs.map((_, i) => i);
  const [leftOrder] = useStateL(() => shuffleArr(indices));
  const [rightOrder] = useStateL(() => shuffleArr(indices));
  const [picked, setPicked] = useStateL(null);
  const [hot, setHot] = useStateL(null);
  const [matched, setMatched] = useStateL([]);
  const [links, setLinks] = useStateL([]);
  const [freshLink, setFreshLink] = useStateL(null);
  const [fresh, setFresh] = useStateL(null);
  const [wrongPairs, setWrongPairs] = useStateL(null);
  const [cursor, setCursor] = useStateL(null);
  const [, setTick] = useStateL(0);
  const [feedback, setFeedback] = useStateL(null);
  const [attemptsLeft, setAttemptsLeft] = useStateL(maxAttempts);
  const [wrongAttempts, setWrongAttempts] = useStateL(0);
  const [lostHeart, setLostHeart] = useStateL(false);
  const [streak, setStreak] = useStateL(initialStreak);
  const { fire, layer } = useConfetti();
  const wrapRef = useRefL(null);
  const tileRefs = useRefL({});
  const dragRef = useRefL(null);

  useEffectL(() => {
    const onResize = () => setTick((n) => n + 1);
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(() => setTick((n) => n + 1));
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => { window.removeEventListener("resize", onResize); ro.disconnect(); };
  }, []);

  const anchor = (side, idx) => {
    const el = tileRefs.current[side + idx];
    const wrap = wrapRef.current;
    if (!el || !wrap) return null;
    const r = el.getBoundingClientRect();
    const w = wrap.getBoundingClientRect();
    return { x: (side === "L" ? r.right : r.left) - w.left, y: r.top + r.height / 2 - w.top };
  };

  const bezier = (a, b) => {
    const c = Math.max(30, Math.abs(b.x - a.x) * 0.45);
    const dir = b.x >= a.x ? 1 : -1;
    return "M " + a.x + " " + a.y + " C " + (a.x + c * dir) + " " + a.y + ", " + (b.x - c * dir) + " " + b.y + ", " + b.x + " " + b.y;
  };

  const winTask = () => {
    setFeedback({ kind: "ok", msg: "All matched — brilliant!" });
    setStreak((s) => s + 1);
    fire();
  };

  const loseRound = (msg) => {
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setWrongAttempts((w) => w + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      /* MT-03 structured reveal */
      setFeedback({ kind: "no", msg: "Out of tries — here are the pairs", correctList: pairs.map((p) => [p.left, p.right]) });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg });
    }
  };

  const resolvePair = (lIdx, rIdx) => {
    setHot(null); setPicked(null); setCursor(null);
    if (deferred) {
      setLinks((ls) => [...ls.filter((p) => p[0] !== lIdx && p[1] !== rIdx), [lIdx, rIdx]]);
      setFreshLink(lIdx);
      return;
    }
    if (lIdx === rIdx) {
      const nm = [...matched, lIdx];
      setMatched(nm);
      setFresh(lIdx);
      if (nm.length === pairs.length) setTimeout(() => winTask(), 380);
    } else {
      setWrongPairs([[lIdx, rIdx]]);
      setTimeout(() => { setWrongPairs(null); loseRound("Those two don't match"); }, 620);
    }
  };

  const check = () => {
    const ok = links.filter((p) => p[0] === p[1]);
    const bad = links.filter((p) => p[0] !== p[1]);
    if (ok.length) { setMatched((m) => [...m, ...ok.map((p) => p[0])]); setFresh(ok[0][0]); }
    if (bad.length === 0) {
      setLinks([]); setFreshLink(null);
      setTimeout(() => winTask(), 380);
    } else {
      setLinks(bad); setWrongPairs(bad);
      setTimeout(() => {
        setWrongPairs(null); setLinks([]);
        loseRound(bad.length === 1 ? "1 pair came undone — look again" : bad.length + " pairs came undone — look again");
      }, 700);
    }
  };

  const retry = () => {
    if (!deferred) { setMatched([]); setFresh(null); }
    setLinks([]); setFreshLink(null); setPicked(null); setWrongPairs(null); setCursor(null);
    setFeedback(null);
  };

  /* MT-01: click-click via keyboard */
  const keyPick = (side, idx) => {
    if (feedback || matched.includes(idx) || wrongPairs) return;
    if (deferred) setLinks((ls) => ls.filter((p) => p[side === "L" ? 0 : 1] !== idx));
    if (picked && picked.side === side && picked.idx === idx) { setPicked(null); setCursor(null); return; }
    if (picked && picked.side !== side) {
      const lIdx = side === "L" ? idx : picked.idx;
      const rIdx = side === "R" ? idx : picked.idx;
      resolvePair(lIdx, rIdx);
      return;
    }
    setPicked({ side, idx });
    const a = anchor(side, idx);
    if (a) setCursor({ x: a.x + (side === "L" ? 30 : -30), y: a.y });
  };

  const tileDown = (side, idx) => (e) => {
    if (feedback || matched.includes(idx) || wrongPairs) return;
    if (e.currentTarget.hasPointerCapture && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (deferred) setLinks((ls) => ls.filter((p) => p[side === "L" ? 0 : 1] !== idx));
    dragRef.current = { side, idx, x0: e.clientX, y0: e.clientY, moved: false, prevPicked: picked };
    if (!picked || picked.side === side) {
      setPicked({ side, idx });
      const w = wrapRef.current && wrapRef.current.getBoundingClientRect();
      if (w) setCursor({ x: e.clientX - w.left, y: e.clientY - w.top });
    }
  };

  const onMove = (e) => {
    const d = dragRef.current;
    if (d && !d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) > DRAG_THRESHOLD) d.moved = true;
    if (!picked || !wrapRef.current) return;
    const w = wrapRef.current.getBoundingClientRect();
    setCursor({ x: e.clientX - w.left, y: e.clientY - w.top });
  };

  useEffectL(() => {
    const up = (e) => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      if (feedback) return;
      if (!d.moved) {
        const p = d.prevPicked;
        if (p && p.side === d.side && p.idx === d.idx) { setPicked(null); setCursor(null); }
        else if (p && p.side !== d.side) {
          const lIdx = d.side === "L" ? d.idx : p.idx;
          const rIdx = d.side === "R" ? d.idx : p.idx;
          resolvePair(lIdx, rIdx);
        }
        return;
      }
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const target = el && el.closest("[data-mside]");
      if (target) {
        const side = target.dataset.mside;
        const idx = parseInt(target.dataset.midx || "", 10);
        if (side !== d.side && !Number.isNaN(idx) && !matched.includes(idx)) {
          const lIdx = d.side === "L" ? d.idx : idx;
          const rIdx = d.side === "R" ? d.idx : idx;
          resolvePair(lIdx, rIdx);
          return;
        }
      }
      setPicked(null); setCursor(null); setHot(null);
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => { window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  });

  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", wrongAttempts, streak });

  const linkFor = (side, idx) => links.find((p) => p[side === "L" ? 0 : 1] === idx);
  const inWrong = (side, idx) => !!(wrongPairs && wrongPairs.some((p) => p[side === "L" ? 0 : 1] === idx));

  const stateFor = (side, idx) => {
    if (matched.includes(idx)) return fresh === idx ? "correct" : "correct locked";
    if (inWrong(side, idx)) return "wrong";
    if (picked && picked.side === side && picked.idx === idx) return "selected";
    if (picked && picked.side !== side) {
      if (hot && hot.side === side && hot.idx === idx) return "hot";
      return linkFor(side, idx) ? "linked" : "candidate";
    }
    return linkFor(side, idx) ? "linked" : "";
  };

  let cursorPath = null, cursorEnd = null, cursorStart = null;
  if (picked) {
    const a = anchor(picked.side, picked.idx);
    let b = null;
    if (hot && hot.side !== picked.side) b = anchor(hot.side, hot.idx);
    else if (cursor) b = cursor;
    if (a && b) { cursorPath = bezier(a, b); cursorStart = a; cursorEnd = b; }
  }

  const renderTile = (side, idx) => (
    <button
      key={side + idx}
      ref={(el) => { tileRefs.current[side + idx] = el; }}
      data-mside={side} data-midx={idx}
      className={"gp-tile " + stateFor(side, idx)}
      style={{
        fontFamily: side === "L" ? "var(--font-mono)" : "var(--font-sans)",
        padding: "14px 12px", fontSize: side === "L" ? 15 : 14,
        width: "100%", textAlign: "center", touchAction: "none",
        whiteSpace: "normal", lineHeight: 1.35,
      }}
      onPointerDown={tileDown(side, idx)}
      onPointerEnter={() => { if (picked && picked.side !== side && !matched.includes(idx)) setHot({ side, idx }); }}
      onPointerLeave={() => setHot(null)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); keyPick(side, idx); } }}
      aria-pressed={picked && picked.side === side && picked.idx === idx}
      aria-label={pairs[idx][side === "L" ? "left" : "right"] + (matched.includes(idx) ? ", matched" : "")}
    >
      {pairs[idx][side === "L" ? "left" : "right"]}
    </button>
  );

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttempts} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Match the pairs"}
        feedback={feedback}
        canCheck={deferred && links.length + matched.length === pairs.length && !wrongPairs && !feedback}
        checkLabel="Check pairs" checkHint="Connect every pair first"
        instant={!deferred} instantLabel="pairs check themselves"
        showSkip={false}
        onCheck={check} onContinue={handleContinue}
        onRetry={attemptsLeft > 0 || (feedback && feedback.kind === "ok") ? retry : undefined}
        onQuit={onQuit}
      >
        <div
          ref={wrapRef}
          className="fb-linkwrap"
          onPointerMove={onMove}
          style={{
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: "12px clamp(28px, 12cqw, 80px)", /* MT-02 */
            maxWidth: 620, margin: "0 auto", width: "100%",
          }}
        >
          <svg className="fb-linksvg">
            {matched.map((idx) => {
              const a = anchor("L", idx), b = anchor("R", idx);
              if (!a || !b) return null;
              return <path key={idx} className={"fb-line-done" + (fresh === idx ? " fresh" : "")} d={bezier(a, b)}></path>;
            })}
            {links.map(([l, r]) => {
              if (inWrong("L", l)) return null;
              const a = anchor("L", l), b = anchor("R", r);
              if (!a || !b) return null;
              return <path key={"s" + l + "-" + r} className={"fb-line-soft" + (freshLink === l ? " fresh" : "")} d={bezier(a, b)}></path>;
            })}
            {wrongPairs && wrongPairs.map(([l, r]) => {
              const a = anchor("L", l), b = anchor("R", r);
              if (!a || !b) return null;
              return <path key={"w" + l + "-" + r} className="fb-line-wrong" d={bezier(a, b)}></path>;
            })}
            {cursorPath && (
              <g>
                <path className="fb-line-cursor" d={cursorPath}></path>
                {cursorStart && <circle className="fb-line-anchor" cx={cursorStart.x} cy={cursorStart.y} r="6"></circle>}
                {cursorEnd && <circle className="fb-line-dot" cx={cursorEnd.x} cy={cursorEnd.y} r="5"></circle>}
              </g>
            )}
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{leftOrder.map((idx) => renderTile("L", idx))}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{rightOrder.map((idx) => renderTile("R", idx))}</div>
        </div>
        {deferred && (
          <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-300)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 22 }}>
            tap or drag to connect · tap a linked tile to undo
          </div>
        )}
      </LessonShell>
    </div>
  );
}

/* ════════════════ FILL BLANKS ════════════════ */
function parseTemplate(text) {
  const out = [];
  const re = /\{\{blank\}\}/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    out.push(text.slice(last, m.index));
    out.push(null);
    last = m.index + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

function FillBlanksV2({ text, parts: explicitParts, blanks, wordBank, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onGrade, onQuit, onFinish }) {
  const parts = useMemoL(() => explicitParts || (text ? parseTemplate(text) : []), [explicitParts, text]);
  const blankCount = useMemoL(() => parts.filter((p) => p === null).length, [parts]);
  const answersKnown = !onGrade && !!blanks;

  const [slots, setSlots] = useStateL(() => Array.from({ length: blankCount }, () => null));
  const [slotMarks, setSlotMarks] = useStateL(() => Array.from({ length: blankCount }, () => ""));
  const [used, setUsed] = useStateL([]);
  const [armed, setArmed] = useStateL(null);
  const [hoverBank, setHoverBank] = useStateL(false);
  const [feedback, setFeedback] = useStateL(null);
  const [attemptsLeft, setAttemptsLeft] = useStateL(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateL(0);
  const [lostHeart, setLostHeart] = useStateL(false);
  const [streak, setStreak] = useStateL(initialStreak);
  const [checking, setChecking] = useStateL(false);
  const [announce, setAnnounce] = useStateL(""); // FB-02
  const { fire, layer } = useConfetti();
  const pillRefs = useRefL({});
  const slotRefs = useRefL({});

  const setSlotMark = (si, mark) => setSlotMarks((ms) => ms.map((m, i) => (i === si ? mark : m)));

  const place = (wi) => {
    if (feedback || checking || used.includes(wi)) return;
    const si = armed != null && slots[armed] === null ? armed : slots.findIndex((s) => s === null);
    if (si < 0) return;
    setArmed(null);
    setUsed((u) => [...u, wi]);
    flyClone(pillRefs.current[wi] || null, slotRefs.current[si] || null, () => {
      setSlots((s) => s.map((x, i) => (i === si ? wi : x)));
      setSlotMark(si, "flash");
      setAnnounce("Placed “" + wordBank[wi] + "” in blank " + (si + 1));
      window.setTimeout(() => {
        setSlotMarks((ms) => ms.map((m, i) => (i === si && m === "flash" ? "" : m)));
      }, 450);
    });
  };

  const unplace = (si) => {
    if (feedback || checking) return;
    if (slots[si] === null) { setArmed((a) => (a === si ? null : si)); return; }
    const wi = slots[si];
    setSlots((s) => s.map((x, i) => (i === si ? null : x)));
    setSlotMark(si, "");
    setAnnounce("Removed “" + wordBank[wi] + "” from blank " + (si + 1));
    flyClone(slotRefs.current[si] || null, pillRefs.current[wi] || null, () => {
      setUsed((u) => u.filter((x) => x !== wi));
    });
  };

  const applyResult = (res, perSlot) => {
    setSlotMarks(perSlot || Array.from({ length: blankCount }, () => (res.correct ? "ok" : "no")));
    if (res.correct) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Sweet — every word in place!" : "Got it!", explain: res.explain });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = res.attemptsRemaining != null ? res.attemptsRemaining : attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (res.maxReached || remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here's the sentence", correct: res.correctAnswer || (blanks && blanks.join(" · ")), explain: res.explain });
      setStreak(0);
    } else {
      const wrongCount = perSlot ? perSlot.filter((m) => m === "no").length : null;
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "So close — 1 try left" : "Not quite — " + remaining + " tries left",
        explain: wrongCount ? (wrongCount === 1 ? "1 word is in the wrong spot — the green ones are staying put." : wrongCount + " words are in the wrong spot — the green ones are staying put.") : undefined,
      });
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    const got = slots.map((s) => (s == null ? "" : wordBank[s]));
    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ blanks: got });
        applyResult(res);
      } catch {
        /* FB-03 */
        setFeedback({ kind: "meh", msg: "Hmm, we couldn't check that", explain: "Check your connection and try again — your words are safe." });
      } finally {
        setChecking(false);
      }
      return;
    }
    const marks = got.map((w, i) => (w === (blanks && blanks[i]) ? "ok" : "no"));
    applyResult({ correct: marks.every((m) => m === "ok"), correctAnswer: blanks && blanks.join(" · "), attemptsRemaining: attemptsLeft - 1 }, marks);
  };

  const handleRetry = () => {
    const wasNetwork = feedback && feedback.kind === "meh";
    setFeedback(null);
    setArmed(null);
    if (wasNetwork) return; // FB-03: keep everything
    if (answersKnown) {
      const keep = slots.map((wi, i) => (wi !== null && wordBank[wi] === blanks[i] ? wi : null));
      setSlots(keep);
      setUsed(keep.filter((x) => x !== null));
      setSlotMarks((ms) => ms.map((m, i) => (keep[i] !== null && m === "ok" ? "ok" : "")));
    } else {
      setSlots(Array.from({ length: blankCount }, () => null));
      setUsed([]);
      setSlotMarks(Array.from({ length: blankCount }, () => ""));
    }
  };

  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });

  const allFilled = slots.every((s) => s !== null);
  const canRetry = feedback && (feedback.kind === "meh" || (feedback.kind === "no" && attemptsLeft > 0));

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }} aria-live="polite">{announce}</span>
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Complete the sentence"}
        feedback={feedback} canCheck={allFilled} checking={checking}
        checkHint="Fill every blank first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ fontSize: "clamp(16px, 4cqw, 19px)", lineHeight: 2.3, color: "var(--ink-900)", maxWidth: 560, margin: "8px auto 28px", textAlign: "center", fontWeight: 600 }}>
          {parts.map((p, i) => {
            if (p !== null) return <span key={i}>{p}</span>;
            const si = parts.slice(0, i).filter((x) => x === null).length;
            const wi = slots[si];
            const mark = slotMarks[si];
            const cls = "fb-slot" + (wi !== null ? " filled" : "") + (armed === si ? " armed" : "") + (wi === null && hoverBank && !feedback ? " pulse" : "") + (mark ? " " + mark : "");
            return (
              <button
                key={i}
                ref={(el) => { slotRefs.current[si] = el; }}
                className={cls}
                onClick={() => unplace(si)}
                aria-label={wi !== null ? "Blank " + (si + 1) + ": " + wordBank[wi] + ". Tap to remove" : "Blank " + (si + 1) + ", empty. Tap to aim here"}
              >
                {wi == null ? (armed === si ? "here!" : "· · ·") : wordBank[wi]}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 520, margin: "0 auto" }}>
          {wordBank.map((w, i) => (
            <button
              key={i}
              ref={(el) => { pillRefs.current[i] = el; }}
              className={"gp-tile" + (used.includes(i) ? " locked" : "")}
              style={{ padding: "10px 18px", fontSize: 15, borderRadius: 999, opacity: used.includes(i) ? 0.25 : 1 }}
              disabled={used.includes(i) || !!feedback || checking}
              onClick={() => place(i)}
              onPointerEnter={() => setHoverBank(true)}
              onPointerLeave={() => setHoverBank(false)}
            >
              {w}
            </button>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { MatchingV2, FillBlanksV2 });
