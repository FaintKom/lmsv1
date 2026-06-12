/* ex-drag.jsx — OrderingV2 + CategorizeV2 (playground ports with audit fixes)

   OrderingV2 fixes:
   - OR-01 rows are measured, not assumed 56px — long wrapped text no longer
           breaks the drag math (upstream SLOT=56+gap constant)
   - OR-02 keyboard path: focus a row, ↑/↓ moves it (plus visible arrow
           buttons on focus); aria-live announces the new position
   - OR-03 server-sim support; network failure = neutral sheet, order kept

   CategorizeV2 fixes:
   - CT-01 chips are buttons: tap/Enter arms a chip, tap/Enter a bucket
           places it — full keyboard + no-drag touch path
   - CT-02 instant mode: a wrong drop shakes inline + costs a heart but no
           longer opens the full sheet mid-flow (sheet only at 0 hearts)
   - CT-04 out-of-tries reveal is a structured list per item
*/

const { useState: useStateD, useRef: useRefD, useMemo: useMemoD } = React;

/* ════════════════ ORDERING ════════════════ */
const ROW_GAP = 10;

function OrderingV2({ items, eyebrow, title, hint, maxAttemptsPerTask = 3, streak: initialStreak = 0, onGrade, onQuit, onFinish }) {
  const n = items.length;
  const indices = items.map((_, i) => i);
  const [order, setOrder] = useStateD(() => shuffleArr(indices));
  const [drag, setDrag] = useStateD(null);
  const [settledIdx, setSettledIdx] = useStateD(null);
  const [graded, setGraded] = useStateD(false);
  const [feedback, setFeedback] = useStateD(null);
  const [attemptsLeft, setAttemptsLeft] = useStateD(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateD(0);
  const [lostHeart, setLostHeart] = useStateD(false);
  const [streak, setStreak] = useStateD(initialStreak);
  const [checking, setChecking] = useStateD(false);
  const [announce, setAnnounce] = useStateD("");
  const startY = useRefD(0);
  const rowRefs = useRefD({});
  const { fire, layer } = useConfetti();

  const locked = !!feedback || graded || checking;

  /* OR-01: measure real row heights each drag */
  const rowH = (pos) => {
    const el = rowRefs.current[pos];
    return el ? el.offsetHeight : 56;
  };
  const dragH = drag ? rowH(drag.pos) + ROW_GAP : 0;

  /* target slot from real cumulative heights */
  const targetPos = useMemoD(() => {
    if (!drag) return null;
    let center = 0;
    for (let i = 0; i < drag.pos; i++) center += rowH(i) + ROW_GAP;
    center += rowH(drag.pos) / 2 + drag.dy;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const h = rowH(i) + ROW_GAP;
      if (center < acc + h) return i;
      acc += h;
    }
    return n - 1;
  }, [drag, n]);

  const down = (pos) => (e) => {
    if (locked) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setDrag({ pos, dy: 0 });
    setSettledIdx(null);
  };
  const move = (e) => {
    if (!drag) return;
    setDrag({ ...drag, dy: e.clientY - startY.current });
  };
  const up = () => {
    if (!drag || targetPos === null) return;
    const from = drag.pos, to = targetPos;
    if (from !== to) {
      const next = order.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      setOrder(next);
      setSettledIdx(to);
      setTimeout(() => setSettledIdx(null), 350);
    }
    setDrag(null);
  };

  /* OR-02: keyboard move */
  const keyMove = (pos, dir) => {
    if (locked) return;
    const to = pos + dir;
    if (to < 0 || to >= n) return;
    const next = order.slice();
    const [moved] = next.splice(pos, 1);
    next.splice(to, 0, moved);
    setOrder(next);
    setSettledIdx(to);
    setTimeout(() => setSettledIdx(null), 350);
    setAnnounce("“" + items[moved] + "” moved to position " + (to + 1) + " of " + n);
    requestAnimationFrame(() => {
      const el = rowRefs.current[to];
      if (el) el.focus();
    });
  };

  const shiftFor = (pos) => {
    if (!drag || targetPos === null || pos === drag.pos) return 0;
    if (drag.pos < targetPos && pos > drag.pos && pos <= targetPos) return -dragH;
    if (drag.pos > targetPos && pos < drag.pos && pos >= targetPos) return dragH;
    return 0;
  };

  const rowState = (itemIdx, pos) => {
    if (!graded || !feedback) return "";
    if (feedback.kind === "ok") return "ok";
    if (feedback.kind === "meh") return "";
    if (onGrade) return "";
    return itemIdx === pos ? "ok" : "no";
  };

  const applyResult = (res) => {
    setGraded(true);
    if (res.correct) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Perfect order, first try!" : "Got it!", explain: res.explain || hint });
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
      setFeedback({ kind: "no", msg: "Out of tries — here's the order", correctList: items.map((it, i) => [String(i + 1), it]) });
      setStreak(0);
    } else {
      const rightCount = onGrade ? null : order.filter((v, i) => v === i).length;
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "Almost — 1 try left" : "Not yet — " + remaining + " tries left",
        explain: rightCount != null ? rightCount + " of " + n + " are already in the right place — they'll glow green." : (res.explain || hint || "Your order is kept so you can fix it."),
      });
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    const values = order.map((idx) => items[idx]);
    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ order: values });
        applyResult(res);
      } catch {
        setFeedback({ kind: "meh", msg: "Hmm, we couldn't check that", explain: "Check your connection and try again — your order is safe." });
      } finally {
        setChecking(false);
      }
      return;
    }
    applyResult({ correct: order.every((v, i) => v === i), attemptsRemaining: attemptsLeft - 1 });
  };

  const handleRetry = () => { setGraded(false); setFeedback(null); };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });

  const canRetry = feedback && (feedback.kind === "meh" || (feedback.kind === "no" && attemptsLeft > 0));

  /* per-row partial marks while retrying (local mode): right rows glow */
  const showKeptMarks = !feedback && graded === false && usedAttempts > 0 && !onGrade;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }} aria-live="polite">{announce}</span>
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Put these in order"}
        feedback={feedback} canCheck={!feedback && !checking} checking={checking}
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: ROW_GAP, maxWidth: 540, margin: "0 auto", width: "100%" }} role="list" aria-label="Items to order">
          {order.map((itemIdx, pos) => {
            const isDrag = drag !== null && drag.pos === pos;
            const shift = shiftFor(pos);
            const state = rowState(itemIdx, pos);
            const keptOk = showKeptMarks && itemIdx === pos;
            const displayNum = isDrag && targetPos !== null ? targetPos + 1 : pos + 1 + (shift < 0 ? -1 : shift > 0 ? 1 : 0);
            return (
              <div
                key={itemIdx}
                ref={(el) => { rowRefs.current[pos] = el; }}
                role="listitem"
                tabIndex={locked ? -1 : 0}
                className={"fb-dragrow" + (isDrag ? " dragging" : "") + (settledIdx === pos ? " settled" : "") + (state ? " " + state : "") + (keptOk ? " ok" : "")}
                style={{
                  transform: isDrag
                    ? "translateY(" + drag.dy + "px) rotate(calc(1.4deg * var(--mamp))) scale(1.02)"
                    : "translateY(" + shift + "px)",
                  cursor: locked ? "default" : undefined,
                }}
                aria-label={"Position " + (pos + 1) + " of " + n + ": " + items[itemIdx] + ". Use arrow keys to move."}
                onPointerDown={down(pos)}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") { e.preventDefault(); keyMove(pos, -1); }
                  if (e.key === "ArrowDown") { e.preventDefault(); keyMove(pos, 1); }
                }}
              >
                <span className="num">{displayNum}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{items[itemIdx]}</span>
                <span className="grip" aria-hidden="true">⋮⋮</span>
                <span className="kbd-arrows" aria-hidden="true">
                  <button tabIndex={-1} onClick={(e) => { e.stopPropagation(); keyMove(pos, -1); }} onPointerDown={(e) => e.stopPropagation()}>↑</button>
                  <button tabIndex={-1} onClick={(e) => { e.stopPropagation(); keyMove(pos, 1); }} onPointerDown={(e) => e.stopPropagation()}>↓</button>
                </span>
              </div>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ CATEGORIZE ════════════════ */
const BUCKET_SWATCHES = ["var(--green-400)", "var(--sun-400)", "var(--coral-300)", "var(--info)"];

function CategorizeV2({ categories, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, deferred = true, onQuit, onFinish }) {
  const all = useMemoD(() => categories.flatMap((c) => c.items), [categories]);
  const correctCat = useMemoD(() => {
    const m = {};
    categories.forEach((c) => c.items.forEach((it) => { m[it] = c.name; }));
    return m;
  }, [categories]);

  const [trayOrder] = useStateD(() => shuffleArr(all));
  const [placed, setPlaced] = useStateD({});
  const [chipStates, setChipStates] = useStateD({});
  const [drag, setDrag] = useStateD(null);
  const [armedChip, setArmedChip] = useStateD(null); // CT-01
  const [flash, setFlash] = useStateD(null);
  const [grading, setGrading] = useStateD(false);
  const [feedback, setFeedback] = useStateD(null);
  const [attemptsLeft, setAttemptsLeft] = useStateD(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateD(0);
  const [lostHeart, setLostHeart] = useStateD(false);
  const [streak, setStreak] = useStateD(initialStreak);
  const [announce, setAnnounce] = useStateD("");
  const start = useRefD({ x: 0, y: 0 });
  const bucketRefs = useRefD({});
  const { fire, layer } = useConfetti();

  const tray = trayOrder.filter((it) => !placed[it]);
  const revealList = () => all.map((it) => [it, correctCat[it]]);

  const bucketAt = (x, y) => {
    for (const c of categories) {
      const el = bucketRefs.current[c.name];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return c.name;
    }
    return null;
  };

  const winTask = () => {
    setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Spot on — every single one!" : "Got it!" });
    setStreak((s) => s + 1);
    fire();
  };

  const loseRound = (msg, opts) => {
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here's where they go", correctList: revealList() });
      setStreak(0);
      return true;
    }
    if (!opts || !opts.silent) setFeedback({ kind: "no", msg });
    return false;
  };

  const placeChip = (item, bucketName) => {
    if (deferred) {
      setPlaced((p) => ({ ...p, [item]: bucketName }));
      setFlash({ key: bucketName, kind: "catch" });
      setAnnounce("“" + item + "” placed in " + bucketName);
      setTimeout(() => setFlash(null), 450);
      return;
    }
    if (correctCat[item] === bucketName) {
      const next = { ...placed, [item]: bucketName };
      setPlaced(next);
      setChipStates((s) => ({ ...s, [item]: "ok" }));
      setFlash({ key: bucketName, kind: "gotcha" });
      setAnnounce("Correct! “" + item + "” belongs in " + bucketName);
      setTimeout(() => setFlash(null), 450);
      if (Object.keys(next).length === all.length) setTimeout(() => winTask(), 380);
    } else {
      /* CT-02: inline shake + heart, sheet only at 0 hearts */
      setFlash({ key: bucketName, kind: "reject" });
      setAnnounce("“" + item + "” doesn't belong in " + bucketName);
      setTimeout(() => setFlash(null), 450);
      loseRound("", { silent: true });
    }
  };

  const down = (item) => (e) => {
    if (feedback || chipStates[item]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ item, dx: 0, dy: 0, over: null, moved: false });
  };
  const move = (e) => {
    if (!drag) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({ ...drag, dx, dy, over: bucketAt(e.clientX, e.clientY), moved: drag.moved || Math.hypot(dx, dy) > 6 });
  };
  const up = () => {
    if (!drag) return;
    const { item, over, moved } = drag;
    setDrag(null);
    if (!moved) {
      /* tap = arm (CT-01 touch path) */
      setArmedChip((a) => (a === item ? null : item));
      return;
    }
    setArmedChip(null);
    if (!over) return;
    placeChip(item, over);
  };

  const bucketTap = (name) => {
    if (!armedChip || feedback) return;
    const item = armedChip;
    setArmedChip(null);
    placeChip(item, name);
  };

  const handleCheck = () => {
    if (grading) return;
    setGrading(true);
    const states = {};
    const bad = [];
    all.forEach((it) => {
      if (!placed[it]) return;
      const ok = placed[it] === correctCat[it];
      states[it] = ok ? "ok" : "no";
      if (!ok) bad.push(it);
    });
    setChipStates(states);
    if (bad.length === 0) { winTask(); setGrading(false); return; }
    const taskOver = attemptsLeft - 1 <= 0;
    setTimeout(() => {
      if (!taskOver) {
        setPlaced((p) => {
          const np = { ...p };
          bad.forEach((it) => delete np[it]);
          return np;
        });
        setChipStates((s) => {
          const ns = { ...s };
          bad.forEach((it) => delete ns[it]);
          return ns;
        });
      }
      setGrading(false);
      loseRound(bad.length === 1 ? "1 hopped back to the tray — try a different home" : bad.length + " hopped back to the tray — try different homes");
    }, 750);
  };

  const unplace = (item) => {
    if (!deferred || feedback || chipStates[item]) return;
    setPlaced((p) => {
      const np = { ...p };
      delete np[item];
      return np;
    });
    setAnnounce("“" + item + "” returned to the tray");
  };

  const handleRetry = () => {
    if (!deferred) { setPlaced({}); setChipStates({}); }
    setFeedback(null);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });

  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }} aria-live="polite">{announce}</span>
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Sort them into groups"}
        feedback={feedback}
        canCheck={deferred && tray.length === 0 && !grading && !feedback}
        checkLabel="Check groups" checkHint="Sort every card first"
        instant={!deferred} instantLabel="cards check themselves"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
          {/* tray */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", minHeight: 60, marginBottom: 26 }}>
            {tray.map((it) => {
              const isDrag = drag !== null && drag.item === it;
              const isArmed = armedChip === it;
              return (
                <button
                  key={it}
                  className={"fb-chip-drag" + (isDrag ? " dragging" : "") + (isArmed ? " armed" : "")}
                  style={isDrag && drag.moved
                    ? { transform: "translate(" + drag.dx + "px, " + drag.dy + "px) rotate(calc(2deg * var(--mamp))) scale(1.06)", border: "none", background: "var(--paper-2)", boxShadow: "var(--shadow-md)", outline: "2px solid var(--green-400)" }
                    : feedback ? { cursor: "default" } : undefined}
                  onPointerDown={down(it)}
                  onPointerMove={move}
                  onPointerUp={up}
                  onPointerCancel={up}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setArmedChip((a) => (a === it ? null : it)); } }}
                  aria-pressed={isArmed}
                  aria-label={"“" + it + "”" + (isArmed ? " — now pick a group" : ". Press Enter, then pick a group")}
                >
                  {it}
                </button>
              );
            })}
            {tray.length === 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-300)", alignSelf: "center", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {deferred && !feedback ? "all sorted — hit check!" : "all sorted!"}
              </span>
            )}
          </div>

          {/* buckets */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
            {categories.map((c, ci) => {
              const inBucket = all.filter((it) => placed[it] === c.name);
              const isOver = drag !== null && drag.over === c.name;
              const isFlash = flash !== null && flash.key === c.name;
              const isTarget = !!armedChip && !feedback;
              return (
                <div
                  key={c.name}
                  ref={(el) => { bucketRefs.current[c.name] = el; }}
                  className={"fb-bucket" + (isOver ? " over" : "") + (isFlash ? " " + flash.kind : "") + (isTarget && !isOver && !isFlash ? " target" : "")}
                  role={isTarget ? "button" : undefined}
                  tabIndex={isTarget ? 0 : -1}
                  aria-label={isTarget ? "Place “" + armedChip + "” in " + c.name : c.name + " group, " + inBucket.length + " cards"}
                  onClick={() => bucketTap(c.name)}
                  onKeyDown={(e) => { if (isTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); bucketTap(c.name); } }}
                >
                  <div className="fb-bucket-title">
                    <span className="swatch" style={{ background: BUCKET_SWATCHES[ci % BUCKET_SWATCHES.length] }} aria-hidden="true"></span>
                    {c.name}
                    <span className="cnt">{inBucket.length}</span>
                  </div>
                  {inBucket.map((it) => {
                    const st = chipStates[it];
                    const returnable = deferred && !st && !feedback;
                    return (
                      <button
                        key={it}
                        className={"fb-chip-drag landed" + (st ? " " + st : "")}
                        onClick={(e) => { e.stopPropagation(); unplace(it); }}
                        disabled={!returnable}
                        aria-label={returnable ? "“" + it + "” in " + c.name + ". Tap to return to tray" : "“" + it + "” in " + c.name}
                        style={{
                          cursor: returnable ? "pointer" : "default",
                          alignSelf: "flex-start",
                          borderColor: st ? undefined : deferred ? "color-mix(in oklab, var(--link-color) 55%, var(--ink-100))" : "var(--green-300)",
                          background: st ? undefined : deferred ? "color-mix(in oklab, var(--link-color) 7%, var(--paper-2))" : "var(--green-50)",
                        }}
                      >
                        {it}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-300)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 18 }}>
            drag a card — or tap it, then tap its group
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { OrderingV2, CategorizeV2 });
